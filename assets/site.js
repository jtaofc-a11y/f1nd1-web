// F1ND1 website — language switch, the living sky, and the motion layer.
// Everything degrades: without GSAP or with reduced motion the page is a
// complete, readable static page.
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  if (!hasGsap) root.classList.add("no-gsap");

  // ── Language ──────────────────────────────────────────────────────────────
  var dict = window.F1ND1_I18N || {};
  var store = {
    get: function () { try { return localStorage.getItem("f1nd1.lang"); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem("f1nd1.lang", v); } catch (e) {} },
  };
  function initialLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "sk" || q === "en") return q;
    var saved = store.get();
    if (saved === "sk" || saved === "en") return saved;
    var nav = (navigator.language || "sk").toLowerCase();
    return nav.indexOf("sk") === 0 || nav.indexOf("cs") === 0 ? "sk" : "en";
  }
  var lang = initialLang();

  function applyLang(next) {
    lang = next;
    var t = dict[lang] || {};
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = t[el.getAttribute("data-i18n")];
      if (typeof v === "string") el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var v = t[el.getAttribute("data-i18n-html") + "-html"];
      if (typeof v === "string") el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var v = t[el.getAttribute("data-i18n-placeholder")];
      if (typeof v === "string") el.setAttribute("placeholder", v);
    });
    if (t["meta.title"]) document.title = t["meta.title"];
    root.lang = lang;
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    splitManifesto();
    store.set(lang);
    if (hasGsap) window.ScrollTrigger.refresh();
  }
  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function () { if (b.getAttribute("data-lang") !== lang) applyLang(b.getAttribute("data-lang")); });
  });

  // ── "Coming soon" links ───────────────────────────────────────────────────
  var toast = document.querySelector(".toast");
  var toastTimer;
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a.soon");
    if (!a) return;
    e.preventDefault();
    toast.textContent = (dict[lang] || {})["toast.soon"] || "";
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  });

  // ── Pre-launch form ───────────────────────────────────────────────────────
  // open stays false until the lawyer's privacy notice and consent wording exist
  // (apps/web/README.md). consentVersion names the wording the person ticked —
  // change it whenever the consent text changes.
  var PRELAUNCH = {
    open: false,
    endpoint: "https://htnnwzlzqyirnuddamte.supabase.co/functions/v1/prelaunch-signup",
    consentVersion: "web-2026-10-11",
  };
  var form = document.querySelector(".pl-form");
  if (form) {
    var msg = form.querySelector(".pl-msg");
    var say = function (key, good) {
      msg.textContent = (dict[lang] || {})[key] || "";
      msg.className = "pl-msg " + (good ? "good" : "bad");
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say("pl.badEmail");
      if (!form.consent.checked) return say("pl.needConsent");
      if (!PRELAUNCH.open) return say("pl.closed", true);
      var btn = form.querySelector("button");
      btn.disabled = true;
      fetch(PRELAUNCH.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, locale: lang, wantsTester: form.tester.checked, consentVersion: PRELAUNCH.consentVersion, website: form.website.value }),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          if (j.status === "ok") { form.reset(); form.classList.add("done"); return say("pl.ok", true); }
          say(j.status === "bad_email" ? "pl.badEmail" : j.status === "rate_limited" ? "pl.limited" : j.status === "no_consent" ? "pl.needConsent" : "pl.error");
        })
        .catch(function () { say("pl.error"); })
        .then(function () { btn.disabled = false; });
    });
  }

  // ── Nav state ─────────────────────────────────────────────────────────────
  var nav = document.querySelector(".nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 30); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── The living sky: aurora, stars, a slow constellation ───────────────────
  var canvas = document.getElementById("sky");
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var stars = [];
  var mouse = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4 };
  var auroras = [
    { c: [155, 92, 246], x: 0.82, y: 0.12, r: 0.62, s: 0.00011, p: 0 },
    { c: [222, 75, 160], x: 0.12, y: 0.78, r: 0.58, s: 0.00014, p: 2 },
    { c: [242, 69, 92], x: 0.55, y: 0.55, r: 0.44, s: 0.00009, p: 4 },
    { c: [120, 40, 200], x: 0.3, y: 0.2, r: 0.38, s: 0.00012, p: 1 },
  ];
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.round(Math.min(160, (W * H) / 9000));
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.8 + 0.2, tw: Math.random() * Math.PI * 2 });
    }
  }
  var scrollY = 0;
  window.addEventListener("scroll", function () { scrollY = window.scrollY; }, { passive: true });
  function frame(t) {
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#07030f"); g.addColorStop(1, "#0b0414");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    var scrollShift = (scrollY / Math.max(1, document.body.scrollHeight - H)) || 0;
    for (var a = 0; a < auroras.length; a++) {
      var o = auroras[a];
      var px = (o.x + Math.sin(t * o.s + o.p) * 0.08 + (mouse.x - 0.5) * 0.06) * W;
      var py = (o.y + Math.cos(t * o.s * 1.3 + o.p) * 0.07 + (mouse.y - 0.5) * 0.05 - scrollShift * 0.25 * (a % 2 ? -1 : 1)) * H;
      var rr = o.r * Math.max(W, H);
      var rg = ctx.createRadialGradient(px, py, 0, px, py, rr);
      rg.addColorStop(0, "rgba(" + o.c.join(",") + ",0.30)");
      rg.addColorStop(0.45, "rgba(" + o.c.join(",") + ",0.09)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = "source-over";
    // Stars with depth parallax and twinkle.
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var sx = s.x + (mouse.x - 0.5) * 30 * s.z;
      var sy = ((s.y - scrollY * 0.15 * s.z) % H + H) % H;
      var al = 0.35 + 0.45 * Math.sin(t * 0.0015 + s.tw) * s.z;
      ctx.fillStyle = "rgba(245,235,255," + Math.max(0.05, al) + ")";
      ctx.beginPath(); ctx.arc(sx, sy, s.z * 1.3, 0, Math.PI * 2); ctx.fill();
      s.px = sx; s.py = sy;
    }
    // A faint constellation between near stars, close to the pointer.
    if (finePointer) {
      var mx = mouse.x * W, my = mouse.y * H;
      ctx.lineWidth = 0.6;
      for (var j = 0; j < stars.length; j++) {
        var p = stars[j];
        var dm = Math.hypot(p.px - mx, p.py - my);
        if (dm > 220) continue;
        for (var k = j + 1; k < stars.length; k++) {
          var q = stars[k];
          var d = Math.hypot(p.px - q.px, p.py - q.py);
          if (d < 90) {
            ctx.strokeStyle = "rgba(240,120,200," + (0.22 * (1 - d / 90) * (1 - dm / 220)) + ")";
            ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(q.px, q.py); ctx.stroke();
          }
        }
      }
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);

  // ── Pointer: glow, sky, phone tilt ────────────────────────────────────────
  var glow = document.querySelector(".cursor-glow");
  var phone = document.querySelector(".phone");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  if (finePointer && !reduce) {
    window.addEventListener("pointermove", function (e) {
      mouse.tx = e.clientX / W; mouse.ty = e.clientY / H;
      glow.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0)";
      var dx = e.clientX / W - 0.5, dy = e.clientY / H - 0.5;
      if (phone && window.scrollY < H) {
        phone.style.transform = "translateY(-50%) rotateY(" + (-14 + dx * 22) + "deg) rotateX(" + (6 - dy * 14) + "deg)";
        chips.forEach(function (c) {
          var d = parseFloat(c.getAttribute("data-depth") || "1");
          c.style.translate = (dx * 26 * d) + "px " + (dy * 20 * d) + "px";
        });
      }
    }, { passive: true });

    // Magnetic buttons.
    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.25 + "px," + (e.clientY - r.top - r.height / 2) * 0.35 + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });

    // 3D cards with a spotlight that follows the pointer.
    document.querySelectorAll(".tilt").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", x * 100 + "%"); el.style.setProperty("--my", y * 100 + "%");
        el.style.transform = "perspective(900px) rotateY(" + (x - 0.5) * 10 + "deg) rotateX(" + (0.5 - y) * 10 + "deg) translateZ(0)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  } else if (glow) {
    glow.style.display = "none";
  }

  // ── Manifesto words ───────────────────────────────────────────────────────
  var HOT = { sk: ["jedného,", "prečo.", "F1ND1."], en: ["one", "why.", "F1ND1."] };
  function splitManifesto() {
    var p = document.querySelector(".manifesto .words");
    if (!p) return;
    var text = (dict[lang] || {})["manifesto"] || p.textContent;
    p.innerHTML = "";
    text.split(" ").forEach(function (w, i, arr) {
      var s = document.createElement("span");
      s.className = "w" + ((HOT[lang] || []).indexOf(w) >= 0 ? " hot" : "");
      s.textContent = w;
      p.appendChild(s);
      if (i < arr.length - 1) p.appendChild(document.createTextNode(" "));
    });
    if (reduce || !hasGsap) p.querySelectorAll(".w").forEach(function (w) { w.classList.add("lit"); });
    else lightWords();
  }
  var wordsTrigger;
  function lightWords() {
    var words = Array.prototype.slice.call(document.querySelectorAll(".manifesto .w"));
    if (wordsTrigger) wordsTrigger.kill();
    wordsTrigger = window.ScrollTrigger.create({
      trigger: ".manifesto", start: "top 75%", end: "bottom 45%", scrub: true,
      onUpdate: function (self) {
        var n = Math.round(self.progress * words.length);
        words.forEach(function (w, i) { w.classList.toggle("lit", i < n); });
      },
    });
  }

  // ── Motion (GSAP) ─────────────────────────────────────────────────────────
  var intro = document.querySelector(".intro");
  function startMotion() {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    // Intro curtain → hero.
    var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(".intro-mark", { scale: 0.7, opacity: 0, duration: 0.9 })
      .to(".intro-mark", { scale: 1.08, duration: 0.5, ease: "power2.in" })
      .to(intro, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, "-=0.1")
      .set(intro, { display: "none" })
      .from(".nav", { y: -40, opacity: 0, duration: 0.9 }, "-=0.5")
      .from(".hero h1 .line > span", { yPercent: 110, duration: 1.2, stagger: 0.1 }, "-=0.7")
      .from(".hero-in", { y: 30, opacity: 0, duration: 1, stagger: 0.08 }, "-=0.9")
      .from(".stage", { y: 120, opacity: 0, duration: 1.6 }, "-=1.2")
      .from(".radar", { scale: 0.6, opacity: 0, duration: 1.6 }, "-=1.5")
      .from(".chip", { scale: 0.6, opacity: 0, duration: 0.9, stagger: 0.15, ease: "back.out(1.8)" }, "-=1");

    // The phone drifts as the hero scrolls away.
    gsap.to(".stage", { yPercent: 18, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero-copy", { yPercent: -10, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "center top", end: "bottom top", scrub: true } });

    // Section reveals.
    gsap.set(".reveal", { y: 60, opacity: 0 });
    window.ScrollTrigger.batch(".reveal", {
      start: "top 88%",
      onEnter: function (els) { gsap.to(els, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.09, overwrite: true }); },
    });

    // Horizontal story, desktop only.
    var mm = gsap.matchMedia();
    mm.add("(min-width: 761px)", function () {
      var track = document.querySelector(".story-track");
      var bar = document.querySelector(".story-progress span");
      var dist = function () { return track.scrollWidth - window.innerWidth + 80; };
      gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: ".story", pin: ".story-pin", start: "top top", end: function () { return "+=" + dist(); },
          scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: function (self) { bar.style.width = self.progress * 100 + "%"; },
        },
      });
    });

    // Small moments.
    window.ScrollTrigger.create({ trigger: ".meter", start: "top 85%", once: true, onEnter: function () {
      var m = document.querySelector(".meter span"); m.style.width = m.getAttribute("data-v");
    } });
    window.ScrollTrigger.create({ trigger: ".room", start: "top 75%", once: true, onEnter: function () { document.querySelector(".room").classList.add("on"); } });
    gsap.from(".final-title .accent", { backgroundPosition: "200% 0", scrollTrigger: { trigger: ".final", start: "top 80%", end: "bottom bottom", scrub: true } });
  }

  function staticPage() {
    if (intro) intro.style.display = "none";
    var m = document.querySelector(".meter span"); if (m) m.style.width = m.getAttribute("data-v");
    var room = document.querySelector(".room"); if (room) room.classList.add("on");
  }

  applyLang(lang);
  if (hasGsap && !reduce) {
    startMotion();
    lightWords();
  } else {
    staticPage();
  }
})();
