/* ============================================================
   Portfolio content — this is the ONLY file you edit to add,
   reorder, or retire a project.
   See ADDING-A-PROJECT.md for the 3-step recipe.
   ============================================================ */

window.PORTFOLIO = {

  profile: {
    name: "Pabel Haque",
    role: "Digital Transformation · Systems & Data",
    location: "Bangladesh",
    // Leave a field as "" to hide that row in the Contact gate.
    github: "https://github.com/pabel64",
    email: "",
    linkedin: "",
    resume: ""
  },

  /* ---------------------------------------------------------
     PROJECTS — order here is the order of the gates and the
     tour. Each project is a node in the field and a gate below.
     principle:  the one rule the system refuses to break (short)
     stat:       the one number for this system — shown on the
                 node panel and counted up in its gate
     glyph:      pipeline | cascade | funnel | hierarchy | code
     repo:       full URL, or "" if there is nothing to link
     visibility: "public" | "private"
     page:       path to the case study, or "" for no page
     Node positions and connecting lines are computed — nothing
     to lay out by hand.
     --------------------------------------------------------- */
  projects: [
    {
      slug: "factory-agent-overlay",
      title: "Multi-Agent Software Factory",
      kicker: "AI orchestration · platform",
      year: "2026",
      glyph: "pipeline",
      principle: "Waits for a human.",
      stat: { n: "71", label: "specialist agents · 4 human gates" },
      summary: "Drop it into any codebase and the codebase gets a delivery pipeline: 71 specialist agents, 38 stages, and four approval gates where everything stops and waits for you. No agent can declare a stage done without leaving a file on disk that passes its own check, and a critic sends back work that is merely correct.",
      facts: [
        { k: "Agents", v: "71 specialists" },
        { k: "Stages", v: "38, 4 human-gated" },
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
      principle: "Refuses to guess.",
      stat: { n: "17,962", label: "targets per cycle · bit-identical" },
      summary: "Turns a branch's microfinance targets into a fair share for each of 2,574 field officers, weighted by their own portfolio. The engine will not run on inputs it cannot order canonically and will not accept a metric without a declared direction — so the same cycle re-run gives the same 17,962 numbers, and each one can be explained to the officer who received it.",
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
      principle: "Won't overspend.",
      stat: { n: "0", label: "paid API calls · by default" },
      summary: "Reads the morning's op-eds and geopolitics coverage so exam candidates don't have to — scoring every article 0–100 against the syllabus, keeping the argument for why a foreign story matters in Bangladesh, and logging the rejects for audit. Routes across three model providers, free and local tiers first; paid calls stay off until someone turns them on.",
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
      principle: "Knows who's asking.",
      stat: { n: "5", label: "role tiers · each scoped" },
      summary: "One dashboard for a five-tier field hierarchy: a field officer sees their own figures, each manager sees one level wider, head office gets the whole network in the shape HR and payroll consume. Scoring configuration lives in a separate admin console, so a settings mistake and a data-access mistake can never share a click.",
      facts: [
        { k: "Role tiers", v: "5 + admin" },
        { k: "Stack", v: "Django + Next.js" },
        { k: "Reporting views", v: "4 suites" }
      ],
      tags: ["Django", "Next.js", "TypeScript", "PostgreSQL", "Docker", "Recharts"],
      page: "projects/ak47-dashboard.html",
      repo: "https://github.com/pabel64/AK47-Dashboard",
      visibility: "private"
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
