import { z } from 'zod';
import type { RoleId } from './roles';

/** Player reports (FR-MISC-02): allowed until 24 h after the game ended. */
export const REPORT_WINDOW_MS = 24 * 3600 * 1000;

export const REPORT_REASONS = ['abuse', 'cheating', 'spam', 'afk', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const CreateReportBodySchema = z.object({
  gameId: z.string().min(1),
  reportedId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).optional(),
});
export type CreateReportBody = z.infer<typeof CreateReportBodySchema>;

export interface ReportView {
  id: string;
  gameId: string;
  reportedId: string;
  reason: ReportReason;
  status: 'open' | 'reviewed' | 'actioned';
  createdAt: number;
}

/** A finished game the user can still report players from (within the 24 h window). */
export interface ReportableGame {
  gameId: string;
  endedAt: number;
  /** Until when reports are accepted. */
  reportableUntil: number;
  players: { userId: string; displayName: string }[];
  /** Players this user already reported in this game. */
  reportedIds: string[];
}

/** Personal statistics (FR-MISC-03). Roles are the dealt roles. */
export interface UserStats {
  games: number;
  wins: number;
  byRole: Partial<Record<RoleId, { games: number; wins: number }>>;
}
