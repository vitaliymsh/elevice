FROM python:3.9-slim

WORKDIR /app

# Copy shared requirements first for better caching
COPY shared/requirements.txt ./shared/
RUN pip install --no-cache-dir -r ./shared/requirements.txt

# Copy service requirements and install
COPY services/api_gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared models and auth middleware
COPY shared ./shared

# Copy application code
COPY services/api_gateway .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
