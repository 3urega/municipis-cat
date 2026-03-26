import { create } from "zustand";

type MapBasemapState = {
  showOsmTiles: boolean;
  setShowOsmTiles: (value: boolean) => void;
  toggleOsmTiles: () => void;
};

export const useMapBasemap = create<MapBasemapState>((set) => ({
  showOsmTiles: true,

  setShowOsmTiles: (value): void => {
    set({ showOsmTiles: value });
  },

  toggleOsmTiles: (): void => {
    set((s) => ({ showOsmTiles: !s.showOsmTiles }));
  },
}));
