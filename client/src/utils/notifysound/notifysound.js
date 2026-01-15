
// LRU-дедуп на время жизни страницы
const seen = new Map(); // eventId -> ts
function remember(id, ttlMs = 5 * 60 * 1000) {
  const now = Date.now();
  seen.set(id, now);
  for (const [k, t] of seen) {
    if (now - t > ttlMs) seen.delete(k);
  }
}
function hasSeen(id) {
  return seen.has(id);
}

export class AudioNotifier {
  constructor({ src, volume = 0.8, minIntervalMs = 1500 } = {}) {
    this.src = src;
    this.volume = volume;
    this.minIntervalMs = minIntervalMs;

    this.enabled = false;
    this.unlocked = false;
    this.lastPlayAt = 0;

    // Один <audio> на всё приложение
    this.audio = new Audio(src);
    this.audio.preload = "auto";
    this.audio.volume = volume;
  }

  setEnabled(v) {
    this.enabled = !!v;
  }

  setVolume(v) {
    const vv = Math.max(0, Math.min(1, Number(v)));
    this.volume = vv;
    this.audio.volume = vv;
  }

  // Вызывать из клика пользователя (кнопка)
  async unlock() {
    try {
      await this.audio.play();
      this.audio.pause();
      this.audio.currentTime = 0;
      this.unlocked = true;
      return true;
    } catch (e) {
      this.unlocked = false;
      return false;
    }
  }

  // eventId нужен для дедупа
  async playOnce(eventId) {
    if (!this.enabled) return;
    if (!this.unlocked) return;

    if (eventId && hasSeen(eventId)) return;

    const now = Date.now();
    if (now - this.lastPlayAt < this.minIntervalMs) return;

    try {
      this.audio.currentTime = 0;
      await this.audio.play();
      this.lastPlayAt = now;
      if (eventId) remember(eventId);
    } catch {
      // если браузер внезапно заблокировал — отмечаем как locked
      this.unlocked = false;
    }
  }
}
