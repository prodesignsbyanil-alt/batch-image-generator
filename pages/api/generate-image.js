\
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Only POST is allowed" });
  }

  const { prompt, apiKey } = req.body || {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const keyFromBody = typeof apiKey === "string" ? apiKey.trim() : "";
  const fallbackKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const effectiveKey = keyFromBody || fallbackKey;

  if (!effectiveKey) {
    return res
      .status(500)
      .json({ error: "No Gemini API key provided (body.apiKey or env GEMINI_API_KEY)." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveKey });

    // Use Imagen model for text-to-image
    const response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt,
      config: {
        numberOfImages: 1,
        // আপনি চাইলে এখানে aspectRatio / imageSize কনফিগ করতে পারেন
        // aspectRatio: "1:1",
      },
    });

    if (
      !response ||
      !response.generatedImages ||
      !response.generatedImages.length ||
      !response.generatedImages[0].image ||
      !response.generatedImages[0].image.imageBytes
    ) {
      console.error("Unexpected Imagen response format:", response);
      return res
        .status(500)
        .json({ error: "No image data received from Gemini / Imagen API." });
    }

    const base64 = response.generatedImages[0].image.imageBytes;

    // Generate a simple filename suggestion based on the prompt
    const slug = (prompt || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 8)
      .join("-") || "image";
    const fileName = `${slug}.png`;

    return res.status(200).json({ imageBase64: base64, fileName });
  } catch (error) {
    console.error("Gemini / Imagen API route error:", error);
    const message =
      (error && error.message) ||
      "Server error generating image using Gemini / Imagen";
    return res.status(500).json({ error: message });
  }
}
