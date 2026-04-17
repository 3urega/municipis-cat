import "reflect-metadata";

import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { VisitsForExplorerSearcher } from "@/contexts/geo-journal/visits/application/search-for-explorer/VisitsForExplorerSearcher";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";

export async function GET(request: Request): Promise<Response> {
  const user = await resolveAuthUser(request);
  if (user === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visits = await container
    .get(VisitsForExplorerSearcher)
    .search(user.id);

  return HttpNextResponse.json(visits);
}
