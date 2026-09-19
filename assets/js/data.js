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
      summary: "Every month the MIS exports one file of 590,000 to 736,000 rows and 56 to 82 columns, growing every month: every member and every loan. Excel could barely hold it, and a single question meant a day of filtering, lookups and copying. For twenty-seven months I answered regulators, finance, programme heads and donors from that file with pandas instead — 73 notebooks in seven programmes, each one run in minutes and footed to the source before it left. The reconciliation checks stay in the code.",
      facts: [
        { k: "Monthly export", v: "590,000\u2013736,000 rows \u00d7 56\u201382 columns" },
        { k: "Notebooks", v: "73 kept of 104" },
        { k: "Programmes", v: "7" }
      ],
      /* The in-depth block rendered after this gate. Only Part II has one. */
      detail: {
        eyebrow: "Part II, in depth",
        heading: "From a file Excel could not hold to answers in minutes.",
        problem: [
          "The institution's MIS exports a monthly <em>CM Report</em>: one row per member-loan, 590,000 to 736,000 rows by 56 to 82 columns depending on the month, most of them headed in Bangla. It is the only complete picture of the loan book, and there was no reporting layer above it. So every question landed on a spreadsheet — the regulator's classification schedule, the bank's disbursement statement, which branches carry the overdue, which activities the loans fund.",
          "Excel is the wrong tool at that size. The file sits near the row ceiling, opens slowly if at all, and a pivot or lookup across it can freeze the machine. It strips the leading zeros from member IDs the moment it opens them, reads the same date column four different ways depending on what touched the export last, and counts a member with three loans three times. Each answer took a day or more of filtering, lookups and copying between workbooks, and a wrong cell was invisible.",
          "A notebook reads the same export in pandas, cleans it once — identifiers as text, four date formats parsed, headers stripped, money coerced — and answers the question in minutes, footed to the source file. Next month the same notebook runs on next month's export."
        ],
        file: { n: "736k", l: "rows in the latest month", n2: "82", l2: "columns, up from 56", n3: "70%", l3: "of Excel\u2019s row ceiling" },
        beforeAfter: {
          cols: ["The question", "In Excel", "In pandas"],
          rows: [
            ["Regulator's classification schedule — loans and savers by size, term, aging and sex, per branch", "Manual banding and one pivot per branch over several days; totals checked by hand.", "Bands, branch and sex in one grouped pass; every subtotal footed to the raw file automatically."],
            ["Bank disbursement statement for finance", "Member rows copied into the bank's layout, branch by branch, every month.", "One run writes the statement in finance's layout — one workbook per zone, subtotals included."],
            ["Portfolio at risk by zone, branch, product, activity, age band", "A separate pivot for every cut, and members with several loans counted more than once.", "One PAR function, unique members counted, any dimension on request."],
            ["Month-to-month cohorts — disbursed in one month, overdue the next; overdue members given a new loan", "Practically impossible: two 700,000-row files side by side.", "Two months merged on member and loan ID with month prefixes; the cohort is a filter."],
            ["Overdue-tracking packs for every zone", "A workbook per zone assembled by hand each month.", "Split into workbooks with subtotals in one step; every zone's pack in one run."]
          ]
        },
        programmes: [
          { name: "Regulatory classification schedules", n: 7, who: "the regulator’s half-yearly return", q: "Loans and savers classified by size, term, aging and sex, per branch, footed to totals — the MRA return and the MAPLE aging schedules." },
          { name: "Portfolio quality", n: 16, who: "programme heads and zone managers", q: "Where the risk sits: which zones, branches, products, activities, age groups and education levels carry the overdue, and how old it is." },
          { name: "Cohorts and flows", n: 12, who: "management and monitoring", q: "Disbursed in one month, overdue the next; overdue members who received a new loan; new overdue realised or carried; the share of a month’s disbursement made in its last three days." },
          { name: "Portfolio structure by fiscal year", n: 10, who: "management", q: "How the book is distributed across disbursement years, and within the running year by quarter and month, at organisation, zone, branch, credit-manager and loan-type level." },
          { name: "Sector, IGA and donor-facing analytics", n: 10, who: "donors, communications and project design", q: "How much of the portfolio is agriculture and, within it, livestock, fisheries and crops; which branches hold cattle, fish or forestry borrowers; loan-size bands and small-loan geography." },
          { name: "Operational data services", n: 14, who: "finance, the bank, the zones and the MIS team", q: "The monthly member-level disbursement statement for finance and the bank, overdue tracking workbooks per zone, member-count cross-checks, monitoring packs, reference-data fixes." },
          { name: "System validation", n: 4, who: "the MIS team, before a system change", q: "Does each overdue account show a real payment history? Are the borrower’s phone and NID verified? How do verified and unverified populations differ in outstanding and overdue?" }
        ],
        programmesNote: "kept of 104 written. The rest were monthly re-runs and drafts.",
        rules: [
          { t: "Identifiers are text.", d: "A member ID that loses its leading zero is a different member. Every ID column is read as a string before anything else happens." },
          { t: "A date is parsed once.", d: "Five formats tried in order; a value that has parsed is never re-interpreted. The fiscal year is derived from the date, never read from a column." },
          { t: "Members, not rows.", d: "A member with three loans is three rows. Borrowers are counted unique and savings summed per member, or every count is wrong by the number of repeat loans." },
          { t: "Every total foots.", d: "A schedule reconciles to the raw export inside the notebook before anything is written out. The check is code, not memory." },
          { t: "Unknown stays unknown.", d: "An activity that matches no sector goes to Other. Nothing is guessed to make a chart look complete." },
          { t: "A number is defined once.", d: "PAR, fiscal year, total savings and the classification bands live in one library with tests, so two reports cannot disagree." }
        ],
        impact: [
          "<b>Minutes, not days.</b> A question that took a day in a spreadsheet is a notebook run, and next month it is the same run on the next export.",
          "<b>Recurring deliverables, owned.</b> The regulator’s half-yearly return, finance’s monthly bank statement, the zone overdue packs and the member-count cross-checks all run from the same engine.",
          "<b>Twenty-seven months</b> of regulator, finance, programme and donor questions answered from one dataset. 73 analyses kept in seven programmes, runnable by the next person.",
          "<b>The groundwork for Part I.</b> The target-allocation engine, the reporting dashboard and the special-permission tracker were built on the understanding of the data these notebooks produced."
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
