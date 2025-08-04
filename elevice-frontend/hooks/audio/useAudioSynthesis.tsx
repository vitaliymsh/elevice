import { useState, useRef, useEffect } from "react"
import { getApiServices } from "@/services"

export const useAudioSynthesis = (apiUrl: string, userId?: string) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const lastQuestionRef = useRef<string>("");

  // Get API services instance
  const apiServices = getApiServices(apiUrl);

  // Cleanup current audio
  const cleanupCurrentAudio = () => {
    if (currentAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      } catch (e) {
        // Ignore revoke errors
      }
      currentAudioUrlRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
    }
    
    setIsPlayingAudio(false);
  };

  // Core speech synthesis function - simplified
  const synthesizeQuestionSpeech = async (text: string) => {
    // Prevent multiple simultaneous calls
    if (isSynthesizing || isDisabled || !text.trim()) {
      console.log("🔊 TTS skipped:", { isSynthesizing, isDisabled, hasText: !!text.trim() });
      return;
    }

    // Skip if same question as last one to prevent loops
    if (lastQuestionRef.current === text) {
      console.log("🔊 TTS skipped - same question as before");
      return;
    }

    try {
      setIsSynthesizing(true);
      lastQuestionRef.current = text;
      
      // Clean up any existing audio first
      cleanupCurrentAudio();

      console.log("🔊 Starting TTS for:", text.substring(0, 50) + "...");

      // Get audio from API
      const audioBuffer = await apiServices.audio.convertTextToSpeech(text);
      
      if (!audioBuffer || !(audioBuffer instanceof ArrayBuffer) || audioBuffer.byteLength === 0) {
        throw new Error("Invalid audio data received");
      }

      // Create blob and URL
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      currentAudioUrlRef.current = audioUrl;

      if (!audioRef.current) {
        throw new Error("Audio element not available");
      }

      // Set up event handlers first
      audioRef.current.onended = () => {
        console.log("🔊 Audio playback ended");
        setIsPlayingAudio(false);
      };
      
      audioRef.current.onerror = (e) => {
        console.log("🔊 Audio playback error (this is normal for invalid audio):", e);
        cleanupCurrentAudio();
        setFailedAttempts(prev => prev + 1);
      };

      audioRef.current.onloadeddata = () => {
        console.log("🔊 Audio data loaded, starting playback immediately");
        if (audioRef.current) {
          audioRef.current.play().catch(playError => {
            if (playError instanceof DOMException && playError.name === 'NotAllowedError') {
              console.log("🔊 Autoplay blocked - user interaction required");
              setFailedAttempts(prev => Math.max(0, prev - 1)); // Don't count autoplay blocks as failures
            } else {
              console.log("🔊 Failed to play audio (this is normal for some audio formats):", playError);
              setFailedAttempts(prev => prev + 1);
            }
            setIsPlayingAudio(false);
          });
        }
      };

      // Set source and load - this will trigger onloadeddata when ready
      setIsPlayingAudio(true);
      audioRef.current.src = audioUrl;
      audioRef.current.load(); // Force load the audio data
      console.log("🔊 Audio loading started, will play automatically when ready");

      // Reset failed attempts on success
      setFailedAttempts(0);
      
    } catch (error) {
      console.log("🔊 TTS error (this is often normal):", error);
      cleanupCurrentAudio();
      
      setFailedAttempts(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          console.log("🔊 Too many failures, disabling TTS for 30 seconds");
          setIsDisabled(true);
          setTimeout(() => {
            setIsDisabled(false);
            setFailedAttempts(0);
          }, 30000);
        }
        return newCount;
      });
      
      // For autoplay restrictions, don't count as failure
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.log("🔊 Autoplay blocked - user interaction required");
        setFailedAttempts(prev => Math.max(0, prev - 1)); // Don't count autoplay blocks as failures
      }
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Replay function
  const replayCurrentQuestion = async (currentQuestion: string, isInterviewStarted: boolean) => {
    if (!currentQuestion || !isInterviewStarted || isPlayingAudio || isSynthesizing || isDisabled) {
      console.log("🔊 Replay blocked:", { 
        hasQuestion: !!currentQuestion, 
        isInterviewStarted, 
        isPlayingAudio, 
        isSynthesizing,
        isDisabled 
      });
      return;
    }

    // Clear last question to allow replay
    lastQuestionRef.current = "";
    await synthesizeQuestionSpeech(currentQuestion);
  };

  // Function to stop current audio playback
  const stopAudioPlayback = () => {
    console.log("🔊 Stopping audio playback");
    cleanupCurrentAudio();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCurrentAudio();
    };
  }, []);

  return {
    isPlayingAudio,
    audioRef,
    synthesizeQuestionSpeech,
    replayCurrentQuestion,
    stopAudioPlayback,
  };
};
