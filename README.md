# AI Resume Analyzer

AI Resume Analyzer is a web app for uploading resumes, analyzing them for ATS compatibility, and getting clear, actionable improvement tips.

Live demo: https://ai-resume-analyzer-chi-weld.vercel.app

## Features

- Resume upload and processing flow
- ATS score summary with actionable suggestions
- Detailed category breakdown (Tone, Content, Structure, Skills)
- Resume history and detail view by ID
- Built-in chatbot assistant for ATS guidance

## Tech Stack

- React 19 + TypeScript
- React Router 7 (SSR capable)
- Vite
- Tailwind utilities (`clsx`, `tailwind-merge`)
- Gemini API (via `VITE_API_KEY`)

## Requirements

- Node.js 18+
- npm

## Setup

1. Install dependencies:
  ```bash
  npm install
  ```
2. Create a local `.env` file:
  ```dotenv
  VITE_API_KEY=your_google_api_key
  ```
3. Start the dev server:
  ```bash
  npm run dev
  ```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Serve the production build
- `npm run typecheck` - Generate types and run TypeScript checks

## Project Structure

- Routes: [app/routes.ts](app/routes.ts)
- Home: [app/routes/home.tsx](app/routes/home.tsx)
- Upload: [app/routes/upload.tsx](app/routes/upload.tsx)
- Resume detail: [app/routes/resume.tsx](app/routes/resume.tsx)
- Chatbot: [app/Components/Chatbot](app/Components/Chatbot)
- Utilities: [lib](lib)

## Routes

- `/` - Home
- `/auth` - Authentication
- `/upload` - Resume upload
- `/resume/:id` - Resume detail and analysis
- `/wipe` - Clear app data

## Environment Variables

Create a `.env` file locally and set:

```dotenv
VITE_API_KEY=your_google_api_key
```

Do not commit `.env` to source control.

## Deployment Notes

- **Static deploy (Vercel)**: Set `ssr: false` in [react-router.config.ts](react-router.config.ts), build, and deploy `build/client`.
- **SSR deploy**: Keep `ssr: true` and host a Node server using `npm run start`.

## Docker (Optional)

Build and run with Docker:

```bash
docker build -t ai-resume-analyzer .
docker run -p 3000:3000 ai-resume-analyzer
```



