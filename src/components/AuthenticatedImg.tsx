"use client";

import { MediaType } from "@prisma/client";
import { useEffect, useState } from "react";

import { VisitLocalImagePlaceholder } from "@/components/VisitLocalImagePlaceholder";
import { apiFetch, apiUrl } from "@/lib/apiUrl";

type AuthenticatedImgProps = {
  /** URL emmagatzemada (blob preview, link extern o path legacy). */
  src: string;
  alt: string;
  /** Per `image` servida pel backend: id de la fila `Media` (URL signada). */
  mediaId?: string;
  /** Per triar entre flux signat i URL directa (links externs). */
  mediaType?: MediaType;
  className?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
};

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

/**
 * Imatges d’upload: obté URL signada (JWT curt) i la usa a `<img src>` sense Bearer.
 * Links externs: `src` directe.
 */
export function AuthenticatedImg({
  src,
  alt,
  mediaId,
  mediaType,
  className,
  loading,
  decoding,
}: AuthenticatedImgProps): React.ReactElement {
  const isDirectSrc =
    src.startsWith("blob:") || src.startsWith("data:");

  const useSignedFlow =
    !isDirectSrc &&
    mediaId !== undefined &&
    mediaId.length > 0 &&
    mediaType !== MediaType.link;

  const useExternalLink =
    !isDirectSrc && mediaType === MediaType.link;

  const [signedSrc, setSignedSrc] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">(() => {
    if (isDirectSrc || useExternalLink || !useSignedFlow) {
      return "ready";
    }
    return "loading";
  });

  useEffect(() => {
    if (!useSignedFlow) {
      return;
    }

    let alive = true;
    void (async (): Promise<void> => {
      setPhase("loading");
      setSignedSrc(null);
      try {
        const res = await apiFetch(
          `/api/uploads/${encodeURIComponent(mediaId)}/signed-url`,
        );
        if (!alive) {
          return;
        }
        if (!res.ok) {
          setPhase("error");
          return;
        }
        const j: unknown = await res.json();
        const path = parseSignedUrlPayload(j);
        if (path === null) {
          setPhase("error");
          return;
        }
        setSignedSrc(apiUrl(path));
        setPhase("ready");
      } catch {
        if (alive) {
          setPhase("error");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [mediaId, useSignedFlow]);

  if (isDirectSrc) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
      />
    );
  }

  if (useExternalLink) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
      />
    );
  }

  if (!useSignedFlow) {
    return (
      <img
        src={apiUrl(src)}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
      />
    );
  }

  if (phase === "error") {
    return (
      <VisitLocalImagePlaceholder
        className={className ?? ""}
        compact
      />
    );
  }

  if (phase === "loading" || signedSrc === null) {
    return (
      <div
        className={`${className ?? ""} animate-pulse bg-zinc-200 dark:bg-zinc-700`}
        aria-busy="true"
      />
    );
  }

  return (
    <img
      src={signedSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
    />
  );
}
