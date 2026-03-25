import "reflect-metadata";

import { AllMunicipalitiesSearcher } from "@/contexts/geo-journal/municipalities/application/search-all/AllMunicipalitiesSearcher";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";

export async function GET(): Promise<Response> {
  const municipalities = await container
    .get(AllMunicipalitiesSearcher)
    .searchAll();

  return HttpNextResponse.json(municipalities);
}
