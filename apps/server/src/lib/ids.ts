import { createHash, randomBytes } from 'node:crypto';
import { customAlphabet } from 'nanoid';

/** 6-char room codes without look-alike characters (0/O, 1/I/L). FR-ROOM-01. */
export const newRoomCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6);

export const newOpaqueToken = () => randomBytes(32).toString('base64url');

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
