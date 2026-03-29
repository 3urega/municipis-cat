import "reflect-metadata";

import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { AllMunicipalitiesSearcher } from "@/contexts/geo-journal/municipalities/application/search-all/AllMunicipalitiesSearcher";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { loadMunicipiComarcaMapSync } from "@/lib/loadMunicipiComarcaMap";
import { findComarcaForMunicipalityId } from "@/lib/municipiComarca";

export async function GET(request: Request): Promise<Response> {
  const user = await resolveAuthUser(request);
  if (user === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const municipalities = await container
    .get(AllMunicipalitiesSearcher)
    .searchAll(user.id);

  const comarcaMap = loadMunicipiComarcaMapSync();
  const withComarca = municipalities.map((m) => {
    const c = findComarcaForMunicipalityId(comarcaMap, m.id);
    return {
      ...m,
      comarcaName: c !== null ? c.comarcaName : null,
      comarcaCode: c !== null ? c.comarcaCode : null,
    };
  });

  return HttpNextResponse.json(withComarca);
}
