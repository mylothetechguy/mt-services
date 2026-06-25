/* ===== M&T Services — liquid-metal background (scrub-only) =====
   Desktop (mouse): the metal stays still until you move the cursor — moving it
   scrubs the video to "stir" the metal. It NEVER plays on its own / no loop.
   Mobile/touch/reduced-motion: a clean static frame (no autoplay, no play button). */
(function () {
  var v = document.getElementById("metal-bg");
  if (!v) return;

  // Never autoplay or loop — motion comes only from the mouse scrub.
  v.removeAttribute("autoplay");
  v.removeAttribute("loop");
  v.muted = true;
  v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
  try { v.pause(); } catch (e) {}

  var mqReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var small = window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
  var mobile = !fine || small;

  function showPoster() {
    if (v.dataset.fb) return;
    v.dataset.fb = "1";
    v.style.display = "none";
    var fb = document.createElement("div");
    fb.setAttribute("aria-hidden", "true");
    fb.style.cssText = "position:absolute;inset:0;background:#070b16 url('media/liquid-metal-poster.jpg') center center / cover no-repeat;";
    v.parentNode.insertBefore(fb, v);
  }

  // No mouse on touch devices (and respect reduced-motion): show a static frame.
  if (mobile || mqReduce) { showPoster(); return; }

  // ---------- Desktop: scrub-only ----------
  var dur = 0, target = 0, cur = 0, raf = 0;

  v.addEventListener("loadedmetadata", function () {
    dur = v.duration || 0;
    try { v.currentTime = dur * 0.2; cur = v.currentTime; target = cur; } catch (e) {}
  });
  v.load(); // ensure a frame decodes so it isn't black before the first move

  function tick() {
    cur += (target - cur) * 0.12;            // smooth glide toward the cursor target
    if (dur) { try { v.currentTime = cur; } catch (e) {} }
    if (Math.abs(target - cur) > 0.0008) raf = requestAnimationFrame(tick);
    else raf = 0;
  }
  function scrubTo(x, y) {
    if (!dur) return;
    var fx = Math.min(1, Math.max(0, x / window.innerWidth));
    var fy = Math.min(1, Math.max(0, y / window.innerHeight));
    target = (fx * 0.7 + fy * 0.3) * (dur - 0.05);  // both axes stir the metal
    if (!raf) raf = requestAnimationFrame(tick);
  }
  window.addEventListener("mousemove", function (e) { scrubTo(e.clientX, e.clientY); }, { passive: true });
})();
