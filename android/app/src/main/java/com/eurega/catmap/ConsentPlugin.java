package com.geodiari.app;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.FormError;
import com.google.android.ump.UserMessagingPlatform;

/**
 * Pont Capacitor cap al Google User Messaging Platform (UMP). La persistència la gestiona l’SDK;
 * veure {@link com.google.android.ump.ConsentInformation}.
 */
@CapacitorPlugin(name = "Consent")
public class ConsentPlugin extends Plugin {

    @PluginMethod
    public void initializeConsent(final PluginCall call) {
        try {
            UserMessagingPlatform.getConsentInformation(getContext());
            call.resolve();
        } catch (Exception e) {
            call.resolve();
        }
    }

    /**
     * Equivalent a requestConsentInfoUpdate seguit de loadAndShowConsentFormIfRequired (recomanació Google).
     */
    @PluginMethod
    public void requestConsent(final PluginCall call) {
        runConsentGatheringFlow(call);
    }

    @PluginMethod
    public void showConsentIfRequired(final PluginCall call) {
        runConsentGatheringFlow(call);
    }

    @PluginMethod
    public void getConsentStatus(final PluginCall call) {
        try {
            ConsentInformation ci = UserMessagingPlatform.getConsentInformation(getContext());
            call.resolve(consentToJs(ci));
        } catch (Exception e) {
            call.resolve(safeFallbackJs());
        }
    }

    private void runConsentGatheringFlow(final PluginCall call) {
        final Activity activity = getActivity();
        if (activity == null) {
            call.resolve(safeFallbackJs());
            return;
        }

        final ConsentInformation consentInformation = UserMessagingPlatform.getConsentInformation(getContext());
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();

        consentInformation.requestConsentInfoUpdate(
            activity,
            params,
            () ->
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                    activity,
                    (FormError formError) -> {
                        JSObject out = consentToJs(consentInformation);
                        if (formError != null) {
                            out.put("formError", formError.getMessage());
                        }
                        call.resolve(out);
                    }
                ),
            requestConsentError -> {
                JSObject out = consentToJs(consentInformation);
                if (requestConsentError != null) {
                    out.put("requestError", requestConsentError.getMessage());
                }
                call.resolve(out);
            }
        );
    }

    private static JSObject consentToJs(ConsentInformation ci) {
        JSObject o = new JSObject();
        o.put("consentStatus", mapConsentStatus(ci.getConsentStatus()));
        o.put("canRequestAds", ci.canRequestAds());
        o.put("isConsentFormAvailable", ci.isConsentFormAvailable());
        o.put("privacyOptionsRequirementStatus", ci.getPrivacyOptionsRequirementStatus().name());
        return o;
    }

    private static String mapConsentStatus(int consentConstant) {
        switch (consentConstant) {
            case ConsentInformation.ConsentStatus.REQUIRED:
                return "REQUIRED";
            case ConsentInformation.ConsentStatus.NOT_REQUIRED:
                return "NOT_REQUIRED";
            case ConsentInformation.ConsentStatus.OBTAINED:
                return "OBTAINED";
            case ConsentInformation.ConsentStatus.UNKNOWN:
            default:
                return "UNKNOWN";
        }
    }

    private static JSObject safeFallbackJs() {
        JSObject o = new JSObject();
        o.put("consentStatus", "UNKNOWN");
        o.put("canRequestAds", false);
        o.put("isConsentFormAvailable", false);
        o.put("privacyOptionsRequirementStatus", "UNKNOWN");
        return o;
    }
}
