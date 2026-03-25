import type { MediaType } from "@prisma/client";

export type CreateVisitMediaBody = {
  type: MediaType;
  url: string;
};

export type CreateVisitBody = {
  municipalityId: string;
  visitedAt: string;
  notes?: string | null;
  media?: CreateVisitMediaBody[];
};
