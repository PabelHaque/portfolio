/* ============================================================
   Rendering + interaction. No dependencies, no build step.
   Content lives in data.js — this file never needs editing to
   add a project.
   ============================================================ */

(function () {
  "use strict";

  var D = window.PORTFOLIO || {};
  var REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ============================================================
     GLYPHS — one small SVG per project category.
     Add a key here and reference it as glyph: "<key>" in data.js.
     Classes: .a accent stroke · .b faint stroke · .fa accent fill
              .fb faint fill · .pulse animates on hover · .draw draws in
     ============================================================ */

  var GLYPHS = {
    pipeline:
      '<svg viewBox="0 0 200 200" fill="none" stroke-width="1.5" aria-hidden="true">' +
        '<path class="b draw" d="M28 60 H172 a20 20 0 0 1 0 40 H28 a20 20 0 0 0 0 40 H172"/>' +
        '<g class="fb">' +
          '<circle cx="28" cy="60" r="3.5"/><circle cx="76" cy="60" r="3.5"/><circle cx="124" cy="60" r="3.5"/>' +
          '<circle cx="172" cy="100" r="3.5"/><circle cx="100" cy="100" r="3.5"/>' +
          '<circle cx="76" cy="140" r="3.5"/><circle cx="124" cy="140" r="3.5"/>' +
        '</g>' +
        '<g class="fa pulse"><circle cx="52" cy="60" r="6"/></g>' +
        '<g class="fa pulse" style="animation-delay:.2s"><circle cx="148" cy="60" r="6"/></g>' +
        '<g class="fa pulse" style="animation-delay:.4s"><circle cx="52" cy="100" r="6"/></g>' +
        '<g class="fa pulse" style="animation-delay:.6s"><circle cx="172" cy="140" r="6"/></g>' +
      '</svg>',

    cascade:
      '<svg viewBox="0 0 200 200" fill="none" stroke-width="1.5" aria-hidden="true">' +
        '<g class="b">' +
          '<path d="M100 36 V60 M100 60 H44 V84 M100 60 H156 V84 M100 60 V84"/>' +
          '<path d="M44 84 H26 V110 M44 84 V110 M44 84 H62 V110"/>' +
          '<path d="M100 84 H82 V110 M100 84 V110 M100 84 H118 V110"/>' +
          '<path d="M156 84 H138 V110 M156 84 V110 M156 84 H174 V110"/>' +
        '</g>' +
        '<g class="fb">' +
          '<rect x="22" y="110" width="8" height="34" rx="2"/><rect x="40" y="110" width="8" height="52" rx="2"/><rect x="58" y="110" width="8" height="22" rx="2"/>' +
          '<rect x="78" y="110" width="8" height="46" rx="2"/><rect x="96" y="110" width="8" height="30" rx="2"/><rect x="114" y="110" width="8" height="58" rx="2"/>' +
          '<rect x="134" y="110" width="8" height="26" rx="2"/><rect x="152" y="110" width="8" height="40" rx="2"/><rect x="170" y="110" width="8" height="50" rx="2"/>' +
        '</g>' +
        '<g class="fa"><circle cx="44" cy="60" r="3.5"/><circle cx="100" cy="60" r="3.5"/><circle cx="156" cy="60" r="3.5"/></g>' +
        '<g class="fa pulse"><circle cx="100" cy="36" r="7"/></g>' +
        '<path class="a" d="M22 176 H178" stroke-dasharray="3 5"/>' +
      '</svg>',

    funnel:
      '<svg viewBox="0 0 200 200" fill="none" stroke-width="1.5" aria-hidden="true">' +
        '<path class="b draw" d="M30 44 H170 L128 104 V160 H72 V104 Z"/>' +
        '<g class="fb">' +
          '<circle cx="46" cy="30" r="3"/><circle cx="66" cy="22" r="3"/><circle cx="86" cy="32" r="3"/><circle cx="106" cy="20" r="3"/>' +
          '<circle cx="126" cy="30" r="3"/><circle cx="146" cy="24" r="3"/><circle cx="60" cy="62" r="3"/><circle cx="96" cy="70" r="3"/>' +
          '<circle cx="134" cy="60" r="3"/><circle cx="116" cy="88" r="3"/><circle cx="82" cy="92" r="3"/>' +
        '</g>' +
        '<g class="fa pulse"><circle cx="100" cy="124" r="5"/></g>' +
        '<g class="fa pulse" style="animation-delay:.3s"><circle cx="100" cy="146" r="5"/></g>' +
        '<path class="a" d="M64 176 H136" />' +
        '<path class="a" d="M78 186 H122" opacity=".5"/>' +
      '</svg>',

    hierarchy:
      '<svg viewBox="0 0 200 200" fill="none" stroke-width="1.5" aria-hidden="true">' +
        '<g class="b">' +
          '<path d="M86 34 H114 L120 54 H80 Z"/>' +
          '<path d="M74 62 H126 L134 82 H66 Z"/>' +
          '<path d="M60 90 H140 L150 110 H50 Z"/>' +
          '<path d="M46 118 H154 L166 138 H34 Z"/>' +
          '<path d="M32 146 H168 L182 166 H18 Z"/>' +
        '</g>' +
        '<path class="fa" d="M60 90 H140 L150 110 H50 Z" opacity=".22"/>' +
        '<path class="a" d="M60 90 H140 L150 110 H50 Z"/>' +
        '<g class="fa pulse"><circle cx="100" cy="100" r="4"/></g>' +
        '<path class="a" d="M28 100 H42 M158 100 H172" opacity=".7"/>' +
      '</svg>',

    code:
      '<svg viewBox="0 0 200 200" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
        '<path class="b" d="M70 50 L38 100 L70 150 M130 50 L162 100 L130 150"/>' +
        '<path class="a draw" d="M112 44 L88 156"/>' +
        '<g class="fa pulse"><circle cx="100" cy="100" r="4"/></g>' +
      '</svg>'
  };

  function glyph(name) {
    return '<div class="glyph">' + (GLYPHS[name] || GLYPHS.code) + "</div>";
  }

  /* ---------- stats ---------- */

  function renderStats(mount) {
    (D.stats || []).forEach(function (s, i) {
      var node = el("div", "stat reveal",
        '<b data-count="' + esc(s.n) + '">' + (REDUCED ? esc(s.n) : "0") + "</b><span>" + esc(s.label) + "</span>");
      node.setAttribute("data-delay", String(Math.min(i, 3)));
      mount.appendChild(node);
    });
  }

  function countUp(node) {
    var raw = node.getAttribute("data-count") || "";
    var target = parseFloat(raw.replace(/[^0-9.]/g, ""));
    if (isNaN(target)) { node.textContent = raw; return; }
    var hasComma = raw.indexOf(",") !== -1;
    var suffix = raw.replace(/^[0-9.,]+/, "");
    var start = null, dur = 1400;

    function fmt(v) {
      var s = Math.round(v).toString();
      if (hasComma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return s + suffix;
    }
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      var e = 1 - Math.pow(2, -10 * t);          // easeOutExpo
      node.textContent = fmt(target * e);
      if (t < 1) requestAnimationFrame(step); else node.textContent = fmt(target);
    }
    requestAnimationFrame(step);
  }

  /* ---------- project cards ---------- */

  function cardInner(p, i) {
    var facts = (p.facts || []).map(function (f) {
      return "<span>" + esc(f.k) + " &middot; <b>" + esc(f.v) + "</b></span>";
    }).join("");

    var tags = (p.tags || []).map(function (t) {
      return '<span class="tag">' + esc(t) + "</span>";
    }).join("");

    var isPublic = p.visibility === "public";
    var state = isPublic
      ? '<span class="repo-state is-public"><span class="pip"></span>Public repository</span>'
      : '<span class="repo-state"><span class="pip"></span>Private repo &mdash; walkthrough on request</span>';

    var action = p.page
      ? '<span class="readmore">Read the case study <span class="arrow">&rarr;</span></span>'
      : (isPublic && p.repo
          ? '<span class="readmore">View on GitHub <span class="arrow">&rarr;</span></span>'
          : "");

    var principle = p.principle
      ? '<p class="principle"><span class="k">The rule it keeps</span><span class="v">' + esc(p.principle) + "</span></p>"
      : "";

    return '<span class="idx">' + pad(i + 1) + "</span>" +
           "<div>" +
             '<span class="kicker">' + esc(p.kicker || "") + (p.year ? " &middot; " + esc(p.year) : "") + "</span>" +
             "<h3>" + esc(p.title) + "</h3>" +
             principle +
             '<p class="summary">' + esc(p.summary) + "</p>" +
             (facts ? '<div class="card-facts">' + facts + "</div>" : "") +
             (tags ? '<div class="tags">' + tags + "</div>" : "") +
             '<div class="card-foot">' + state + action + "</div>" +
           "</div>" +
           glyph(p.glyph);
  }

  function renderProjects(mount) {
    (D.projects || []).forEach(function (p, i) {
      var href = p.page || (p.visibility === "public" ? p.repo : "");
      var node;
      if (href) {
        node = el("a", "card reveal spot");
        node.href = href;
        if (!p.page) { node.target = "_blank"; node.rel = "noopener"; }
        node.setAttribute("aria-label", p.title);
      } else {
        node = el("div", "card reveal spot");
      }
      node.innerHTML = cardInner(p, i);
      mount.appendChild(node);
    });
    var c = document.getElementById("project-count");
    if (c) c.textContent = pad((D.projects || []).length) + " systems";
  }

  /* ---------- rotating headline ---------- */

  function initRotator() {
    var word = document.getElementById("rot-word");
    var phrases = (D.hero && D.hero.phrases) || [];
    if (!word || phrases.length < 2) return;
    word.textContent = phrases[0];
    if (REDUCED) return;

    var i = 0, paused = false, HOLD = 2600, SWAP = 380;
    var hero = word.closest(".hero");
    if (hero) {
      hero.addEventListener("pointerenter", function () { paused = true; });
      hero.addEventListener("pointerleave", function () { paused = false; });
    }

    // The phrase sits on its own headline line (after a <br>), so a width
    // change never reflows the line above it — no width reservation needed.
    function tick() {
      if (paused || document.hidden) return;
      word.classList.add("out");
      setTimeout(function () {
        i = (i + 1) % phrases.length;
        word.textContent = phrases[i];
        word.classList.remove("out");
        word.classList.add("pre");
        // force a frame so the "pre" state paints before we animate in
        requestAnimationFrame(function () { requestAnimationFrame(function () { word.classList.remove("pre"); }); });
      }, SWAP);
    }
    setInterval(tick, HOLD + SWAP);
  }

  /* ---------- stack ---------- */

  function renderSkills(mount) {
    (D.skills || []).forEach(function (g, i) {
      var items = (g.items || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
      var node = el("div", "stack-block reveal", "<h3>" + esc(g.group) + "</h3><ul>" + items + "</ul>");
      node.setAttribute("data-delay", String(Math.min(i, 3)));
      mount.appendChild(node);
    });
  }

  /* ---------- contact ---------- */

  function renderContact(mount) {
    var p = D.profile || {};
    var rows = [
      { k: "GitHub",   v: p.github,   href: p.github, show: (p.github || "").replace(/^https?:\/\//, "") },
      { k: "Email",    v: p.email,    href: p.email ? "mailto:" + p.email : "", show: p.email },
      { k: "LinkedIn", v: p.linkedin, href: p.linkedin, show: (p.linkedin || "").replace(/^https?:\/\/(www\.)?/, "") },
      { k: "Résumé",   v: p.resume,   href: p.resume, show: "Download PDF" },
      { k: "Based in", v: p.location, href: "", show: p.location }
    ];
    rows.forEach(function (r) {
      if (!r.v) return;
      var inner = '<span class="k">' + esc(r.k) + '</span><span class="v">' + esc(r.show) + "</span>";
      var node;
      if (r.href) {
        node = el("a", "contact-row", inner);
        node.href = r.href;
        if (/^https?:/.test(r.href)) { node.target = "_blank"; node.rel = "noopener"; }
      } else {
        node = el("div", "contact-row", inner);
      }
      mount.appendChild(node);
    });
  }

  /* ---------- glyph slots on case-study pages ---------- */

  function fillGlyphs() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-glyph]"), function (n) {
      n.innerHTML = glyph(n.getAttribute("data-glyph"));
    });
  }

  /* ---------- scroll reveal + count-up ---------- */

  function initReveal() {
    var targets = document.querySelectorAll(".reveal, .stage");
    if (REDUCED || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(targets, function (t) { t.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var node = e.target;
        var delay = parseInt(node.getAttribute("data-step") || "0", 10) * 70;
        setTimeout(function () {
          node.classList.add("in");
          var counter = node.querySelector("[data-count]");
          if (counter) countUp(counter);
        }, delay);
        io.unobserve(node);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
  }

  /* ---------- cursor spotlight on cards / stages ---------- */

  function initSpotlight() {
    if (!window.PointerEvent) return;
    document.addEventListener("pointermove", function (e) {
      var host = e.target && e.target.closest ? e.target.closest(".card, .stage, .case-nav a") : null;
      if (!host) return;
      var r = host.getBoundingClientRect();
      host.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(2) + "%");
      host.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(2) + "%");
    }, { passive: true });
  }

  /* ---------- header + reading progress ---------- */

  function initScrollChrome() {
    var head = document.querySelector(".site-head");
    var bar = document.querySelector(".progress");
    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (head) head.classList.toggle("scrolled", y > 24);
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ")";
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ============================================================
     HERO FIELD — a grid of points that leans away from the cursor
     and lights up around it. Static grid when motion is reduced.
     ============================================================ */

  function initField(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var W = 0, H = 0, DPR = 1, pts = [];
    var GAP = 30, R = 200, PUSH = 26;
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, has: false };
    var t0 = performance.now();
    var raf = null;

    function resize() {
      var r = canvas.getBoundingClientRect();
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.floor(r.width)); H = Math.max(1, Math.floor(r.height));
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      GAP = W < 600 ? 26 : 30;
      pts = [];
      var ox = (W % GAP) / 2, oy = (H % GAP) / 2;
      for (var y = oy; y <= H; y += GAP) for (var x = ox; x <= W; x += GAP) pts.push({ x: x, y: y });
      if (REDUCED) drawStatic();
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      for (var i = 0; i < pts.length; i++) ctx.fillRect(pts[i].x - 0.75, pts[i].y - 0.75, 1.5, 1.5);
    }

    function frame(now) {
      var t = (now - t0) / 1000;

      // ease the cursor; drift on a slow figure-8 when no pointer is present
      if (!mouse.has) {
        mouse.tx = W * (0.5 + 0.32 * Math.sin(t * 0.35));
        mouse.ty = H * (0.45 + 0.22 * Math.sin(t * 0.7));
      }
      mouse.x += (mouse.tx - mouse.x) * 0.09;
      mouse.y += (mouse.ty - mouse.y) * 0.09;

      ctx.clearRect(0, 0, W, H);

      // glow
      var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R * 1.4);
      g.addColorStop(0, "rgba(245,183,106,0.16)");
      g.addColorStop(1, "rgba(245,183,106,0)");
      ctx.fillStyle = g;
      ctx.fillRect(mouse.x - R * 1.4, mouse.y - R * 1.4, R * 2.8, R * 2.8);

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        var wave = Math.sin(p.x * 0.02 + t * 0.9) * Math.cos(p.y * 0.02 + t * 0.7) * 1.6;
        var px = p.x, py = p.y + wave, a = 0.13, s = 1.4;

        if (d < R) {
          var k = 1 - d / R;               // 0..1, 1 at the cursor
          var f = k * k;
          var inv = d > 0.001 ? 1 / d : 0;
          px += dx * inv * PUSH * f;
          py += dy * inv * PUSH * f;
          a = 0.13 + 0.75 * f;
          s = 1.4 + 2.2 * f;
          ctx.fillStyle = "rgba(245,183,106," + a.toFixed(3) + ")";
        } else {
          ctx.fillStyle = "rgba(255,255,255," + a + ")";
        }
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
      }
      raf = requestAnimationFrame(frame);
    }

    function onMove(e) {
      var r = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top; mouse.has = true;
    }
    function onLeave() { mouse.has = false; }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (REDUCED) return;

    var hero = canvas.parentElement;
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave, { passive: true });

    // only animate while the hero is on screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var vis = entries[0].isIntersecting;
        if (vis && raf === null) raf = requestAnimationFrame(frame);
        if (!vis && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      }, { threshold: 0 }).observe(hero);
    } else {
      raf = requestAnimationFrame(frame);
    }
  }

  /* ---------- boot ---------- */

  function fill(id, fn) { var m = document.getElementById(id); if (m) fn(m); }

  function boot() {
    var p = D.profile || {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-profile]"), function (n) {
      var key = n.getAttribute("data-profile");
      if (p[key]) n.textContent = p[key];
    });

    fill("stats", renderStats);
    fill("projects", renderProjects);
    fill("skills", renderSkills);
    fill("contact-list", renderContact);
    fillGlyphs();

    Array.prototype.forEach.call(document.querySelectorAll(".pipeline"), function (pipe) {
      Array.prototype.forEach.call(pipe.querySelectorAll(".stage"), function (s, i) {
        s.setAttribute("data-step", String(i % 6));
      });
    });

    var y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());

    var canvas = document.querySelector(".hero canvas");
    if (canvas) initField(canvas);

    initRotator();
    initReveal();
    initSpotlight();
    initScrollChrome();

    // Content is rendered by this script, so a URL hash resolved against a
    // shorter page than the one that now exists. Re-run it.
    if (window.location.hash.length > 1) {
      var target = document.getElementById(window.location.hash.slice(1));
      if (target) requestAnimationFrame(function () { target.scrollIntoView({ block: "start" }); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
