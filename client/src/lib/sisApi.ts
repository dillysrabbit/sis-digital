// REST API helper for SIS operations (used on Vercel instead of tRPC)

export async function sisApi(action: string, body?: Record<string, any>) {
  const isGet = !body || Object.keys(body).length === 0;
  const url = isGet ? `/api/sis?action=${action}` : `/api/sis`;
  const res = await fetch(url, {
    method: isGet ? "GET" : "POST",
    headers: isGet ? undefined : { "Content-Type": "application/json" },
    credentials: "include",
    body: isGet ? undefined : JSON.stringify({ action, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Fehler" }));
    throw new Error(err.error || "Fehler");
  }
  return res.json();
}
