import type { CreateVisitMediaInput } from "./CreateVisitInput";

export type UpdateVisitInput = {
  visitId: string;
  userId: string;
  /** No enviar el camp = no canviar. `null` = esborrar el text. */
  notes?: string | null;
  visitedAt?: Date;
  /** Si es defineix, substitueix tot el conjunt de mitjans de la visita. */
  media?: CreateVisitMediaInput[];
};
