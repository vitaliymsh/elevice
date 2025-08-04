// Audio recording, transcription, and playback management
import { useRef, useCallback, useEffect, useMemo } from "react"
import { useAudioRecording } from "../audio/useAudioRecording"
import { AudioApiService } from "@/services/api/audio"
import type { MicrophoneState } from "@/types/interview"

interface UseInterviewAudioOptions {
  apiUrl: string
  micState: MicrophoneState
  onMicStateChange: (state: MicrophoneState) => void
  onInterviewTurn: (text: string, duration: number) => Promise<void>
  onError: (error: string) => void
}

/**
 * Manages audio recording, transcription, and playback for interview sessions
 * Follows SRP: Only handles audio-related functionality
 */
export const useInterviewAudio = ({
  apiUrl,
  micState,
  onMicStateChange,
  onInterviewTurn,
  onError,
}: UseInterviewAudioOptions) => {
  // --- Refs for encapsulation ---
  const audioServiceRef = useRef<AudioApiService | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const currentAudioUrlRef = useRef<string | null>(null)
  const latestDurationRef = useRef<number>(0)

  // --- Initialize audio service ---
  useEffect(() => {
    audioServiceRef.current = new AudioApiService(apiUrl)
  }, [apiUrl])


  // --- Stable transcription callback ---
  const audioDataCallback = useCallback(async (audioBlob: Blob) => {
    console.log("🎤 audioDataCallback called with blob", audioBlob)
    if (!audioServiceRef.current) {
      onError("Audio service not initialized")
      return
    }
    onMicStateChange("processing")
    try {
      const transcription = await audioServiceRef.current.transcribeAudio(audioBlob)
      const duration = latestDurationRef.current
      if (transcription && transcription.trim()) {
        await onInterviewTurn(transcription, duration)
        console.log("🎤 Transcription complete", transcription)
      } else {
        onError("No speech detected. Please try speaking again.")
        onMicStateChange("idle")
      }
    } catch (err) {
      onError("Failed to transcribe audio. Please try again.")
      onMicStateChange("idle")
      console.error("🎤 Transcription error", err)
    }
  }, [onMicStateChange, onInterviewTurn, onError])

  // --- Stable options for useAudioRecording ---
  // Memoize the callback to avoid unnecessary re-renders
  const callbackRef = useRef(audioDataCallback)
  useEffect(() => {
    callbackRef.current = audioDataCallback
  }, [audioDataCallback])

  const stableOptions = useMemo(() => ({
    onAudioDataAvailable: (audioBlob: Blob) => {
      // Always use the unified callback for both flows
      if (callbackRef.current) {
        callbackRef.current(audioBlob)
      } else {
        console.warn("🎤 callbackRef.current is not set!", callbackRef)
      }
    }
  }), [])

  // --- Audio recording hook ---
  const {
    startRecording: rawStartRecording,
    stopRecording: rawStopRecording,
    audioData,
    lastRecordingDuration,
    recordingError
  } = useAudioRecording(stableOptions)
  // --- Wrapped recording functions ---
  const startRecording = useCallback(async () => {
    if (micState !== "idle") return
    onMicStateChange("recording")
    try {
      await rawStartRecording()
    } catch {
      onError("Failed to start recording. Please check microphone permissions.")
      onMicStateChange("idle")
    }
  }, [micState, onMicStateChange, rawStartRecording, onError])

  const stopRecording = useCallback(() => {
    if (micState !== "recording") return
    console.log("🎤 stopRecording triggered, micState:", micState)
    try {
      rawStopRecording()
      console.log("🎤 rawStopRecording called")
    } catch {
      onError("Failed uto stop recording")
      onMicStateChange("idle")
    }
    // State will be changed to "processing" in onAudioDataAvailable
    // If audioData is available after stopping, trigger transcription
    // (useAudioRecording should call onAudioDataAvailable automatically)
  }, [micState, rawStopRecording, onError, onMicStateChange])

  // --- Audio playback for TTS ---
  const playAudio = useCallback(async (text: string) => {
    if (!audioServiceRef.current) {
      onError("Audio service not initialized")
      return null;
    }
    try {
      const audioBuffer = await audioServiceRef.current.convertTextToSpeech(text)
      if (!audioBuffer) {
        onError("Failed to generate audio")
        return null;
      }
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current)
      }
      currentAudioUrlRef.current = audioUrl
      // Do not play audio here; let the page handle playback
      return audioUrl;
    } catch {
      onError("Failed to play audio")
      onMicStateChange("idle")
      return null;
    }
  }, [onError, onMicStateChange])

  const stopAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
      audioElementRef.current = null
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current)
      currentAudioUrlRef.current = null
    }
    onMicStateChange("idle")
  }, [onMicStateChange])

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause()
      }
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current)
      }
    }
  }, [])

  // --- Return values ---
  return {
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    isRecordingAvailable: micState === "idle",
    canStopRecording: micState === "recording",
  }
}