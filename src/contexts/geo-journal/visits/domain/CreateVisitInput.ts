import type { MediaType } from "@prisma/client";

export type CreateVisitMediaInput = {
  type: MediaType;
  url: string;
};

export type CreateVisitInput = {
  municipalityId: string;
  visitedAt: Date;
  notes: string | null | undefined;
  media: CreateVisitMediaInput[];
};
