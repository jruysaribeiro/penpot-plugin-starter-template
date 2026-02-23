# Penpot AI Plugin - SvelteKit Edition

Penpot plugin with AI features using SvelteKit for secure server-side API handling.

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment:**

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_key_here
```

3. **Start development server:**

```bash
npm run dev
```

Access plugin at: **http://localhost:5173/index.html**

## Architecture

**Frontend** (Plugin UI):

- `static/index.html` - Plugin interface
- `src/main.ts` - Client-side logic
- `src/plugin.ts` - Penpot API integration

**Backend** (API):

- `src/routes/api/gemini/+server.ts` - Server route
  - GET: List available AI models
  - POST: Handle background removal, translation
  - **API key stays server-side** ✅

## Features

- 🖼️ Image Editor (crop, filters, adjustments)
- 🎨 Background Removal (AI-powered)
- 🔄 Image Tracing (vector conversion)
- 📄 PDF Import
- 🌍 AI Translation with model selection

## Deployment

### Build

```bash
npm run build
```

### Deploy To:

**Vercel** (Recommended):

```bash
npm install -g vercel
vercel
```

Add `GEMINI_API_KEY` in Vercel dashboard.

**Railway**:

1. Connect GitHub repo
2. Add environment variable: `GEMINI_API_KEY`
3. Deploy automatically

**Render**:

1. New Web Service → Connect repo
2. Build: `npm run build`
3. Start: `node build`
4. Add `GEMINI_API_KEY` env var

## Why SvelteKit?

✅ API key never exposed to client  
✅ No CORS issues  
✅ Single codebase for frontend + backend  
✅ Works everywhere (Vercel, Railway, Render, Fly.io)  
✅ Simple deployment

## Environment Variables

- `GEMINI_API_KEY` - Your Google Gemini API key (server-side only)

Get your API key at: https://aistudio.google.com/app/apikey
