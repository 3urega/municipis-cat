"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchPremiumProductForUi,
  isAndroidBillingAvailable,
  openPlaySubscriptionSettings,
  purchasePremiumYearly,
  restorePremiumManual,
  type PremiumProductForUi,
} from "@/lib/billing/googlePlayPremium";
import {
  formatBytesAsMiB,
  municipalitiesUsagePercent,
  pickPrimaryUsageAxis,
  storageUsagePercent,
  type UsageThresholdLevel,
} from "@/lib/usage/usageThresholds";
import {
  USER_PLAN_FREE_BYTES,
  USER_PLAN_FREE_MAX_DISTINCT_MUNICIPALITIES,
  USER_PLAN_PREMIUM_BYTES,
} from "@/lib/storage/userPlanLimits";

function bannerClassForLevel(level: UsageThresholdLevel): string {
  switch (level) {
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100";
    case "critical":
      return "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100";
    default:
      return "";
  }
}

function UsageBar(props: {
  label: string;
  valueLine: string;
  percent: number | null;
}): React.ReactElement {
  const pct = props.percent;
  const width =
    pct === null ? 0 : Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
  const barColor =
    pct === null
      ? "bg-zinc-300 dark:bg-zinc-600"
      : pct >= 100
        ? "bg-red-500"
        : pct >= 90
          ? "bg-amber-500"
          : pct >= 70
            ? "bg-sky-500"
            : "bg-emerald-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {props.label}
        </span>
      </div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {props.valueLine}
      </p>
      {pct !== null ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className={`h-full rounded-full transition-[width] ${barColor}`}
            style={{ width: `${String(width)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function PremiumPageClient(): React.ReactElement {
  const { data: session, refresh } = useAuth();
  const user = session?.user;
  const userId = user?.id ?? "";
  const plan = user?.plan;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [productLoadState, setProductLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [product, setProduct] = useState<PremiumProductForUi | null>(null);
  const [productError, setProductError] = useState<string | null>(null);

  const native = isAndroidBillingAvailable();

  useEffect(() => {
    void refresh("silent");
  }, [refresh]);

  const loadProduct = useCallback(async (): Promise<void> => {
    if (!native) {
      setProductLoadState("idle");
      return;
    }
    setProductLoadState("loading");
    setProductError(null);
    const { product: p, error: err } = await fetchPremiumProductForUi();
    if (err !== null) {
      setProduct(null);
      setProductError(err);
      setProductLoadState("error");
      return;
    }
    setProduct(p);
    setProductLoadState(p === null ? "error" : "ready");
    if (p === null) {
      setProductError("Producte no disponible.");
    }
  }, [native]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const onPurchase = useCallback(async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await purchasePremiumYearly(userId);
      setMessage("Subscripció activada. Gràcies!");
      await refresh("silent");
      await loadProduct();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No s’ha pogut completar la compra.",
      );
    } finally {
      setBusy(false);
    }
  }, [userId, refresh, loadProduct]);

  const onRestore = useCallback(async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const ok = await restorePremiumManual();
      if (ok) {
        setMessage("S’ha restaurat la subscripció.");
        await refresh("silent");
      } else {
        setMessage("No s’ha trobat cap subscripció activa per a aquest compte.");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error en restaurar la compra.",
      );
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const isPremium = plan === "PREMIUM";
  const canPurchase =
    native &&
    !isPremium &&
    userId.length > 0 &&
    productLoadState === "ready" &&
    product !== null &&
    !busy;

  const usageBanner = useMemo(
    () => (user !== undefined ? pickPrimaryUsageAxis(user) : null),
    [user],
  );

  const sp = user !== undefined ? storageUsagePercent(user) : null;
  const mp = user !== undefined ? municipalitiesUsagePercent(user) : null;

  const storageLine =
    user !== undefined
      ? user.isStorageUnlimited
        ? "Sense límit d’emmagatzematge (superadmin)"
        : `${formatBytesAsMiB(BigInt(user.storageUsed))} / ${formatBytesAsMiB(BigInt(user.storageLimitBytes))} MiB`
      : "…";

  const muniLine =
    user !== undefined
      ? user.municipalitiesLimit === null
        ? `${String(user.municipalitiesUsedCount)} municipis (sense límit al pla)`
        : `${String(user.municipalitiesUsedCount)} / ${String(user.municipalitiesLimit)} municipis distints`
      : "…";

  const imagesLine =
    user !== undefined
      ? user.imagesLimit === null
        ? `${String(user.imagesUsedCount)} fotos al servidor (sense límit d’aquest tipus)`
        : `${String(user.imagesUsedCount)} / ${String(user.imagesLimit)} fotos al servidor`
      : "…";

  const ip =
    user !== undefined &&
    user.imagesLimit !== null &&
    user.imagesLimit > 0
      ? (user.imagesUsedCount / user.imagesLimit) * 100
      : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-6 text-zinc-800 dark:text-zinc-100">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        Monetització
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Fes-te Premium
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            isPremium
              ? "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200"
              : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
          }`}
        >
          {isPremium ? "Pla Premium" : "Pla gratuït"}
        </span>
      </div>

      {user !== undefined ? (
        <section className="mt-6 space-y-5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            El teu ús ara
          </h2>

          {usageBanner !== null ? (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${bannerClassForLevel(
                usageBanner.primary.level,
              )}`}
            >
              {usageBanner.message}
            </div>
          ) : null}

          <UsageBar
            label="Emmagatzematge al servidor"
            valueLine={storageLine}
            percent={sp}
          />
          <UsageBar
            label="Municipis amb visites"
            valueLine={muniLine}
            percent={mp}
          />
          <UsageBar
            label="Fotos al servidor"
            valueLine={imagesLine}
            percent={ip}
          />
        </section>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">Carregant dades del compte…</p>
      )}

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Free vs Premium
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/30">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Gratuït
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              <li>{formatBytesAsMiB(USER_PLAN_FREE_BYTES)} MiB d’emmagatzematge</li>
              <li>
                Fins a {String(USER_PLAN_FREE_MAX_DISTINCT_MUNICIPALITIES)}{" "}
                municipis distints
              </li>
              <li>
                Les fotos de les visites es guarden només en aquest dispositiu
                (no al servidor)
              </li>
              <li>Notes i dates de visita sincronitzades al núvol</li>
            </ul>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              Premium
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              <li>
                {formatBytesAsMiB(USER_PLAN_PREMIUM_BYTES)} MiB d’emmagatzematge
                al servidor
              </li>
              <li>Sense límit de municipis distints</li>
              <li>
                Fotos de visites pujades al servidor (visibles des de qualsevol
                dispositiu amb el teu compte)
              </li>
              <li>Més marge per fotos i notes; ideal si viatges molt</li>
            </ul>
          </div>
        </div>
      </section>

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        El preu el mostra Google Play (subscripció anual). Les compres només
        des de l’app Android; la validació és al servidor.
      </p>

      {isPremium ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          Ara tens el pla Premium actiu.
        </p>
      ) : null}

      {!native ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Les compres In-App estan disponibles a l’aplicació Android (Google
          Play). Obre l’app des del teu dispositiu per subscriure&apos;t.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {productLoadState === "loading" ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Carregant informació del producte des de Google Play…
            </p>
          ) : null}

          {productLoadState === "error" && productError !== null ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              <p>{productError}</p>
              <button
                type="button"
                className="mt-2 text-sm font-medium text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
                onClick={() => {
                  void loadProduct();
                }}
              >
                Tornar a provar
              </button>
            </div>
          ) : null}

          {product !== null && productLoadState === "ready" && !isPremium ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {product.displayName}
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {product.displayPrice}{" "}
                <span className="text-xs font-normal text-zinc-500">
                  ({product.currencyCode}, subscripció anual)
                </span>
              </p>
              {product.description.trim().length > 0 ? (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {product.description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={!canPurchase}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              onClick={() => {
                void onPurchase();
              }}
            >
              Activar Premium
            </button>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
            >
              Més tard
            </Link>
            <button
              type="button"
              disabled={busy || userId.length === 0}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100"
              onClick={() => {
                void onRestore();
              }}
            >
              Restaurar compres
            </button>
            <button
              type="button"
              disabled={busy}
              className="text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
              onClick={() => {
                void openPlaySubscriptionSettings();
              }}
            >
              Gestionar subscripció a Google Play
            </button>
          </div>
        </div>
      )}

      {message !== null ? (
        <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
          {message}
        </p>
      ) : null}
      {error !== null ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-500">
        El pagament es processa mitjançant Google Play. La teva subscripció es
        valida al nostre servidor; no confiem només en el dispositiu.
      </p>

      <Link
        href="/"
        className="mt-6 inline-block text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        Tornar al mapa
      </Link>
    </main>
  );
}
