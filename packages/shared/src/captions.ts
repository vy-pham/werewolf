import { z } from 'zod';
import { SUPPORTED_LOCALES } from './locale';
import type { Channel } from './phases';

/**
 * AI captions (docs/03-technical-design.md §7). The Python worker (`apps/captions`) listens to
 * LiveKit rooms as a hidden participant, transcribes and translates speech, and posts each
 * sentence to the server. The server decides who may read it (same rules as voice) and delivers
 * it over Socket.IO in each listener's caption language.
 */

/** Languages captions can be shown in (MVP: the UI languages). */
export const CAPTION_LANGS = SUPPORTED_LOCALES;
export const CaptionLangSchema = z.enum(CAPTION_LANGS);
export type CaptionLang = z.infer<typeof CaptionLangSchema>;

/** Worker → server: `POST /internal/captions`. */
export const CaptionIngestSchema = z.object({
  /** LiveKit room the audio came from. */
  room: z.string().min(1).max(100),
  /** LiveKit identity of the speaker (= user id). */
  speakerId: z.string().min(1).max(64),
  /** Language detected by speech-to-text (ISO 639-1, may be outside CAPTION_LANGS). */
  lang: z.string().min(2).max(8),
  text: z.string().trim().min(1).max(1000),
  /** Translations by caption language (the source language is not repeated here). */
  translations: z.record(z.string(), z.string().max(2000)).default({}),
});
export type CaptionIngest = z.input<typeof CaptionIngestSchema>;

export interface CaptionIngestResult {
  /** Listeners the caption was delivered to (0 = nobody may hear this room right now). */
  delivered: number;
  /** Caption languages the current listeners want: translate only into these next time. */
  wanted: CaptionLang[];
}

/** Worker → server: `GET /internal/captions/rooms` (polled). Rooms the worker should listen to. */
export interface CaptionRoomsResult {
  /** LiveKit URL. */
  url: string;
  rooms: { room: string; token: string }[];
}

/** Server → client: one transcribed sentence, in the receiver's caption language. */
export interface CaptionView {
  id: string;
  channel: Channel;
  speakerId: string;
  speakerName: string;
  /** Text in `lang` (translated when the speaker used another language). */
  text: string;
  lang: string;
  /** What the speaker said, in `sourceLang`. Equal to `text` when not translated. */
  original: string;
  sourceLang: string;
  at: number;
}
