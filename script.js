/* ============ M&T Services — interactions ============ */
(function () {
  "use strict";

  // ---- Footer year ----
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  // ---- Nav: shrink on scroll ----
  var nav = document.getElementById("nav");
  var onScroll = function () {
    if (window.scrollY > 30) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---- Mobile menu ----
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  var closeMenu = function () { toggle.classList.remove("open"); links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });

  // ---- Scroll reveal ----
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 0.07 + "s"; io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // ---- Animated counters ----
  var counters = document.querySelectorAll(".stat-num[data-count]");
  var runCounter = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var dur = 1400, start = null;
    var step = function (ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  // ================= AI Assistant demo =================
  var fab = document.getElementById("chatFab");
  var win = document.getElementById("chatWindow");
  var closeBtn = document.getElementById("chatClose");
  var body = document.getElementById("chatBody");
  var form = document.getElementById("chatForm");
  var input = document.getElementById("chatText");
  var quick = document.getElementById("chatQuick");

  var openChat = function () { win.classList.add("open"); win.setAttribute("aria-hidden", "false"); fab.style.display = "none"; setTimeout(function () { input.focus(); }, 300); };
  var closeChat = function () { win.classList.remove("open"); win.setAttribute("aria-hidden", "true"); fab.style.display = ""; };
  fab.addEventListener("click", openChat);
  closeBtn.addEventListener("click", closeChat);

  var addMsg = function (text, who) {
    var m = document.createElement("div");
    m.className = "msg " + who;
    m.innerHTML = text;
    body.appendChild(m);
    body.scrollTop = body.scrollHeight;
    return m;
  };

  var typing = function () {
    var t = document.createElement("div");
    t.className = "msg bot typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(t);
    body.scrollTop = body.scrollHeight;
    return t;
  };

  // Simple intent matching for the demo
  var answer = function (q) {
    var s = q.toLowerCase();
    if (/(price|pricing|cost|how much|rate|\$|plan|subscription|monthly)/.test(s))
      return "We keep it simple with monthly subscriptions: <strong>Starter $149/mo</strong>, our most popular <strong>Growth $349/mo</strong>, and <strong>Pro $649/mo</strong> — all $0 down, cancel anytime. Prefer to own your site outright? One-time builds are available too. Want me to help you pick the right plan?";
    if (/(ai|chatbot|bot|assistant|receptionist|agent)/.test(s))
      return "Great question — I'm a demo of exactly that! 🤖 We build custom AI assistants that answer questions, book appointments, and capture leads 24/7. They're included with our <strong>Growth ($349/mo)</strong> and <strong>Pro ($649/mo)</strong> plans, or you can add one to any plan for <strong>$99–199/mo</strong>.";
    if (/(time|long|how fast|when|timeline|deadline)/.test(s))
      return "Most small-business sites launch in <strong>days, not months</strong>. After your free consultation we give you a clear timeline based on your project's scope.";
    if (/(seo|google|rank|search|traffic)/.test(s))
      return "SEO is built into our <strong>Growth ($349/mo)</strong> and <strong>Pro ($649/mo)</strong> plans to help the right customers find you on Google. Want to go bigger? A <strong>Premium SEO Campaign</strong> add-on runs $200–500/mo.";
    if (/(contact|call|book|consult|talk|email|phone|appointment)/.test(s))
      return "Let's talk! 📅 Book a <strong>free consultation</strong> by filling out the form on this page, emailing <a href='mailto:mylothetechguy@gmail.com'>mylothetechguy@gmail.com</a>, or calling Myles Wells at (270) 570-0790 or Trey Williams at (270) 231-1173.";
    if (/(hi|hello|hey|yo|sup|howdy)/.test(s))
      return "Hey there! 👋 I can tell you about our websites, AI assistants, pricing, or help you book a free consultation. What are you curious about?";
    if (/(who|what.*you.*do|services|offer)/.test(s))
      return "M&amp;T Services builds modern websites and custom AI assistants for small businesses. We handle design, AI chatbots, SEO, and content — pick a plan and we take it from there!";
    return "I'd love to help with that! For specifics, the best next step is a <strong>free consultation</strong> — use the contact form below, or call Myles Wells at (270) 570-0790. You can also ask me about pricing, AI assistants, or timelines. 🙂";
  };

  var respond = function (q) {
    var t = typing();
    setTimeout(function () {
      t.remove();
      addMsg(answer(q), "bot");
    }, 700 + Math.random() * 500);
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    addMsg(q, "user");
    input.value = "";
    respond(q);
  });

  var quickText = { pricing: "What are your prices?", ai: "Tell me about AI chatbots", time: "How long does it take?", contact: "I'd like to book a call" };
  quick.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      var q = quickText[b.getAttribute("data-q")] || b.textContent;
      addMsg(q, "user");
      respond(q);
    });
  });
})();
