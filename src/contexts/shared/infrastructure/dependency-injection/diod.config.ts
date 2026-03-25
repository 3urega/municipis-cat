import { ContainerBuilder } from "diod";

import { AllMunicipalitiesSearcher } from "@/contexts/geo-journal/municipalities/application/search-all/AllMunicipalitiesSearcher";
import { MunicipalityRepository } from "@/contexts/geo-journal/municipalities/domain/MunicipalityRepository";
import { PrismaMunicipalityRepository } from "@/contexts/geo-journal/municipalities/infrastructure/PrismaMunicipalityRepository";
import { VisitCreator } from "@/contexts/geo-journal/visits/application/create/VisitCreator";
import { VisitsByMunicipalitySearcher } from "@/contexts/geo-journal/visits/application/search-by-municipality/VisitsByMunicipalitySearcher";
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
builder.registerAndUse(VisitsByMunicipalitySearcher).asSingleton();

export const container = builder.build();
