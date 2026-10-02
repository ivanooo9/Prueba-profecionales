(function () {
  if (window.PecVideoPlayer) return;

  const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";
  let youtubeApiPromise = null;

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      return Promise.resolve(window.YT);
    }

    if (youtubeApiPromise) {
      return youtubeApiPromise;
    }

    youtubeApiPromise = new Promise((resolve) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previousCallback === "function") previousCallback();
        resolve(window.YT);
      };

      if (!document.querySelector(`script[src="${YOUTUBE_API_SRC}"]`)) {
        const tag = document.createElement("script");
        tag.src = YOUTUBE_API_SRC;
        tag.async = true;
        document.head.appendChild(tag);
      }
    });

    return youtubeApiPromise;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const rounded = Math.floor(seconds);
    const mins = Math.floor(rounded / 60);
    const secs = String(rounded % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  async function resolveVideo(sourceType, sourceId) {
    const response = await fetch(`/api/videos/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success || !payload.videoId) {
      throw new Error(payload.error || "No se pudo cargar este video.");
    }
    return payload;
  }

  function getYouTubeVideoIdFromUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.origin);
      if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || null;
      if (url.searchParams.get("v")) return url.searchParams.get("v");
      const embedMatch = url.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/);
      return embedMatch ? embedMatch[1] : null;
    } catch (_) {
      return null;
    }
  }

  class PecVideoPlayer {
    constructor(root) {
      this.root = root;
      this.sourceType = root.dataset.videoSourceType;
      this.sourceId = root.dataset.videoSourceId;
      this.title = root.dataset.videoTitle || "Video Profesionales Ecuador";
      this.shouldAutoplay = root.dataset.videoAutoplay === "true";
      this.stage = root.querySelector("[data-pec-video-stage]");
      this.poster = root.querySelector("[data-pec-video-poster]");
      this.cover = root.querySelector("[data-pec-video-cover]");
      this.errorBox = root.querySelector("[data-pec-video-error]");
      this.errorText = root.querySelector("[data-pec-video-error-text]");
      this.toggleBtn = root.querySelector("[data-pec-video-toggle]");
      this.muteBtn = root.querySelector("[data-pec-video-mute]");
      this.volumeSlider = root.querySelector("[data-pec-video-volume]");
      this.fullscreenBtn = root.querySelector("[data-pec-video-fullscreen]");
      this.captionsBtn = root.querySelector("[data-pec-video-captions]");
      this.speedWrap = root.querySelector("[data-pec-video-speed]");
      this.speedToggle = root.querySelector("[data-pec-video-speed-toggle]");
      this.speedMenu = root.querySelector("[data-pec-video-speed-menu]");
      this.speedLabel = root.querySelector("[data-pec-video-speed-label]");
      this.rateButtons = Array.from(root.querySelectorAll("[data-pec-video-rate]"));
      this.progress = root.querySelector("[data-pec-video-progress]");
      this.progressBar = root.querySelector("[data-pec-video-progress-bar]");
      this.time = root.querySelector("[data-pec-video-time]");
      this.isAuthenticated = root.dataset.isAuthenticated === "true";
      this.previewLimitSeconds = Number(root.dataset.previewLimitSeconds) || 60;
      this.hasFullAccess = false;
      this.bunnyPreviewTimer = null;
      this.bunnyPreviewElapsed = 0;
      this.limitOverlay = root.querySelector("[data-pec-video-limit-overlay]");
      this.player = null;
      this.timer = null;
      this.loading = false;
      this.lastVolume = 100;
      this.resolvedVideo = null;
      this.captionsEnabled = false;
      this.playbackRate = 1;
    }

    init() {
      if (!this.sourceType || !this.sourceId || !this.stage) return;
      this.cover?.addEventListener("click", () => this.loadAndPlay());
      this.toggleBtn?.addEventListener("click", () => this.togglePlayback());
      this.muteBtn?.addEventListener("click", () => this.toggleMute());
      this.volumeSlider?.addEventListener("input", () => this.changeVolume());
      this.fullscreenBtn?.addEventListener("click", () => this.toggleFullscreen());
      this.captionsBtn?.addEventListener("click", () => this.toggleCaptions());
      this.speedToggle?.addEventListener("click", (event) => this.toggleSpeedMenu(event));
      this.rateButtons.forEach((button) => {
        button.addEventListener("click", () => this.changePlaybackRate(button.dataset.pecVideoRate));
      });
      document.addEventListener("click", (event) => this.closeSpeedMenuFromEvent(event));
      document.addEventListener("fullscreenchange", () => this.syncFullscreenState());
      document.addEventListener("webkitfullscreenchange", () => this.syncFullscreenState());
      this.syncFullscreenState();
      this.progress?.addEventListener("click", (event) => this.seekFromEvent(event));
      this.syncCaptionsState();
      this.syncPlaybackRate();
      this.loadPoster();

      if (this.shouldAutoplay) {
        this.loadAndPlay();
      }
    }

    async loadAndPlay() {
      if (this.loading) return;

      if (this.player) {
        this.player.playVideo();
        return;
      }

      this.loading = true;
      this.root.classList.add("is-loading");
      this.root.classList.remove("has-error");

      try {
        const video = await this.getResolvedVideo();
        this.hasFullAccess = !!video.hasFullAccess;

        if (video.provider === "bunny") {
          const iframe = document.createElement("iframe");
          iframe.src = `https://iframe.mediadelivery.net/embed/${video.libraryId}/${video.videoId}?autoplay=${this.shouldAutoplay ? 'true' : 'false'}&preload=true`;
          iframe.setAttribute("allow", "accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen;");
          iframe.setAttribute("allowfullscreen", "true");
          iframe.style.border = "0";
          iframe.style.position = "absolute";
          iframe.style.top = "0";
          iframe.style.height = "100%";
          iframe.style.width = "100%";
          
          this.stage.innerHTML = "";
          this.stage.appendChild(iframe);
          
          this.root.classList.add("is-ready");
          this.root.classList.remove("is-loading");
          
          // Ocultar controles propios ya que Bunny Stream usa los suyos
          const controls = this.root.querySelector("[data-pec-video-controls]");
          if (controls) controls.style.display = "none";
          if (this.cover) this.cover.style.display = "none";

          // Vista previa limitada (ponente de pago sin acceso completo)
          if (!this.hasFullAccess) {
            this.startBunnyPreviewTimer();
          }
          return;
        }

        const YT = await loadYouTubeApi();

        const containerId = `pec-youtube-${this.sourceType}-${this.sourceId}-${Math.random().toString(36).slice(2)}`;
        const playerNode = document.createElement("div");
        playerNode.id = containerId;
        this.stage.innerHTML = "";
        this.stage.appendChild(playerNode);

        this.player = new YT.Player(containerId, {
          videoId: video.videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            cc_load_policy: 0,
          },
          events: {
            onReady: (event) => {
              this.root.classList.add("is-ready");
              this.root.classList.remove("is-loading");
              this.syncVolume();
              this.setDefaultPlaybackRate(event.target);
              this.disableCaptions(event.target);
              event.target.playVideo();
              this.startTimer();
            },
            onStateChange: (event) => this.syncState(event.data),
          },
        });
      } catch (error) {
        this.showError(error instanceof Error ? error.message : "No se pudo cargar este video.");
      } finally {
        this.loading = false;
      }
    }

    async getResolvedVideo() {
      if (!this.resolvedVideo) {
        this.resolvedVideo = resolveVideo(this.sourceType, this.sourceId);
      }
      return this.resolvedVideo;
    }

    async loadPoster() {
      if (!this.poster) return;

      const existingIframe = this.stage?.querySelector("iframe[src]");
      const immediateVideoId = getYouTubeVideoIdFromUrl(existingIframe?.src) || getYouTubeVideoIdFromUrl(this.sourceId);
      if (immediateVideoId) this.setPosterSrc(immediateVideoId);

      try {
        const video = await this.getResolvedVideo();
        if (video?.provider === "bunny") {
          this.poster.src = `https://vz-47021eb3-764.b-cdn.net/${video.videoId}/preview.webp`;
        } else if (video?.videoId) {
          this.setPosterSrc(video.videoId);
        }
      } catch (_) {
        // The play action will surface the API error; keep the cover usable until then.
      }
    }

    setPosterSrc(videoId) {
      if (!this.poster || !videoId) return;
      this.poster.dataset.fallbackSrc = `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
      this.poster.src = `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;
    }

    showError(message) {
      this.root.classList.remove("is-loading", "is-ready");
      this.root.classList.add("has-error");
      if (this.errorText) this.errorText.textContent = message;
    }

    togglePlayback() {
      if (!this.player) {
        this.loadAndPlay();
        return;
      }

      const state = this.player.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
      }
    }

    toggleMute() {
      if (!this.player) return;
      if (this.player.isMuted()) {
        const restoredVolume = this.lastVolume > 0 ? this.lastVolume : 100;
        this.player.unMute();
        this.player.setVolume(restoredVolume);
        this.syncVolume(restoredVolume);
      } else {
        const currentVolume = this.player.getVolume();
        if (currentVolume > 0) this.lastVolume = currentVolume;
        this.player.mute();
        this.syncVolume(0);
      }
    }

    changeVolume() {
      if (!this.player || !this.volumeSlider) return;
      const volume = Number(this.volumeSlider.value);
      const safeVolume = Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 100) : 100;

      this.player.setVolume(safeVolume);
      if (safeVolume === 0) {
        this.player.mute();
      } else {
        this.lastVolume = safeVolume;
        this.player.unMute();
      }

      this.syncVolume(safeVolume);
    }

    syncVolume(forcedVolume) {
      if (!this.player) return;
      const isMuted = this.player.isMuted();
      const playerVolume = typeof forcedVolume === "number" ? forcedVolume : this.player.getVolume();
      const safeVolume = Number.isFinite(playerVolume) ? Math.min(Math.max(playerVolume, 0), 100) : 100;
      const visualVolume = isMuted ? 0 : safeVolume;

      if (!isMuted && safeVolume > 0) {
        this.lastVolume = safeVolume;
      }

      if (this.volumeSlider) {
        this.volumeSlider.value = String(Math.round(visualVolume));
        this.volumeSlider.setAttribute("aria-valuenow", String(Math.round(visualVolume)));
      }

      if (this.muteBtn) {
        const icon = visualVolume === 0 ? "fa-volume-xmark" : visualVolume < 50 ? "fa-volume-low" : "fa-volume-high";
        this.muteBtn.innerHTML = `<i class="fa-solid ${icon}"></i>`;
        this.muteBtn.setAttribute("aria-label", visualVolume === 0 ? "Activar audio" : "Silenciar audio");
      }
    }

    toggleCaptions() {
      if (!this.player) return;
      this.captionsEnabled = !this.captionsEnabled;

      try {
        if (this.captionsEnabled) {
          this.player.loadModule("captions");
        } else {
          this.disableCaptions(this.player);
        }
      } catch (_) {
        this.captionsEnabled = false;
      }

      this.syncCaptionsState();
    }

    disableCaptions(player) {
      try {
        player?.unloadModule?.("captions");
      } catch (_) {
        // Videos without captions can throw here; the visible default remains off.
      }
      this.captionsEnabled = false;
      this.syncCaptionsState();
    }

    syncCaptionsState() {
      if (!this.captionsBtn) return;
      this.captionsBtn.classList.toggle("is-active", this.captionsEnabled);
      this.captionsBtn.setAttribute("aria-pressed", String(this.captionsEnabled));
      this.captionsBtn.setAttribute("aria-label", this.captionsEnabled ? "Desactivar subtítulos" : "Activar subtítulos");
    }

    toggleSpeedMenu(event) {
      event.stopPropagation();
      const isOpen = this.speedWrap?.classList.toggle("is-open") || false;
      this.speedToggle?.setAttribute("aria-expanded", String(isOpen));
    }

    closeSpeedMenuFromEvent(event) {
      if (!this.speedWrap || this.speedWrap.contains(event.target)) return;
      this.closeSpeedMenu();
    }

    closeSpeedMenu() {
      this.speedWrap?.classList.remove("is-open");
      this.speedToggle?.setAttribute("aria-expanded", "false");
    }

    changePlaybackRate(rateValue) {
      const rate = Number(rateValue);
      if (!Number.isFinite(rate)) return;
      this.playbackRate = rate;
      if (this.player) this.player.setPlaybackRate(rate);
      this.syncPlaybackRate();
      this.closeSpeedMenu();
    }

    setDefaultPlaybackRate(player) {
      this.playbackRate = 1;
      try {
        player?.setPlaybackRate?.(1);
      } catch (_) {
        // Some embeds report rates late; the UI default remains 1x.
      }
      this.syncPlaybackRate();
    }

    syncPlaybackRate() {
      if (this.speedLabel) this.speedLabel.textContent = `${this.playbackRate}x`;
      this.rateButtons.forEach((button) => {
        const isSelected = Number(button.dataset.pecVideoRate) === this.playbackRate;
        button.classList.toggle("is-active", isSelected);
        button.setAttribute("aria-checked", String(isSelected));
      });
    }

    getFullscreenElement() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    }

    isFullscreen() {
      return this.getFullscreenElement() === this.root;
    }

    toggleFullscreen() {
      if (this.isFullscreen()) {
        this.exitFullscreen();
      } else {
        this.enterFullscreen();
      }
    }

    enterFullscreen() {
      if (this.root.requestFullscreen) {
        this.root.requestFullscreen();
      } else if (this.root.webkitRequestFullscreen) {
        this.root.webkitRequestFullscreen();
      }
    }

    exitFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }

    syncFullscreenState() {
      if (!this.fullscreenBtn) return;
      const isFullscreen = this.isFullscreen();
      this.fullscreenBtn.innerHTML = isFullscreen
        ? '<i class="fa-solid fa-compress"></i>'
        : '<i class="fa-solid fa-expand"></i>';
      const label = isFullscreen ? "Salir de pantalla completa" : "Entrar a pantalla completa";
      this.fullscreenBtn.setAttribute("aria-label", label);
      this.fullscreenBtn.setAttribute("title", label);
      this.fullscreenBtn.setAttribute("aria-pressed", String(isFullscreen));
    }

    seekFromEvent(event) {
      if (!this.player || !this.progress) return;
      const duration = this.player.getDuration();
      if (!duration) return;
      const rect = this.progress.getBoundingClientRect();
      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      const targetTime = duration * ratio;

      if (!this.hasFullAccess && targetTime >= this.previewLimitSeconds) {
        try {
          this.player.seekTo(this.previewLimitSeconds, true);
          this.player.pauseVideo();
        } catch (_) {}
        this.showLimitOverlay();
        return;
      }

      this.player.seekTo(targetTime, true);
      this.updateProgress();
    }

    syncState(state) {
      if (!window.YT || !this.toggleBtn) return;
      const isPlaying = state === window.YT.PlayerState.PLAYING;
      this.toggleBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
      if (isPlaying) {
        this.startTimer();
      }
    }

    startTimer() {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = window.setInterval(() => this.updateProgress(), 500);
      this.updateProgress();
    }

    updateProgress() {
      if (!this.player || !this.progressBar || !this.time) return;
      const duration = this.player.getDuration() || 0;
      const current = this.player.getCurrentTime() || 0;

      // Unauthenticated preview limit check
      if (!this.hasFullAccess && current >= this.previewLimitSeconds) {
        try {
          this.player.pauseVideo();
          this.player.seekTo(this.previewLimitSeconds, true);
        } catch (_) {}
        this.showLimitOverlay();
        return;
      }

      const ratio = duration > 0 ? Math.min(current / duration, 1) : 0;
      this.progressBar.style.width = `${ratio * 100}%`;
      this.progress?.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      this.time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }

    showLimitOverlay() {
      this.root.classList.add("has-reached-limit");
      if (!this.limitOverlay) {
        const overlay = document.createElement("div");
        overlay.className = "pec-video-limit-overlay";
        overlay.setAttribute("data-pec-video-limit-overlay", "true");
        overlay.innerHTML = `
          <button type="button" class="pec-limit-close" aria-label="Cerrar modal" title="Cerrar"><i class="fa-solid fa-xmark"></i></button>
          <div class="pec-limit-card">
            <div class="pec-limit-glow"></div>
            <div class="pec-limit-icon"><i class="fa-solid fa-crown"></i></div>
            <h3 class="pec-limit-title">Desbloquea la Ponencia Completa</h3>
            <p class="pec-limit-desc">Has disfrutado la <strong>vista previa gratuita de ${this.previewLimitSeconds} segundos</strong>. Inicia sesión o crea tu cuenta gratis para ver el video completo y obtener tu certificado de asistencia.</p>
            <div class="pec-limit-buttons">
              <a href="/login" class="pec-limit-btn-login"><i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión</a>
              <a href="/registro-estudiante" class="pec-limit-btn-register"><i class="fa-solid fa-user-plus"></i> Crear Cuenta Gratis</a>
            </div>
          </div>
        `;
        overlay.querySelector(".pec-limit-close").addEventListener("click", (e) => {
          e.stopPropagation();
          overlay.remove();
          this.limitOverlay = null;
        });
        this.root.appendChild(overlay);
        this.limitOverlay = overlay;
      } else {
        this.limitOverlay.classList.remove("hidden");
      }
    }

    clearBunnyPreviewTimer() {
      if (this.bunnyPreviewTimer) {
        window.clearInterval(this.bunnyPreviewTimer);
        this.bunnyPreviewTimer = null;
      }
      this.bunnyPreviewElapsed = 0;
    }

    startBunnyPreviewTimer() {
      this.clearBunnyPreviewTimer();
      this.bunnyPreviewElapsed = 0;
      this.bunnyPreviewTimer = window.setInterval(() => {
        this.bunnyPreviewElapsed += 1;
        if (this.bunnyPreviewElapsed >= this.previewLimitSeconds) {
          this.stopBunnyPreview();
        }
      }, 1000);
    }

    stopBunnyPreview() {
      this.clearBunnyPreviewTimer();
      // No podemos pausar el iframe de Bunny programáticamente, así que lo quitamos
      // y mostramos el overlay de límite de vista previa.
      if (this.stage) this.stage.innerHTML = "";
      this.showLimitOverlay();
    }
  }

  function initAll() {
    document.querySelectorAll(".pec-video-player").forEach((root) => {
      if (root.dataset.pecVideoReady === "true") return;
      root.dataset.pecVideoReady = "true";
      new PecVideoPlayer(root).init();
    });
  }

  window.PecVideoPlayer = { initAll };

  document.addEventListener("error", (event) => {
    const poster = event.target;
    if (!(poster instanceof HTMLImageElement) || !poster.matches("[data-pec-video-poster]")) return;
    const fallbackSrc = poster.dataset.fallbackSrc;
    if (fallbackSrc && poster.src !== fallbackSrc) poster.src = fallbackSrc;
  }, true);

  document.addEventListener("load", (event) => {
    const poster = event.target;
    if (!(poster instanceof HTMLImageElement) || !poster.matches("[data-pec-video-poster]")) return;
    const fallbackSrc = poster.dataset.fallbackSrc;
    if (fallbackSrc && poster.naturalWidth <= 120 && poster.src !== fallbackSrc) poster.src = fallbackSrc;
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
