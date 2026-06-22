/* ===== NAV ===== */
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', open);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

/* ===== REVEAL ON SCROLL ===== */
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => entry.target.classList.add('in-view'), delay);
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => {
  const siblings = el.parentElement.querySelectorAll('.reveal');
  el.dataset.delay = Array.from(siblings).indexOf(el) * 90;
  io.observe(el);
});

/* ===== CONTACT FORM ===== */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.textContent = '✓ Message Sent — John will be in touch!';
    btn.disabled = true;
    btn.style.background = '#16224a';
    btn.style.color = '#fff';
    form.reset();
  });
}

/* ===== CHECKOUT FLOW ===== */
(function () {
  const overlay   = document.getElementById('checkoutOverlay');
  if (!overlay) return;
  const modal     = overlay.querySelector('.checkout-modal');
  const closeBtn  = document.getElementById('checkoutClose');
  const steps     = document.querySelectorAll('#checkoutSteps .cs-step');
  const panes     = [document.getElementById('pane-1'), document.getElementById('pane-2'), document.getElementById('pane-3')];
  const fmt = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 });
  let current = { plan: '', price: 0 };

  function setStep(n) {
    panes.forEach((p, i) => p.hidden = (i !== n - 1));
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === n - 1);
      s.classList.toggle('is-done', i < n - 1);
    });
  }
  function open(plan, price) {
    current = { plan, price };
    document.getElementById('osPlan').textContent  = plan;
    document.getElementById('osPlan2').textContent = plan;
    document.getElementById('osAmount').textContent  = fmt(price);
    document.getElementById('osAmount2').textContent = fmt(price);
    document.getElementById('payAmt').textContent    = fmt(price);
    setStep(1);
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.enroll-btn').forEach(btn => {
    btn.addEventListener('click', () => open(btn.dataset.plan, btn.dataset.price));
  });
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

  // Step 1 -> 2
  document.getElementById('toPayment').addEventListener('click', () => {
    const name = document.getElementById('ckName').value.trim();
    const email = document.getElementById('ckEmail').value.trim();
    if (!name || !email) { alert('Please enter your name and email so we can send your course access.'); return; }
    document.getElementById('successEmail').textContent = email;
    setStep(2);
  });
  document.getElementById('backToDetails').addEventListener('click', () => setStep(1));

  // Card field formatting
  const cardEl = document.getElementById('ckCard');
  cardEl.addEventListener('input', () => {
    let v = cardEl.value.replace(/\D/g, '').slice(0, 16);
    cardEl.value = v.replace(/(.{4})/g, '$1 ').trim();
  });
  const expEl = document.getElementById('ckExp');
  expEl.addEventListener('input', () => {
    let v = expEl.value.replace(/\D/g, '').slice(0, 4);
    expEl.value = v.length > 2 ? v.slice(0, 2) + ' / ' + v.slice(2) : v;
  });
  document.getElementById('ckCvc').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
  });

  // Pay -> success
  const payBtn = document.getElementById('payNow');
  payBtn.addEventListener('click', () => {
    if (document.getElementById('ckCard').value.replace(/\s/g, '').length < 13) {
      alert('Please enter a card number. (Demo — use any digits.)'); return;
    }
    const original = payBtn.innerHTML;
    payBtn.disabled = true;
    payBtn.textContent = 'Processing…';
    setTimeout(() => {
      document.getElementById('successPlan').textContent = current.plan + ' — ' + fmt(current.price);
      setStep(3);
      payBtn.disabled = false;
      payBtn.innerHTML = original;
    }, 1100);
  });
  document.getElementById('successDone').addEventListener('click', close);
})();

