
# AI Batch Image Studio (Gemini, professional UI)

Full Next.js app for batch image generation with Gemini image API.

- Big site title on top-left: AI Batch Image Studio
- Top-right: email login (required) and a boxed "Developed By Anil Chandra Barman"
- Generation Controls section with 10 Gemini API key inputs
  - View / Hide button for each key
  - Save button (keys stored in browser localStorage)
- Prompt Queue: one prompt per line
- Batch generation calls /api/generate-image which uses Gemini REST API
- Each result shows:
  - Prompt
  - Status
  - Suggested file name
  - Image preview + download button
- Footer (bottom-left): "Developed By Anil Chandra  Follow: Facebook" with a link.

## Local dev

npm install
npm run dev

Optionally set GEMINI_API_KEY in .env.local as a fallback.

## Deploy to Vercel

- Push this folder to GitHub
- Import in Vercel
- (Optional) set GEMINI_API_KEY env
- Deploy
