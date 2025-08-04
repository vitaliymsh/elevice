import os
import io
import wave
import contextlib
import logging
from typing import Dict, Tuple, Any

from fastapi import FastAPI, HTTPException, UploadFile, File
from google.cloud import speech
from dotenv import load_dotenv
from pydub import AudioSegment

from shared.models import TranscriptionResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

load_dotenv()

# Constants
TARGET_SAMPLE_RATE = 44100
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_DURATION_SECONDS = 60
ALLOWED_TYPES = ["audio/wav", "audio/x-wav", "audio/webm", "audio/mpeg", "audio/flac"]

# Content type to format mapping
FORMAT_MAPPING = {
    "audio/wav": "wav",
    "audio/x-wav": "wav", 
    "audio/mpeg": "mp3",
    "audio/webm": "webm",
    "audio/flac": "flac"
}

# Initialize FastAPI app
app = FastAPI(
    title="Transcription Microservice",
)

# Google Cloud Speech-to-Text client initialization
def initialize_google_cloud_client() -> speech.SpeechClient:
    """Initialize Google Cloud Speech-to-Text client."""
    try:
        # Get credentials path from environment or use default
        credentials_path = os.getenv("GOOGLE_TRANSCRIPTION_CREDENTIALS_PATH", "credentials/transcription-service-key.json")
        
        # In Docker, the working directory is /app, so we use relative path
        key_file_path = os.path.join("/app", credentials_path)
        
        if not os.path.exists(key_file_path):
            raise FileNotFoundError(f"Key file not found at: {key_file_path}")
            
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = key_file_path
        logger.info(f"Using GOOGLE_APPLICATION_CREDENTIALS from: {key_file_path}")
        
        # Initialize client
        client = speech.SpeechClient()
        logger.info("Successfully initialized Google Cloud Speech-to-Text client.")
        return client
        
    except Exception as e:
        error_msg = f"Failed to initialize Google Speech client: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e

# Initialize the speech client
stt_client = initialize_google_cloud_client()

# Audio processing functions

def get_audio_properties(audio_bytes: bytes, content_type: str) -> Dict[str, Any]:
    """Extract audio properties based on content type."""
    if content_type in ["audio/wav", "audio/x-wav"]:
        return _extract_wav_properties(audio_bytes)
    elif content_type == "audio/mpeg":
        return _extract_mp3_properties(audio_bytes)
    else:
        return {}

def _extract_wav_properties(audio_bytes: bytes) -> Dict[str, Any]:
    """Extract WAV file properties using wave module."""
    try:
        with io.BytesIO(audio_bytes) as audio_file:
            with contextlib.closing(wave.open(audio_file, 'rb')) as wav_file:
                frame_rate = wav_file.getframerate()
                return {
                    "sample_rate": frame_rate,
                    "channels": wav_file.getnchannels(),
                    "sample_width": wav_file.getsampwidth(),
                    "duration_seconds": wav_file.getnframes() / frame_rate if frame_rate > 0 else 0
                }
    except (wave.Error, Exception) as e:
        logger.warning(f"Could not parse WAV properties: {str(e)}")
        return {}

def _extract_mp3_properties(audio_bytes: bytes) -> Dict[str, Any]:
    """Extract MP3 file properties using pydub."""
    try:
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format="mp3")
        return {
            "sample_rate": audio.frame_rate,
            "channels": audio.channels,
            "duration_seconds": len(audio) / 1000.0
        }
    except Exception as e:
        logger.warning(f"Could not parse MP3 properties: {str(e)}")
        return {}

# Validation functions
def validate_audio_file(audio: UploadFile) -> None:
    """Validate uploaded audio file."""
    if not audio:
        raise HTTPException(status_code=400, detail="No audio file provided.")
    
    if audio.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {audio.content_type}. "
                   f"Supported types: {ALLOWED_TYPES}"
        )

def validate_file_size(audio_bytes: bytes) -> None:
    """Validate audio file size."""
    file_size = len(audio_bytes)
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Empty audio file received.")
    
    if file_size > MAX_FILE_SIZE:
        max_size_mb = MAX_FILE_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Audio file too large (max {max_size_mb}MB)."
        )

def validate_duration(properties: Dict[str, Any]) -> None:
    """Validate audio duration for API limits."""
    duration = properties.get("duration_seconds", 0)
    if duration > MAX_DURATION_SECONDS:
        logger.warning(
            f"Audio duration ({duration}s) exceeds {MAX_DURATION_SECONDS} seconds. "
            "Consider using long_running_recognize."
        )

# Audio conversion functions
def convert_audio_to_standard(audio_bytes: bytes, content_type: str) -> Tuple[bytes, bool]:
    """
    Convert audio to 44100 Hz mono WAV format.
    Returns (converted_bytes, conversion_successful).
    """
    try:
        format_type = FORMAT_MAPPING.get(content_type, "wav")
        logger.info(f"Attempting to load audio as format: {format_type}")
        
        # Load audio with pydub
        audio = _load_audio_segment(audio_bytes, content_type, format_type)
        
        logger.info(f"Successfully loaded audio: {audio.frame_rate}Hz, {audio.channels} channels, {len(audio)}ms duration")
        
        # Apply conversions
        audio = _apply_audio_conversions(audio)
        
        # Export as standardized WAV
        converted_bytes = _export_as_wav(audio)
        logger.info(f"Successfully converted audio to WAV format, size: {len(converted_bytes)} bytes")
        return converted_bytes, True
        
    except Exception as e:
        logger.error(f"Error converting audio: {str(e)}")
        logger.warning("Falling back to original audio bytes without conversion")
        return audio_bytes, False

