import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { ensureDefaultCategories } from "@/lib/default-categories";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { getServerEnv } from "@/lib/env";

const env = getServerEnv();

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail({
        to: user.email,
        resetUrl: url,
      }).catch((error) => {
        console.error("Failed to send password reset email", error);
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureDefaultCategories(user.id);
        },
      },
    },
  },
  plugins: [nextCookies()],
});
