"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";

import { syncOfflineQueue } from "@/lib/offline/syncOfflineQueue";
import { deleteAllPendingForUser } from "@/lib/offline/visitsDb";
import { useMunicipalities } from "@/store/useMunicipalities";
import { useOfflineSync } from "@/store/useOfflineSync";

export function VisitSyncListener(): React.ReactElement | null {
  const { data: session, status } = useAuth();
  const prevUserIdRef = useRef<string | undefined>(undefined);
  const setMapTileHint = useOfflineSync((s) => s.setMapTileHint);

  const userId =
    typeof session?.user?.id === "string" && session.user.id.length > 0
      ? session.user.id
      : undefined;

  useEffect(() => {
    const onOffline = (): void => {
      setMapTileHint("offline_no_network");
    };
    const onOnline = (): void => {
      setMapTileHint("online");
    };
    if (typeof navigator !== "undefined") {
      setMapTileHint(navigator.onLine ? "online" : "offline_no_network");
      window.addEventListener("offline", onOffline);
      window.addEventListener("online", onOnline);
    }
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [setMapTileHint]);

  useEffect(() => {
    if (status !== "authenticated" || userId === undefined) {
      return;
    }

    const flush = (): void => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void syncOfflineQueue(userId).then(() => {
          useMunicipalities.getState().requestMunicipalitiesRefresh();
        });
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
