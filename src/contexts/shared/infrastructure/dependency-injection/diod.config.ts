import { ContainerBuilder } from "diod";

import { AllMunicipalitiesSearcher } from "@/contexts/geo-journal/municipalities/application/search-all/AllMunicipalitiesSearcher";
import { MunicipalityRepository } from "@/contexts/geo-journal/municipalities/domain/MunicipalityRepository";
import { PrismaMunicipalityRepository } from "@/contexts/geo-journal/municipalities/infrastructure/PrismaMunicipalityRepository";
import { VisitCreator } from "@/contexts/geo-journal/visits/application/create/VisitCreator";
import { VisitFinder } from "@/contexts/geo-journal/visits/application/find/VisitFinder";
import { VisitRemover } from "@/contexts/geo-journal/visits/application/remove/VisitRemover";
import { VisitsByMunicipalitySearcher } from "@/contexts/geo-journal/visits/application/search-by-municipality/VisitsByMunicipalitySearcher";
import { VisitsForExplorerSearcher } from "@/contexts/geo-journal/visits/application/search-for-explorer/VisitsForExplorerSearcher";
import { VisitUpdater } from "@/contexts/geo-journal/visits/application/update/VisitUpdater";
import { VisitRepository } from "@/contexts/geo-journal/visits/domain/VisitRepository";
import { PrismaVisitRepository } from "@/contexts/geo-journal/visits/infrastructure/PrismaVisitRepository";
import { PrismaService } from "@/contexts/shared/infrastructure/prisma/PrismaService";

const builder = new ContainerBuilder();

builder.registerAndUse(PrismaService).asSingleton();

builder
  .register(MunicipalityRepository)
  .use(PrismaMunicipalityRepository)
  .asSingleton();

builder.registerAndUse(AllMunicipalitiesSearcher).asSingleton();

builder.register(VisitRepository).use(PrismaVisitRepository).asSingleton();

builder.registerAndUse(VisitCreator).asSingleton();
builder.registerAndUse(VisitFinder).asSingleton();
builder.registerAndUse(VisitUpdater).asSingleton();
builder.registerAndUse(VisitRemover).asSingleton();
builder.registerAndUse(VisitsByMunicipalitySearcher).asSingleton();
builder.registerAndUse(VisitsForExplorerSearcher).asSingleton();

export const container = builder.build();
