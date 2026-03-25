import "reflect-metadata";

import type { NextRequest } from "next/server";

import { AllMunicipalitiesSearcher } from "@/contexts/geo-journal/municipalities/application/search-all/AllMunicipalitiesSearcher";
import { container } from "@/contexts/shared/infrastructure/dependency-injection/diod.config";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";

const searcher = container.get(AllMunicipalitiesSearcher);

export async function GET(_request: NextRequest): Promise<Response> {
  const municipalities = await searcher.searchAll();

  return HttpNextResponse.json(municipalities);
}
