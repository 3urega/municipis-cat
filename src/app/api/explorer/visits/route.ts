import "reflect-metadata";

import { auth } from "@/auth";
import { VisitsForExplorerSearcher } from "@/contexts/geo-journal/visits/application/search-for-explorer/VisitsForExplorerSearcher";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visits = await container
    .get(VisitsForExplorerSearcher)
    .search(session.user.id);

  return HttpNextResponse.json(visits);
}
