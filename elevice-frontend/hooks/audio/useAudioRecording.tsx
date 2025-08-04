import { useState, useRef, useEffect, useCallback } from "react"

export interface UseAudioRecordingOptions {
  onAudioDataAvailable?: (audioBlob: Blob) => void;
}

export const useAudioRecording = (options?: UseAudioRecordingOptions) => {
  // --- Stable callback ref for audio data ---
  const audioDataAvailableRef = useRef<((audioBlob: Blob) => void) | undefined>(options?.onAudioDataAvailable)
  useEffect(() => {
    audioDataAvailableRef.current = options?.onAudioDataAvailable
  }, [options?.onAudioDataAvailable])

  // --- Internal state ---
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [lastRecordingDuration, setLastRecordingDuration] = useState<number>(0);

  // --- Internal refs for browser API objects ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  /**
   * Request microphone permission from the user
   */
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      stream.getTracks().forEach((track) => track.stop());
      setRecordingError(null);
    } catch (err) {
      setPermissionGranted(false);
      setRecordingError("Microphone permission is required for voice interaction.");
      throw err;
    }
  }, []);

  /**
   * Start audio recording. Handles permission, sample rate selection, and MediaRecorder setup.
   */
  const startRecording = useCallback(async () => {
    setRecordingError(null);
    setAudioData(null);
    if (!permissionGranted) {
      try {
        await requestMicrophonePermission();
      } catch (err) {
        return;
      }
    }
    let stream;
    const supportedSampleRates = [48000, 24000, 16000, 12000, 8000];
    for (const sampleRate of supportedSampleRates) {
      try {
        const constraints = {
          audio: {
            sampleRate: { exact: sampleRate },
            channelCount: { exact: 1 },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const audioTrack = stream.getAudioTracks()[0];
        const settings = audioTrack.getSettings();
        if (settings.sampleRate && supportedSampleRates.includes(settings.sampleRate)) {
          break;
        } else {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
      } catch (e) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
      }
    }
    if (!stream) {
      try {
        const constraints = {
          audio: {
            channelCount: { exact: 1 },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const audioTrack = stream.getAudioTracks()[0];
        const settings = audioTrack.getSettings();
        if (settings.sampleRate && !supportedSampleRates.includes(settings.sampleRate)) {
          stream.getTracks().forEach(track => track.stop());
          setRecordingError(`Audio sample rate ${settings.sampleRate} Hz is not supported. Backend supports: ${supportedSampleRates.join(', ')} Hz`);
          return;
        }
      } catch (e) {
        setRecordingError("Could not get audio stream with any supported sample rate");
        return;
      }
    }
    if (!stream) {
      setRecordingError("Could not get audio stream");
      return;
    }
    streamRef.current = stream;
    let recorderOptions: MediaRecorderOptions = {};
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')) {
      recorderOptions.mimeType = 'audio/webm;codecs=pcm';
    } else if (MediaRecorder.isTypeSupported('audio/wav')) {
      recorderOptions.mimeType = 'audio/wav';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      recorderOptions.mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      recorderOptions.mimeType = 'audio/mp4';
    }
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);
    } catch (err) {
      setRecordingError("Failed to initialize MediaRecorder");
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    audioChunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    mediaRecorderRef.current.onerror = (event) => {
      setRecordingError("Recording error occurred");
      stopRecording();
    };
    mediaRecorderRef.current.onstop = async () => {
      setIsRecording(false);
      const endTime = Date.now();
      if (recordingStartTimeRef.current) {
        const duration = (endTime - recordingStartTimeRef.current) / 1000;
        setLastRecordingDuration(duration);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioChunksRef.current.length > 0) {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioData(audioBlob);
        const cb = audioDataAvailableRef.current;
        if (typeof cb === 'function') {
          cb(audioBlob);
        }
      }
    };
    recordingStartTimeRef.current = Date.now();
    mediaRecorderRef.current.start(100);
    setIsRecording(true);
  }, [permissionGranted, requestMicrophonePermission, options]);

  /**
   * Stop audio recording if active
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /**
   * Clear all recording data and errors
   */
  const clearRecording = useCallback(() => {
    audioChunksRef.current = [];
    setAudioData(null);
    setLastRecordingDuration(0);
    setRecordingError(null);
  }, []);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // --- Hook return values ---
  return {
    permissionGranted,
    isRecording,
    audioData,
    recordingError,
    lastRecordingDuration,
    requestMicrophonePermission,
    startRecording,
    stopRecording,
    clearRecording,
  };
};
