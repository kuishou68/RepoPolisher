import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { getDatabase, settings } from '@repo-polisher/db';
import { eq } from 'drizzle-orm';

const t = initTRPC.create({ isServer: true });

export const settingsRouter = t.router({
  // Get a setting
  get: t.procedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = getDatabase();
      const [setting] = await db.select().from(settings).where(eq(settings.key, input.key));
      return setting?.value ?? null;
    }),

  // Set a setting
  set: t.procedure
    .input(
      z.object({
        key: z.string(),
        value: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDatabase();
      const now = new Date();

      await db
        .insert(settings)
        .values({
          key: input.key,
          value: input.value,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: input.value,
            updatedAt: now,
          },
        });

      return { success: true };
    }),

  // Get all settings
  getAll: t.procedure.query(async () => {
    const db = getDatabase();
    const allSettings = await db.select().from(settings);
    return Object.fromEntries(allSettings.map((s) => [s.key, s.value]));
  }),

  // Delete a setting
  delete: t.procedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDatabase();
      await db.delete(settings).where(eq(settings.key, input.key));
      return { success: true };
    }),
});
