const MAX_IMAGES = 3;
const MAX_TEXT_CHARS = 2500;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
  }

  try {
    const { text = "", images = [] } = req.body || {};
    const cleanText = String(text).slice(0, MAX_TEXT_CHARS);
    const cleanImages = Array.isArray(images)
      ? images
          .filter((image) => image && ALLOWED_IMAGE_TYPES.has(image.media_type) && image.data)
          .slice(0, MAX_IMAGES)
      : [];

    if (!cleanText.trim() && cleanImages.length === 0) {
      return res.status(400).json({ error: "Send vent text or at least one screenshot." });
    }

    const content = [
      {
        type: "input_text",
        text: `You are Dr. Whiskers, a witty but deeply kind forensic cat who analyzes failed talking stages and situationships.

Analyze the user's vent text and any chat screenshots. For screenshots, inspect who initiates, reply effort/length, dry responses, double texts, breadcrumbing, mixed signals, time gaps, and who asks questions.

Return only JSON matching the schema. Never blame the user. Keep it funny, warm, and emotionally validating.

Vent text:
"""${cleanText}"""`,
      },
      ...cleanImages.map((image) => ({
        type: "input_image",
        image_url: `data:${image.media_type};base64,${image.data}`,
        detail: "high",
      })),
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "talking_stage_analysis",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                delta: {
                  type: "integer",
                  minimum: -10,
                  maximum: 10,
                  description: "Negative for red flags/unhealthy dynamics, positive for genuinely healthy mutual dynamics.",
                },
                note: {
                  type: "string",
                  description: "Two to three sentences as Dr. Whiskers, warm, specific, a little sassy, validating.",
                },
                findings: {
                  type: "array",
                  maxItems: 4,
                  items: {
                    type: "string",
                    maxLength: 140,
                    description: "Short forensic finding from screenshots or testimony.",
                  },
                },
              },
              required: ["delta", "note", "findings"],
            },
          },
        },
        max_output_tokens: 700,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: "OpenAI analysis failed",
        detail: data.error?.message || "Unknown API error",
      });
    }

    const outputText =
      data.output_text ||
      (data.output || [])
        .flatMap((item) => item.content || [])
        .filter((part) => part.type === "output_text")
        .map((part) => part.text)
        .join("");

    const parsed = JSON.parse(outputText);
    return res.status(200).json({
      delta: clamp(Number(parsed.delta) || 0, -10, 10),
      note: String(parsed.note || "").slice(0, 700),
      findings: Array.isArray(parsed.findings)
        ? parsed.findings.slice(0, 4).map((finding) => String(finding).slice(0, 140))
        : [],
    });
  } catch (error) {
    return res.status(500).json({
      error: "Analysis endpoint crashed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
