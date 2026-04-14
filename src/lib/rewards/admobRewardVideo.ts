import { Capacitor } from "@capacitor/core";

import { apiFetch } from "@/lib/apiUrl";

/** ID de prova oficial Google (rewarded video). */
export const ADMOB_TEST_REWARD_UNIT_ID =
  "ca-app-pub-3940256099942544/5224354917" as const;

let admobInitPromise: Promise<void> | null = null;

function getRewardUnitId(): string {
  const fromEnv =
    typeof process !== "undefined" &&
    typeof process.env.NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID === "string"
      ? process.env.NEXT_PUBLIC_ADMOB_REWARD_UNIT_ID.trim()
      : "";
  return fromEnv.length > 0 ? fromEnv : ADMOB_TEST_REWARD_UNIT_ID;
}

async function ensureAdMobInitialized(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  if (admobInitPromise === null) {
    admobInitPromise = (async () => {
      const { AdMob } = await import("@capacitor-community/admob");
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
        | "server_error";
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

  await ensureAdMobInitialized();

  const { AdMob, RewardAdPluginEvents } = await import(
    "@capacitor-community/admob"
  );
  const adId = getRewardUnitId();

  let postResult: "pending" | "ok" | "fail" = "pending";
  let sawReward = false;
  let postInflight: Promise<void> | null = null;

  try {
    await AdMob.prepareRewardVideoAd({
      adId,
      isTesting: process.env.NODE_ENV !== "production",
    });
  } catch {
    return { ok: false, reason: "load_failed" };
  }

  const handles: { remove: () => Promise<void> }[] = [];

  const cleanup = async (): Promise<void> => {
    await Promise.all(handles.map((h) => h.remove()));
  };

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
          sawReward = true;
          postInflight = (async (): Promise<void> => {
            try {
              const res = await apiFetch("/api/rewards/admob", {
                method: "POST",
              });
              postResult = res.ok ? "ok" : "fail";
            } catch {
              postResult = "fail";
            }
          })();
        }),
      );

      handles.push(
        await AdMob.addListener(RewardAdPluginEvents.Dismissed, async () => {
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
        await AdMob.addListener(RewardAdPluginEvents.FailedToShow, async () => {
          await cleanup();
          finish({ ok: false, reason: "show_failed" });
        }),
      );

      try {
        await AdMob.showRewardVideoAd();
      } catch {
        await cleanup();
        finish({ ok: false, reason: "show_failed" });
      }
    })();
  });
}
