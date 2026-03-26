export function isLikelyNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) {
    return true;
  }
  if (e instanceof Error && e.name === "AbortError") {
    return true;
  }
  if (
    typeof DOMException !== "undefined" &&
    e instanceof DOMException &&
    (e.name === "NetworkError" || e.name === "AbortError")
  ) {
    return true;
  }
  if (
    e instanceof Error &&
    /failed to fetch|load failed|networkerror/i.test(e.message)
  ) {
    return true;
  }
  return false;
}
