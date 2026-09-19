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

  /* Two parts. Every project carries a `part`; the gates get a divider
     where the part changes, and the field colours nodes by part. */
  parts: {
    systems:   { label: "Products & systems", numeral: "I",  blurb: "Things people use every day: a delivery pipeline, an allocation engine, a study platform, a dashboard, a tracker. Each one enforces a rule so nobody has to remember it." },
    analytics: { label: "Analytics",          numeral: "II", blurb: "The practice behind them: turning one unwieldy monthly export into answers for regulators, finance, programme heads and donors — in minutes, not days." }
  },

  /* ---------------------------------------------------------
     PROJECTS — order here is the order of the gates and the
     tour. Each project is a node in the field and a gate below.
     part:       "systems" | "analytics" (groups the gates)
     principle:  the one rule the system refuses to break (short)
     detail:     optional — an in-depth block rendered after the
                 gate (pain, before/after, capabilities, impact)
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
      part: "systems",
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
      part: "systems",
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
      part: "systems",
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
      part: "systems",
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
    },
    {
      slug: "padakhep-rebate-automation",
      part: "systems",
      title: "Special-Permission Tracking & Microzen Validation",
      kicker: "Automation · data extraction",
      year: "2026",
      glyph: "audit",
      principle: "Won't assume a yes.",
      stat: { n: "5", label: "concession types · Bangla + English" },
      summary: "Reads a bilingual WhatsApp group where branch staff post loan waiver, rebate and settlement requests, keeps only the genuine concessions, and cross-checks every member against the core banking system to catch a new loan issued after one. Each application lands as pending — the approver's bare \"Okay\" replies cannot be tied to a record, so no approval is ever inferred.",
      facts: [
        { k: "Concession types", v: "5, bilingual" },
        { k: "Audit workbook", v: "6 sheets" },
        { k: "Approvals inferred", v: "0" }
      ],
      tags: ["Python", "Flask", "SQLite", "Playwright", "Chart.js", "Excel automation", "Bilingual parsing"],
      page: "projects/padakhep-rebate-automation.html",
      repo: "https://github.com/pabel64/padakhep-rebate-automation",
      visibility: "private"
    },
    {
      slug: "reports-and-analytics",
      part: "analytics",
      title: "Reports & Analytics",
      kicker: "Data analysis · pandas",
      year: "2023–2026",
      glyph: "report",
      principle: "Shows its working.",
      stat: { n: "73", label: "analyses · 27 months · one dataset" },
      summary: "Every month the MIS exports one file: around 800,000 rows by 90 columns, every member and every loan. Excel could barely hold it, and a single question meant a day of filtering, lookups and copying. For twenty-seven months I answered regulators, finance, programme heads and donors from that file with pandas instead — 73 notebooks in seven programmes, each one run in minutes and footed to the source before it left. The reconciliation checks stay in the code.",
      facts: [
        { k: "Monthly export", v: "≈800,000 rows × 90 columns" },
        { k: "Notebooks", v: "73 kept of 104" },
        { k: "Programmes", v: "7" }
      ],
      /* The in-depth block rendered after this gate. Only Part II has one. */
      detail: {
        eyebrow: "Part II, in depth",
        heading: "From a file Excel could not hold to answers in minutes.",
        problem: [
          "The institution's MIS exports a monthly <em>CM Report</em>: one row per member-loan, around 800,000 rows by 90 columns, most of them headed in Bangla. It is the only complete picture of the loan book, and there was no reporting layer above it. So every question landed on a spreadsheet — the regulator's classification schedule, the bank's disbursement statement, which branches carry the overdue, which activities the loans fund.",
          "Excel is the wrong tool at that size. The file sits near the row ceiling, opens slowly if at all, and a pivot or lookup across it can freeze the machine. It strips the leading zeros from member IDs the moment it opens them, reads the same date column four different ways depending on what touched the export last, and counts a member with three loans three times. Each answer took a day or more of filtering, lookups and copying between workbooks, and a wrong cell was invisible.",
          "A notebook reads the same export in pandas, cleans it once — identifiers as text, four date formats parsed, headers stripped, money coerced — and answers the question in minutes, footed to the source file. Next month the same notebook runs on next month's export."
        ],
        file: { n: "≈800,000", l: "rows a month", n2: "90", l2: "columns", n3: "1", l3: "source of truth" },
        beforeAfter: {
          cols: ["The question", "In Excel", "In pandas"],
          rows: [
            ["Regulator's classification schedule — loans and savers by size, term, aging and sex, per branch", "Manual banding and one pivot per branch over several days; totals checked by hand.", "Bands, branch and sex in one grouped pass; every subtotal footed to the raw file automatically."],
            ["Bank disbursement statement for finance", "Member rows copied into the bank's layout, branch by branch, every month.", "One run writes the statement in finance's layout — one workbook per zone, subtotals included."],
            ["Portfolio at risk by zone, branch, product, activity, age band", "A separate pivot for every cut, and members with several loans counted more than once.", "One PAR function, unique members counted, any dimension on request."],
            ["Month-to-month cohorts — disbursed in one month, overdue the next; overdue members given a new loan", "Practically impossible: two 800,000-row files side by side.", "Two months merged on member and loan ID with month prefixes; the cohort is a filter."],
            ["Overdue-tracking packs for every zone", "A workbook per zone assembled by hand each month.", "Split into workbooks with subtotals in one step; every zone's pack in one run."]
          ]
        },
        columns: [
          { title: "Capabilities used", items: [
            "<b>Cleaning at scale</b> — identifiers kept as text so leading zeros survive, four date formats parsed, headers stripped, money coerced",
            "<b>Derived measures</b> — July–June fiscal year from the disbursement date, total savings across three accounts, days since last instalment",
            "<b>Aggregation</b> — groupby, pivot and banded cuts over zone, branch, credit manager, product, activity and age, counting unique members not rows",
            "<b>Reshaping</b> — members with several loans unstacked to one row; month-prefixed merges for cohorts and flows",
            "<b>Taxonomy</b> — loan component to product family, activity to sector and agricultural sub-sector",
            "<b>Reconciliation</b> — totals footed to the raw export; cross-system checks by joining the MIS database",
            "<b>Delivery</b> — workbooks with subtotals split per zone or branch, charts for programme heads, an interactive ID filter for field visits"
          ] },
          { title: "Skills", items: [
            "Python · pandas · NumPy",
            "Data cleaning and validation on large exports",
            "groupby · merge · pivot · pd.cut",
            "Excel automation — xlsxwriter, openpyxl",
            "SQL and cross-system joins — SQLAlchemy",
            "Visualisation — matplotlib, plotly",
            "Reproducibility — pytest, pre-commit, synthetic sample data",
            "Domain: microfinance — portfolio at risk, regulatory schedules, fiscal-year reporting"
          ] },
          { title: "Impact", items: [
            "<b>Minutes, not days.</b> A question that took a day of spreadsheet work is a notebook run.",
            "<b>Answers that foot.</b> Every schedule reconciles to the raw export before it leaves.",
            "<b>One definition per number.</b> PAR, fiscal year and total savings are defined once, in a tested library.",
            "<b>Twenty-seven months</b> of regulator, finance, programme and donor questions answered from one dataset; 73 analyses kept.",
            "<b>The groundwork for Part I.</b> The target-allocation engine and the reporting dashboard were built on this understanding of the data."
          ] }
        ]
      },
      tags: ["Python", "pandas", "Jupyter", "xlsxwriter", "SQLAlchemy", "ipywidgets", "pytest"],
      page: "projects/reports-and-analytics.html",
      repo: "https://github.com/pabel64/reports-and-analytics",
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
