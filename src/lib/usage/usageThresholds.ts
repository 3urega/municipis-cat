import type { AppAuthUser } from "@/lib/auth/appAuthTypes";

export type UsageThresholdLevel = "ok" | "info" | "warning" | "critical";

const SEVERITY_RANK: Record<UsageThresholdLevel, number> = {
  ok: 0,
  info: 1,
  warning: 2,
  critical: 3,
};

/**
 * Percentatge d’ús d’emmagatzematge (0–100), o null si il·limitat.
 */
export function storageUsagePercentFromFields(
  storageUsed: string,
  storageLimitBytes: number,
  isStorageUnlimited: boolean,
): number | null {
  if (isStorageUnlimited) {
    return null;
  }
  const used = BigInt(storageUsed);
  const limit = BigInt(storageLimitBytes);
  if (limit <= BigInt(0)) {
    return null;
  }
  const scaled = Number((used * BigInt(10000)) / limit) / 100;
  return Math.min(100, Math.max(0, scaled));
}

export function storageUsagePercent(user: AppAuthUser): number | null {
  return storageUsagePercentFromFields(
    user.storageUsed,
    user.storageLimitBytes,
    user.isStorageUnlimited,
  );
}

/**
 * Percentatge de municipis distints usats (0–100), o null si sense límit.
 */
export function municipalitiesUsagePercentFromCounts(
  usedCount: number,
  municipalitiesLimit: number | null,
): number | null {
  if (municipalitiesLimit === null || municipalitiesLimit <= 0) {
    return null;
  }
  const pct = (usedCount / municipalitiesLimit) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function municipalitiesUsagePercent(user: AppAuthUser): number | null {
  return municipalitiesUsagePercentFromCounts(
    user.municipalitiesUsedCount,
    user.municipalitiesLimit,
  );
}

export function thresholdLevelFromPercent(
  percent: number | null,
): UsageThresholdLevel {
  if (percent === null) {
    return "ok";
  }
  if (percent >= 100) {
    return "critical";
  }
  if (percent >= 90) {
    return "warning";
  }
  if (percent >= 70) {
    return "info";
  }
  return "ok";
}

export type UsageAxisKind = "storage" | "municipalities";

export type UsageAxisSummary = {
  kind: UsageAxisKind;
  percent: number | null;
  level: UsageThresholdLevel;
};

function bannerMessageForAxis(
  kind: UsageAxisKind,
  level: UsageThresholdLevel,
): string | null {
  if (level === "ok") {
    return null;
  }
  const storage = kind === "storage";
  switch (level) {
    case "info":
      return storage
        ? "T’acostes al límit gratuït d’emmagatzematge."
        : "T’acostes al límit de municipis distints del pla gratuït.";
    case "warning":
      return storage
        ? "Et quedes sense espai al compte gratuït."
        : "Et quedes sense quota de municipis nous al pla gratuït.";
    case "critical":
      return storage
        ? "Has assolit el límit gratuït d’emmagatzematge."
        : "Has assolit el límit de municipis distints del pla gratuït.";
    default:
      return null;
  }
}

/**
 * Eixos amb límit actiu i nivell mínim info (per mostrar banner únic: el pitjor).
 */
export function pickPrimaryUsageAxis(user: AppAuthUser): {
  primary: UsageAxisSummary;
  message: string;
} | null {
  const axes: UsageAxisSummary[] = [];

  const sp = storageUsagePercent(user);
  if (sp !== null) {
    axes.push({
      kind: "storage",
      percent: sp,
      level: thresholdLevelFromPercent(sp),
    });
  }

  const mp = municipalitiesUsagePercent(user);
  if (mp !== null) {
    axes.push({
      kind: "municipalities",
      percent: mp,
      level: thresholdLevelFromPercent(mp),
    });
  }

  let best: UsageAxisSummary | null = null;
  for (const axis of axes) {
    if (axis.level === "ok") {
      continue;
    }
    if (
      best === null ||
      SEVERITY_RANK[axis.level] > SEVERITY_RANK[best.level]
    ) {
      best = axis;
    }
  }

  if (best === null) {
    return null;
  }

  const msg = bannerMessageForAxis(best.kind, best.level);
  if (msg === null) {
    return null;
  }
  return { primary: best, message: msg };
}

/** Bytes disponibles abans d’arribar al límit (mínim 0), o null si il·limitat. */
export function storageBytesRemaining(user: AppAuthUser): bigint | null {
  if (user.isStorageUnlimited) {
    return null;
  }
  const used = BigInt(user.storageUsed);
  const limit = BigInt(user.storageLimitBytes);
  const left = limit - used;
  return left > BigInt(0) ? left : BigInt(0);
}

export function formatBytesAsMiB(bytes: bigint | number): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (!Number.isFinite(n)) {
    return "0.0";
  }
  return (n / (1024 * 1024)).toFixed(1);
}
