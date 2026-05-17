import { NextRequest, NextResponse } from "next/server";

const WAFER_BASE = "https://pass.wafer.ai/v1";
const DEFAULT_MODEL = "Qwen3.5-397B-A17B";

export async function POST(req: NextRequest) {
  const { prompt, images = [], model = DEFAULT_MODEL, max_tokens = 8000 } = await req.json();

  const apiKey = process.env.WAFER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "WAFER_API_KEY not set" }, { status: 500 });
  }

  // Build message content — images first, then text (OpenAI vision format)
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const content: ContentPart[] = [
    ...images.map((b64: string) => ({
      type: "image_url" as const,
      image_url: { url: `data:image/jpeg;base64,${b64}` },
    })),
    { type: "text" as const, text: prompt },
  ];

  const res = await fetch(`${WAFER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      max_tokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Wafer API error:", err);
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";

  // Strip markdown code fences and parse JSON
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return NextResponse.json(JSON.parse(cleaned));
  } catch {
    // Return raw text if the model didn't return valid JSON
    return NextResponse.json({ raw: text });
  }
}