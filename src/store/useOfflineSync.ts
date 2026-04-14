import { create } from "zustand";

import { syncOfflineQueue } from "@/lib/offline/syncOfflineQueue";
import { useMunicipalities } from "@/store/useMunicipalities";

export type OfflineSyncPhase = "idle" | "syncing" | "error";

export type MapTileHint = "online" | "offline_no_network";

type OfflineSyncState = {
  phase: OfflineSyncPhase;
  lastSyncAt: string | null;
  lastError: string | null;
  mapTileHint: MapTileHint;
  setMapTileHint: (hint: MapTileHint) => void;
  triggerSync: (userId: string) => Promise<number>;
};

export const useOfflineSync = create<OfflineSyncState>((set) => ({
  phase: "idle",
  lastSyncAt: null,
  lastError: null,
  mapTileHint: "online",

  setMapTileHint: (hint): void => {
    set({ mapTileHint: hint });
  },

  triggerSync: async (userId: string): Promise<number> => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ phase: "idle", lastError: "Sense connexió." });
      return 0;
    }
    set({ phase: "syncing", lastError: null });
    try {
      const {
        applied,
        storageQuotaExceeded,
        municipalityLimitExceeded,
        imageLimitExceeded,
      } = await syncOfflineQueue(userId);
      useMunicipalities.getState().requestMunicipalitiesRefresh();
      const limitMsg =
        "El pla gratuït té límit de municipis distints. S’ha tret la visita denegada de la cua local; allibera municipis o actualitza el pla.";
      const imageLimitMsg =
        "Límit de fotos al servidor assolit. Les fotos pendents es conservaran; esborra imatges d’altres visites o actualitza el pla.";
      set({
        phase: "idle",
        lastSyncAt: new Date().toISOString(),
        lastError: storageQuotaExceeded
          ? "Límit d’emmagatzematge del servidor assolit. Les fotos pendents es conservaran; allibera espai o actualitza el pla."
          : imageLimitExceeded
            ? imageLimitMsg
            : municipalityLimitExceeded
              ? limitMsg
              : null,
      });
      return applied;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de sincronització";
      set({ phase: "error", lastError: msg });
      return 0;
    }
  },
}));
