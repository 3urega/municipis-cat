"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

import { syncPendingVisits } from "@/lib/offline/syncPendingVisits";
import { deleteAllPendingForUser } from "@/lib/offline/visitsDb";

export function VisitSyncListener(): React.ReactElement | null {
  const { data: session, status } = useSession();
  const prevUserIdRef = useRef<string | undefined>(undefined);

  const userId =
    typeof session?.user?.id === "string" && session.user.id.length > 0
      ? session.user.id
      : undefined;

  useEffect(() => {
    if (status !== "authenticated" || userId === undefined) {
      return;
    }

    const flush = (): void => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void syncPendingVisits(userId);
      }
    };

    flush();
    window.addEventListener("online", flush);
    return () => {
      window.removeEventListener("online", flush);
    };
  }, [status, userId]);

  useEffect(() => {
    if (status !== "authenticated" || userId === undefined) {
      return;
    }
    if (
      prevUserIdRef.current !== undefined &&
      prevUserIdRef.current !== userId
    ) {
      void deleteAllPendingForUser(prevUserIdRef.current);
    }
    prevUserIdRef.current = userId;
  }, [status, userId]);

  return null;
}
