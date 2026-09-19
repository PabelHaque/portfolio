/* ============================================================
   Rendering + interaction. No build step.
   Content lives in data.js — this file never needs editing to
   add a project: the field lays nodes out, the gates render, the
   rail grows.

   Home page:  the Field (opener: a constellation, hover/tap to preview) → the Gates (one per project,
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
  // Parts: every project belongs to one ("systems" unless it says otherwise). Labels come from data.js.
  var PARTS = D.parts || { systems: { label: "Products & systems", numeral: "I" }, analytics: { label: "Analytics", numeral: "II" } };
  function partOf(p) { return (p && p.part && PARTS[p.part]) ? p.part : "systems"; }
  function refWord(p) { return partOf(p) === "analytics" ? "Analytics" : "System"; }
  function countPart(key) { return P.filter(function (p) { return partOf(p) === key; }).length; }
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
      "</svg>",
    /* a report page: rows, a small bar chart, one row checked */
    report:
      '<svg viewBox="0 0 200 200" aria-hidden="true">' +
        '<path class="b" pathLength="1" d="M44 28 H132 L156 52 V172 H44 Z"/><path class="b" pathLength="1" d="M132 28 V52 H156"/>' +
        '<path class="b" pathLength="1" d="M60 72 H140 M60 92 H140"/>' +
        '<g class="fb"><rect x="60" y="136" width="10" height="22" rx="2"/><rect x="78" y="128" width="10" height="30" rx="2"/><rect x="96" y="144" width="10" height="14" rx="2"/></g>' +
        '<g class="fa"><rect x="114" y="122" width="10" height="36" rx="2"/></g>' +
        '<path class="a" pathLength="1" d="M60 112 H140"/>' +
        '<path class="a" pathLength="1" d="M122 86 L130 94 L146 76"/>' +
      "</svg>",
    /* a chat message becoming ledger rows, one row checked against the record */
    audit:
      '<svg viewBox="0 0 200 200" aria-hidden="true">' +
        '<path class="b" pathLength="1" d="M28 44 H104 a8 8 0 0 1 8 8 V78 a8 8 0 0 1 -8 8 H52 L36 100 V86 H28 a8 8 0 0 1 -8 -8 V52 a8 8 0 0 1 8 -8 Z"/>' +
        '<path class="b" pathLength="1" d="M40 60 H100 M40 72 H84"/>' +
        '<path class="b" pathLength="1" d="M124 60 H176 M124 84 H176 M124 108 H176 M124 132 H176 M124 156 H176"/>' +
        '<g class="fb"><circle cx="116" cy="60" r="2.5"/><circle cx="116" cy="84" r="2.5"/><circle cx="116" cy="132" r="2.5"/><circle cx="116" cy="156" r="2.5"/></g>' +
        '<path class="a" pathLength="1" d="M124 108 H176"/><g class="fa"><circle cx="116" cy="108" r="4"/></g>' +
        '<path class="a" pathLength="1" d="M138 118 L146 126 L162 100"/>' +
        '<path class="b" pathLength="1" d="M40 132 H100 M40 148 H88 M40 164 H96"/>' +
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

  // Up to four projects sit at preset spots. Beyond that they form a serpentine grid read in
  // order, 01 to 0N: two columns when the room is upright, more when it is wide.
  function layoutNodes(n, cols, upright) {
    var preset = [[520, 420], [1500, 380], [1700, 1000], [760, 1050]];
    if (n <= 4) return preset.slice(0, n);
    cols = Math.max(2, Math.min(n, cols || 2)); var rows = Math.ceil(n / cols);
    // upright rooms (phones) are width-bound: pull the columns closer so the rows can breathe
    var x0 = upright ? 650 : 500, x1 = upright ? 1750 : 1900, y0 = upright ? 180 : 250, y1 = upright ? 1320 : 1250, out = [];
    for (var i = 0; i < n; i++) {
      var r = Math.floor(i / cols), c = i % cols; if (r % 2 === 1) c = cols - 1 - c;
      out.push([Math.round(x0 + c * (x1 - x0) / (cols - 1)), Math.round(rows === 1 ? 750 : y0 + r * (y1 - y0) / (rows - 1))]);
    }
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
    var world = field.querySelector(".world"), cam = field.querySelector(".cam"), nodesEl = field.querySelector("#nodes"), lines = field.querySelector("#lines");
    var panel = field.querySelector("#panel"), intro = field.querySelector("#intro"), posEl = document.getElementById("pos"), hint = field.querySelector("#hint");
    var pos = layoutNodes(P.length), cols = 0;
    var HOVER = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    if (hint) hint.textContent = (HOVER ? "Hover" : "Tap") + " a point to preview it · scroll to walk the gates";

    // points, and the faint links between neighbours
    P.forEach(function (p, i) {
      var n = el("button", "fnode"); n.type = "button"; n.style.left = pos[i][0] + "px"; n.style.top = pos[i][1] + "px";
      n.setAttribute("aria-label", refWord(p) + " " + pad(i + 1) + ": " + p.title); n.setAttribute("data-part", partOf(p));
      n.innerHTML = '<span class="core"></span><span class="tag">' + refWord(p) + " " + pad(i + 1) + "<b>" + esc(p.principle || p.title) + "</b></span>";
      n.addEventListener("click", function (e) { e.stopPropagation(); go(i, true); });
      if (HOVER) n.addEventListener("pointerenter", function () { if (!stacked()) go(i, false); });
      n.addEventListener("focus", function () { if (!stacked()) go(i, false); });
      nodesEl.appendChild(n);
      if (i < P.length - 1) { var path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("pathLength", "1"); lines.appendChild(path); }
    });
    var nodes = nodesEl.querySelectorAll(".fnode"), paths = lines.querySelectorAll("path");
    var upright = null;
    function place(c, up) {
      if (c === cols && up === upright) return; cols = c; upright = up; pos = layoutNodes(P.length, c, up);
      nodes.forEach(function (n, i) { n.style.left = pos[i][0] + "px"; n.style.top = pos[i][1] + "px"; });
      paths.forEach(function (l, i) { l.setAttribute("d", curve(pos[i], pos[i + 1])); });
    }

    // One fixed camera. The constellation is fitted once into the room the intro and the
    // preview card leave free. Nothing pans or zooms, so the page reads the same for everyone.
    var cx = 0, cy = 0, sc = 1, cur = -1;
    function stacked() { return field.classList.contains("stacked"); }
    function size() { return { w: world.clientWidth || 1, h: world.clientHeight || 1, narrow: (world.clientWidth || 1) < 900 }; }
    function apply() {
      cam.style.transform = "translate(" + cx + "px," + cy + "px) scale(" + sc + ")";
      // points counter-scale (capped, so cores stay small); labels cancel the camera exactly
      var inv = Math.min(3.2, 1 / sc);
      cam.style.setProperty("--inv", inv.toFixed(3));
      cam.style.setProperty("--tag", (1 / sc / inv).toFixed(3));
    }
    function fit() {
      var HEAD = 84, NODES_MIN = 300;
      var s = size();
      if (s.w < 120 || s.h < 120) return; // not laid out yet; the resize handler will call again
      field.classList.remove("stacked", "compact", "tiny");
      field.style.minHeight = ""; panel.style.width = "";
      s = size(); var fr = world.getBoundingClientRect(), ir = intro.getBoundingClientRect();
      var GUT = Math.max(16, ir.left - fr.left), left = (ir.right - fr.left) + 32, sideW = s.w - left - GUT;
      if (sideW >= 340) panel.style.width = Math.round(sideW) + "px"; // the card takes the room beside the intro
      var ph = panel.offsetHeight || 190, sideH = s.h - HEAD - ph - 34 - 28;
      var isStacked = s.narrow || sideW < 480 || sideH < 240;
      var rx, rw, ry, rh;
      if (isStacked) {
        field.classList.add("stacked"); panel.style.width = "";
        s = size(); fr = world.getBoundingClientRect(); ir = intro.getBoundingClientRect();
        var need = HEAD + NODES_MIN + 24 + ir.height + 150;
        if (need > s.h) { field.style.minHeight = Math.ceil(need) + "px"; s = size(); fr = world.getBoundingClientRect(); ir = intro.getBoundingClientRect(); }
        var inset = 72; // keep fixed-size labels inside the edges
        rx = inset; rw = s.w - inset * 2; ry = HEAD; rh = Math.max(160, (ir.top - fr.top) - 24 - HEAD);
        if (cur < 0) { panel.classList.remove("on"); intro.classList.remove("hide"); }
      } else {
        rx = left; rw = sideW; ry = HEAD; rh = sideH;
        panel.classList.add("on"); intro.classList.remove("hide");
      }
      if (rw < 40 || rh < 40) return;
      place(rw / rh > 1.6 ? Math.ceil(P.length / 2) : 2, rw / rh < .8);
      // fit the points' own bounding box (plus room for labels) into that region
      var xs = pos.map(function (p) { return p[0]; }), ys = pos.map(function (p) { return p[1]; }), padX = 260, padY = 280;
      var bx = Math.min.apply(null, xs) - padX, by = Math.min.apply(null, ys) - padY;
      var bw = Math.max.apply(null, xs) - Math.min.apply(null, xs) + padX * 2, bh = Math.max.apply(null, ys) - Math.min.apply(null, ys) + padY * 2;
      sc = Math.min(rw / bw, rh / bh);
      cx = rx + (rw - bw * sc) / 2 - bx * sc; cy = ry + (rh - bh * sc) / 2 - by * sc;
      // label density: would two labels of this size overlap on screen?
      function collides(w, h) { for (var a = 0; a < pos.length; a++) for (var b = a + 1; b < pos.length; b++) if (Math.abs(pos[a][0] - pos[b][0]) * sc < w && Math.abs(pos[a][1] - pos[b][1]) * sc < h) return true; return false; }
      if (collides(215, 96)) field.classList.add("compact");
      if (collides(112, 52)) field.classList.add("tiny");
      apply();
    }

    var swapT = null;
    function fillPanel(i) {
      var p = P[i];
      panel.setAttribute("data-part", partOf(p));
      panel.querySelector("#p-ref").textContent = refWord(p) + " " + pad(i + 1);
      panel.querySelector("#p-cat").textContent = p.kicker || "";
      panel.querySelector("#p-rule").textContent = p.principle || "";
      panel.querySelector("#p-title").textContent = p.title + (p.year ? " · " + p.year : "");
      panel.querySelector("#p-body").textContent = p.summary;
      panel.querySelector("#p-l").textContent = (p.stat && p.stat.label) || "";
      var nEl = panel.querySelector("#p-n"), target = num(p.stat && p.stat.n);
      if (panel.classList.contains("on")) countTo(nEl, target, 600); else nEl.textContent = fmt(target);
      var read = panel.querySelector("#p-read"); if (p.page) { read.href = p.page; read.hidden = false; } else { read.hidden = true; }
      panel.querySelector("#p-gate").setAttribute("data-gate", "gate-" + (i + 1));
    }
    // open: true when the visitor clicked or used the keyboard; on phones only that opens the sheet
    function go(i, open) {
      var p = P[i], changed = cur !== i; cur = i;
      nodes.forEach(function (n, k) { n.classList.toggle("on", k === i); });
      paths.forEach(function (l, k) { l.classList.toggle("lit", k === i); });
      if (posEl) posEl.textContent = refWord(p) + " " + pad(i + 1) + " · " + p.title;
      var shown = panel.classList.contains("on");
      if (stacked()) {
        if (open) { panel.classList.add("on"); intro.classList.add("hide"); setTimeout(function () { var r = panel.getBoundingClientRect(), over = r.bottom - window.innerHeight + 16; if (over > 0) { try { window.scrollBy({ top: over, behavior: "instant" }); } catch (err) { window.scrollBy(0, over); } } }, 80); }
        else if (!shown) { fillPanel(i); return; }
      }
      else panel.classList.add("on");
      if (changed && shown && !REDUCED) {
        clearTimeout(swapT); panel.classList.add("swap");
        swapT = setTimeout(function () { fillPanel(i); panel.classList.remove("swap"); }, 140);
      } else fillPanel(i);
    }
    function closePanel() {
      if (!stacked()) return;
      panel.classList.remove("on"); intro.classList.remove("hide"); cur = -1;
      nodes.forEach(function (n) { n.classList.remove("on"); }); paths.forEach(function (l) { l.classList.remove("lit"); });
      if (posEl) posEl.textContent = "Overview · " + P.length + " projects";
    }
    var closeBtn = panel.querySelector("#p-close"); if (closeBtn) closeBtn.addEventListener("click", closePanel);
    panel.querySelector("#p-gate").addEventListener("click", function () {
      var t = document.getElementById(this.getAttribute("data-gate")); if (t) t.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    });
    world.addEventListener("click", function (e) { if (!e.target.closest(".fnode")) closePanel(); });

    // arrow keys step through the points while the field is on screen
    var visible = true;
    document.addEventListener("keydown", function (e) {
      if (!visible || e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") go((cur + 1 + P.length) % P.length, true);
      else if (e.key === "ArrowLeft") go((cur - 1 + P.length) % P.length, true);
      else if (e.key === "Escape") closePanel();
    });
    window.addEventListener("resize", function () { fit(); if (cur >= 0 && !stacked()) go(cur, false); });

    // dots: a point field in world space that leans gently away from the cursor
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

    // the first project is shown from the start, so the card is never empty on a desktop
    fillPanel(0); fit();
    if (!stacked()) go(0, false); else if (posEl) posEl.textContent = "Overview · " + P.length + " projects";
  }

  /* ============================================================
     THE GATES
     ============================================================ */

  function renderDivider(key) {
    var part = PARTS[key] || {}, n = countPart(key);
    var d = el("div", "part-divider"); d.id = "part-" + key; d.setAttribute("data-part", key);
    d.innerHTML =
      '<div class="wrap">' +
        '<div class="numeral" aria-hidden="true">' + esc(part.numeral || "") + "</div>" +
        "<div>" +
          '<p class="ref">Part ' + esc(part.numeral || "") + " &middot; " + n + (n === 1 ? " gate" : " gates") + "</p>" +
          '<h2 class="part-title">' + esc(part.label || key) + "</h2>" +
          (part.blurb ? '<p class="part-blurb">' + esc(part.blurb) + "</p>" : "") +
        "</div>" +
      "</div>";
    return d;
  }

  function renderDossier(p, i) {
    var d = p.detail, f = d.file || {};
    var sec = el("section", "dossier"); sec.id = "dossier-" + (i + 1); sec.setAttribute("data-part", partOf(p));
    var problem = (d.problem || []).map(function (t, k) { return '<p class="reveal" data-step="' + k + '">' + t + "</p>"; }).join("");
    var file = f.n ? '<div class="file-card reveal" data-step="1">' +
        '<div class="row"><b>' + esc(f.n) + "</b><span>" + esc(f.l || "") + "</span></div>" +
        (f.n2 ? '<div class="row"><b>' + esc(f.n2) + "</b><span>" + esc(f.l2 || "") + "</span></div>" : "") +
        (f.n3 ? '<div class="row"><b>' + esc(f.n3) + "</b><span>" + esc(f.l3 || "") + "</span></div>" : "") +
        '<div class="grid-lines" aria-hidden="true"></div></div>' : "";
    var ba = d.beforeAfter ? '<div class="ba reveal"><div class="table-scroll"><table class="data-table ba-table"><thead><tr>' +
        (d.beforeAfter.cols || []).map(function (c, k) { return '<th class="c' + k + '">' + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        (d.beforeAfter.rows || []).map(function (r) { return "<tr><td><strong>" + esc(r[0]) + '</strong></td><td class="before">' + esc(r[1]) + '</td><td class="after">' + esc(r[2]) + "</td></tr>"; }).join("") +
        "</tbody></table></div></div>" : "";
    var total = 0;
    var progs = (d.programmes || []).map(function (g, k) {
      total += Number(g.n) || 0;
      return '<div class="dprog reveal" data-step="' + (k % 4) + '"><span class="n">' + pad(k + 1) + "</span><div><h4>" + esc(g.name) + "</h4><p>" + esc(g.q) + "</p>" +
        (g.who ? '<span class="who">For ' + esc(g.who) + "</span>" : "") + '</div><span class="cnt"><b>' + esc(String(g.n)) + "</b>notebooks</span></div>";
    }).join("");
    if (progs) progs += '<div class="dprog total reveal"><span class="n">&Sigma;</span><div><h4>' + total + " notebooks</h4>" + (d.programmesNote ? "<p>" + esc(d.programmesNote) + "</p>" : "") + '</div><span class="cnt"><b>' + total + "</b>kept</span></div>";
    var rules = (d.rules || []).map(function (r, k) {
      return '<div class="drule reveal" data-step="' + (k % 3) + '"><span class="n">' + pad(k + 1) + "</span><h4>" + esc(r.t) + "</h4><p>" + esc(r.d) + "</p></div>";
    }).join("");
    var impact = (d.impact || []).map(function (x) { return "<li>" + x + "</li>"; }).join("");
    sec.innerHTML =
      '<div class="wrap">' +
        '<div class="dhead reveal">' +
          '<p class="ref">' + esc(d.eyebrow || "In depth") + " &middot; " + esc(p.title) + "</p>" +
          '<h2 class="dtitle">' + esc(d.heading || "") + "</h2>" +
        "</div>" +
        '<div class="dproblem">' + '<div class="dtext">' + problem + "</div>" + file + "</div>" +
        ba +
        (progs ? '<div class="dblock"><p class="dsub reveal">The questions, by programme</p><div class="dprogs">' + progs + "</div></div>" : "") +
        (rules || impact ? '<div class="dpair">' +
          (rules ? '<div class="dblock"><p class="dsub reveal">The rules the notebooks keep</p><div class="drules">' + rules + "</div></div>" : "") +
          (impact ? '<div class="dblock reveal" data-step="1"><p class="dsub">Impact</p><div class="dimpact"><ul>' + impact + "</ul></div></div>" : "") +
        "</div>" : "") +
        (p.page ? '<div class="dacts reveal"><a class="pill hot" href="' + esc(p.page) + '">Read the full case study &rarr;</a></div>' : "") +
      "</div>";
    return sec;
  }

  function renderGates(mount) {
    P.forEach(function (p, i) {
      var isPublic = p.visibility === "public";
      if (i === 0 || partOf(p) !== partOf(P[i - 1])) mount.appendChild(renderDivider(partOf(p)));
      var sec = el("section", "gate-section"); sec.id = "gate-" + (i + 1); sec.setAttribute("data-part", partOf(p));
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
      if (p.detail) mount.appendChild(renderDossier(p, i));
    });
  }

  function renderRail(rail) {
    var track = rail.querySelector(".track"); var n = P.length + 1;
    P.concat([{ principle: "you" }]).forEach(function (p, i) {
      var l = el("div", "lock"); l.style.top = ((i + .5) / n * 100) + "%"; if (i < P.length) l.setAttribute("data-part", partOf(p));
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
    var nSys = countPart("systems"), nAna = countPart("analytics");
    var count = document.getElementById("sys-count");
    if (count) count.textContent = nSys + (nSys === 1 ? " system" : " systems") + (nAna ? " · " + (nAna === 1 ? "one analytics practice" : nAna + " analytics entries") : "");
    var lastGate = document.getElementById("last-gate-n"); if (lastGate) lastGate.textContent = pad(P.length + 1);
    var words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
    var sysWord = document.getElementById("sys-word"); if (sysWord) sysWord.textContent = words[nSys] || String(nSys);
    var nS = document.getElementById("n-sys"); if (nS) nS.textContent = String(nSys);
    var nA = document.getElementById("n-ana"); if (nA) nA.textContent = String(nAna);

    initField();
    // GSAP is loaded after this script so the field never waits on the CDN; the gates
    // initialise once the page (and therefore GSAP, if it is coming) has loaded.
    if (window.gsap && window.ScrollTrigger || document.readyState === "complete") initGates();
    else window.addEventListener("load", initGates, { once: true });
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
