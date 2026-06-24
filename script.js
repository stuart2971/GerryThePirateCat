/* ===========================================================
   Gerry the Pirate Cat — pre-launch hype page
   Countdown · real database sign-up (Supabase) · 3 mini games
   =========================================================== */
(function () {
  "use strict";

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */
  const CONFIG = {
    launchDate: new Date(2026, 11, 1, 0, 0, 0), // 1 Dec 2026 (month is 0-indexed)

    // Supabase project "gerry-pirate-cat". The publishable key is safe to ship
    // in the browser — the email table is private and only reachable through
    // two locked-down database functions (join_crew / crew_count).
    supabaseUrl: "https://zajmkkhpcxgkebkoycdb.supabase.co",
    supabaseKey: "sb_publishable_OIEeNvEHldEkRRKhyyF7cA_frXBtIpn",

    storageKeyJoined: "gerry_joined_email",

    mascotLines: [
      "Climb aboard, matey! 🏴‍☠️", "Arr — almost ready!", "Treasure awaits! 🪙",
      "I be savin' ye a seat!", "Hoist the sails! ⛵", "Try me games below! 🎮",
      "Dec 1st — mark it! 🗓️", "Adventure ahoy! 🗺️"
    ]
  };

  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ==========================================================
     SUPABASE (REST RPC — no SDK needed)
     ========================================================== */
  async function rpc(fn, body) {
    const res = await fetch(CONFIG.supabaseUrl + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: {
        apikey: CONFIG.supabaseKey,
        Authorization: "Bearer " + CONFIG.supabaseKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) throw new Error("rpc " + fn + " failed: " + res.status);
    return res.json();
  }
  const joinCrew = (email) => rpc("join_crew", { p_email: email }); // {ok, already, count}
  const fetchCrewCount = () => rpc("crew_count", {}); // integer

  /* ==========================================================
     COUNTDOWN
     ========================================================== */
  const cd = { days: $("#cdDays"), hours: $("#cdHours"), mins: $("#cdMins"), secs: $("#cdSecs") };
  function setNum(el, val) {
    const s = String(val).padStart(2, "0");
    if (el.textContent !== s) {
      el.textContent = s;
      if (!prefersReduced) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
    }
  }
  function tickCountdown() {
    let diff = CONFIG.launchDate - new Date();
    if (diff <= 0) {
      const wrap = $("#countdown");
      if (wrap && !wrap.dataset.done) {
        wrap.dataset.done = "1";
        wrap.innerHTML =
          '<p style="font-family:var(--font-display);font-weight:800;color:#fff;font-size:1.5rem;margin:0;text-shadow:0 2px 10px rgba(0,0,0,.5)">🎉 We&rsquo;ve set sail! Welcome aboard!</p>';
      }
      const cap = $(".cd-caption");
      if (cap) cap.textContent = "🚢 The adventure has begun!";
      return;
    }
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
    const m = Math.floor(diff / 60000);    diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    setNum(cd.days, d); setNum(cd.hours, h); setNum(cd.mins, m); setNum(cd.secs, s);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ==========================================================
     LIVE CREW COUNT
     ========================================================== */
  const countEls = [$("#countNum"), $("#countNum2")].filter(Boolean);
  let displayedCount = null;
  function renderCount(target, animated) {
    displayedCount = target;
    const lbl = document.getElementById("countLabel");
    if (lbl) lbl.textContent = target === 1 ? "future pirate aboard!" : "future pirates aboard!";
    countEls.forEach((el) => {
      const from = parseInt(String(el.textContent).replace(/\D/g, ""), 10) || 0;
      if (!animated || prefersReduced || from === target) {
        el.textContent = target.toLocaleString();
        return;
      }
      const start = performance.now(), dur = 700;
      (function step(now) {
        const t = clamp((now - start) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (target - from) * eased).toLocaleString();
        if (t < 1) requestAnimationFrame(step);
      })(start);
    });
  }
  // initial load
  fetchCrewCount()
    .then((n) => renderCount(typeof n === "number" ? n : 0, false))
    .catch(() => countEls.forEach((el) => (el.textContent = "0")));

  /* ==========================================================
     EMAIL SIGN-UP  (both forms talk to the database)
     ========================================================== */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showSuccess(formEl, email, already) {
    const name = esc((email.split("@")[0] || "matey").slice(0, 24));
    const headline = already ? "⚓ You're already aboard, " + name + "!" : "🎉 Welcome aboard, " + name + "!";
    const line = already
      ? "We've got your email safe — we'll shout the moment we set sail. ⛵"
      : "You're on the crew list — we'll give ye a shout the moment we set sail. ⛵";
    formEl.classList.add("is-done");
    formEl.innerHTML =
      '<div class="signup-success"><span class="big">' + headline + "</span><span>" + line + "</span></div>";
  }
  function flagJoinedEverywhere(email, already) {
    $$(".signup").forEach((f) => { if (!f.classList.contains("is-done")) showSuccess(f, email, already); });
  }

  async function handleSubmit(form, input, msg, btn, e) {
    e.preventDefault();
    const email = (input.value || "").trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      msg.textContent = "Hmm, that doesn't look like an email — try again!";
      msg.className = "signup__msg err";
      input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
      input.focus();
      return;
    }

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = "Hoisting the sails…";
    msg.textContent = ""; msg.className = "signup__msg";

    try {
      const result = await joinCrew(email);
      if (!result || result.ok === false) {
        throw new Error(result && result.error ? result.error : "unknown");
      }
      try { localStorage.setItem(CONFIG.storageKeyJoined, email); } catch (err) {}

      if (typeof result.count === "number") renderCount(result.count, true);

      const r = btn.getBoundingClientRect();
      burstConfetti(r.left + r.width / 2, r.top + r.height / 2, 34);
      if (!result.already) burstConfetti(window.innerWidth / 2, window.innerHeight * 0.2, 24);
      mascotSay(result.already ? "Already aboard, matey! ⚓" : "Yar! Welcome to the crew! 🎉");

      showSuccess(form, email, result.already);
      flagJoinedEverywhere(email, result.already);
    } catch (err) {
      btn.disabled = false; btn.textContent = label;
      msg.textContent = "Couldn't reach the crew roster — check your connection and try again.";
      msg.className = "signup__msg err";
    }
  }

  function wireForm(formId, inputId, msgId) {
    const form = $("#" + formId);
    if (!form) return;
    const input = $("#" + inputId), msg = $("#" + msgId), btn = form.querySelector("button");
    form.addEventListener("submit", (e) => handleSubmit(form, input, msg, btn, e));
    input.addEventListener("input", () => { if (msg.textContent) { msg.textContent = ""; msg.className = "signup__msg"; } });
  }
  wireForm("signupHero", "emailHero", "msgHero");
  wireForm("signupFinal", "emailFinal", "msgFinal");

  // Returning visitor (this browser already joined)? Show the thank-you right away.
  try {
    const joined = localStorage.getItem(CONFIG.storageKeyJoined);
    if (joined) flagJoinedEverywhere(joined, true);
  } catch (e) {}

  /* ==========================================================
     CONFETTI
     ========================================================== */
  const cvs = $("#confetti"), ctx = cvs.getContext("2d");
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const COLORS = ["#f5a623", "#e8472b", "#2bb3a3", "#ffffff", "#fde8b0", "#5b6fd6"];
  let parts = [], raf = null;

  function sizeCanvas() {
    cvs.width = window.innerWidth * DPR; cvs.height = window.innerHeight * DPR;
    cvs.style.width = window.innerWidth + "px"; cvs.style.height = window.innerHeight + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  function burstConfetti(x, y, n) {
    if (prefersReduced) return;
    n = n || 30;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 7;
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4,
        g: 0.22 + Math.random() * 0.12, size: 6 + Math.random() * 9,
        rot: Math.random() * 6, vr: -0.3 + Math.random() * 0.6,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        shape: Math.random() < 0.4 ? "circle" : "rect", life: 0
      });
    }
    if (!raf) raf = requestAnimationFrame(tickConfetti);
  }
  function tickConfetti() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    parts = parts.filter((p) => p.y < window.innerHeight + 40 && p.life < 280);
    for (const p of parts) {
      p.life++; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - p.life / 280); ctx.fillStyle = p.color;
      if (p.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(tickConfetti);
    else { raf = null; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }

  /* ==========================================================
     MASCOT (cursor follower)
     ========================================================== */
  const mascot = $("#mascot"), mImg = $(".mascot__img", mascot), mBubble = $("#mascotBubble");
  let mouseX = window.innerWidth * 0.6, mouseY = window.innerHeight * 0.4;
  let mpx = mouseX, mpy = mouseY, facing = 1, tBob = 0, lastMove = performance.now(), bubbleTimer = null;
  const finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function mascotSay(text) {
    if (!mBubble) return;
    mBubble.textContent = text; mBubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => mBubble.classList.remove("show"), 3600);
  }

  if (finePointer && mascot) {
    window.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; lastMove = performance.now(); });
    (function loopMascot() {
      tBob += 0.06;
      const dx = mouseX + 16 - mpx, dy = mouseY + 20 - mpy;
      mpx += dx * 0.14; mpy += dy * 0.14;
      if (Math.abs(dx) > 0.7) facing = dx < 0 ? -1 : 1;
      const bob = prefersReduced ? 0 : Math.sin(tBob) * 4;
      const tilt = prefersReduced ? 0 : clamp(dx * 0.4, -12, 12);
      mascot.style.transform = "translate(" + mpx + "px," + mpy + "px) rotate(" + tilt + "deg)";
      mImg.style.transform = "translateY(" + bob + "px) scaleX(" + facing + ")";
      requestAnimationFrame(loopMascot);
    })();
    setTimeout(() => mascotSay("Ahoy! I'm Gerry 🐱"), 1600);
    setInterval(() => {
      if (performance.now() - lastMove > 1800 && Math.random() < 0.9)
        mascotSay(CONFIG.mascotLines[(Math.random() * CONFIG.mascotLines.length) | 0]);
    }, 7000);
    window.addEventListener("pointerdown", () => {
      if (prefersReduced) return;
      mImg.animate(
        [{ transform: "translateY(0) scaleX(" + facing + ")" },
         { transform: "translateY(-16px) scaleX(" + facing + ")" },
         { transform: "translateY(0) scaleX(" + facing + ")" }],
        { duration: 320, easing: "ease-out" });
    });
  } else if (mascot) {
    mascot.style.display = "none";
  }

  /* ==========================================================
     GAME 1 · BUILD THE SCENE (drag Gerry to the wheel)
     ========================================================== */
  (function buildGame() {
    const stage = $("#buildStage"), chip = $("#dragChip"), target = $("#dropTarget");
    const badge = $("#placedBadge"), status = $("#buildStatus"), reset = $("#buildReset");
    if (!stage || !chip || !target) return;
    let dragging = false, placed = false, home = null, grabDX = 0, grabDY = 0;

    const sRect = () => stage.getBoundingClientRect();
    function setChip(x, y) { chip.style.left = x + "px"; chip.style.top = y + "px"; chip.style.right = "auto"; }
    function overTarget() {
      const c = chip.getBoundingClientRect(), t = target.getBoundingClientRect();
      const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
      return cx > t.left && cx < t.right && cy > t.top && cy < t.bottom;
    }
    chip.addEventListener("pointerdown", (e) => {
      if (placed) return;
      e.preventDefault();
      const sr = sRect(), cr = chip.getBoundingClientRect();
      if (!home) home = { x: cr.left - sr.left, y: cr.top - sr.top };
      setChip(cr.left - sr.left, cr.top - sr.top);
      chip.classList.add("dragging"); dragging = true;
      grabDX = e.clientX - cr.left; grabDY = e.clientY - cr.top;
      try { chip.setPointerCapture(e.pointerId); } catch (err) {}
    });
    chip.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const sr = sRect();
      let x = clamp(e.clientX - sr.left - grabDX, 0, sr.width - chip.offsetWidth);
      let y = clamp(e.clientY - sr.top - grabDY, 0, sr.height - chip.offsetHeight);
      setChip(x, y);
      target.classList.toggle("hot", overTarget());
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false; chip.classList.remove("dragging");
      if (overTarget()) {
        placed = true; target.classList.remove("hot");
        const sr = sRect(), tr = target.getBoundingClientRect();
        setChip(tr.left - sr.left + tr.width / 2 - chip.offsetWidth / 2,
                tr.top - sr.top + tr.height / 2 - chip.offsetHeight / 2);
        chip.classList.add("placed"); target.style.opacity = "0";
        if (badge) badge.classList.add("show");
        burstConfetti(tr.left + tr.width / 2, tr.top + tr.height / 2, 24);
        if (status) { status.textContent = "🎉 You did it! Gerry's at the helm!"; status.classList.add("win"); }
        mascotSay("Yar! Perfect spot! 🎉");
      } else {
        target.classList.remove("hot");
        if (home) setChip(home.x, home.y);
      }
    }
    chip.addEventListener("pointerup", endDrag);
    chip.addEventListener("pointercancel", endDrag);
    if (reset) reset.addEventListener("click", () => {
      placed = false; chip.classList.remove("placed", "dragging");
      chip.style.left = ""; chip.style.top = ""; chip.style.right = "";
      target.style.opacity = ""; if (badge) badge.classList.remove("show");
      if (status) { status.textContent = "👆 Grab Gerry and drop him on the dashed square."; status.classList.remove("win"); }
      home = null;
    });
  })();

  /* ==========================================================
     GAME 2 · TREASURE MAZE
     ========================================================== */
  (function mazeGame() {
    const grid = $("#mazeGrid"), status = $("#mazeStatus"), reset = $("#mazeReset"), dpad = $("#dpad");
    if (!grid) return;
    // # wall · . path · S start · E end (treasure)
    const MAP = [
      "#######",
      "#S....#",
      "#.###.#",
      "#...#.#",
      "#.#.#.#",
      "#.#..E#",
      "#######"
    ];
    const rows = MAP.length, cols = MAP[0].length;
    let start = { r: 1, c: 1 }, end = { r: 5, c: 5 }, pos = { r: 1, c: 1 }, won = false, cells = [];

    function build() {
      grid.style.gridTemplateColumns = "repeat(" + cols + ",1fr)";
      grid.innerHTML = ""; cells = [];
      for (let r = 0; r < rows; r++) {
        cells[r] = [];
        for (let c = 0; c < cols; c++) {
          const ch = MAP[r][c];
          const cell = document.createElement("div");
          cell.className = "cell " + (ch === "#" ? "wall" : "path");
          if (ch === "S") start = { r: r, c: c };
          if (ch === "E") { end = { r: r, c: c }; cell.classList.add("end"); cell.textContent = "💰"; }
          grid.appendChild(cell); cells[r][c] = cell;
        }
      }
      pos = { r: start.r, c: start.c }; won = false; draw();
      if (status) { status.textContent = "Tip: tap the maze first, then use your arrow keys."; status.classList.remove("win"); }
    }
    function draw() {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        cell.classList.remove("gerry");
        if (MAP[r][c] !== "#" && !(r === end.r && c === end.c)) cell.textContent = "";
        else if (r === end.r && c === end.c) cell.textContent = "💰";
      }
      const g = cells[pos.r][pos.c];
      g.classList.add("gerry"); g.textContent = "🐱";
    }
    function move(dr, dc) {
      if (won) return;
      const nr = pos.r + dr, nc = pos.c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return;
      if (MAP[nr][nc] === "#") return;
      pos = { r: nr, c: nc }; draw();
      if (pos.r === end.r && pos.c === end.c) {
        won = true;
        const rct = cells[pos.r][pos.c].getBoundingClientRect();
        burstConfetti(rct.left + rct.width / 2, rct.top + rct.height / 2, 40);
        if (status) { status.textContent = "🎉 Treasure found! Hooray!"; status.classList.add("win"); }
        mascotSay("Treasure! Well done, matey! 🪙");
      }
    }
    const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    grid.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      const map = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
      if (map[k]) { e.preventDefault(); const d = DIRS[map[k]]; move(d[0], d[1]); }
    });
    if (dpad) dpad.addEventListener("click", (e) => {
      const b = e.target.closest("[data-dir]"); if (!b) return;
      const d = DIRS[b.dataset.dir]; if (d) { grid.focus(); move(d[0], d[1]); }
    });
    if (reset) reset.addEventListener("click", build);
    build();
  })();

  /* ==========================================================
     GAME 3 · PIRATE MEMORY MATCH
     ========================================================== */
  (function matchGame() {
    const grid = $("#matchGrid"), status = $("#matchStatus"), reset = $("#matchReset");
    if (!grid) return;
    const ICONS = ["🐱", "🦜", "🗺️", "⛵"]; // 4 pairs (avoid ⚓ — that's the card back)
    let deck = [], first = null, lock = false, moves = 0, pairs = 0;

    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

    // Render the status line. Rewriting innerHTML each time keeps the counters
    // intact (no detached nodes) and lets the win message replace them cleanly.
    function renderStatus(winMsg) {
      if (!status) return;
      if (winMsg) { status.innerHTML = winMsg; status.classList.add("win"); }
      else {
        status.innerHTML = "Flips: <strong>" + moves + "</strong> · Pairs found: <strong>" + pairs + "</strong>/" + ICONS.length;
        status.classList.remove("win");
      }
    }

    function build() {
      deck = shuffle(ICONS.concat(ICONS));
      first = null; lock = false; moves = 0; pairs = 0;
      renderStatus();
      grid.innerHTML = "";
      deck.forEach((icon) => {
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "mcard"; btn.dataset.icon = icon;
        btn.innerHTML = '<span class="mcard__back">⚓</span><span class="mcard__front">' + icon + "</span>";
        btn.addEventListener("click", () => flip(btn));
        grid.appendChild(btn);
      });
    }
    function flip(btn) {
      if (lock || btn.classList.contains("flipped") || btn.classList.contains("matched")) return;
      btn.classList.add("flipped");
      if (!first) { first = btn; return; }
      moves++;
      if (first.dataset.icon === btn.dataset.icon) {
        first.classList.add("matched"); btn.classList.add("matched");
        first.disabled = true; btn.disabled = true;
        first = null; pairs++; renderStatus();
        if (pairs === ICONS.length) {
          renderStatus("🎉 You found them all in " + moves + " flips!");
          const r = grid.getBoundingClientRect();
          burstConfetti(r.left + r.width / 2, r.top + r.height / 2, 44);
          mascotSay("Sharp eyes, matey! 🦜");
        }
      } else {
        renderStatus();
        lock = true;
        const a = first, b = btn; first = null;
        setTimeout(() => { a.classList.remove("flipped"); b.classList.remove("flipped"); lock = false; }, 850);
      }
    }
    if (reset) reset.addEventListener("click", build);
    build();
  })();

  /* ==========================================================
     SCROLL REVEAL + hero parallax
     ========================================================== */
  const heroArt = $(".hero__art");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || 0;
      if (heroArt && !prefersReduced && y < window.innerHeight)
        heroArt.style.transform = "scale(1.06) translateY(" + y * 0.18 + "px)";
      ticking = false;
    });
  }, { passive: true });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach((el) => io.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("in"));
  }
})();
