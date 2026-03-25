import { create } from "zustand";

export type MunicipalitySelection = {
  id: string;
  name: string;
};

type MunicipalitiesState = {
  selected: MunicipalitySelection | null;
  municipalitiesNonce: number;
  setSelectedMunicipality: (selection: MunicipalitySelection | null) => void;
  clearSelection: () => void;
  requestMunicipalitiesRefresh: () => void;
};

export const useMunicipalities = create<MunicipalitiesState>((set) => ({
  selected: null,
  municipalitiesNonce: 0,

  setSelectedMunicipality: (selection): void => {
    set({ selected: selection });
  },

  clearSelection: (): void => {
    set({ selected: null });
  },

  requestMunicipalitiesRefresh: (): void => {
    set((s) => ({ municipalitiesNonce: s.municipalitiesNonce + 1 }));
  },
}));
