import type { VisitMediaPrimitives } from "./VisitMediaPrimitives";

export type VisitWithMediaPrimitives = {
  id: string;
  municipalityId: string;
  visitedAt: string;
  notes: string | null;
  media: VisitMediaPrimitives[];
};
