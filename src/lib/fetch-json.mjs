export async function fetchJsonWithTimeout(url, { timeoutMs = 15000, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error("Daten konnten gerade nicht geladen werden.");
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Das Laden dauert zu lange. Bitte später erneut versuchen.", { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
