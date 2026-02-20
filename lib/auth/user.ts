import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Get the current authenticated user with their Prisma DB record.
 * Auto-creates Prisma record on first access (upsert).
 * Bootstrap: first user to access becomes super_admin.
 * Uses serializable transaction to prevent race condition in bootstrap.
 *
 * Wrapped with React cache() to deduplicate calls within the same
 * request cycle (layout + page both call this without deadlocking).
 */
export const getCurrentUser = cache(async function getCurrentUserImpl() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Use serializable transaction to prevent race condition where
  // two concurrent requests both read superAdminCount === 0
  const dbUser = await prisma.$transaction(
    async (tx) => {
      const superAdminCount = await tx.user.count({
        where: { isSuperAdmin: true },
      });

      return tx.user.upsert({
        where: { id: user.id },
        update: { email: user.email! },
        create: {
          id: user.id,
          email: user.email!,
          fullName: user.user_metadata?.full_name || null,
          isSuperAdmin: superAdminCount === 0,
        },
        include: {
          memberships: {
            include: { organization: true },
          },
        },
      });
    },
    { isolationLevel: "Serializable" }
  );

  return dbUser;
});

/** Serializable user data for passing from server to client components */
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
