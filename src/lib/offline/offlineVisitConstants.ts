export const VISITS_OFFLINE_SYNCED_EVENT = "visits-offline-synced";

export type VisitsOfflineSyncedDetail = {
  replacements: Array<{ localId: string; remoteId: string }>;
};
