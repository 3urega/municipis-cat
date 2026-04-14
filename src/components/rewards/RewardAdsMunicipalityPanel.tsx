"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";

import type { AppAuthUser } from "@/lib/auth/appAuthTypes";
import {
  ADS_PER_UNLOCK_BLOCK,
  REWARD_MUNICIPALITY_EXTRA_PER_BLOCK,
} from "@/lib/rewards/rewardMunicipalityAds";
import { showRewardedVideoAndClaim } from "@/lib/rewards/admobRewardVideo";

type RewardAdsMunicipalityPanelProps = {
  user: AppAuthUser;
  onRewardRecorded: () => Promise<void>;
};

export function RewardAdsMunicipalityPanel({
  user,
  onRewardRecorded,
}: RewardAdsMunicipalityPanelProps): React.ReactElement | null {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (user.municipalitiesLimit === null) {
    return null;
  }

  const onWatchAd = (): void => {
    setNotice(null);
    void (async (): Promise<void> => {
      setBusy(true);
      try {
        const r = await showRewardedVideoAndClaim();
        if (r.ok) {
          await onRewardRecorded();
          setNotice(null);
        } else if (r.reason === "not_native") {
          setNotice(
            Capacitor.isNativePlatform()
              ? "No s’ha pogut mostrar l’anunci."
              : "Els anuncis recompensats només estan disponibles a l’app Android.",
          );
        } else if (r.reason === "cancelled") {
          setNotice("Anunci tancat sense recompensa.");
        } else if (r.message !== undefined) {
          setNotice(r.message);
        } else {
          setNotice("No s’ha pogut completar la recompensa.");
        }
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="pointer-events-auto max-w-md rounded-lg border border-violet-200/90 bg-violet-50/95 px-3 py-2 text-left text-xs text-violet-950 shadow-md backdrop-blur dark:border-violet-800/80 dark:bg-violet-950/90 dark:text-violet-100">
      <p className="text-[11px] leading-snug">
        Desbloqueja {String(REWARD_MUNICIPALITY_EXTRA_PER_BLOCK)} municipis més
        veient {String(ADS_PER_UNLOCK_BLOCK)} anuncis.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onWatchAd}
        className="mt-2 w-full rounded-md border border-violet-400 bg-white px-2 py-1.5 text-xs font-semibold text-violet-900 shadow-sm hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-600 dark:bg-violet-900 dark:text-violet-50 dark:hover:bg-violet-800"
      >
        {busy ? "Carregant…" : "Veure anunci"}
      </button>
      {notice !== null ? (
        <p className="mt-2 text-[11px] text-red-700 dark:text-red-300">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
