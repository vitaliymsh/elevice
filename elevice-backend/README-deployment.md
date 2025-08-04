# Elevice Backend Deployment Guide

This guide explains how to run the Elevice backend in different environments.

## Local Development

For local development, nginx is disabled and the API gateway is directly accessible:

```bash
# Standard local development (with override file)
docker-compose up

# The API gateway will be available at: http://localhost:8000
```

The `docker-compose.override.yml` file is automatically loaded and:
- Exposes the API gateway on port 8000
- Disables nginx
- Sets environment to "development"

## Production Deployment

For production deployment, nginx handles SSL termination and reverse proxy:

```bash
# Production deployment with nginx
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# nginx will be available on:
# - HTTP: http://your-domain (redirects to HTTPS)
# - HTTPS: https://your-domain
```

### Production Setup Steps

1. **Update SSL certificates in nginx.conf**:
   ```nginx
   ssl_certificate /etc/letsencrypt/live/your-domain/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;
   ```

2. **Ensure Let's Encrypt certificates exist**:
   ```bash
   # Install certbot and obtain certificates
   certbot certonly --webroot -w /var/www/certbot -d your-domain
   ```

3. **Update server_name in nginx.conf**:
   ```nginx
   server_name your-domain.com;
   ```

## File Structure

- `docker-compose.yml` - Base configuration (no ports exposed, no nginx)
- `docker-compose.override.yml` - Local development overrides (auto-loaded)
- `docker-compose.prod.yml` - Production configuration with nginx
- `nginx.conf` - Nginx reverse proxy configuration

## Environment Variables

All environment variables are centralized in `.env`:
- `ENVIRONMENT=development` (local) or `production`
- All service configurations
- API keys and credentials

## Security

- **Local**: Direct access to API gateway
- **Production**: 
  - SSL/TLS termination at nginx
  - Security headers
  - Request size limits
  - CORS handling