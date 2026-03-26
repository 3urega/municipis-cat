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
      const n = await syncOfflineQueue(userId);
      useMunicipalities.getState().requestMunicipalitiesRefresh();
      set({
        phase: "idle",
        lastSyncAt: new Date().toISOString(),
        lastError: null,
      });
      return n;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de sincronització";
      set({ phase: "error", lastError: msg });
      return 0;
    }
  },
}));
