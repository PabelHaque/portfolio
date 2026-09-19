# Pabel Haque — Portfolio

**Live site → https://pabel64.github.io/portfolio/**

Systems that wait for a human, refuse to guess, won't overspend, know who's asking, and won't
assume a yes. Five production systems — a 71-agent AI delivery pipeline, a deterministic
allocation engine, an LLM study platform, role-scoped analytics, and a WhatsApp-to-ledger
automation validated against core banking — each with a full case study built around the one
rule it refuses to break.

---

## The work

| Project | What it is | Case study |
|---|---|---|
| **Multi-Agent Software Factory** | A portable overlay that turns any codebase into a governed 71-agent delivery pipeline — four mandatory human approval gates, artifact verification agents cannot fake, and an adversarial critic that blocks work for being merely correct. | [Read →](projects/factory-agent-overlay.html) |
| **PMUK Target &amp; Budget Allocation System** | A weighted largest-remainder cascade that divides branch-level microfinance targets across 2,574 field staff in 409 branches — 17,962 targets per cycle, bit-identical on re-run. | [Read →](projects/pmuk-target-system.html) |
| **Autonomous Exam-Study Intelligence Platform** | A crawler-to-classroom LLM pipeline: scores every article 0–100 for exam relevance through a deterministic taxonomy plus a model gate, and serves the survivors through an 18-page workspace. Runs on free-tier and local models by default. | [Read →](projects/editorials-study-assistant.html) |
| **AK47 Performance &amp; Reporting Dashboard** | A role-aware operations dashboard for a five-tier field hierarchy — each tier sees exactly one level wider than the one below — plus the reporting suite that replaced manual scorecard assembly. | [Read →](projects/ak47-dashboard.html) |
| **Special-Permission Tracking &amp; Microzen Validation** | Extracts loan waiver, rebate and settlement applications from a bilingual WhatsApp group, records each exactly once, cross-checks every member against the core banking system for a post-concession loan — and never infers an approval. | [Read →](projects/padakhep-rebate-automation.html) |
| **Reports &amp; Analytics** | Twenty-seven months of answering regulators, finance, programme heads and donors from one monthly MIS export — 73 pandas notebooks in seven programmes, reconciliation checks left visible, and a shared library that defines each number once. | [Read →](projects/reports-and-analytics.html) |

Most of the source repositories are private because the systems run against real
organisational data. Live walkthroughs and architecture documents are available on request —
see the contact section of the site.

---

## About this repository

This repo *is* the portfolio site. It is deliberately plain: **no framework, no build step,
no npm install.** GitHub Pages serves the files exactly as they are committed, which means
it cannot break in a build pipeline and it will still work in five years. The one runtime
dependency is GSAP (ScrollTrigger) from cdnjs for the pinned gates; if it fails to load,
the page degrades to a static, fully readable layout.

The home page is a journey in two movements: **the Field** — the four systems as nodes you
can fly between, drag around, or tour — and **the Gates** — one pinned section per system
where its rule types in, its glyph draws itself, and its number counts, while a rail of
locks opens as you pass. The last gate is contact.

```
index.html                  the whole home page
projects/
  factory-agent-overlay.html
  pmuk-target-system.html
  editorials-study-assistant.html
  ak47-dashboard.html
  _template.html            copy this to start a new case study
assets/
  css/site.css              one stylesheet; design tokens live in :root
  js/data.js                ALL content — projects, stats, skills, contact
  js/site.js                rendering + scroll reveal
ADDING-A-PROJECT.md         the 3-step recipe for a new project
```

### Adding a project

See **[ADDING-A-PROJECT.md](ADDING-A-PROJECT.md)**. Short version: add an object to the
`projects` array in [`assets/js/data.js`](assets/js/data.js), optionally copy
`projects/_template.html`, commit, push. Array order is page order.

### Running it locally

Open `index.html` in a browser. That is the whole procedure — content is loaded from a plain
`<script>` file rather than `fetch()`, specifically so the site works from the filesystem
without a server.

### Notes on the build

- **Dark, deliberately.** One palette, defined on `:root` in `site.css` — void, signal
  orange, ultraviolet. Type is Unbounded / Manrope / JetBrains Mono from Google Fonts, with
  system fallbacks.
- **The Field** (`initField` in `site.js`) is a 2400×1500 world under a CSS-transform
  camera. Nodes counter-scale so labels stay legible at every zoom; the dot canvas leans away
  from the cursor in world space; drag pans (vertical touch still scrolls the page); the tour
  auto-advances; arrow keys work while the field is on screen. Node positions and the
  connecting curves are computed from the project array.
- **The Gates** (`initGates`) pin each section with GSAP ScrollTrigger and scrub the rule,
  glyph strokes, fills, count and body against scroll. The rail shows only while the gates
  are on screen. Without GSAP or with reduced motion, an IntersectionObserver still tracks the
  locks and everything is visible at rest.
- **Accessible by default.** Skip link, semantic landmarks, focus-visible outlines, labelled
  figures, a live region for the node panel, and every animation guarded behind
  `prefers-reduced-motion`.
- **Responsive to ~320px.** Tables and wide figures scroll inside their own container; the
  page body never scrolls sideways.
- **Private repos are never linked as browsable.** A project marked
  `visibility: "private"` renders as *"Private repo — walkthrough on request"* rather than a
  link to a 404.
