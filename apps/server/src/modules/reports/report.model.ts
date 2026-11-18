import type { Channel, ReportReason } from '@werewolf/shared';
import { model, Schema, type Types } from 'mongoose';

/**
 * A player report (FR-MISC-02). The evidence is a COPY of the reported player's chat messages and
 * transcripts from that game: the originals expire after 24 h, the report keeps them.
 */
const reportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, required: true },
    reportedId: { type: Schema.Types.ObjectId, required: true },
    gameId: { type: Schema.Types.ObjectId, required: true },
    roomId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    note: { type: String, default: '' },
    evidence: {
      messages: { type: [Schema.Types.Mixed], default: [] },
      transcripts: { type: [Schema.Types.Mixed], default: [] },
    },
    status: { type: String, enum: ['open', 'reviewed', 'actioned'], default: 'open' },
  },
  { timestamps: true, versionKey: false, minimize: false },
);

// One report per reporter, reported player and game.
reportSchema.index({ gameId: 1, reporterId: 1, reportedId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedId: 1, createdAt: -1 });

export interface EvidenceLine {
  channel: Channel;
  text: string;
  at: Date;
  lang?: string;
}

export interface ReportDoc {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  reportedId: Types.ObjectId;
  gameId: Types.ObjectId;
  roomId: Types.ObjectId;
  reason: ReportReason;
  note: string;
  evidence: { messages: EvidenceLine[]; transcripts: EvidenceLine[] };
  status: 'open' | 'reviewed' | 'actioned';
  createdAt: Date;
}

export const Report = model('Report', reportSchema);
