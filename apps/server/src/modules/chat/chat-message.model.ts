import type { Channel } from '@werewolf/shared';
import { model, Schema, type Types } from 'mongoose';

/** Kept 24h only, for reconnect and reports (FR-CHAT-03). */
const chatMessageSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, required: true },
    gameId: { type: Schema.Types.ObjectId, default: null },
    channel: { type: String, enum: ['lobby', 'main', 'wolves', 'dead'], required: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { versionKey: false },
);

chatMessageSchema.index({ gameId: 1, at: -1 });
chatMessageSchema.index({ roomId: 1, channel: 1, at: -1 });
chatMessageSchema.index({ at: 1 }, { expireAfterSeconds: 24 * 3600 });

export interface ChatMessageDoc {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  gameId: Types.ObjectId | null;
  channel: Channel;
  senderId: Types.ObjectId;
  senderName: string;
  text: string;
  at: Date;
}

export const ChatMessage = model('ChatMessage', chatMessageSchema, 'chat_messages');
