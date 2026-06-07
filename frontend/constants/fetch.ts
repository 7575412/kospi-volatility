export async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } catch (e: any) {
    if (e.name === "AbortError") throw new Error("요청 시간 초과");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
