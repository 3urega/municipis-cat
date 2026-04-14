/** Missatge fix quan la imatge no es pot mostrar en aquest dispositiu (pla FREE o error de càrrega). */
export const VISIT_LOCAL_IMAGE_UNAVAILABLE_CA =
  "Imatge no disponible en aquest dispositiu";

type VisitLocalImagePlaceholderProps = {
  className?: string;
  /** Si es passa, es mostra en tipografia més petita (miniatures). */
  compact?: boolean;
};

export function VisitLocalImagePlaceholder({
  className = "",
  compact = false,
}: VisitLocalImagePlaceholderProps): React.ReactElement {
  return (
    <div
      className={`flex items-center justify-center bg-zinc-200 text-center text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 ${compact ? "p-1 text-[9px] leading-tight" : "p-2 text-xs"} ${className}`}
      role="img"
      aria-label={VISIT_LOCAL_IMAGE_UNAVAILABLE_CA}
    >
      {VISIT_LOCAL_IMAGE_UNAVAILABLE_CA}
    </div>
  );
}
