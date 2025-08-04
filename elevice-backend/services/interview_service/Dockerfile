FROM python:3.11-slim

WORKDIR /app

# Copy shared requirements first for better caching
COPY shared/requirements.txt ./shared/
RUN pip install --no-cache-dir -r ./shared/requirements.txt

# Copy service requirements and install
COPY services/interview_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared models
COPY shared ./shared

# Copy application code
COPY services/interview_service .

# Expose port
EXPOSE 8004

# Run the application
CMD ["uvicorn", "app_refactored:app", "--host", "0.0.0.0", "--port", "8004"]
