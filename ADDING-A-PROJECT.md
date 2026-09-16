# Adding a project

Three steps. No build step, no dependencies, no framework — edit, commit, push, and
GitHub Pages redeploys in about a minute.

---

## 1. Add the card

Open [`assets/js/data.js`](assets/js/data.js) and add an entry to the `projects` array.
**Position in the array is position on the page** — put your strongest work first.

```js
{
  slug: "my-new-thing",
  title: "My New Thing",
  kicker: "Category · discipline",
  year: "2026",
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
| `page` | If set, the whole card links to the case study. |
| `repo` + `visibility: "public"` | If there is no `page`, the card links to GitHub instead. |
| `visibility: "private"` | Card shows *"Private repo — walkthrough on request"* and does **not** link to a URL a recruiter would hit a 404 on. |
| `facts` | The mono line under the summary. Keep to 2–3; they should be checkable. |
| `tags` | The pill row. Real technologies only. |

Only `slug`, `title`, `summary` and `visibility` are strictly required.

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
- `.table-scroll` wrapping `.data-table` — a table that scrolls sideways on a phone
  instead of breaking the layout.
- `<pre>` — plain pre-formatted text (ASCII diagrams, command sequences).
- `.reveal` on any element — fades in on scroll.

### Editing the rest of the page

| What | Where |
|---|---|
| Name, location, contact links | `profile` in `assets/js/data.js` |
| The four headline numbers | `stats` in `assets/js/data.js` |
| Stack lists | `skills` in `assets/js/data.js` |
| Hero headline, "How I work", section copy | `index.html` — plain HTML |
| Colours, spacing, type | the `:root` variables at the top of `assets/css/site.css` |

### Testing before you push

Open `index.html` in a browser directly — it works from the filesystem, because the
content is a plain `<script>` file rather than a `fetch()`. Check it at phone width too
(dev tools → device toolbar).

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
