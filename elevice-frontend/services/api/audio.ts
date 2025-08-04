export class AudioApiService {
  constructor(private apiUrl: string) {
    this.apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL!; // apiUrl
  } // Added a comment to force re-evaluation

  // Text to speech conversion
  async convertTextToSpeech(text: string): Promise<ArrayBuffer | null> {
    try {
      console.log("Converting text to speech:", text.substring(0, 50) + "...");

      const response = await fetch(`${this.apiUrl}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.statusText}`);
      }

      // Check if the response is actually audio data
      const contentType = response.headers.get('content-type');
      console.log("🔊 TTS API response content-type:", contentType);
      
      if (contentType && !contentType.includes('audio') && !contentType.includes('application/octet-stream')) {
        // If it's not audio, try to read as text to see what we got
        const textResponse = await response.text();
        console.error("🔊 TTS API returned non-audio content:", { contentType, response: textResponse.substring(0, 200) });
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Validate that we got actual binary data
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error("🔊 TTS API returned empty response");
        return null;
      }
      
      if (arrayBuffer.byteLength < 100) {
        console.error("🔊 TTS API returned suspiciously small response:", arrayBuffer.byteLength);
        return null;
      }
      
      console.log("🔊 TTS API returned audio data:", arrayBuffer.byteLength, "bytes");
      return arrayBuffer;
    } catch (err) {
      console.error('Text to speech conversion failed:', err);
      return null;
    }
  }

  // Speech to text transcription
  async transcribeAudio(audioBlob: Blob): Promise<string | null> {
    console.log("🔊 transcribeAudio called with:", { audioBlob, apiUrl: this.apiUrl });
    try {
      if (!this.apiUrl) {
        console.error("API URL not configured");
        return null;
      }
      
      if (!audioBlob || !(audioBlob instanceof Blob) || audioBlob.size === 0) {
        console.error("Invalid audioBlob provided for transcription.");
        return null;
      }
      
      // Validate audio blob size and type
      if (audioBlob.size > 25 * 1024 * 1024) { // 25MB limit
        console.error("Audio blob too large:", audioBlob.size, "bytes");
        return null;
      }
      
      console.log("🔊 Transcribing audio blob:", {
        size: audioBlob.size,
        type: audioBlob.type,
        apiUrl: this.apiUrl,
        endpoint: `${this.apiUrl}/transcribe`
      });

      const formData = new FormData();
      
      // Fix the MIME type - server rejects codec specifications like "audio/webm;codecs=pcm"
      // Extract base MIME type without codec information
      const baseMimeType = audioBlob.type.split(';')[0];
      const cleanedBlob = new Blob([audioBlob], { type: baseMimeType });
      
      // Determine filename based on MIME type
      let filename = 'recording.webm';
      if (baseMimeType.includes('wav')) {
        filename = 'recording.wav';
      } else if (baseMimeType.includes('mpeg') || baseMimeType.includes('mp3')) {
        filename = 'recording.mp3';
      } else if (baseMimeType.includes('flac')) {
        filename = 'recording.flac';
      }
      
      formData.append('audio', cleanedBlob, filename);
      
      console.log("🔊 FormData prepared:", {
        fieldName: 'audio',
        originalBlobType: audioBlob.type,
        cleanedBlobType: baseMimeType,
        blobSize: audioBlob.size,
        filename: filename
      });

      console.log("🔊 Making request to:", `${this.apiUrl}/transcribe`);
      
      const response = await fetch(`${this.apiUrl}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      console.log("🔊 Response received:", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        // Get detailed error information
        let errorMessage = `Transcription API error: ${response.status} ${response.statusText}`;
        let errorData = "";
        try {
          errorData = await response.text();
          console.error("🔊 Transcription API error details:", {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            errorData: errorData
          });
          if (errorData) {
            errorMessage += ` - ${errorData}`;
          }
        } catch (parseError) {
          console.warn("Could not parse error response:", parseError);
        }
        console.error("🔊 Full error message:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Transcription result:", data.transcription?.substring(0, 100) + "...");
      
      return data.transcription || null;
    } catch (err) {
      console.error('Audio transcription failed:', err);
      return null;
    }
  }

  // Audio processing for speech analysis
  async analyzeAudioSpeech(
    audioBlob: Blob,
    questionContext?: string
  ): Promise<{
    transcript: string;
    confidence: number;
    analysis?: any;
  } | null> {
    try {
      console.log("Analyzing audio speech, size:", audioBlob.size);

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      if (questionContext) {
        formData.append('context', questionContext);
      }

      const response = await fetch(`${this.apiUrl}/analyze_speech`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Speech analysis API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        transcript: data.transcript || '',
        confidence: data.confidence || 0,
        analysis: data.analysis
      };
    } catch (err) {
      console.error('Speech analysis failed:', err);
      return null;
    }
  }

  // Audio quality check
  async checkAudioQuality(audioBlob: Blob): Promise<{
    isValid: boolean;
    quality: 'high' | 'medium' | 'low';
    issues?: string[];
  } | null> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const response = await fetch(`${this.apiUrl}/check_audio_quality`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Audio quality check API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Audio quality check failed:', err);
      return null;
    }
  }
}

// Create a singleton instance
export const createAudioApiService = (apiUrl: string) => new AudioApiService(apiUrl);
