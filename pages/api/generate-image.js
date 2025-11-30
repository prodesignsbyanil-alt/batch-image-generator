export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Only POST is allowed" });
  }

  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY is not set in environment variables" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "512x512",
        n: 1,
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("OpenAI image error:", err);
      return res
        .status(500)
        .json({ error: err.error?.message || "Failed to generate image" });
    }

    const data = await response.json();
    const base64 = data?.data?.[0]?.b64_json;

    if (!base64) {
      return res
        .status(500)
        .json({ error: "No image data received from OpenAI" });
    }

    return res.status(200).json({ imageBase64: base64 });
  } catch (error) {
    console.error("API route error:", error);
    return res.status(500).json({ error: "Server error generating image" });
  }
}
