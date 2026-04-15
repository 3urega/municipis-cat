import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Estat retornat pel SDK UMP (Google). `canRequestAds === false` equival a rebutjar o limitar anuncis
 * segons el que hagi triat l’usuari; AdMob aplica el consentiment automàticament.
 */
export type UmpConsentStatusString =
  | "UNKNOWN"
  | "REQUIRED"
  | "NOT_REQUIRED"
  | "OBTAINED";

export interface ConsentStatusResult {
  consentStatus: UmpConsentStatusString;
  canRequestAds: boolean;
  isConsentFormAvailable?: boolean;
  privacyOptionsRequirementStatus: string;
  formError?: string;
  requestError?: string;
}

export interface ConsentPluginInterface {
  initializeConsent(): Promise<void>;
  requestConsent(): Promise<ConsentStatusResult>;
  showConsentIfRequired(): Promise<ConsentStatusResult>;
  getConsentStatus(): Promise<ConsentStatusResult>;
}

/**
 * Pont natiu Android (`ConsentPlugin`). A web/PWA s’usa la implementació segura sense cridar UMP.
 */
export const Consent = registerPlugin<ConsentPluginInterface>("Consent", {
  web: {
    initializeConsent: async () => {},
    requestConsent: async () => ({
      consentStatus: "NOT_REQUIRED",
      canRequestAds: false,
      privacyOptionsRequirementStatus: "NOT_REQUIRED",
    }),
    showConsentIfRequired: async () => ({
      consentStatus: "NOT_REQUIRED",
      canRequestAds: false,
      privacyOptionsRequirementStatus: "NOT_REQUIRED",
    }),
    getConsentStatus: async () => ({
      consentStatus: "NOT_REQUIRED",
      canRequestAds: false,
      privacyOptionsRequirementStatus: "NOT_REQUIRED",
    }),
  },
});

let consentFlowPromise: Promise<void> | null = null;

/**
 * Executa el flux UMP una sola vegada (idempotent): inicialització + formulari si cal.
 * Només Android natiu; iOS/web resolen sense fer res (el plugin Consent és només Android).
 */
export function ensureConsentForAds(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return Promise.resolve();
  }
  if (consentFlowPromise === null) {
    consentFlowPromise = (async () => {
      try {
        await Consent.requestConsent();
      } catch {
        // Fallback: sense consentiment explícit, AdMob usarà estat persistit o no personalitzat.
      }
    })();
  }
  return consentFlowPromise;
}
