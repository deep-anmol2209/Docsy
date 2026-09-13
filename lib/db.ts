/**
 * Prisma Client singleton with PostgreSQL driver adapter.
 *
 * Reuses one client in development (via `globalThis`) to survive hot reloads.
 * Requires `DATABASE_URL` in the environment.
 *
 * @example Input → Output
 * ```ts
 * import prisma from "./lib/db.js";
 *
 * await prisma.workspace.findMany({ where: { userId: "user_abc" } })
 * // → [{ id: "ws_xyz", title: "ML Notes", ... }]
 * ```
 */

// import { PrismaClient } from "./generated/prisma/client";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { Pool } from "pg";

// const globalForPrisma = globalThis as unknown as {
//     prisma: PrismaClient | undefined;
// };

// function createPrismaClient(): PrismaClient {
//     const pool = new Pool({
//         connectionString: process.env.DATABASE_URL,
//     });

//     const adapter = new PrismaPg(pool);

//     return new PrismaClient({ adapter });
// }

// const prisma = globalForPrisma.prisma ?? createPrismaClient();

// if (process.env.NODE_ENV !== "production") {
//     globalForPrisma.prisma = prisma;
// }

// export default prisma;


import {PrismaPg} from "@prisma/adapter-pg"

import { PrismaClient} from "./generated/prisma/client"

const globalforPrisma= globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient(){
    const url = process.env.DATABASE_URL
    if(!url) throw new Error("DATABASE_URL is not defined")

        const adapter = new PrismaPg({connectionString : url})
        return new PrismaClient({adapter})
}

export const prisma = globalforPrisma.prisma ?? createPrismaClient()

if(process.env.NODE_ENV !== "production"){
    globalforPrisma.prisma = prisma;
}

