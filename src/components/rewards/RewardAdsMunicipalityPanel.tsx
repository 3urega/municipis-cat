"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";

import type { AppAuthUser } from "@/lib/auth/appAuthTypes";
import { useAuth } from "@/hooks/useAuth";
import {
  REWARD_MUNICIPALITY_EXTRA_PER_BLOCK,
} from "@/lib/rewards/rewardMunicipalityAds";
import { showRewardedVideoAndClaim } from "@/lib/rewards/admobRewardVideo";

type RewardAdsMunicipalityPanelProps = {
  user: AppAuthUser;
  onRewardRecorded: () => Promise<void>;
  /** Classes for the root wrapper (e.g. spacing inside the visit-stats card). */
  className?: string;
};

export function RewardAdsMunicipalityPanel({
  user,
  onRewardRecorded,
  className = "",
}: RewardAdsMunicipalityPanelProps): React.ReactElement | null {
  const { patchUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (user.municipalitiesLimit === null) {
    return null;
  }

  const n = user.rewardNextUnlockIn;
  const progressLine =
    n === 1
      ? `Falta 1 anunci per desbloquejar ${String(REWARD_MUNICIPALITY_EXTRA_PER_BLOCK)} municipis més.`
      : `Falten ${String(n)} anuncis per desbloquejar ${String(REWARD_MUNICIPALITY_EXTRA_PER_BLOCK)} municipis més.`;

  const onWatchAd = (): void => {
    setNotice(null);
    void (async (): Promise<void> => {
      setBusy(true);
      try {
        const r = await showRewardedVideoAndClaim();
        if (r.ok) {
          if (
            typeof r.adsWatched === "number" &&
            typeof r.nextUnlockIn === "number" &&
            typeof r.totalAllowed === "number"
          ) {
            patchUser({
              rewardAdsWatched: r.adsWatched,
              rewardNextUnlockIn: r.nextUnlockIn,
              municipalitiesLimit: r.totalAllowed,
            });
          }
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
        } else if (
          r.reason === "load_failed" ||
          r.reason === "show_failed" ||
          r.reason === "config_error"
        ) {
          setNotice(
            "Anunci no disponible. Torna-ho a provar d’aquí una estona.",
          );
        } else if (r.reason === "server_error") {
          setNotice("No s’ha pogut registrar la recompensa al servidor.");
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
    <div className={className}>
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <p className="min-w-0 text-center text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
          {progressLine}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onWatchAd}
          className="inline-flex shrink-0 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          {busy ? "Carregant…" : "Veure anunci"}
        </button>
      </div>
      {notice !== null ? (
        <p className="mt-1.5 text-center text-[11px] text-red-700 dark:text-red-300">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
