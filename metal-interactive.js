/* ===== M&T Services — interactive liquid-metal background =====
   The background video is a seamless boomerang (forward+reverse), so it loops
   with no seam AND scrubs smoothly in both directions. Moving the cursor
   "stirs" the metal by scrubbing the timeline; when idle, it drifts on its own.
   Respects reduced-motion (static poster) and pauses when the tab is hidden. */
(function () {
  var v = document.getElementById("metal-bg");
  if (!v) return;

  var mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mq && mq.matches) { v.removeAttribute("autoplay"); v.removeAttribute("loop"); try { v.pause(); } catch (e) {} return; }

  var dur = 0, target = 0, cur = 0, scrubbing = false, raf = 0, idleTimer = 0;

  v.addEventListener("loadedmetadata", function () { dur = v.duration || 0; });
  function tryPlay() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  tryPlay(); // ambient seamless loop by default

  function tick() {
    cur += (target - cur) * 0.14;               // smooth easing toward cursor target
    if (dur) { try { v.currentTime = cur; } catch (e) {} }
    if (scrubbing && Math.abs(target - cur) > 0.003) {
      raf = requestAnimationFrame(tick);
    } else { raf = 0; }
  }

  function scrubTo(x, y) {
    if (!dur) return;
    if (!scrubbing) { cur = v.currentTime || 0; scrubbing = true; try { v.pause(); } catch (e) {} }
    var fx = Math.min(1, Math.max(0, x / window.innerWidth));
    var fy = Math.min(1, Math.max(0, y / window.innerHeight));
    target = (fx * 0.7 + fy * 0.3) * (dur - 0.05); // blend both axes so motion feels like stirring
    if (!raf) raf = requestAnimationFrame(tick);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(release, 2000);         // resume ambient drift after 2s idle
  }

  function release() {
    scrubbing = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    tryPlay();
  }

  window.addEventListener("mousemove", function (e) { scrubTo(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener("touchmove", function (e) { var t = e.touches[0]; if (t) scrubTo(t.clientX, t.clientY); }, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { try { v.pause(); } catch (e) {} }
    else if (!scrubbing) tryPlay();
  });
})();
