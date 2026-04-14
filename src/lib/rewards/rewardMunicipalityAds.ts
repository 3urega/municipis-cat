/** Base de municipis distints abans de cap recompensa per anuncis. */
export const REWARD_MUNICIPALITY_BASE = 5;

/** Municipis addicionals per cada bloc de 3 anuncis completats. */
export const REWARD_MUNICIPALITY_EXTRA_PER_BLOCK = 15;

/** Anuncis necessaris per desbloquejar un bloc extra. */
export const ADS_PER_UNLOCK_BLOCK = 3;

export function computeBlocksFromAdsWatched(adsWatched: number): number {
  return Math.floor(adsWatched / ADS_PER_UNLOCK_BLOCK);
}

export function computeTotalAllowedMunicipalities(
  rewardUnlockBlocks: number,
  municipalityCatalogCount: number,
): number {
  const raw =
    REWARD_MUNICIPALITY_BASE +
    rewardUnlockBlocks * REWARD_MUNICIPALITY_EXTRA_PER_BLOCK;
  return Math.min(municipalityCatalogCount, raw);
}

/**
 * Anuncis que falten per al proper desbloqueig de bloc (cicle 3).
 * Quan `adsWatched % 3 === 0`, retorna 3 (següent bloc).
 */
export function computeNextUnlockIn(adsWatched: number): number {
  return ADS_PER_UNLOCK_BLOCK - (adsWatched % ADS_PER_UNLOCK_BLOCK);
}
