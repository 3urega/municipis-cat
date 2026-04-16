import { Capacitor } from "@capacitor/core";

import { ensureConsentForAds } from "@/lib/ads/consentPlugin";
import { apiFetch } from "@/lib/apiUrl";

/** ID de prova oficial Google (rewarded video). */
export const ADMOB_TEST_REWARD_UNIT_ID =
  "ca-app-pub-3940256099942544/5224354917" as const;

let admobInitPromise: Promise<void> | null = null;

/**
 * Només cert si `NEXT_PUBLIC_ADMOB_USE_PRODUCTION_ADS` val exactament `true` (string).
 * Sense això, sempre s’usen unitats de prova encara que `NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID` estigui definit.
 */
export function isAdMobProductionRewardUnitsEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_ADMOB_USE_PRODUCTION_ADS;
  return typeof v === "string" && v.trim().toLowerCase() === "true";
}

type RewardAdPrepareOptions =
  | { ok: true; adId: string; isTesting: boolean }
  | { ok: false; message: string };

function getRewardAdPrepareOptions(): RewardAdPrepareOptions {
  if (!isAdMobProductionRewardUnitsEnabled()) {
    return {
      ok: true,
      adId: ADMOB_TEST_REWARD_UNIT_ID,
      isTesting: true,
    };
  }

  const fromEnv =
    typeof process !== "undefined" &&
    typeof process.env.NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID === "string"
      ? process.env.NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID.trim()
      : "";

  if (fromEnv.length === 0) {
    return {
      ok: false,
      message:
        "Falta NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID quan NEXT_PUBLIC_ADMOB_USE_PRODUCTION_ADS=true.",
    };
  }

  return { ok: true, adId: fromEnv, isTesting: false };
}

async function ensureAdMobInitialized(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  if (admobInitPromise === null) {
    admobInitPromise = (async () => {
      await ensureConsentForAds();
      const { AdMob } = await import("@capacitor-community/admob");
      console.info("[AdMob] initialize");
      await AdMob.initialize();
    })();
  }
  await admobInitPromise;
}

export type RewardVideoClaimResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_native"
        | "cancelled"
        | "load_failed"
        | "show_failed"
        | "server_error"
        | "config_error";
      message?: string;
    };

/**
 * Mostra un vídeo recompensat i, si l’usuari el completa, registra la recompensa al servidor.
 */
export async function showRewardedVideoAndClaim(): Promise<RewardVideoClaimResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      ok: false,
      reason: "not_native",
      message: "Només disponible a l’app Android.",
    };
  }

  const prepareOpts = getRewardAdPrepareOptions();
  if (!prepareOpts.ok) {
    console.error("[AdMob]", prepareOpts.message);
    return {
      ok: false,
      reason: "config_error",
      message: prepareOpts.message,
    };
  }

  await ensureAdMobInitialized();

  const { AdMob, RewardAdPluginEvents } = await import(
    "@capacitor-community/admob"
  );

  const { adId, isTesting } = prepareOpts;
  console.info("[AdMob] prepare reward ad", {
    mode: isAdMobProductionRewardUnitsEnabled() ? "production" : "test",
    isTesting,
  });

  let postResult: "pending" | "ok" | "fail" = "pending";
  let sawReward = false;
  let postInflight: Promise<void> | null = null;

  const handles: { remove: () => Promise<void> }[] = [];

  const cleanup = async (): Promise<void> => {
    await Promise.all(handles.map((h) => h.remove()));
  };

  try {
    handles.push(
      await AdMob.addListener(RewardAdPluginEvents.Loaded, (info) => {
        console.info("[AdMob] rewarded ad loaded", info);
      }),
    );
    handles.push(
      await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
        console.error("[AdMob] rewarded ad failed to load", err);
      }),
    );

    await AdMob.prepareRewardVideoAd({
      adId,
      isTesting,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[AdMob] prepareRewardVideoAd rejected:", msg);
    await cleanup();
    return {
      ok: false,
      reason: "load_failed",
      message: msg,
    };
  }

  return await new Promise<RewardVideoClaimResult>((resolve) => {
    let settled = false;
    const finish = (r: RewardVideoClaimResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(r);
    };

    void (async () => {
      handles.push(
        await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          console.info("[AdMob] user earned reward (server claim starts)");
          sawReward = true;
          postInflight = (async (): Promise<void> => {
            try {
              const res = await apiFetch("/api/rewards/admob", {
                method: "POST",
              });
              postResult = res.ok ? "ok" : "fail";
              if (res.ok) {
                console.info("[AdMob] server reward recorded");
              } else {
                console.error("[AdMob] server reward failed", res.status);
              }
            } catch {
              postResult = "fail";
              console.error("[AdMob] server reward request threw");
            }
          })();
        }),
      );

      handles.push(
        await AdMob.addListener(RewardAdPluginEvents.Dismissed, async () => {
          console.info("[AdMob] rewarded ad dismissed");
          if (sawReward && postInflight !== null) {
            await postInflight;
          }
          await cleanup();
          if (!sawReward) {
            finish({ ok: false, reason: "cancelled" });
            return;
          }
          if (postResult === "ok") {
            finish({ ok: true });
            return;
          }
          finish({
            ok: false,
            reason: "server_error",
          });
        }),
      );

      handles.push(
        await AdMob.addListener(RewardAdPluginEvents.Showed, () => {
          console.info("[AdMob] rewarded ad showed full screen");
        }),
      );

      handles.push(
        await AdMob.addListener(RewardAdPluginEvents.FailedToShow, async () => {
          console.error("[AdMob] rewarded ad failed to show");
          await cleanup();
          finish({ ok: false, reason: "show_failed" });
        }),
      );

      try {
        console.info("[AdMob] showRewardVideoAd");
        await AdMob.showRewardVideoAd();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[AdMob] showRewardVideoAd threw:", msg);
        await cleanup();
        finish({
          ok: false,
          reason: "show_failed",
          message: msg,
        });
      }
    })();
  });
}
