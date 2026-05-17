/**
 * Shared client helper — calls the /api/generate route which proxies to Wafer Pass.
 * Returns parsed JSON from the model.
 *
 * @param prompt    The full prompt string (include "Return JSON only." at the end)
 * @param images    Optional array of base64 image strings (no data: prefix)
 * @param model     Override model — defaults to Qwen3.5-397B-A17B on the server
 * @param maxTokens Override completion budget — defaults to 8000 on the server.
 *                  Wafer models (Qwen3.5, GLM-5.1) are reasoning models that
 *                  burn ~1500-2000 tokens on chain-of-thought before producing
 *                  any final content, so 2000 is not enough for any structured
 *                  output prompt — leave this at the default unless you know
 *                  you're sending a very small prompt with a tight output.
 */
export async function callWafer<T = unknown>(
  prompt: string,
  images: string[] = [],
  model?: string,
  maxTokens?: number
): Promise<T> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, images, model, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Wafer error ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json() as Promise<T>;
}