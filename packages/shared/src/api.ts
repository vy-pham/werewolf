import { z } from 'zod';
import { SUPPORTED_LOCALES } from './locale';
import type { MAX_PLAYERS } from './roles';
import {
  PhaseTimersPatchSchema,
  RoleCountsSchema,
  RoomRulesPatchSchema,
  type RoomSettings,
} from './settings';

// ── Users & auth ─────────────────────────────────────────────────────────────

export const LocaleSchema = z.enum(SUPPORTED_LOCALES);
export const DisplayNameSchema = z.string().trim().min(3).max(20);

export interface UserView {
  id: string;
  kind: 'guest' | 'google';
  displayName: string;
  avatarUrl: string | null;
  locale: z.infer<typeof LocaleSchema>;
  captionLangs: string[];
}

export const GuestLoginBodySchema = z.object({
  displayName: DisplayNameSchema,
  locale: LocaleSchema.optional(),
});

export const GoogleLoginBodySchema = z.object({
  idToken: z.string().min(10),
  locale: LocaleSchema.optional(),
});

export const RefreshBodySchema = z.object({ refreshToken: z.string().min(10) });

export interface AuthResponse {
  accessToken: string;
  /** Unix ms. Refresh shortly before this. */
  accessTokenExpiresAt: number;
  refreshToken: string;
  user: UserView;
}

export const UpdateMeBodySchema = z.object({
  displayName: DisplayNameSchema.optional(),
  locale: LocaleSchema.optional(),
  /** Caption language preference (first = shown). Empty = follow `locale`. */
  captionLangs: z.array(z.enum(SUPPORTED_LOCALES)).max(2).optional(),
});

// ── Rooms ────────────────────────────────────────────────────────────────────

export const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/);

/** Partial settings a host may send; merged into the current settings and re-validated. */
export const RoomSettingsPatchSchema = z.object({
  roles: RoleCountsSchema.optional(),
  rules: RoomRulesPatchSchema.optional(),
  timers: PhaseTimersPatchSchema.optional(),
  voice: z.boolean().optional(),
  captions: z.boolean().optional(),
  /** true = use the preset for the player count at start (clears custom roles). */
  autoRoles: z.boolean().optional(),
});
export type RoomSettingsPatch = z.infer<typeof RoomSettingsPatchSchema>;

export const CreateRoomBodySchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  visibility: z.enum(['public', 'private']).default('private'),
  lang: LocaleSchema.optional(),
  settings: RoomSettingsPatchSchema.optional(),
});

export interface RoomMemberView {
  userId: string;
  displayName: string;
  seat: number;
  ready: boolean;
  online: boolean;
}

export interface RoomView {
  id: string;
  code: string;
  name: string;
  hostId: string;
  visibility: 'public' | 'private';
  lang: string;
  status: 'lobby' | 'in_game' | 'closed';
  settings: RoomSettings;
  /** True until the host edits roles: the preset for the player count is used at start. */
  autoRoles: boolean;
  members: RoomMemberView[];
  maxPlayers: typeof MAX_PLAYERS;
  currentGameId: string | null;
}

export interface RoomSummary {
  code: string;
  name: string;
  lang: string;
  players: number;
  maxPlayers: number;
}