def _load_audio_segment(audio_bytes: bytes, content_type: str, format_type: str) -> AudioSegment:
    """Load audio segment with special handling for WebM."""
    if content_type == "audio/webm":
        try:
            return AudioSegment.from_file(io.BytesIO(audio_bytes), format="webm")
        except Exception as webm_error:
            logger.warning(f"Failed to load as WebM, trying auto-detection: {webm_error}")
            return AudioSegment.from_file(io.BytesIO(audio_bytes))
    else:
        return AudioSegment.from_file(io.BytesIO(audio_bytes), format=format_type)

def _apply_audio_conversions(audio: AudioSegment) -> AudioSegment:
    """Apply sample rate and channel conversions."""
    # Convert to 44100 Hz sample rate if needed
    if audio.frame_rate != TARGET_SAMPLE_RATE:
        logger.info(f"Converting audio from {audio.frame_rate} Hz to {TARGET_SAMPLE_RATE} Hz")
        audio = audio.set_frame_rate(TARGET_SAMPLE_RATE)
    
    # Convert to mono if stereo
    if audio.channels > 1:
        logger.info(f"Converting audio from {audio.channels} channels to mono")
        audio = audio.set_channels(1)
    
    return audio

def _export_as_wav(audio: AudioSegment) -> bytes:
    """Export audio as WAV with standard parameters."""
    output_buffer = io.BytesIO()
    audio.export(output_buffer, format="wav", parameters=["-ac", "1", "-ar", str(TARGET_SAMPLE_RATE)])
    return output_buffer.getvalue()

def get_speech_config(
    content_type: str, 
    conversion_successful: bool, 
    properties: Dict[str, Any]
) -> speech.RecognitionConfig:
    """Get the appropriate Google Cloud Speech configuration."""
    if conversion_successful:
        encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16
        sample_rate = TARGET_SAMPLE_RATE
        logger.info(f"Using converted audio with LINEAR16 encoding at {TARGET_SAMPLE_RATE} Hz")
    else:
        encoding, sample_rate = _get_fallback_encoding_config(content_type, properties)
        logger.info(f"Using original audio format with encoding={encoding.name}, sample_rate={sample_rate}")

    return speech.RecognitionConfig(
        encoding=encoding,
        sample_rate_hertz=sample_rate,
        language_code="en-US",
        enable_automatic_punctuation=True,
    )

def _get_fallback_encoding_config(
    content_type: str, 
    properties: Dict[str, Any]
) -> Tuple[speech.RecognitionConfig.AudioEncoding, int]:
    """Get fallback encoding configuration when conversion fails."""
    encoding_map = {
        "audio/webm": (speech.RecognitionConfig.AudioEncoding.WEBM_OPUS, 48000),
        "audio/wav": (speech.RecognitionConfig.AudioEncoding.LINEAR16, TARGET_SAMPLE_RATE),
        "audio/x-wav": (speech.RecognitionConfig.AudioEncoding.LINEAR16, TARGET_SAMPLE_RATE),
        "audio/mpeg": (speech.RecognitionConfig.AudioEncoding.MP3, TARGET_SAMPLE_RATE),
        "audio/flac": (speech.RecognitionConfig.AudioEncoding.FLAC, TARGET_SAMPLE_RATE),
    }
    
    encoding, default_rate = encoding_map.get(
        content_type, 
        (speech.RecognitionConfig.AudioEncoding.LINEAR16, TARGET_SAMPLE_RATE)
    )
    sample_rate = properties.get("sample_rate", default_rate)
    return encoding, sample_rate

def extract_transcription_text(response) -> str:
    """Extract transcription text from Google Cloud Speech response."""
    if response.results and response.results[0].alternatives:
        transcription_text = response.results[0].alternatives[0].transcript
        logger.info(f"Transcription: {transcription_text}")
        return transcription_text
    else:
        logger.warning("No transcription results returned by Google Cloud API.")
        return "No transcription could be generated."

# API Endpoints

@app.get("/")
async def read_root():
    """Health check endpoint."""
    return {
        "message": "Transcription Microservice", 
        "status": "healthy",
        "target_sample_rate": TARGET_SAMPLE_RATE,
        "supported_formats": ALLOWED_TYPES
    }

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio files using Google Cloud Speech-to-Text API.
    
    All audio is automatically converted to 44100 Hz mono WAV format for optimal transcription.
    Supports multiple input formats: WAV, MP3, WebM, FLAC.
    """
    # Validate input
    validate_audio_file(audio)
    
    try:
        # Read and validate file
        audio_bytes = await audio.read()
        validate_file_size(audio_bytes)
        
        logger.info(
            f"Processing audio file: {audio.filename}, "
            f"size: {len(audio_bytes)} bytes, type: {audio.content_type}"
        )

        # Convert audio to standard format
        converted_audio_bytes, conversion_successful = convert_audio_to_standard(
            audio_bytes, audio.content_type
        )
        
        # Extract and validate audio properties
        properties = get_audio_properties(audio_bytes, audio.content_type)
        logger.info(f"Original audio properties: {properties}")
        validate_duration(properties)
        
        # Configure transcription
        audio_data = speech.RecognitionAudio(content=converted_audio_bytes)
        config = get_speech_config(audio.content_type, conversion_successful, properties)

        # Perform transcription
        logger.info(
            f"Transcribing with config: encoding={config.encoding.name}, "
            f"sample_rate={config.sample_rate_hertz}"
        )
        response = stt_client.recognize(config=config, audio=audio_data)
        
        # Extract and return transcription
        transcription_text = extract_transcription_text(response)
        # Use duration_seconds from properties if available
        duration_seconds = properties.get("duration_seconds", 0.0)
        return TranscriptionResponse(transcription=transcription_text, duration_seconds=duration_seconds)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to transcribe audio: {str(e)}"
        )
