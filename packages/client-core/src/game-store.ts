import type {
  CaptionView,
  ChatMessageView,
  DeliveredGameEvent,
  GameSyncResult,
  PlayerView,
  RoomView,
} from '@werewolf/shared';
import { create } from 'zustand';

interface GameStore {
  connected: boolean;
  room: RoomView | null;
  gameId: string | null;
  view: PlayerView | null;
  events: DeliveredGameEvent[];
  lastSeq: number;
  chat: ChatMessageView[];
  /** The final view of the last game, kept until the player dismisses the results. */
  lastResult: PlayerView | null;
  /** Live captions (newest last). Each disappears after CAPTION_TTL_MS. */
  captions: CaptionView[];
  /** Local display preference (CC button). */
  captionsVisible: boolean;

  setConnected: (connected: boolean) => void;
  setRoom: (room: RoomView | null) => void;
  onGameStarted: (gameId: string) => void;
  onState: (gameId: string, view: PlayerView) => void;
  onEvent: (event: DeliveredGameEvent) => void;
  onChat: (message: ChatMessageView) => void;
  onCaption: (caption: CaptionView) => void;
  setCaptionsVisible: (visible: boolean) => void;
  applySync: (gameId: string, sync: GameSyncResult) => void;
  dismissResult: () => void;
  leaveRoom: () => void;
}

const MAX_CHAT = 200;
const MAX_CAPTIONS = 3;
export const CAPTION_TTL_MS = 8000;

export const useGame = create<GameStore>()((set) => ({
  connected: false,
  room: null,
  gameId: null,
  view: null,
  events: [],
  lastSeq: 0,
  chat: [],
  lastResult: null,
  captions: [],
  captionsVisible: true,

  setConnected: (connected) => set({ connected }),

  setRoom: (room) =>
    set((s) => {
      // Back in the lobby: keep chat from the lobby only.
      if (room && s.room?.status === 'in_game' && room.status === 'lobby') {
        return { room, gameId: null, view: null, events: [], lastSeq: 0, chat: [], captions: [] };
      }
      return { room };
    }),

  onGameStarted: (gameId) =>
    set({ gameId, view: null, events: [], lastSeq: 0, chat: [], lastResult: null, captions: [] }),

  onState: (gameId, view) =>
    set((s) => ({
      gameId,
      view,
      lastResult: view.phase.name === 'GAME_OVER' ? view : s.lastResult,
    })),

  onEvent: (event) =>
    set((s) =>
      event.seq <= s.lastSeq ? s : { events: [...s.events, event].slice(-300), lastSeq: event.seq },
    ),

  onChat: (message) =>
    set((s) =>
      s.chat.some((m) => m.id === message.id) ? s : { chat: [...s.chat, message].slice(-MAX_CHAT) },
    ),

  onCaption: (caption) => {
    set((s) =>
      s.captions.some((c) => c.id === caption.id)
        ? s
        : { captions: [...s.captions, caption].slice(-MAX_CAPTIONS) },
    );
    setTimeout(
      () => set((s) => ({ captions: s.captions.filter((c) => c.id !== caption.id) })),
      CAPTION_TTL_MS,
    );
  },

  setCaptionsVisible: (captionsVisible) => set({ captionsVisible }),

  applySync: (gameId, sync) =>
    set((s) => {
      const known = new Set(s.events.map((e) => e.seq));
      const events = [...s.events, ...sync.events.filter((e) => !known.has(e.seq))].sort(
        (a, b) => a.seq - b.seq,
      );
      const chatIds = new Set(s.chat.map((m) => m.id));
      return {
        gameId,
        view: sync.view,
        events: events.slice(-300),
        lastSeq: events.at(-1)?.seq ?? s.lastSeq,
        chat: [...s.chat, ...sync.chat.filter((m) => !chatIds.has(m.id))].sort(
          (a, b) => a.at - b.at,
        ),
      };
    }),

  dismissResult: () => set({ lastResult: null }),

  leaveRoom: () =>
    set({
      room: null,
      gameId: null,
      view: null,
      events: [],
      lastSeq: 0,
      chat: [],
      lastResult: null,
      captions: [],
    }),
}));
