import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import  {prisma} from "./db"

const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";

/**
 * Configured Better Auth instance used by Next.js App Router API routes.
 *
 * @example Usage in routes
 * ```ts
 * // POST /api/auth/sign-in/social → redirects to Google
 * // GET  /api/auth/callback/google → creates session cookie
 * // use Better Auth APIs such as getSessionFromCtx() in route handlers
 * ```
 */
export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? clientUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [clientUrl],
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
});