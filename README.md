
# AI Batch Image Studio (Gemini REST version)

This is a Next.js app for batch image generation using the Gemini image model via the REST API.

## Features

- Email login at the top-right (required before using the app).
- Big site title on the top-left: AI Batch Image Studio.
- "Developed By Anil Chandra Barman" box at the top-right.
- Generation Controls: 10 input boxes for Gemini API keys, each with a View/Hide button.
- Keys are stored in browser localStorage only.
- Prompt queue: one prompt per line.
- Batch generation calls a Next.js API route which uses `fetch` to the official Gemini image endpoint.

## Local setup

```bash
npm install
npm run dev
```

Optionally set a fallback key in `.env.local`:

```bash
GEMINI_API_KEY=your_default_gemini_key
```

Then open `http://localhost:3000`.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Import it in Vercel as a new project.
3. (Optional) add `GEMINI_API_KEY` environment variable in Vercel.
4. Deploy.

The UI will let you paste 10 API keys and rotate between them for each image generation.
