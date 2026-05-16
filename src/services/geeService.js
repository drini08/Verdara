import { apiUrl } from "../config/api";

export async function analyzeField({ polygon, crop = "potato", signal } = {}) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    throw new Error("Polygon must have at least 3 points.");
  }

  const res = await fetch(apiUrl("/api/gee/analyze"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ polygon, crop }),
    signal
  });

  if (!res.ok) {
    let msg = "Failed to analyze field.";
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}
