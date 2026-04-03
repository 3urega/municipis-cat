"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  fetchPremiumProductForUi,
  isAndroidBillingAvailable,
  openPlaySubscriptionSettings,
  purchasePremiumYearly,
  restorePremiumManual,
  type PremiumProductForUi,
} from "@/lib/billing/googlePlayPremium";

export function PremiumPageClient(): React.ReactElement {
  const { data: session, refresh } = useAuth();
  const userId = session?.user?.id ?? "";
  const plan = session?.user?.plan;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [productLoadState, setProductLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [product, setProduct] = useState<PremiumProductForUi | null>(null);
  const [productError, setProductError] = useState<string | null>(null);

  const native = isAndroidBillingAvailable();

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

  return (
    <main className="mx-auto max-w-lg px-4 py-6 text-zinc-800 dark:text-zinc-100">
      <h1 className="text-xl font-semibold">Premium</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        La subscripció anual desbloqueja més emmagatzematge i sense límit de
        municipis distints visitats (el pla gratuït en permet un nombre limitat).
      </p>

      {isPremium ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          Ara tens el pla Premium actiu.
        </p>
      ) : null}

      {!native ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Les compres In-App estan disponibles a l’aplicació Android
          (Google Play). Obre l’app des del teu dispositiu per subscriure&apos;t.
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
                  ({product.currencyCode})
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
              Subscriure&apos;m (anual)
            </button>
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
