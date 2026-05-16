/**
 * Shared client helper — calls the /api/generate route which proxies to Wafer Pass.
 * Returns parsed JSON from the model.
 *
 * @param prompt  The full prompt string (include "Return JSON only." at the end)
 * @param images  Optional array of base64 image strings (no data: prefix)
 * @param model   Override model — defaults to Qwen3.5-397B-A17B on the server
 */
export async function callWafer<T = unknown>(
  prompt: string,
  images: string[] = [],
  model?: string
): Promise<T> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, images, model }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Wafer error ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json() as Promise<T>;
}
