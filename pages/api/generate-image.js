export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { prompt, apiKey } = req.body || {};
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const key = typeof apiKey === "string" && apiKey.trim().length
    ? apiKey.trim()
    : process.env.GEMINI_API_KEY;

  if (!key) {
    return res
      .status(500)
      .json({ error: "No Gemini API key provided (body.apiKey or GEMINI_API_KEY env)." });
  }

  try {
    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

    const response = await fetch(endpoint + "?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Gemini image API error:", err);
      return res
        .status(500)
        .json({ error: err.error?.message || "Failed to call Gemini image API." });
    }

    const data = await response.json();

    let imageBase64 = null;
    try {
      const cands = data.candidates || [];
      if (cands.length > 0) {
        const parts = cands[0].content?.parts || [];
        for (const part of parts) {
          if (part.inline_data && part.inline_data.data) {
            imageBase64 = part.inline_data.data;
            break;
          }
          if (part.inlineData && part.inlineData.data) {
            imageBase64 = part.inlineData.data;
            break;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    if (!imageBase64) {
      return res
        .status(500)
        .json({ error: "Could not find image data in Gemini response." });
    }

    const slug =
      prompt
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .split(/\s+/)
        .slice(0, 8)
        .join("-") || "image";

    const fileName = slug + ".png";

    return res.status(200).json({ imageBase64, fileName });
  } catch (err) {
    console.error("Server error calling Gemini:", err);
    return res
      .status(500)
      .json({ error: "Server error calling Gemini image endpoint." });
  }
}