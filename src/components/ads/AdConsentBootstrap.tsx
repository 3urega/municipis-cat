"use client";

import { ensureConsentForAds } from "@/lib/ads/consentPlugin";
import { useEffect } from "react";

/**
 * Engega el flux GDPR/UMP en segon pla en obrir l’app Android (WebView); no bloqueja el mapa.
 */
export function AdConsentBootstrap(): null {
  useEffect(() => {
    void ensureConsentForAds();
  }, []);
  return null;
}
