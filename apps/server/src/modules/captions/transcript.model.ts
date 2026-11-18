import type { Channel } from '@werewolf/shared';
import { model, Schema, type Types } from 'mongoose';

/**
 * One transcribed sentence. Kept 24h only, as evidence for reports (like chat, FR-CHAT-03).
 * Audio is never stored.
 */
const transcriptSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, required: true },
    gameId: { type: Schema.Types.ObjectId, default: null },
    channel: { type: String, enum: ['lobby', 'main', 'wolves', 'dead'], required: true },
    speakerId: { type: Schema.Types.ObjectId, required: true },
    lang: { type: String, required: true },
    text: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { versionKey: false },
);

transcriptSchema.index({ gameId: 1, at: -1 });
transcriptSchema.index({ at: 1 }, { expireAfterSeconds: 24 * 3600 });

export interface TranscriptDoc {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  gameId: Types.ObjectId | null;
  channel: Channel;
  speakerId: Types.ObjectId;
  lang: string;
  text: string;
  at: Date;
}

export const Transcript = model('Transcript', transcriptSchema, 'transcripts');
