"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";

import { syncOfflineQueue } from "@/lib/offline/syncOfflineQueue";
import { deleteAllPendingForUser } from "@/lib/offline/visitsDb";
import { useMunicipalities } from "@/store/useMunicipalities";
import { useOfflineSync } from "@/store/useOfflineSync";

const STORAGE_QUOTA_SYNC_MESSAGE =
  "Límit d’emmagatzematge del servidor assolit. Les fotos pendents es conservaran; allibera espai o actualitza el pla.";

const MUNICIPALITY_LIMIT_SYNC_MESSAGE =
  "El servidor ha rebutjat una visita en cua: el pla gratuït té límit de municipis distints. La visita s’ha tret de la cua local; torna a crear-la després d’alliberar municipis o amb Premium.";

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
        void syncOfflineQueue(userId).then((result) => {
          useMunicipalities.getState().requestMunicipalitiesRefresh();
          if (result.storageQuotaExceeded) {
            useOfflineSync.setState({
              lastError: STORAGE_QUOTA_SYNC_MESSAGE,
            });
          } else if (result.municipalityLimitExceeded) {
            useOfflineSync.setState({
              lastError: MUNICIPALITY_LIMIT_SYNC_MESSAGE,
            });
          }
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
