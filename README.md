# AI Resume Analyzer

A modern web app to upload, analyze, and review resumes with ATS-style feedback, category scores, and detailed improvement tips.

## Features

- Resume upload and processing flow
- ATS score summary with actionable suggestions
- Detailed category breakdown:
  - Tone & Style
  - Content
  - Structure
  - Skills
- Resume history/detail view by ID
- App data wipe utility route

## Tech Stack

- React + TypeScript
- React Router (file-based route config)
- Vite
- Tailwind CSS utilities (`clsx`, `tailwind-merge`)

## Project Structure

- Routing config: [app/routes.ts](app/routes.ts)
- Wipe route: [app/routes/wipe.tsx](app/routes/wipe.tsx)
- ATS component: [app/Components/ATS.tsx](app/Components/ATS.tsx)
- Details component: [app/Components/Details.tsx](app/Components/Details.tsx)
- Summary component: [app/Components/Summary.tsx](app/Components/Summary.tsx)
- Resume card component: [app/Components/ResumeCard.tsx](app/Components/ResumeCard.tsx)

## Routes

Defined in [app/routes.ts](app/routes.ts):

- `/` – Home
- `/auth` – Authentication
- `/upload` – Resume upload
- `/resume/:id` – Resume detail/analysis
- `/wipe` – Clear app data

## Getting Started

### Prerequisites

- Node.js 18+
- npm (or compatible package manager)

### Installation

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Environment & Configuration

Review and update project-level configuration files as needed:

- [package.json](package.json)
- [tsconfig.json](tsconfig.json)
- [vite.config.ts](vite.config.ts)
- [react-router.config.ts](react-router.config.ts)
- [Dockerfile](Dockerfile)

## Docker

Build and run with Docker:

```bash
docker build -t ai-resume-analyzer .
docker run -p 3000:3000 ai-resume-analyzer
```



