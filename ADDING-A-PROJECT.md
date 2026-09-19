# Adding a project

Three steps. No build step, no dependencies, no framework — edit, commit, push, and
GitHub Pages redeploys in about a minute.

---

## 1. Add the card

Open [`assets/js/data.js`](assets/js/data.js) and add an entry to the `projects` array.
**Position in the array is the order of the gates and the tour** — put your strongest
work first. The project becomes a node in the field and a gate below it; node positions,
connecting lines, the rail of locks and the tour all derive from the array.

```js
{
  slug: "my-new-thing",
  title: "My New Thing",
  kicker: "Category · discipline",
  year: "2026",
  part: "systems",                      // "systems" (Part I) or "analytics" (Part II)
  glyph: "pipeline",                    // pipeline | cascade | funnel | hierarchy | audit | report | code
  principle: "Never loses a record.",   // the one rule it refuses to break — short, ends with a period
  stat: { n: "12,400", label: "records per day · reconciled" },   // the one number for this system
  summary: "Two sentences. Lead with the problem, not the tech. One number if you have one.",
  facts: [
    { k: "Scale",  v: "12k records/day" },
    { k: "Stack",  v: "Go + Postgres" }
  ],
  tags: ["Go", "PostgreSQL", "Docker"],
  page: "projects/my-new-thing.html",   // "" for a card with no case study
  repo: "https://github.com/pabel64/my-new-thing",
  visibility: "private"                 // "public" | "private"
}
```

What each field does:

| Field | Effect |
|---|---|
| `principle` | The node label in the field, the big headline of the gate, and the rail label. Same grammatical shape as the others: a short verb phrase, one period. |
| `stat` | `{ n, label }`. Shown on the node panel and counted up inside the gate. `n` is a string so commas survive (`"17,962"`). |
| `page` | "Read the case study" on the panel and in the gate. |
| `repo` + `visibility: "public"` | Adds a "View the code" button in the gate. |
| `visibility: "private"` | Gate shows *"Private repo — walkthrough on request"* and never links to a URL a recruiter would hit a 404 on. |
| `tags` | The pill row inside the gate. Real technologies only. |
| `part` | Which half of the site the project belongs to: `systems` (Part I · Products & systems) or `analytics` (Part II · Analytics). The field colours the node by part, the gates get a divider where the part changes, and every count on the page ("Five systems, one practice", the legend, the footer) is derived from these values. |
| `detail` | Optional. An in-depth dossier rendered after the gate — `eyebrow`, `heading`, `problem` (paragraphs, HTML allowed), `file` (three big numbers), `beforeAfter` (`cols` + `rows` of three strings), `programmes` (`name`, `n`, `who`, `q`) with a `programmesNote`, `rules` (`t` + `d`), `impact` (HTML strings). Only the analytics entry has one today; see it in `data.js` for the shape. |
| `glyph` | The SVG mark that draws itself in the gate: `pipeline` (flow with gates), `cascade` (tree into bars), `funnel` (filter), `hierarchy` (tiers), `audit` (message becoming ledger rows), `code` (generic). To add a new one, add an entry to `GLYPHS` in `assets/js/site.js` — put `pathLength="1"` on any stroked path so it can animate. |
| `facts` | Kept for the case-study header; not shown on the home page. |

Only `slug`, `title`, `principle`, `summary` and `visibility` are strictly required. Up to
four projects use hand-placed node positions; five or more are distributed around an
ellipse automatically.

## 2. Write the case study (optional but recommended)

```bash
cp projects/_template.html projects/my-new-thing.html
```

The template carries the structure the other four follow, with `[[placeholders]]`
to replace. The shape that works on a technical reader:

> **problem → what you built → one detail worth defending → outcome**

The "one detail" section is the part that earns the interview. Make it a real
decision: an algorithm, a race condition you found, a schema trade-off, a bug and
why it happened. Three strong case studies beat eight thin ones — if a project has
no defensible detail yet, give it a card with `page: ""` and leave it at that.

Then fix up the `.case-nav` links at the bottom of the new page, and the `Next case
study` link on whichever page should now point at it.

## 3. Ship it

```bash
git add -A && git commit -m "Add My New Thing case study" && git push
```

---

## Reference

### Components available in a case study

All defined in [`assets/css/site.css`](assets/css/site.css) — no classes to invent.

- `.callout` with a `<span class="label">` — the highlighted "why this matters" box.
- `.figure` + `.pipeline` + `.stage` — a numbered flow that animates in on scroll. Add
  `class="gate"` to a stage for the accent treatment, and a `<span class="badge">` for a
  short label.
- `<div data-glyph="cascade">` — drops in one of the SVG marks (same keys as the `glyph`
  field). Used in the case-study header; works anywhere.
- `.table-scroll` wrapping `.data-table` — a table that scrolls sideways on a phone
  instead of breaking the layout.
- `<pre>` — plain pre-formatted text (ASCII diagrams, command sequences).
- `.reveal` on any element — fades in on scroll.

### Editing the rest of the page

| What | Where |
|---|---|
| Name, location, contact links | `profile` in `assets/js/data.js` |
| Stack lists (footer) | `skills` in `assets/js/data.js` |
| Field intro headline, last-gate copy | `index.html` — plain HTML |
| Colours, spacing, type | the `:root` variables at the top of `assets/css/site.css` |
| Field dot density / push / glow | `GAP`, `PUSH`, `R` constants in `initField`, `assets/js/site.js` |
| Tour pace | the `4400` ms in `tourStep`, `assets/js/site.js` |
| Gate scroll length | `end: "+=120%"` in `initGates`, `assets/js/site.js` |

### Testing before you push

Open `index.html` in a browser directly — it works from the filesystem, because the
content is a plain `<script>` file rather than a `fetch()`. GSAP loads from cdnjs; if it
is blocked or offline, the gates still render with everything visible (the `static` body
class), they just don't pin and animate. Check it at phone width too (dev tools → device
toolbar) and with reduced motion on.

### Things worth keeping true

- **Never link a private repo as if it were browsable.** `visibility: "private"` exists
  so a recruiter never lands on a 404. If you make a repo public, flip the field.
- **Every number on the site should be one you can defend out loud.** They are all
  currently countable in the repos.
- **No internal URLs, credentials, hostnames, or customer-identifying data.** This site
  is public. The case studies deliberately describe architecture and decisions, not
  configuration.
- **Animation stays optional.** Everything respects `prefers-reduced-motion`; if you add
  motion, guard it the same way.
