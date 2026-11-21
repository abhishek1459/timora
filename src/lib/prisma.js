import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis;

function createOfflinePrismaProxy() {
  console.warn("[AI Studio] Database not connected — using in-memory fallbacks");
  const rejectOffline = async () => {
    throw new Error("[AI Studio] Database not connected");
  };
  const modelProxy = new Proxy(
    {},
    {
      get: () => rejectOffline,
    }
  );
  return new Proxy(
    {},
    {
      get: (_, prop) => {
        if (prop === "$connect" || prop === "$disconnect") return async () => {};
        if (prop === "$transaction") return rejectOffline;
        return modelProxy;
      },
    }
  );
}

let prismaInstance = globalForPrisma.prisma;

if (!prismaInstance) {
  if (!process.env.DATABASE_URL) {
    prismaInstance = createOfflinePrismaProxy();
  } else {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const adapter = new PrismaPg(pool);
      prismaInstance = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      });
    } catch (err) {
      console.warn("[AI Studio] PrismaClient initialization failed — using mock:", err?.message);
      prismaInstance = createOfflinePrismaProxy();
    }
  }
}

export const prisma = prismaInstance;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
