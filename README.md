# Elevice

A full-stack AI-powered interview platform combining frontend and backend services in a monorepo structure.

## Structure

```
elevice/
├── elevice-frontend/     # Next.js web application
│   ├── app/             # Next.js app router pages
│   ├── components/      # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   └── services/       # API and database services
├── elevice-backend/     # Python microservices
│   ├── services/       # Individual microservices
│   │   ├── api_gateway/        # Main API gateway
│   │   ├── interview_service/  # Interview logic and AI agents
│   │   ├── transcription_service/ # Speech-to-text
│   │   ├── tts_service/        # Text-to-speech
│   │   └── evaluation_service/ # Interview evaluation
│   └── shared/         # Shared models and utilities
└── .gitignore          # Combined ignore rules for both projects
```

## Frontend
- **Framework**: Next.js with TypeScript
- **UI**: Custom components with Tailwind CSS
- **Features**: Interview setup, real-time sessions, history tracking

## Backend
- **Architecture**: Microservices with Docker
- **Services**: API Gateway, Interview AI, Transcription, TTS, Evaluation
- **Stack**: Python, Flask, LangChain, Supabase

## Getting Started

### Frontend Development
```bash
cd elevice-frontend
npm install
npm run dev
```

### Backend Development
```bash
cd elevice-backend
docker-compose up
```

## Environment Setup
Both projects require environment variables - see individual README files in each directory for specific requirements.