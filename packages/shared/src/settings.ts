import { z } from 'zod';
import { ROLE_IDS } from './roles';

/** Host-configurable rules (docs/04-game-rules.md §0). These defaults are the single source of truth. */
export const RoomRulesSchema = z.object({
  witchCanSelfHeal: z.boolean().default(true),
  guardCanSelfProtect: z.boolean().default(true),
  noKillFirstNight: z.boolean().default(false),
  revealRoleOnDeath: z.boolean().default(false),
  voteTieBreak: z.enum(['none', 'revote']).default('none'),
  maxRevotes: z.number().int().min(1).max(3).default(3),
  witchOnePotionPerNight: z.boolean().default(true),
  hunterShootsWhenPoisoned: z.boolean().default(false),
  wolfTieBreak: z.enum(['random', 'none']).default('random'),
});
export type RoomRules = z.infer<typeof RoomRulesSchema>;

const seconds = (def: number, min: number, max: number) =>
  z.number().int().min(min).max(max).default(def);

export const PhaseTimersSchema = z.object({
  roleRevealSeconds: seconds(10, 5, 30),
  nightActionSeconds: seconds(40, 15, 120),
  witchSeconds: seconds(20, 10, 60),
  dawnSeconds: seconds(8, 3, 20),
  /** Per-player speaking turn during DISCUSSION (players speak one by one in seat order). */
  speakingSeconds: seconds(30, 10, 120),
  voteSeconds: seconds(30, 10, 120),
  defenseSeconds: seconds(20, 0, 120),
  hunterSeconds: seconds(15, 10, 60),
});
export type PhaseTimers = z.infer<typeof PhaseTimersSchema>;

export const RoleCountsSchema = z.partialRecord(z.enum(ROLE_IDS), z.number().int().min(0).max(16));

export const RoomSettingsSchema = z.object({
  roles: RoleCountsSchema.default({}),
  timers: PhaseTimersSchema.prefault({}),
  rules: RoomRulesSchema.prefault({}),
  voice: z.boolean().default(true),
  captions: z.boolean().default(false),
});
export type RoomSettings = z.infer<typeof RoomSettingsSchema>;

export const defaultRoomSettings = (): RoomSettings => RoomSettingsSchema.parse({});

/**
 * Same validation as `schema`, but every field optional and WITHOUT defaults. Zod's `.partial()`
 * keeps `.default()` values, so a patch like `{ speakingSeconds: 10 }` would silently reset every
 * other field to its default. Patch schemas must be built with this helper instead.
 */
function patchOf<S extends z.ZodObject>(schema: S) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [
      key,
      ((field instanceof z.ZodDefault ? field.unwrap() : field) as z.ZodType).optional(),
    ]),
  );
  return z.object(shape).strict() as unknown as z.ZodType<Partial<z.output<S>>>;
}

export const RoomRulesPatchSchema = patchOf(RoomRulesSchema);
export const PhaseTimersPatchSchema = patchOf(PhaseTimersSchema);
