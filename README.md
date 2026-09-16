# Pabel Haque — Portfolio

**Live site → https://pabel64.github.io/portfolio/**

Digital transformation, systems and data. Four production systems, each with a full case
study: agent orchestration, a deterministic allocation engine, an LLM scoring pipeline, and
role-aware analytics.

---

## The work

| Project | What it is | Case study |
|---|---|---|
| **Multi-Agent Software Factory** | A portable overlay that turns any codebase into a governed 60-agent delivery pipeline — four mandatory human approval gates, artifact verification agents cannot fake, and an adversarial critic that blocks work for being merely correct. | [Read →](projects/factory-agent-overlay.html) |
| **PMUK Target &amp; Budget Allocation System** | A weighted largest-remainder cascade that divides branch-level microfinance targets across 2,574 field staff in 409 branches — 17,962 targets per cycle, bit-identical on re-run. | [Read →](projects/pmuk-target-system.html) |
| **Autonomous Exam-Study Intelligence Platform** | A crawler-to-classroom LLM pipeline: scores every article 0–100 for exam relevance through a deterministic taxonomy plus a model gate, and serves the survivors through an 18-page workspace. Runs on free-tier and local models by default. | [Read →](projects/editorials-study-assistant.html) |
| **AK47 Performance &amp; Reporting Dashboard** | A role-aware operations dashboard for a five-tier field hierarchy — each tier sees exactly one level wider than the one below — plus the reporting suite that replaced manual scorecard assembly. | [Read →](projects/ak47-dashboard.html) |

Most of the source repositories are private because the systems run against real
organisational data. Live walkthroughs and architecture documents are available on request —
see the contact section of the site.

---

## About this repository

This repo *is* the portfolio site. It is deliberately plain: **no framework, no build step,
no dependencies, no npm install.** GitHub Pages serves the files exactly as they are
committed, which means it cannot break in a build pipeline and it will still work in five
years.

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

- **Dark-first, light-aware.** Palette tokens are defined once on `:root` and redefined
  under `prefers-color-scheme: light`.
- **Accessible by default.** Skip link, semantic landmarks, focus-visible outlines, labelled
  figures, and every animation guarded behind `prefers-reduced-motion` — reveals are applied
  as an enhancement, so with motion reduced the content is simply present rather than needing
  a fallback.
- **Responsive to ~320px.** Tables and wide figures scroll inside their own container; the
  page body never scrolls sideways.
- **Private repos are never linked as browsable.** A project marked
  `visibility: "private"` renders as *"Private repo — walkthrough on request"* rather than a
  link to a 404.
