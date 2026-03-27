import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReactElement } from "react";

import { VisitViewerPageClient } from "./VisitViewerPageClient";

async function visitIdsForStaticExport(): Promise<{ visitId: string }[]> {
  const fp = path.join(process.cwd(), "visit-static-params.json");
  try {
    const raw = await readFile(fp, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [{ visitId: "__capacitor_visit_shell__" }];
    }
    const out: { visitId: string }[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        typeof (item as { visitId?: unknown }).visitId === "string" &&
        (item as { visitId: string }).visitId.length > 0
      ) {
        out.push({ visitId: (item as { visitId: string }).visitId });
      }
    }
    return out.length > 0 ? out : [{ visitId: "__capacitor_visit_shell__" }];
  } catch {
    return [{ visitId: "__capacitor_visit_shell__" }];
  }
}

export async function generateStaticParams(): Promise<{ visitId: string }[]> {
  return visitIdsForStaticExport();
}

export default function VisitViewerPage(): ReactElement {
  return <VisitViewerPageClient />;
}
