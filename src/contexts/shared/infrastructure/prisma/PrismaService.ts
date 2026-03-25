import { PrismaClient } from "@prisma/client";
import { Service } from "diod";

import { getOrCreatePrismaClient } from "./prismaSingleton";

@Service()
export class PrismaService {
  readonly client: PrismaClient;

  constructor() {
    this.client = getOrCreatePrismaClient();
  }
}
