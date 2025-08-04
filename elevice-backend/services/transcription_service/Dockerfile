FROM python:3.9-slim

WORKDIR /app

# Install ffmpeg for audio processing with pydub
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy shared requirements first for better caching
COPY shared/requirements.txt ./shared/
RUN pip install --no-cache-dir -r ./shared/requirements.txt

# Copy service requirements and install
COPY services/transcription_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared models
COPY shared ./shared

# Copy application code
COPY services/transcription_service .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
