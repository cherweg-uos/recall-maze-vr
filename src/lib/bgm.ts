import bgmAsset from "@/assets/bgm-main.mp3.asset.json";

/**
 * Swap the background music by pointing this single constant at another file
 * (a new `.asset.json` pointer, or any URL). Track length does not matter —
 * playback loops seamlessly forever.
 */
const TRACK: string = bgmAsset.url;

let el: HTMLAudioElement | null = null;
let volume = 0.5;
let wanted = false;

function audio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!el) {
    el = new Audio(TRACK);
    el.loop = true;
    el.preload = "auto";
    el.volume = volume;
    document.addEventListener("visibilitychange", () => {
      if (!el) return;
      if (document.hidden) el.pause();
      else if (wanted && volume > 0) void el.play().catch(() => {});
    });
  }
  return el;
}

export function playBgm() {
  wanted = true;
  const a = audio();
  if (!a || volume <= 0) return;
  void a.play().catch(() => {});
}

export function stopBgm() {
  wanted = false;
  if (!el) return;
  el.pause();
  el.currentTime = 0;
}

export function setBgmVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  const a = audio();
  if (!a) return;
  a.volume = volume;
  if (volume <= 0) a.pause();
  else if (wanted) void a.play().catch(() => {});
}
