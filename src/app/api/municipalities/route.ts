import "reflect-metadata";

import { auth } from "@/auth";
import { AllMunicipalitiesSearcher } from "@/contexts/geo-journal/municipalities/application/search-all/AllMunicipalitiesSearcher";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { loadMunicipiComarcaMapSync } from "@/lib/loadMunicipiComarcaMap";
import { findComarcaForMunicipalityId } from "@/lib/municipiComarca";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const municipalities = await container
    .get(AllMunicipalitiesSearcher)
    .searchAll(session.user.id);

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
