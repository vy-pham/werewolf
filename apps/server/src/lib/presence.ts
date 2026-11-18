/** In-memory count of connected sockets per user (single instance, docs §3.8). */
export class Presence {
  private readonly sockets = new Map<string, number>();

  connect(userId: string) {
    this.sockets.set(userId, (this.sockets.get(userId) ?? 0) + 1);
  }

  disconnect(userId: string) {
    const left = (this.sockets.get(userId) ?? 1) - 1;
    if (left <= 0) this.sockets.delete(userId);
    else this.sockets.set(userId, left);
  }

  isOnline(userId: string) {
    return this.sockets.has(userId);
  }
}