/* ===== AI CHAT ASSISTANT ===== */
(function () {
  const widget   = document.getElementById('chatWidget');
  if (!widget) return;
  const launcher = document.getElementById('chatLauncher');
  const panel    = document.getElementById('chatPanel');
  const body     = document.getElementById('chatBody');
  const inputForm= document.getElementById('chatInput');
  const field    = document.getElementById('chatField');
  const quick    = document.getElementById('chatQuick');

  // Knowledge base — keyword matched
  const KB = [
    { k: ['report', 'expert', 'opinion', 'documentation', 'insurance', 'legal', 'claim'],
      a: "John provides <strong>fact-based expert reports</strong> for roofing material ID, availability, and repair methods — perfect for insurance or legal disputes. Pricing is custom to your case. <a href='#contact'>Request a quote here →</a>" },
    { k: ['online', 'self', 'self-paced', 'library', 'video course'],
      a: "The <strong>Online Classes</strong> are 15+ hours of pro training you can take anytime. Get a single course for <strong>$149</strong>, or the <strong>Complete Library for $499</strong> (one-time, lifetime access). <a href='#enroll'>Enroll here →</a>" },
    { k: ['price', 'cost', 'how much', 'pricing', 'fee', 'rate', '$'],
      a: "Here's the quick rundown:<br>• <strong>Single Course</strong> — $149<br>• <strong>Complete Library</strong> (15+ hrs) — $499<br>• <strong>Team License</strong> (up to 10) — $1,999<br>Expert reports &amp; private classes are custom-quoted. <a href='#enroll'>See plans →</a>" },
    { k: ['enroll', 'sign up', 'signup', 'register', 'buy', 'purchase', 'pay', 'checkout', 'book'],
      a: "Easy — head to the <a href='#enroll'>Enroll section</a>, pick your plan, and check out in under a minute. You get instant access and a receipt by email. Want me to recommend a plan?" },
    { k: ['team', 'crew', 'company', 'group', 'staff', 'employees'],
      a: "The <strong>Team License ($1,999)</strong> covers up to 10 people, includes a progress dashboard and a group onboarding session with John. Bigger crew? <a href='#contact'>Ask about volume pricing →</a>" },
    { k: ['private', 'one-on-one', 'one on one', 'custom class', 'personal'],
      a: "<strong>Private Classes</strong> give your team individualized, advanced training built around your needs. These are scheduled directly with John — <a href='#contact'>reach out here →</a>" },
    { k: ['group class', 'in person', 'in-person', 'classroom'],
      a: "<strong>Group Classes</strong> are structured courses covering best practices, methodology, and documentation. <a href='#contact'>Get in touch</a> to find the next session." },
    { k: ['car', 'c.a.r', 'approach', 'method', 'framework', 'compatibility', 'availability', 'repairability'],
      a: "The <strong>C.A.R. Approach</strong> is John's framework for evaluating any roof:<br>• <strong>C</strong>ompatibility — do the components work together?<br>• <strong>A</strong>vailability — is the material discontinued?<br>• <strong>R</strong>epairability — can it be objectively repaired?<br>It keeps every assessment clear and on the record." },
    { k: ['who', 'john', 'about', 'senac', 'experience', 'qualified'],
      a: "<strong>John Senac</strong> is a roofing consultant &amp; educator who provides the facts, documentation, and training pros need — not guru hype. \"Ditch the Guru. Work With a Pro.\"" },
    { k: ['contact', 'call', 'phone', 'email', 'reach', 'talk', 'get in touch'],
      a: "You can reach John through the <a href='#contact'>Get in Touch form</a> — he replies personally. Tell him about your project, team, or the report you need." },
    { k: ['shingle', 'discontinued', 'material', 'product', 'matching', 'compatible'],
      a: "Discontinued and mismatched shingles are exactly John's specialty — he documents compatibility, availability, and repairability so you have proof, not guesswork. An <a href='#contact'>expert report</a> or the <a href='#enroll'>online library</a> both cover this." },
    { k: ['hi', 'hey', 'hello', 'yo', 'sup', 'howdy'],
      a: "Hey there! 👋 I can help with expert reports, classes, pricing, or enrolling. What are you looking for?" },
    { k: ['thank', 'thanks', 'appreciate'],
      a: "Anytime! 🙌 Ready to get started? <a href='#enroll'>Enroll here</a> or <a href='#contact'>message John directly</a>." },
    { k: ['refund', 'guarantee', 'money back'],
      a: "Great question — refund terms are handled case by case. <a href='#contact'>Drop John a quick message</a> and he'll take care of you." },
  ];
  const FALLBACK = "Good question! I'd point you to John for that one — <a href='#contact'>send him a quick message here</a> and he'll get right back to you. In the meantime, I can help with <strong>pricing</strong>, <strong>expert reports</strong>, <strong>classes</strong>, or <strong>enrolling</strong>.";

  function answer(text) {
    const q = text.toLowerCase();
    let best = null, bestScore = 0;
    KB.forEach(item => {
      const score = item.k.reduce((s, kw) => s + (q.includes(kw) ? kw.length : 0), 0);
      if (score > bestScore) { bestScore = score; best = item; }
    });
    return best ? best.a : FALLBACK;
  }

  function addMsg(html, who) {
    const el = document.createElement('div');
    el.className = 'chat-msg ' + who;
    el.innerHTML = '<p>' + html + '</p>';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }
  function botReply(text) {
    const typing = document.createElement('div');
    typing.className = 'chat-msg bot chat-typing';
    typing.innerHTML = '<p><span></span><span></span><span></span></p>';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    setTimeout(() => {
      typing.remove();
      addMsg(answer(text), 'bot');
    }, 650 + Math.random() * 500);
  }
  function send(text) {
    if (!text.trim()) return;
    addMsg(text.replace(/</g, '&lt;'), 'user');
    botReply(text);
    quick.style.display = 'none';
  }

  launcher.addEventListener('click', () => {
    const open = widget.classList.toggle('open');
    panel.setAttribute('aria-hidden', String(!open));
    if (open) setTimeout(() => field.focus(), 300);
  });
  inputForm.addEventListener('submit', e => {
    e.preventDefault();
    send(field.value);
    field.value = '';
  });
  quick.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => send(b.dataset.q));
  });
})();
