import type { MediaType } from "@prisma/client";

export type VisitMediaPrimitives = {
  id: string;
  type: MediaType;
  url: string;
};
