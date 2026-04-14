"use client";

import { MediaType } from "@prisma/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";

import { AuthenticatedImg } from "@/components/AuthenticatedImg";
import { VisitLocalImagePlaceholder } from "@/components/VisitLocalImagePlaceholder";
import type { VisitWithOfflineMeta } from "@/lib/offline/mergePendingVisits";
import { listFreeLocalImagesForVisitSorted } from "@/lib/offline/visitsDb";

type VisitThumbnailOrLocalProps = {
  visit: VisitWithOfflineMeta;
  className: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
};

export function VisitThumbnailOrLocal({
  visit,
  className,
  loading,
  decoding,
}: VisitThumbnailOrLocalProps): React.ReactElement {
  const { data: session } = useAuth();
  const userId = session?.user?.id;
  const plan = session?.user?.plan ?? "FREE";
  const firstServer = visit.media.find((m) => m.type === MediaType.image);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [localResolved, setLocalResolved] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    urlRef.current = null;
    setLocalUrl(null);
    setLocalResolved(false);
    if (firstServer !== undefined) {
      setLocalResolved(true);
      return;
    }
    if (plan !== "FREE" || typeof userId !== "string") {
      setLocalResolved(true);
      return;
    }
    let cancelled = false;
    void listFreeLocalImagesForVisitSorted(userId, visit.id).then((rows) => {
      if (cancelled) {
        return;
      }
      if (rows.length === 0) {
        setLocalResolved(true);
        return;
      }
      const blob = new Blob([rows[0].blob], { type: rows[0].mimeType });
      const u = URL.createObjectURL(blob);
      if (urlRef.current !== null) {
        URL.revokeObjectURL(urlRef.current);
      }
      urlRef.current = u;
      setLocalUrl(u);
      setLocalResolved(true);
    });
    return () => {
      cancelled = true;
      if (urlRef.current !== null) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [visit.id, userId, plan, firstServer]);

  if (firstServer !== undefined) {
    return (
      <AuthenticatedImg
        src={firstServer.url}
        mediaId={firstServer.id}
        mediaType={firstServer.type}
        alt=""
        className={className}
        loading={loading}
        decoding={decoding}
      />
    );
  }

  if (localUrl !== null) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={localUrl}
        alt=""
        className={className}
        loading={loading}
        decoding={decoding}
      />
    );
  }

  if (
    plan === "FREE" &&
    typeof userId === "string" &&
    localResolved &&
    firstServer === undefined
  ) {
    return <VisitLocalImagePlaceholder className={className} compact />;
  }

  if (!localResolved && firstServer === undefined) {
    return (
      <div
        className={`animate-pulse bg-zinc-200 dark:bg-zinc-700 ${className}`}
        aria-busy="true"
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 ${className}`}
    >
      Sense foto
    </div>
  );
}
