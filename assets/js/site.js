/* ============================================================
   Rendering + interaction. No dependencies, no build step.
   Content lives in data.js — this file never needs editing to
   add a project.
   ============================================================ */

(function () {
  "use strict";

  var D = window.PORTFOLIO || {};

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

  /* ---------- stats ---------- */

  function renderStats(mount) {
    (D.stats || []).forEach(function (s) {
      mount.appendChild(el("div", "stat",
        "<b>" + esc(s.n) + "</b><span>" + esc(s.label) + "</span>"));
    });
  }

  /* ---------- project cards ---------- */

  function cardInner(p) {
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

    return '<div class="card-top">' +
             "<h3>" + esc(p.title) + "</h3>" +
             '<span class="kicker">' + esc(p.year || "") + "</span>" +
           "</div>" +
           '<div class="kicker">' + esc(p.kicker || "") + "</div>" +
           '<p class="summary">' + esc(p.summary) + "</p>" +
           (facts ? '<div class="card-facts">' + facts + "</div>" : "") +
           (tags ? '<div class="tags">' + tags + "</div>" : "") +
           '<div class="card-foot">' + state + action + "</div>";
  }

  function renderProjects(mount) {
    (D.projects || []).forEach(function (p) {
      var href = p.page || (p.visibility === "public" ? p.repo : "");
      var node;
      if (href) {
        node = el("a", "card reveal");
        node.href = href;
        if (!p.page) { node.target = "_blank"; node.rel = "noopener"; }
        node.setAttribute("aria-label", p.title);
      } else {
        node = el("div", "card reveal");
      }
      node.innerHTML = cardInner(p);
      mount.appendChild(node);
    });
  }

  /* ---------- skills ---------- */

  function renderSkills(mount) {
    (D.skills || []).forEach(function (g) {
      var items = (g.items || []).map(function (i) {
        return "<li>" + esc(i) + "</li>";
      }).join("");
      mount.appendChild(el("div", "skill-block reveal",
        "<h3>" + esc(g.group) + "</h3><ul>" + items + "</ul>"));
    });
  }

  /* ---------- contact ---------- */

  function renderContact(mount) {
    var p = D.profile || {};
    var rows = [
      { k: "GitHub", v: p.github, href: p.github, show: (p.github || "").replace(/^https?:\/\//, "") },
      { k: "Email", v: p.email, href: p.email ? "mailto:" + p.email : "", show: p.email },
      { k: "LinkedIn", v: p.linkedin, href: p.linkedin, show: (p.linkedin || "").replace(/^https?:\/\//, "") },
      { k: "Résumé", v: p.resume, href: p.resume, show: "Download (PDF)" },
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

  /* ---------- scroll reveal ---------- */

  function initReveal() {
    var targets = document.querySelectorAll(".reveal, .stage");
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(targets, function (t) { t.classList.add("in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var node = e.target;
        // Stagger siblings so a pipeline reads as a sequence, not a flash.
        var delay = parseInt(node.getAttribute("data-step") || "0", 10) * 70;
        setTimeout(function () { node.classList.add("in"); }, delay);
        io.unobserve(node);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    Array.prototype.forEach.call(targets, function (t) { io.observe(t); });
  }

  /* ---------- boot ---------- */

  function fill(id, fn) {
    var m = document.getElementById(id);
    if (m) fn(m);
  }

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

    // Number the pipeline stages so the stagger has something to key off.
    Array.prototype.forEach.call(document.querySelectorAll(".pipeline"), function (pipe) {
      Array.prototype.forEach.call(pipe.querySelectorAll(".stage"), function (s, i) {
        s.setAttribute("data-step", String(i % 6));
      });
    });

    var y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());

    initReveal();

    // Sections are rendered by this script, so a hash in the URL resolved
    // against a shorter page than the one that now exists. Re-run it.
    if (window.location.hash.length > 1) {
      var target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        requestAnimationFrame(function () {
          target.scrollIntoView({ block: "start" });
        });
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
