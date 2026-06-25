/* ===== M&T Services — liquid-metal background behavior =====
   Desktop (mouse): cursor scrubs the seamless boomerang video to "stir" the metal.
   Mobile/touch: lighter video that just autoplays + loops (no scrub, so scrolling
   never pauses it). If autoplay is blocked (e.g. iOS Low Power Mode), it shows a
   clean static poster instead of an iOS "play" button. Respects reduced-motion. */
(function () {
  var v = document.getElementById("metal-bg");
  if (!v) return;

  var mqReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var small = window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
  var mobile = !fine || small;

  // Belt-and-suspenders for inline muted autoplay (esp. iOS)
  v.muted = true; v.defaultMuted = true;
  v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
  try { v.playbackRate = 0.5; } catch (e) {}   // slow, hypnotic drift

  // Lighter source on phones
  if (mobile) {
    var src = v.querySelector("source");
    if (src) { src.src = "media/liquid-metal-loop-mobile.mp4"; v.load(); }
  }

  var started = false;
  v.addEventListener("playing", function () { started = true; });

  function showPoster() {
    if (v.dataset.fb || started) return;
    v.dataset.fb = "1";
    v.style.display = "none";
    var fb = document.createElement("div");
    fb.setAttribute("aria-hidden", "true");
    fb.style.cssText = "position:absolute;inset:0;background:#070b16 url('media/liquid-metal-poster.jpg') center center / cover no-repeat;";
    v.parentNode.insertBefore(fb, v);
  }

  function tryPlay() {
    try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }

  if (mqReduce) { v.removeAttribute("autoplay"); v.removeAttribute("loop"); try { v.pause(); } catch (e) {} showPoster(); return; }

  tryPlay();

  // Start playback on first user gesture if autoplay was blocked
  function gestureKick() { if (!started) tryPlay(); }
  window.addEventListener("touchstart", gestureKick, { passive: true });
  window.addEventListener("click", gestureKick);

  // On mobile, if it still hasn't started shortly after load, fall back to the
  // static poster so the user never sees a "play" button.
  if (mobile) {
    setTimeout(function () { if (!started && v.paused) showPoster(); }, 2000);
    return; // no scrubbing on touch devices
  }

  // ---------- Desktop-only interactive scrubbing ----------
  var dur = 0, target = 0, cur = 0, scrubbing = false, raf = 0, idleTimer = 0;
  v.addEventListener("loadedmetadata", function () { dur = v.duration || 0; });

  function tick() {
    cur += (target - cur) * 0.14;
    if (dur) { try { v.currentTime = cur; } catch (e) {} }
    if (scrubbing && Math.abs(target - cur) > 0.003) raf = requestAnimationFrame(tick);
    else raf = 0;
  }
  function scrubTo(x, y) {
    if (!dur) return;
    if (!scrubbing) { cur = v.currentTime || 0; scrubbing = true; try { v.pause(); } catch (e) {} }
    var fx = Math.min(1, Math.max(0, x / window.innerWidth));
    var fy = Math.min(1, Math.max(0, y / window.innerHeight));
    target = (fx * 0.7 + fy * 0.3) * (dur - 0.05);
    if (!raf) raf = requestAnimationFrame(tick);
    clearTimeout(idleTimer); idleTimer = setTimeout(release, 2000);
  }
  function release() { scrubbing = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } tryPlay(); }

  window.addEventListener("mousemove", function (e) { scrubTo(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { try { v.pause(); } catch (e) {} } else if (!scrubbing) tryPlay();
  });
})();
