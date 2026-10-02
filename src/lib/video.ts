const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeVideoId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  const value = rawUrl.trim();
  if (!value) {
    return null;
  }

  if (YOUTUBE_VIDEO_ID_PATTERN.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) {
      return null;
    }

    if (host === "youtu.be" || host === "www.youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    const watchId = url.searchParams.get("v");
    if (watchId && YOUTUBE_VIDEO_ID_PATTERN.test(watchId)) {
      return watchId;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const markerIndex = pathParts.findIndex((part) => ["embed", "shorts", "live", "v"].includes(part));
    if (markerIndex >= 0) {
      const id = pathParts[markerIndex + 1] || "";
      return YOUTUBE_VIDEO_ID_PATTERN.test(id) ? id : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function getEffectiveTiempoMinimoPonencia(
  event: { usarTiempoMinimoPonencia?: boolean | null; tiempoMinimoPonenciaMinutos?: number | null } | null | undefined,
  globalMinutos: number = 3
): number {
  if (!event || !event.usarTiempoMinimoPonencia) {
    return 0; // Desactivado / Sin tiempo mínimo
  }
  if (typeof event.tiempoMinimoPonenciaMinutos === "number" && event.tiempoMinimoPonenciaMinutos > 0) {
    return event.tiempoMinimoPonenciaMinutos; // Personalizado para este curso/conversatorio
  }
  return globalMinutos; // Heredado de la configuración global
}

