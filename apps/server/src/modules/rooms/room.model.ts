import type { RoomSettings } from '@werewolf/shared';
import { model, Schema, type Types } from 'mongoose';

const memberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    displayName: { type: String, required: true },
    seat: { type: Number, required: true },
    ready: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const roomSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    hostId: { type: Schema.Types.ObjectId, required: true },
    visibility: { type: String, enum: ['public', 'private'], default: 'private' },
    lang: { type: String, default: 'en' },
    status: { type: String, enum: ['lobby', 'in_game', 'closed'], default: 'lobby' },
    /** Validated with RoomSettingsSchema before every write. */
    settings: { type: Schema.Types.Mixed, required: true },
    autoRoles: { type: Boolean, default: true },
    members: { type: [memberSchema], default: [] },
    currentGameId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, minimize: false },
);

roomSchema.index({ visibility: 1, status: 1, lang: 1, updatedAt: -1 });
roomSchema.index({ 'members.userId': 1 });
// The captions worker polls rooms with captions on (modules/captions).
roomSchema.index({ 'settings.captions': 1, status: 1 });

export interface RoomMemberDoc {
  userId: Types.ObjectId;
  displayName: string;
  seat: number;
  ready: boolean;
  joinedAt: Date;
}

export interface RoomDoc {
  _id: Types.ObjectId;
  code: string;
  name: string;
  hostId: Types.ObjectId;
  visibility: 'public' | 'private';
  lang: string;
  status: 'lobby' | 'in_game' | 'closed';
  settings: RoomSettings;
  autoRoles: boolean;
  members: RoomMemberDoc[];
  currentGameId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export const Room = model('Room', roomSchema);
