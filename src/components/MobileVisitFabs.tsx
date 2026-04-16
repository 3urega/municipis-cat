import Link from "next/link";

/** Botó rodó vermell cap al mapa (sense posició fixa; usar dins un contenidor fix). */
export function MobileBackToMapFabButton(): React.ReactElement {
  return (
    <Link
      href="/"
      aria-label="Tornar al mapa"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg ring-2 ring-white/90 hover:bg-red-700 active:scale-95 dark:ring-zinc-900/90"
    >
      <svg
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </Link>
  );
}

/** Mateix FAB de mapa, amb contenidor fix (pàgina de municipi). */
export function MobileBackToMapFab(): React.ReactElement {
  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))] z-[1200] md:hidden">
      <MobileBackToMapFabButton />
    </div>
  );
}

type MobileEditVisitFabButtonProps = {
  municipalityId: string;
  visitId: string;
};

/** Enllaç a la pàgina del municipi amb editor obert per aquesta visita. */
export function MobileEditVisitFabButton({
  municipalityId,
  visitId,
}: MobileEditVisitFabButtonProps): React.ReactElement {
  const href = `/municipality/${encodeURIComponent(municipalityId)}?editVisit=${encodeURIComponent(visitId)}`;
  return (
    <Link
      href={href}
      aria-label="Editar visita"
      className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-300 bg-sky-500 text-white shadow-lg ring-2 ring-white/90 hover:bg-sky-600 active:scale-95 dark:border-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 dark:ring-zinc-900/90"
    >
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </Link>
  );
}

type VisitViewerMobileFabClusterProps = {
  municipalityId: string;
  visitId: string;
};

/** FAB llapis (a dalt) + FAB mapa (a baix), només mòbil. */
export function VisitViewerMobileFabCluster({
  municipalityId,
  visitId,
}: VisitViewerMobileFabClusterProps): React.ReactElement | null {
  if (municipalityId.length === 0 || visitId.length === 0) {
    return null;
  }
  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))] z-[1200] flex flex-col gap-2 md:hidden">
      <MobileEditVisitFabButton
        municipalityId={municipalityId}
        visitId={visitId}
      />
      <MobileBackToMapFabButton />
    </div>
  );
}
