import os
from io import BytesIO
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from shared.models import TTSRequest, TTSResponse
from google.cloud import texttospeech
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

try:
    # Get credentials path from environment or use default
    credentials_path = os.getenv("GOOGLE_TTS_CREDENTIALS_PATH", "credentials/tts-service-key.json")
    
    # In Docker, the working directory is /app, so we use relative path
    key_file_path = os.path.join("/app", credentials_path)
    
    if not os.path.exists(key_file_path):
        raise FileNotFoundError(f"Key file not found at: {key_file_path}")
        
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = key_file_path
    print(f"Using GOOGLE_APPLICATION_CREDENTIALS from: {key_file_path}")
except Exception as e:
    raise RuntimeError(f"Failed to set GOOGLE_APPLICATION_CREDENTIALS environment variable: {e}")

try:
    tts_client = texttospeech.TextToSpeechClient()
except Exception as e:
    raise RuntimeError(f"Failed to initialize Google TTS client. Check your GOOGLE_APPLICATION_CREDENTIALS environment variable: {e}")

@app.get("/")
def read_root():
    return {"status": "Google TTS Service is running!"}

@app.post("/synthesize", response_class=StreamingResponse)
async def synthesize_text(request: TTSRequest):
    try:
        synthesis_input = texttospeech.SynthesisInput(text=request.text)

        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        response = tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )

        audio_stream = BytesIO(response.audio_content)

        return StreamingResponse(
            content=audio_stream,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )

    except Exception as e:
        print(f"An error occurred during TTS synthesis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An internal error occurred while generating the audio. {e}"
        )
