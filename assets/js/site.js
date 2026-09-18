/* ============================================================
   Rendering + interaction. No build step.
   Content lives in data.js — this file never needs editing to
   add a project: the field lays nodes out, the gates render, the
   rail grows.

   Home page:  the Field (opener) → the Gates (one per project,
               pinned with GSAP ScrollTrigger) → the last gate (you)
   Case pages: header chrome, glyph slots, reveal, spotlight
   ============================================================ */

(function () {
  "use strict";

  var D = window.PORTFOLIO || {};
  var P = D.projects || [];
  var REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var W = 2400, H = 1500; // world size for the field

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function num(s) { var v = parseFloat(String(s).replace(/[^0-9.]/g, "")); return isNaN(v) ? 0 : v; }
  function fmt(v) { return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  // letters are individual spans for the stagger; words are wrapped so a line never breaks mid-word
  function chars(s) {
    return s.split(" ").map(function (w) {
      return '<span class="w">' + w.split("").map(function (c) { return '<span class="ch">' + esc(c) + "</span>"; }).join("") + "</span>";
    }).join('<span class="sp"></span>');
  }

  /* ============================================================
     GLYPHS — one small SVG per project category.
     Add a key here and reference it as glyph: "<key>" in data.js.
     Strokes carry pathLength="1" so a gate can draw them in.
     Classes: .a accent stroke · .b faint stroke · .fa accent fill · .fb faint fill
     ============================================================ */

  var GLYPHS = {
    pipeline:
      '<svg viewBox="0 0 200 200" aria-hidden="true">' +
        '<path class="b" pathLength="1" d="M28 60 H172 a20 20 0 0 1 0 40 H28 a20 20 0 0 0 0 40 H172"/>' +
        '<g class="fb"><circle cx="28" cy="60" r="3.5"/><circle cx="76" cy="60" r="3.5"/><circle cx="124" cy="60" r="3.5"/><circle cx="172" cy="100" r="3.5"/><circle cx="100" cy="100" r="3.5"/><circle cx="76" cy="140" r="3.5"/><circle cx="124" cy="140" r="3.5"/></g>' +
        '<g class="fa"><circle cx="52" cy="60" r="6"/><circle cx="148" cy="60" r="6"/><circle cx="52" cy="100" r="6"/><circle cx="172" cy="140" r="6"/></g>' +
      "</svg>",
    cascade:
      '<svg viewBox="0 0 200 200" aria-hidden="true">' +
        '<path class="b" pathLength="1" d="M100 36 V60 M100 60 H44 V84 M100 60 H156 V84 M100 60 V84 M44 84 H26 V110 M44 84 V110 M44 84 H62 V110 M100 84 H82 V110 M100 84 V110 M100 84 H118 V110 M156 84 H138 V110 M156 84 V110 M156 84 H174 V110"/>' +
        '<g class="fb"><rect x="22" y="110" width="8" height="34" rx="2"/><rect x="40" y="110" width="8" height="52" rx="2"/><rect x="58" y="110" width="8" height="22" rx="2"/><rect x="78" y="110" width="8" height="46" rx="2"/><rect x="96" y="110" width="8" height="30" rx="2"/><rect x="114" y="110" width="8" height="58" rx="2"/><rect x="134" y="110" width="8" height="26" rx="2"/><rect x="152" y="110" width="8" height="40" rx="2"/><rect x="170" y="110" width="8" height="50" rx="2"/></g>' +
        '<g class="fa"><circle cx="44" cy="60" r="3.5"/><circle cx="100" cy="60" r="3.5"/><circle cx="156" cy="60" r="3.5"/><circle cx="100" cy="36" r="7"/></g>' +
        '<path class="a" pathLength="1" d="M22 176 H178" stroke-dasharray="3 5"/>' +
      "</svg>",
    funnel:
      '<svg viewBox="0 0 200 200" aria-hidden="true">' +
        '<path class="b" pathLength="1" d="M30 44 H170 L128 104 V160 H72 V104 Z"/>' +
        '<g class="fb"><circle cx="46" cy="30" r="3"/><circle cx="66" cy="22" r="3"/><circle cx="86" cy="32" r="3"/><circle cx="106" cy="20" r="3"/><circle cx="126" cy="30" r="3"/><circle cx="146" cy="24" r="3"/><circle cx="60" cy="62" r="3"/><circle cx="96" cy="70" r="3"/><circle cx="134" cy="60" r="3"/><circle cx="116" cy="88" r="3"/><circle cx="82" cy="92" r="3"/></g>' +
        '<g class="fa"><circle cx="100" cy="124" r="5"/><circle cx="100" cy="146" r="5"/></g>' +
        '<path class="a" pathLength="1" d="M64 176 H136"/><path class="a" pathLength="1" d="M78 186 H122" opacity=".5"/>' +
      "</svg>",
    hierarchy:
      '<svg viewBox="0 0 200 200" aria-hidden="true">' +
        '<path class="b" pathLength="1" d="M86 34 H114 L120 54 H80 Z"/><path class="b" pathLength="1" d="M74 62 H126 L134 82 H66 Z"/>' +
        '<path class="fa" d="M60 90 H140 L150 110 H50 Z" opacity=".22"/><path class="a" pathLength="1" d="M60 90 H140 L150 110 H50 Z"/>' +
        '<path class="b" pathLength="1" d="M46 118 H154 L166 138 H34 Z"/><path class="b" pathLength="1" d="M32 146 H168 L182 166 H18 Z"/>' +
        '<g class="fa"><circle cx="100" cy="100" r="4"/></g><path class="a" pathLength="1" d="M28 100 H42 M158 100 H172" opacity=".7"/>' +
      "</svg>",
    code:
      '<svg viewBox="0 0 200 200" aria-hidden="true">' +
        '<path class="b" pathLength="1" d="M70 50 L38 100 L70 150 M130 50 L162 100 L130 150" stroke-width="2"/>' +
        '<path class="a" pathLength="1" d="M112 44 L88 156" stroke-width="2"/><g class="fa"><circle cx="100" cy="100" r="4"/></g>' +
      "</svg>"
  };
  function glyph(name, tl, br) {
    return '<div class="glyph">' + (GLYPHS[name] || GLYPHS.code) +
      (tl ? '<span class="corner tl">' + esc(tl) + "</span>" : "") +
      (br ? '<span class="corner br">' + esc(br) + "</span>" : "") + "</div>";
  }

  function countTo(node, target, dur) {
    if (REDUCED) { node.textContent = fmt(target); return; }
    var start = null, from = num(node.textContent); dur = dur || 800;
    function step(ts) { if (start === null) start = ts; var t = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - t, 3); node.textContent = fmt(from + (target - from) * e); if (t < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  /* ============================================================
     THE FIELD
     ============================================================ */

  function layoutNodes(n) {
    var preset = [[520, 420], [1500, 380], [1700, 1000], [760, 1050]];
    if (n <= 4) return preset.slice(0, n);
    var out = [];
    for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + i * (2 * Math.PI / n); out.push([Math.round(1200 + Math.cos(a) * 760), Math.round(750 + Math.sin(a) * 440)]); }
    return out;
  }

  function curve(a, b) {
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    var nx = -dy / L, ny = dx / L, k = Math.min(160, L * .28);
    // bulge away from the world centre
    if ((mx + nx * k - 1200) * (mx + nx * k - 1200) + (my + ny * k - 750) * (my + ny * k - 750) < (mx - 1200) * (mx - 1200) + (my - 750) * (my - 750)) { nx = -nx; ny = -ny; }
    return "M" + a[0] + " " + a[1] + " Q" + Math.round(mx + nx * k) + " " + Math.round(my + ny * k) + " " + b[0] + " " + b[1];
  }

  function initField() {
    var field = document.getElementById("field"); if (!field || !P.length) return;
    var world = field.querySelector(".world"), cam = field.querySelector(".cam"), nodesEl = field.querySelector("#nodes"), lines = field.querySelector("#lines"), map = field.querySelector("#map");
    var panel = field.querySelector("#panel"), intro = field.querySelector("#intro"), posEl = document.getElementById("pos");
    var pos = layoutNodes(P.length);

    // nodes, lines, minimap
    P.forEach(function (p, i) {
      var n = el("button", "fnode"); n.type = "button"; n.style.left = pos[i][0] + "px"; n.style.top = pos[i][1] + "px";
      n.setAttribute("aria-label", p.title);
      n.innerHTML = '<span class="core"></span><span class="tag">System ' + pad(i + 1) + "<b>" + esc(p.principle || p.title) + "</b></span>";
      n.addEventListener("click", function (e) { e.stopPropagation(); stopTour(); go(i); });
      nodesEl.appendChild(n);
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("pathLength", "1"); path.setAttribute("d", curve(pos[i], pos[(i + 1) % P.length])); lines.appendChild(path);
      if (map) { var c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("cx", pos[i][0]); c.setAttribute("cy", pos[i][1]); c.setAttribute("r", 38); map.insertBefore(c, map.firstChild); }
    });
    if (P.length < 3) lines.innerHTML = "";
    var nodes = nodesEl.querySelectorAll(".fnode"), paths = lines.querySelectorAll("path"), mapDots = map ? map.querySelectorAll("circle") : [], camRect = document.getElementById("cam-rect");

    // camera
    var cx = 0, cy = 0, sc = 1, cur = -1;
    function size() { return { w: world.clientWidth || 1, h: world.clientHeight || 1, narrow: (world.clientWidth || 1) < 760 }; }
    function apply() {
      cam.style.transform = "translate(" + cx + "px," + cy + "px) scale(" + sc + ")";
      cam.style.setProperty("--inv", Math.min(2.6, 1 / sc).toFixed(3));
      if (camRect) { var s = size(); camRect.setAttribute("x", -cx / sc); camRect.setAttribute("y", -cy / sc); camRect.setAttribute("width", s.w / sc); camRect.setAttribute("height", s.h / sc); }
    }
    function overview() {
      var s = size(); sc = Math.min(s.w / W, s.h / H) * (s.narrow ? .86 : .9);
      // sit the field a little right and up on desktop so the intro text has clear ground
      cx = (s.w - W * sc) / 2 + (s.narrow ? 0 : s.w * .1); cy = (s.h - H * sc) / 2 - (s.narrow ? 70 : 30); apply();
      cur = -1; panel.classList.remove("on"); intro.classList.remove("hide"); if (posEl) posEl.textContent = "Overview · " + P.length + " systems";
      nodes.forEach(function (n) { n.classList.remove("on"); }); mapDots.forEach(function (d) { d.classList.remove("on"); }); paths.forEach(function (l) { l.classList.remove("lit"); });
    }
    function go(i) {
      var p = P[i], s = size(); cur = i; sc = s.narrow ? 1.1 : 1.5;
      var offX = s.narrow ? 0 : -s.w * .17, offY = s.narrow ? -s.h * .2 : 0;
      cx = s.w / 2 - pos[i][0] * sc + offX; cy = s.h / 2 - pos[i][1] * sc + offY; apply();
      intro.classList.add("hide"); if (posEl) posEl.textContent = "System " + pad(i + 1) + " · " + (p.kicker || "").split(" · ")[0];
      panel.querySelector("#p-ref").textContent = "System " + pad(i + 1);
      panel.querySelector("#p-cat").textContent = p.kicker || "";
      panel.querySelector("#p-rule").textContent = p.principle || "";
      panel.querySelector("#p-title").textContent = p.title;
      panel.querySelector("#p-body").textContent = p.summary;
      panel.querySelector("#p-l").textContent = (p.stat && p.stat.label) || "";
      countTo(panel.querySelector("#p-n"), num(p.stat && p.stat.n));
      var read = panel.querySelector("#p-read"); if (p.page) { read.href = p.page; read.hidden = false; } else { read.hidden = true; }
      panel.querySelector("#p-gate").setAttribute("data-gate", "gate-" + (i + 1));
      panel.classList.remove("on"); setTimeout(function () { panel.classList.add("on"); }, REDUCED ? 0 : 260);
      nodes.forEach(function (n, k) { n.classList.toggle("on", k === i); }); mapDots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
      paths.forEach(function (l, k) { l.classList.toggle("lit", k === i); });
    }

    // drag to pan (touch-action: pan-y leaves vertical page scroll to the browser)
    var drag = null;
    world.addEventListener("pointerdown", function (e) { if (e.target.closest(".fnode")) return; drag = { x: e.clientX, y: e.clientY, cx: cx, cy: cy }; world.classList.add("dragging"); try { world.setPointerCapture(e.pointerId); } catch (err) {} });
    world.addEventListener("pointermove", function (e) { if (!drag) return; cx = drag.cx + (e.clientX - drag.x); cy = drag.cy + (e.clientY - drag.y); apply(); });
    function endDrag() { drag = null; world.classList.remove("dragging"); }
    world.addEventListener("pointerup", endDrag); world.addEventListener("pointercancel", endDrag);

    // tour
    var touring = false, tourT = null, bar = field.querySelector("#tourbar"), tourBtn = field.querySelector("#tour");
    function stopTour() { touring = false; clearTimeout(tourT); if (bar) { bar.style.transition = "none"; bar.style.transform = "scaleX(0)"; } if (tourBtn) tourBtn.innerHTML = "&#9654; Take the tour"; }
    function tourStep(i) {
      go(i);
      if (bar) { bar.style.transition = "none"; bar.style.transform = "scaleX(0)"; requestAnimationFrame(function () { bar.style.transition = "transform 4.2s linear"; bar.style.transform = "scaleX(1)"; }); }
      tourT = setTimeout(function () { if (!touring) return; if (i + 1 < P.length) tourStep(i + 1); else { stopTour(); overview(); } }, 4400);
    }
    if (tourBtn) tourBtn.addEventListener("click", function () { if (touring) { stopTour(); return; } touring = true; tourBtn.innerHTML = "&#9632; Stop tour"; tourStep(0); });
    var ov = field.querySelector("#overview"); if (ov) ov.addEventListener("click", function () { stopTour(); overview(); });
    panel.querySelector("#p-next").addEventListener("click", function () { stopTour(); go((cur + 1) % P.length); });
    panel.querySelector("#p-gate").addEventListener("click", function () {
      var t = document.getElementById(this.getAttribute("data-gate")); if (t) t.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    });

    // keys work while the field is on screen
    var visible = true;
    document.addEventListener("keydown", function (e) {
      if (!visible || e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") { stopTour(); go((cur + 1 + P.length) % P.length); }
      else if (e.key === "ArrowLeft") { stopTour(); go((cur - 1 + P.length) % P.length); }
      else if (e.key === "Escape") { stopTour(); overview(); }
    });
    window.addEventListener("resize", function () { if (cur < 0) overview(); else go(cur); });

    // dots: a point field in world space that leans away from the cursor
    var cv = field.querySelector("canvas"), ctx = cv && cv.getContext("2d"), pts = [], raf = null, frame = null, drawStatic = null;
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, has: false }, t0 = performance.now();
    if (ctx) {
      var GAP = 34;
      for (var y = 17; y < H; y += GAP) for (var x = 17; x < W; x += GAP) pts.push({ x: x, y: y });
      var R = 260, PUSH = 30;
      drawStatic = function () { ctx.clearRect(0, 0, W, H); ctx.fillStyle = "rgba(245,243,255,0.14)"; for (var i = 0; i < pts.length; i++) ctx.fillRect(pts[i].x - .8, pts[i].y - .8, 1.6, 1.6); };
      frame = function (now) {
        var t = (now - t0) / 1000;
        if (!mouse.has) { mouse.tx = W * (.5 + .34 * Math.sin(t * .3)); mouse.ty = H * (.5 + .26 * Math.sin(t * .62)); }
        mouse.x += (mouse.tx - mouse.x) * .08; mouse.y += (mouse.ty - mouse.y) * .08;
        ctx.clearRect(0, 0, W, H);
        var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R * 1.5);
        g.addColorStop(0, "rgba(139,124,255,0.16)"); g.addColorStop(1, "rgba(139,124,255,0)");
        ctx.fillStyle = g; ctx.fillRect(mouse.x - R * 1.5, mouse.y - R * 1.5, R * 3, R * 3);
        for (var i = 0; i < pts.length; i++) {
          var p = pts[i], dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
          var wave = Math.sin(p.x * .015 + t * .8) * Math.cos(p.y * .015 + t * .6) * 1.8, px = p.x, py = p.y + wave, a = .12, s = 1.6;
          if (d < R) { var k = 1 - d / R, f = k * k, inv = d > .001 ? 1 / d : 0; px += dx * inv * PUSH * f; py += dy * inv * PUSH * f; a = .12 + .7 * f; s = 1.6 + 2.4 * f; ctx.fillStyle = "rgba(255,122,26," + a.toFixed(3) + ")"; }
          else ctx.fillStyle = "rgba(245,243,255," + a + ")";
          ctx.fillRect(px - s / 2, py - s / 2, s, s);
        }
        raf = requestAnimationFrame(frame);
      };
      if (REDUCED) drawStatic();
      else {
        world.addEventListener("pointermove", function (e) { var r = world.getBoundingClientRect(); mouse.tx = (e.clientX - r.left - cx) / sc; mouse.ty = (e.clientY - r.top - cy) / sc; mouse.has = true; }, { passive: true });
        world.addEventListener("pointerleave", function () { mouse.has = false; });
      }
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (ctx && !REDUCED) { if (visible && raf === null) raf = requestAnimationFrame(frame); if (!visible && raf !== null) { cancelAnimationFrame(raf); raf = null; } }
      }, { threshold: 0 }).observe(field);
    } else if (ctx && !REDUCED) { raf = requestAnimationFrame(frame); }

    overview();
  }

  /* ============================================================
     THE GATES
     ============================================================ */

  function renderGates(mount) {
    P.forEach(function (p, i) {
      var isPublic = p.visibility === "public";
      var sec = el("section", "gate-section"); sec.id = "gate-" + (i + 1);
      var acts = (p.page ? '<a class="pill hot" href="' + esc(p.page) + '">Read the case study &rarr;</a>' : "") +
                 (isPublic && p.repo ? '<a class="pill" href="' + esc(p.repo) + '" target="_blank" rel="noopener">View the code</a>' : "");
      var state = isPublic
        ? '<span class="repo-state is-public"><span class="pip"></span>Public repository</span>'
        : '<span class="repo-state"><span class="pip"></span>Private repo &mdash; walkthrough on request</span>';
      var tags = (p.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
      var statN = (p.stat && p.stat.n) || "", statL = (p.stat && p.stat.label) || "";
      sec.innerHTML =
        '<div class="wrap">' +
          "<div>" +
            '<p class="ref">Gate ' + pad(i + 1) + (p.kicker ? " &middot; " + esc(p.kicker) : "") + "</p>" +
            '<h2 class="rule">' + chars(p.principle || p.title) + "</h2>" +
            '<p class="title">' + esc(p.title) + (p.year ? " &middot; " + esc(p.year) : "") + "</p>" +
            '<div class="body"><p>' + esc(p.summary) + "</p>" +
              '<div class="acts">' + acts + "</div>" + state +
              (tags ? '<div class="tags">' + tags + "</div>" : "") +
            "</div>" +
          "</div>" +
          '<div class="visual">' +
            glyph(p.glyph, "Gate " + pad(i + 1), "counted from disk") +
            (statN !== "" ? '<div class="stat-box"><b data-n="' + esc(statN) + '">' + esc(statN) + "</b><span>" + esc(statL) + "</span></div>" : "") +
          "</div>" +
        "</div>";
      mount.appendChild(sec);
    });
  }

  function renderRail(rail) {
    var track = rail.querySelector(".track"); var n = P.length + 1;
    P.concat([{ principle: "you" }]).forEach(function (p, i) {
      var l = el("div", "lock"); l.style.top = ((i + .5) / n * 100) + "%";
      l.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true"><path class="shackle" d="M6 8 V6 a3 3 0 0 1 6 0 V8"/><rect x="4" y="8" width="10" height="7" rx="1.5"/></svg><span class="lbl">' + pad(i + 1) + " " + esc(String(p.principle || "").replace(/\.$/, "").toLowerCase()) + "</span>";
      track.appendChild(l);
    });
  }

  function initGates() {
    var gates = document.getElementById("gates"), rail = document.getElementById("rail"); if (!gates || !P.length) return;
    var secs = gates.querySelectorAll(".gate-section:not(.final)"), locks = rail ? rail.querySelectorAll(".lock") : [];
    var fill = rail ? rail.querySelector(".fill") : null;
    function setLock(i, state) { var l = locks[i]; if (!l) return; l.classList.remove("opening", "open"); if (state !== "locked") l.classList.add(state); }

    if (REDUCED || !window.gsap || !window.ScrollTrigger) {
      // static: content already visible; the rail still tracks position
      if (!("IntersectionObserver" in window) || !rail) return;
      new IntersectionObserver(function (es) { rail.classList.toggle("show", es[0].isIntersecting); }, { rootMargin: "-30% 0px -30% 0px" }).observe(gates);
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (!e.isIntersecting) return; var i = Array.prototype.indexOf.call(secs, e.target); for (var k = 0; k < i; k++) setLock(k, "open"); setLock(i, "opening"); });
      }, { threshold: .5 });
      secs.forEach(function (s) { io.observe(s); });
      var fin = gates.querySelector(".gate-section.final");
      if (fin) new IntersectionObserver(function (es) { if (es[0].isIntersecting) { for (var k = 0; k < secs.length; k++) setLock(k, "open"); setLock(secs.length, "open"); } }, { threshold: .4 }).observe(fin);
      return;
    }

    document.body.classList.remove("static");
    gsap.registerPlugin(ScrollTrigger);

    if (rail) {
      ScrollTrigger.create({ trigger: gates, start: "top 60%", end: "bottom 40%", onToggle: function (self) { rail.classList.toggle("show", self.isActive); } });
      ScrollTrigger.create({ trigger: gates, start: "top top", end: "bottom bottom", onUpdate: function (self) { if (fill) fill.style.height = (self.progress * 100) + "%"; } });
    }

    // Pin on wide screens. On a phone a pinned section taller than the viewport would hide its
    // lower half, so there the gate scrolls naturally and assembles as it rises into view.
    var pinIt = window.innerWidth > 820;
    secs.forEach(function (sec, i) {
      var statEl = sec.querySelector(".stat-box b"), target = statEl ? num(statEl.getAttribute("data-n")) : 0, o = { v: 0 };
      if (statEl) statEl.textContent = "0";
      var st = pinIt
        ? { trigger: sec, start: "top top", end: "+=120%", pin: true, scrub: .5, anticipatePin: 1 }
        : { trigger: sec, start: "top 80%", end: "top 15%", scrub: .5 };
      st.onEnter = function () { setLock(i, "opening"); };
      st.onEnterBack = function () { setLock(i, "opening"); setLock(i + 1, "locked"); };
      st.onLeave = function () { setLock(i, "open"); };
      st.onLeaveBack = function () { setLock(i, "locked"); };
      var tl = gsap.timeline({ scrollTrigger: st });
      tl.to(sec.querySelectorAll(".rule .ch"), { opacity: 1, y: 0, stagger: .025, duration: .5, ease: "none" }, 0)
        .to(sec.querySelectorAll(".glyph path, .glyph circle, .glyph rect"), { strokeDashoffset: 0, stagger: .03, duration: .55, ease: "none" }, .05)
        .to(sec.querySelectorAll(".glyph .fa, .glyph .fb"), { opacity: 1, stagger: .02, duration: .3, ease: "none" }, .3);
      if (statEl) tl.to(o, { v: target, duration: .55, ease: "none", onUpdate: function () { statEl.textContent = fmt(o.v); } }, .15);
      tl.to(sec.querySelector(".body"), { opacity: 1, y: 0, duration: .35, ease: "none" }, .4);
    });

    var fin = gates.querySelector(".gate-section.final");
    if (fin) ScrollTrigger.create({ trigger: fin, start: "top 60%", onEnter: function () { setLock(secs.length, "open"); }, onLeaveBack: function () { setLock(secs.length, "locked"); } });
  }

  /* ---------- shared renderers ---------- */

  function renderSkills(mount) {
    (D.skills || []).forEach(function (g) {
      mount.appendChild(el("div", "stack-block", "<h3>" + esc(g.group) + "</h3><ul>" + (g.items || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"));
    });
  }

  function renderContact(mount) {
    var p = D.profile || {};
    [
      { k: "GitHub", v: p.github, href: p.github, show: (p.github || "").replace(/^https?:\/\//, "") },
      { k: "Email", v: p.email, href: p.email ? "mailto:" + p.email : "", show: p.email },
      { k: "LinkedIn", v: p.linkedin, href: p.linkedin, show: (p.linkedin || "").replace(/^https?:\/\/(www\.)?/, "") },
      { k: "Résumé", v: p.resume, href: p.resume, show: "Download PDF" },
      { k: "Based in", v: p.location, href: "", show: p.location }
    ].forEach(function (r) {
      if (!r.v) return;
      var inner = '<span class="k">' + esc(r.k) + '</span><span class="v">' + esc(r.show) + "</span>", node;
      if (r.href) { node = el("a", "contact-row", inner); node.href = r.href; if (/^https?:/.test(r.href)) { node.target = "_blank"; node.rel = "noopener"; } }
      else node = el("div", "contact-row", inner);
      mount.appendChild(node);
    });
    var cta = document.getElementById("contact-cta");
    if (cta) { cta.href = p.email ? "mailto:" + p.email + "?subject=Portfolio%20walkthrough" : (p.github || "#"); if (!p.email && /^https?:/.test(cta.href)) { cta.target = "_blank"; cta.rel = "noopener"; } }
  }

  function fillGlyphs() { Array.prototype.forEach.call(document.querySelectorAll("[data-glyph]"), function (n) { n.innerHTML = glyph(n.getAttribute("data-glyph")); }); }

  function initReveal() {
    var targets = document.querySelectorAll(".reveal, .stage");
    if (REDUCED || !("IntersectionObserver" in window)) { Array.prototype.forEach.call(targets, function (t) { t.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (!e.isIntersecting) return; var node = e.target, delay = parseInt(node.getAttribute("data-step") || "0", 10) * 70; setTimeout(function () { node.classList.add("in"); }, delay); io.unobserve(node); });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
  }

  function initSpotlight() {
    if (!window.PointerEvent) return;
    document.addEventListener("pointermove", function (e) {
      var host = e.target && e.target.closest ? e.target.closest(".stage, .case-nav a") : null; if (!host) return;
      var r = host.getBoundingClientRect();
      host.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(2) + "%");
      host.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(2) + "%");
    }, { passive: true });
  }

  function initScrollChrome() {
    var head = document.querySelector(".site-head"), bar = document.querySelector(".progress");
    // Case-study pages ship the header already glassy; only the home page fades it in.
    var keep = head && head.classList.contains("scrolled");
    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (head && !keep) head.classList.toggle("scrolled", y > 24);
      if (bar) { var max = document.documentElement.scrollHeight - window.innerHeight; bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ")"; }
    }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---------- boot ---------- */

  function fill(id, fn) { var m = document.getElementById(id); if (m) fn(m); }

  function boot() {
    var p = D.profile || {};
    Array.prototype.forEach.call(document.querySelectorAll("[data-profile]"), function (n) { var k = n.getAttribute("data-profile"); if (p[k]) n.textContent = p[k]; });

    fill("gate-mount", renderGates);
    fill("rail", renderRail);
    fill("skills", renderSkills);
    fill("contact-list", renderContact);
    fillGlyphs();

    Array.prototype.forEach.call(document.querySelectorAll(".pipeline"), function (pipe) {
      Array.prototype.forEach.call(pipe.querySelectorAll(".stage"), function (s, i) { s.setAttribute("data-step", String(i % 6)); });
    });
    var y = document.getElementById("year"); if (y) y.textContent = String(new Date().getFullYear());
    var count = document.getElementById("sys-count"); if (count) count.textContent = P.length + " systems";

    initField();
    initGates();
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
