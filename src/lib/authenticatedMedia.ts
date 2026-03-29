import { apiFetch, apiUrl } from "@/lib/apiUrl";

function parseSignedUrlPayload(json: unknown): string | null {
  if (
    typeof json !== "object" ||
    json === null ||
    typeof (json as { url?: unknown }).url !== "string"
  ) {
    return null;
  }
  return (json as { url: string }).url;
}

export async function fetchAuthenticatedMediaBlob(
  mediaId: string,
): Promise<Blob | null> {
  const res = await apiFetch(
    `/api/uploads/${encodeURIComponent(mediaId)}/signed-url`,
  );
  if (!res.ok) {
    return null;
  }
  const j: unknown = await res.json();
  const path = parseSignedUrlPayload(j);
  if (path === null) {
    return null;
  }
  const imgRes = await fetch(apiUrl(path));
  if (!imgRes.ok) {
    return null;
  }
  return imgRes.blob();
}

export async function triggerAuthenticatedDownload(
  mediaId: string,
  filename: string,
): Promise<void> {
  const blob = await fetchAuthenticatedMediaBlob(mediaId);
  if (blob === null) {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
