/* ============================================================
   Portfolio content — this is the ONLY file you edit to add,
   reorder, or retire a project on the home page.
   See ADDING-A-PROJECT.md for the 3-step recipe.
   ============================================================ */

window.PORTFOLIO = {

  profile: {
    name: "Pabel Haque",
    role: "Digital Transformation · Systems & Data",
    location: "Bangladesh",
    // Leave a field as "" to hide that row in the Contact section.
    github: "https://github.com/pabel64",
    email: "",
    linkedin: "",
    resume: ""
  },

  /* Home-page headline numbers. Animated count-up; keep them to things
     you can defend in an interview — every one below is countable. */
  stats: [
    { n: "4",      label: "Production systems" },
    { n: "71",     label: "Agents orchestrated" },
    { n: "409",    label: "Branches modelled" },
    { n: "17,962", label: "Targets computed / cycle" }
  ],

  /* ---------------------------------------------------------
     PROJECTS — order here is the order on the page.
     glyph:      pipeline | cascade | funnel | hierarchy | code
     repo:       full URL, or "" if there is nothing to link
     visibility: "public" | "private"
     page:       path to the case study, or "" for a card with no page
     --------------------------------------------------------- */
  projects: [
    {
      slug: "factory-agent-overlay",
      title: "Multi-Agent Software Factory",
      kicker: "AI orchestration · platform",
      year: "2026",
      glyph: "pipeline",
      summary: "A portable overlay that turns any codebase into a governed, 71-agent software delivery pipeline — four mandatory human approval gates, artifact verification agents cannot fake, and an adversarial critic that blocks work for being merely correct.",
      facts: [
        { k: "Agents", v: "71 specialists" },
        { k: "Human gates", v: "4, mandatory" },
        { k: "Playbooks", v: "20 workflows" }
      ],
      tags: ["Python", "Claude Agent SDK", "PowerShell", "Bash", "Pytest", "Governance hooks"],
      page: "projects/factory-agent-overlay.html",
      repo: "https://github.com/pabel64/factory-agent-overlay",
      visibility: "private"
    },
    {
      slug: "pmuk-target-system",
      title: "PMUK Field-Staff Target & Budget Allocation System",
      kicker: "Enterprise system · allocation engine",
      year: "2026",
      glyph: "cascade",
      summary: "Divides branch-level microfinance targets down to individual staff with a weighted largest-remainder cascade — deterministic enough that re-running the same inputs reproduces the same 17,962 numbers, exactly.",
      facts: [
        { k: "Scale", v: "2,574 staff · 409 branches" },
        { k: "Domain modules", v: "11" },
        { k: "Re-runs", v: "Bit-identical" }
      ],
      tags: ["Django", "PostgreSQL", "TypeScript", "React", "Docker", "RBAC", "i18n"],
      page: "projects/pmuk-target-system.html",
      repo: "https://github.com/pabel64/PMUK-Target-System",
      visibility: "private"
    },
    {
      slug: "editorials-study-assistant",
      title: "Autonomous Exam-Study Intelligence Platform",
      kicker: "LLM pipeline · data engineering",
      year: "2026",
      glyph: "funnel",
      summary: "Crawls editorial and geopolitics sources nightly, scores each article 0–100 for exam relevance through a deterministic taxonomy plus an LLM gate, and serves the survivors through an 18-page study workspace. Free-tier and local models by default.",
      facts: [
        { k: "Model routing", v: "3-provider fallback" },
        { k: "Workspace", v: "18 pages" },
        { k: "Paid API calls", v: "Off by default" }
      ],
      tags: ["Scrapy", "Streamlit", "SQLite", "Groq", "Cerebras", "Ollama", "ReportLab", "OCR"],
      page: "projects/editorials-study-assistant.html",
      repo: "https://github.com/pabel64/editorials",
      visibility: "private"
    },
    {
      slug: "ak47-dashboard",
      title: "AK47 Performance & Reporting Dashboard",
      kicker: "Analytics · full-stack",
      year: "2026",
      glyph: "hierarchy",
      summary: "A role-aware operations dashboard for a five-tier field hierarchy — each tier sees exactly one level wider than the one below — with the reporting suite that replaced hand-assembled scorecards, transfer analytics and HR exports.",
      facts: [
        { k: "Role tiers", v: "5 + admin" },
        { k: "Stack", v: "Django + Next.js" },
        { k: "Reporting views", v: "4 suites" }
      ],
      tags: ["Django", "Next.js", "TypeScript", "PostgreSQL", "Docker", "Recharts"],
      page: "projects/ak47-dashboard.html",
      repo: "https://github.com/pabel64/AK47-Dashboard",
      visibility: "private"
    },
    {
      slug: "sprite-spirit",
      title: "sprite-spirit",
      kicker: "Open source · earlier work",
      year: "2016",
      glyph: "code",
      summary: "An SCSS mixin that generates sprite-sheet positioning from a single declaration. Public, readable in one sitting.",
      facts: [
        { k: "Language", v: "SCSS" },
        { k: "Scope", v: "Single mixin" }
      ],
      tags: ["SCSS", "CSS"],
      page: "",
      repo: "https://github.com/pabel64/sprite-spirit",
      visibility: "public"
    }
  ],

  skills: [
    {
      group: "Backend & data",
      items: ["Python", "Django / DRF", "FastAPI", "PostgreSQL", "SQLite", "PL/pgSQL", "Scrapy", "Pandas"]
    },
    {
      group: "Frontend",
      items: ["TypeScript", "React", "Next.js", "Tailwind CSS", "Streamlit", "HTML / CSS"]
    },
    {
      group: "AI & agents",
      items: ["Claude Agent SDK", "Multi-agent orchestration", "LLM routing & fallback", "Prompt / eval design", "Groq · Cerebras · Ollama", "Retrieval & scoring pipelines"]
    },
    {
      group: "Platform & practice",
      items: ["Docker", "Git / GitHub Actions", "PowerShell / Bash", "Pytest", "RBAC & audit design", "Deterministic engine design"]
    }
  ]
};
