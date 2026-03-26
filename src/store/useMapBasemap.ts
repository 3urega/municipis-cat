import { create } from "zustand";

type MapBasemapState = {
  showOsmTiles: boolean;
  showComarcaOutlines: boolean;
  setShowOsmTiles: (value: boolean) => void;
  setShowComarcaOutlines: (value: boolean) => void;
  toggleOsmTiles: () => void;
  toggleComarcaOutlines: () => void;
};

export const useMapBasemap = create<MapBasemapState>((set) => ({
  showOsmTiles: true,
  showComarcaOutlines: false,

  setShowOsmTiles: (value): void => {
    set({ showOsmTiles: value });
  },

  setShowComarcaOutlines: (value): void => {
    set({ showComarcaOutlines: value });
  },

  toggleOsmTiles: (): void => {
    set((s) => ({ showOsmTiles: !s.showOsmTiles }));
  },

  toggleComarcaOutlines: (): void => {
    set((s) => ({ showComarcaOutlines: !s.showComarcaOutlines }));
  },
}));
