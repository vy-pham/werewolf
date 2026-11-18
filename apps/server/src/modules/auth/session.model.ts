import { model, Schema } from 'mongoose';

/** One refresh token (stored as a SHA-256 hash). Rotated on every refresh. */
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model('Session', sessionSchema);
