/* ============================================================================
   PMUK Field-Staff Target System — REPLICA (simulation, invented data)
   Single-file client-side replica. No build step, no framework, classic script
   (loads over file://). Business rules, formulas and state names are copied
   from the real code + registries and cited inline; all DATA is invented.

   Engine ported verbatim in behaviour from:
     backend/engine/cascade.py         (Largest-Remainder Method)
     backend/engine/rounding.py        (floor toward -inf; half away from zero)
     backend/engine/publish.py         (A14 published-figure derivation)
   Formulas: datasets/kpi_registry.yaml#target_cascade_lrm ; rules cited by
   BR-id from datasets/business_rules.yaml.
   ============================================================================ */
(function () {
'use strict';

/* ---- tiny DOM + misc helpers ---------------------------------------------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function pad10(n) { return String(n).padStart(10, '0'); }

/* seeded RNG (mulberry32) — data is stable across reloads (prompt requirement) */
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var RNG = mulberry32(0x9E3779B1);
function rnd(min, max) { return min + Math.floor(RNG() * (max - min + 1)); }
function pick(arr) { return arr[Math.floor(RNG() * arr.length)]; }

/* ---- exact rational (BigInt) — decimal-safe cascade arithmetic ------------- */
function bgcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a || 1n; }
function fr(n, d) { n = BigInt(n); d = (d === undefined ? 1n : BigInt(d)); if (d < 0n) { n = -n; d = -d; } var g = bgcd(n, d); return { n: n / g, d: d / g }; }
function frAdd(a, b) { return fr(a.n * b.d + b.n * a.d, a.d * b.d); }
function frSub(a, b) { return fr(a.n * b.d - b.n * a.d, a.d * b.d); }
function frMul(a, b) { return fr(a.n * b.n, a.d * b.d); }
function frDiv(a, b) { return fr(a.n * b.d, a.d * b.n); }
function frCmp(a, b) { var l = a.n * b.d, r = b.n * a.d; return l < r ? -1 : l > r ? 1 : 0; }
function frFloor(a) { var q = a.n / a.d; if (a.n % a.d !== 0n && a.n < 0n) q -= 1n; return q; } /* toward -inf; d>0 */
function frNum(a) { return Number(a.n) / Number(a.d); }

/* ---- rounding (backend/engine/rounding.py) -------------------------------- */
/* A12 BR-GROUP-TARGET-ROUND-AT-IMPORT: symmetric, 824.5->825, -824.5->-825 */
function roundHalfAwayFromZero(x) { return x >= 0 ? Math.floor(x + 0.5) : Math.ceil(x - 0.5); }

/* ---- publish (backend/engine/publish.py, A14 STEP 7) ---------------------- */
function derivePublished(finalTarget, policy) {
  if (finalTarget === null) return [null, null];
  if (policy === 'BLOCK_AT_IMPORT') return [null, null];
  if (policy === 'FLOOR_AT_ZERO_WITH_LABEL' && finalTarget < 0) return [0, 'Maintain'];
  return [finalTarget, null];
}

/* ---- THE cascade engine (backend/engine/cascade.py) -----------------------
   One call = one (Branch+Program group x Metric x Run). Evaluation order is
   NORMATIVE: (a) A17 exclusions on FULL group -> (b) denominators over included
   -> (c) A8 degenerate-denominator -> (d) renormalise -> (e) cascade
   (ratios -> weighted score -> exact share -> floor toward -inf ->
   largest-remainder top-up, ties by ascending staff_id). Exact-sum invariant:
   sum(final_target over included) == group_target.  weights: integer
   micro-units (scaled 1e6); each column sums to exactly 1,000,000.            */
function cascade(gi) {
  var n = gi.indicators.length;
  var W = gi.weights.map(function (m) { return fr(m, 1000000); });

  /* (a) A17 exclusions — tested against the FULL group's raw data */
  var groupWide = new Array(n).fill(0n);
  gi.staff.forEach(function (s) { for (var k = 0; k < n; k++) { var v = s.values[k].value; if (v !== null) groupWide[k] += BigInt(v); } });
  var excludedStaffIds = [], includedRows = [], excludedRows = [];
  gi.staff.forEach(function (s) {
    var reason = null;
    for (var k = 0; k < n; k++) { if (gi.weights[k] > 0 && s.values[k].state === 'NOT_SUPPLIED' && groupWide[k] > 0n) { reason = 'MISSING_INDICATOR_VALUE'; break; } }
    if (reason) { excludedStaffIds.push(s.staff_id); excludedRows.push(s); } else includedRows.push(s);
  });
  if (includedRows.length === 0) return { error: 'group_fully_excluded', groupTarget: gi.groupTarget, rows: [], excludedStaffIds: excludedStaffIds };

  /* (b) denominators over INCLUDED staff only */
  var denom = new Array(n).fill(0n);
  includedRows.forEach(function (s) { for (var k = 0; k < n; k++) { var v = s.values[k].value; if (v !== null) denom[k] += BigInt(v); } });

  /* (c) A8 — i_effective = weighted indicators with denominator > 0 */
  var weightedIdx = []; for (var k = 0; k < n; k++) if (gi.weights[k] > 0) weightedIdx.push(k);
  var iEff = weightedIdx.filter(function (k) { return denom[k] > 0n; });
  var excludedIndicatorIds = weightedIdx.filter(function (k) { return iEff.indexOf(k) < 0; }).map(function (k) { return gi.indicators[k].id; });

  /* (d) renormalise, or even split (BR-ZERO-HISTORY-GROUP) */
  var weightMassEff = fr(0); iEff.forEach(function (k) { weightMassEff = frAdd(weightMassEff, W[k]); });
  var evenSplit = weightMassEff.n === 0n;
  var rescale = fr(1), effW = new Array(n).fill(fr(0)), renormalised = false;
  if (!evenSplit) {
    rescale = frDiv(fr(1), weightMassEff);
    for (var k2 = 0; k2 < n; k2++) effW[k2] = iEff.indexOf(k2) >= 0 ? frMul(W[k2], rescale) : fr(0);
    renormalised = iEff.length !== weightedIdx.length;
  }

  /* (e) cascade */
  var gt = fr(gi.groupTarget);
  var nInc = includedRows.length;
  var rows = includedRows.map(function (s) {
    var ratios = new Array(n).fill(null);
    var ws;
    if (evenSplit) { ws = fr(1, nInc); }
    else { ws = fr(0); iEff.forEach(function (k) { var r = frDiv(fr(s.values[k].value), fr(denom[k])); ratios[k] = r; ws = frAdd(ws, frMul(effW[k], r)); }); }
    var exact = frMul(ws, gt);
    var fl = frFloor(exact);
    var rem = frSub(exact, fr(fl));
    return { staff_id: s.staff_id, ratios: ratios, weightedScore: ws, exactShare: exact, floor: fl, remainder: rem };
  });
  var sumFloor = 0n; rows.forEach(function (r) { sumFloor += r.floor; });
  var bonusTotal = Number(BigInt(gi.groupTarget) - sumFloor);
  var order = rows.map(function (_, i) { return i; }).sort(function (a, b) {
    var c = frCmp(rows[b].remainder, rows[a].remainder); if (c !== 0) return c;
    return rows[a].staff_id < rows[b].staff_id ? -1 : 1; /* BR-TIEBREAK-STAFFID */
  });
  order.forEach(function (idx, pos) { rows[idx].bonusUnit = pos < bonusTotal ? 1 : 0; rows[idx].rank = pos + 1; });
  rows.forEach(function (r) { r.finalTarget = Number(r.floor) + r.bonusUnit; });
  var sumFinal = rows.reduce(function (a, r) { return a + r.finalTarget; }, 0);

  return {
    groupTarget: gi.groupTarget, indicators: gi.indicators.map(function (i) { return i.id; }),
    configuredWeights: gi.weights.slice(), effectiveWeights: effW.map(frNum), renormalised: renormalised,
    rescaleFactor: frNum(rescale), excludedIndicatorIds: excludedIndicatorIds, excludedStaffIds: excludedStaffIds,
    groupDenominators: denom.map(function (d) { return Number(d); }),
    rows: rows, excludedRows: excludedRows, sumFinal: sumFinal, invariantOk: sumFinal === gi.groupTarget
  };
}

/* ============================================================================
   DUMMY DATA (seeded, invented — no real names/ids/targets)
   Scale per brief: 4 divisions x 3 regions x 2 areas x 3 branches; 4-6 officers.
   ============================================================================ */
var DIV_NAMES = ['Uttoron', 'Poriborton', 'Agroshor', 'Shomriddhi', 'Protyasha'];
var REG_STEMS = ['Nodi', 'Palash', 'Shimul', 'Krishnochura', 'Bokul', 'Kadam', 'Joba', 'Doyel', 'Chompa', 'Hijol', 'Tomal', 'Neel', 'Shapla', 'Kamini', 'Golap'];
var AREA_STEMS = ['Purbo', 'Poschim', 'Uttar', 'Dokkhin', 'Modhyo', 'Notun', 'Purano', 'Shobuj', 'Chandni', 'Prantik'];
var BR_STEMS = ['Aloknagar', 'Bishalpur', 'Chandpara', 'Doharkandi', 'Eklashpur', 'Fultola', 'Gopinathpur', 'Horishpur', 'Ichhapur', 'Joynagar', 'Kutubpur', 'Lakshmipara', 'Mirzapur', 'Nolchira', 'Oxinagar', 'Panchbibi', 'Rupganj', 'Shibpur', 'Tarapur', 'Ujanpara', 'Bagmara', 'Char Fasson', 'Debidwar', 'Gournadi', 'Kaliganj', 'Muktagacha', 'Patgram', 'Shahrasti', 'Tungipara', 'Zianagar'];
var GIVEN = ['Rahima', 'Kamal', 'Shahida', 'Mizanur', 'Nasreen', 'Abdul', 'Fatema', 'Jahangir', 'Ruksana', 'Habibur', 'Sultana', 'Anwar', 'Morzina', 'Delwar', 'Rokeya', 'Shahin', 'Momtaz', 'Firoz', 'Salma', 'Bakul', 'Nilufa', 'Jasim', 'Parvin', 'Rafiq', 'Shirin', 'Mahmuda', 'Aminul', 'Taslima', 'Kohinoor', 'Belal', 'Josna', 'Monir', 'Rehana', 'Shafiqul', 'Ayesha', 'Nurul', 'Dilruba', 'Saiful', 'Marjina', 'Ekramul'];
var SUR = ['Akter', 'Hossain', 'Begum', 'Rahman', 'Khatun', 'Islam', 'Ali', 'Chowdhury', 'Miah', 'Sarkar', 'Uddin', 'Bibi', 'Hoque', 'Sheikh', 'Mondol', 'Talukder'];
var STAFF_TYPES = ['CM', 'CM', 'CM', 'CM', 'ABM (Loan)', 'ABM'];

var DB = { org: null, nodes: [], byId: {}, indicators: [], metrics: [], weightConfigs: [], staff: [], periods: [], targets: {}, audit: [], results: null };

DB.indicators = [
  { id: 'samity_no', code: 'SAM', name: 'Samity count', ordinal: 10, unit: 'count', mapped: true, active: true, source: 'Samity' },
  { id: 'member_no', code: 'MEM', name: 'Member count', ordinal: 20, unit: 'count', mapped: true, active: true, source: 'Member' },
  { id: 'loan_outstanding', code: 'OUT', name: 'Loan outstanding', ordinal: 30, unit: 'BDT', mapped: true, active: true, source: 'Outstanding' },
  { id: 'disbursement_amount', code: 'DISB', name: 'Disbursement amount', ordinal: 40, unit: 'BDT', mapped: false, active: false, source: null, addedOn: '2026-08-18' }
];
var ACT_IND = DB.indicators.filter(function (i) { return i.active; }); /* weight-matrix rows */

DB.metrics = [
  { id: 'M1', name: 'Good Loanee Increase Target', unit: 'count', direction: 'HIGHER_IS_BETTER', role: 'CASCADED', policy: 'FLOOR_AT_ZERO_WITH_LABEL', active: true, negative: true, alert: true },
  { id: 'M2', name: 'Good Loan Amount Increase Target', unit: 'BDT', direction: 'HIGHER_IS_BETTER', role: 'CASCADED', policy: 'FLOOR_AT_ZERO_WITH_LABEL', active: true, negative: true },
  { id: 'M3', name: 'Savings Balance Increase Target', unit: 'BDT', direction: 'HIGHER_IS_BETTER', role: 'CASCADED', composite: true, active: true },
  { id: 'M3a', name: 'Savings Balance Increase — RSP(M)', unit: 'BDT', direction: 'HIGHER_IS_BETTER', role: 'CASCADED', componentOf: 'M3', active: true },
  { id: 'M3b', name: 'Savings Balance Increase — VSP', unit: 'BDT', direction: 'HIGHER_IS_BETTER', role: 'CASCADED', componentOf: 'M3', active: true },
  { id: 'M3c', name: 'Savings Balance Increase — RSP(W)', unit: 'BDT', direction: 'HIGHER_IS_BETTER', role: 'CASCADED', componentOf: 'M3', active: true },
  { id: 'M4', name: 'LEAP Product Sales Target', unit: '?', direction: 'HIGHER_IS_BETTER', role: 'CASCADED', active: false, blockedOn: 'LEAP file pending', policy: 'FLOOR_AT_ZERO_WITH_LABEL' },
  { id: 'M5', name: 'Current Ratio Decrease Target', unit: '?', direction: 'LOWER_IS_BETTER', role: 'CASCADED', active: false, blockedOn: 'OPEN-BA-001' },
  { id: 'M6', name: 'Overdue Decrease Target', unit: 'BDT', direction: 'LOWER_IS_BETTER', role: 'CASCADED', policy: 'PUBLISH_AS_IS', active: true, negative: true }
];
DB.compositeAuthority = 'components';
function isCascadeActive(m) {
  if (!m.active) return false;
  if (m.composite) return DB.compositeAuthority === 'composite';
  if (m.componentOf) return DB.compositeAuthority === 'components';
  return m.role === 'CASCADED';
}
function cascadeMetrics() { return DB.metrics.filter(isCascadeActive); }
function metricById(id) { return DB.metrics.find(function (m) { return m.id === id; }); }

/* ---- hierarchy ------------------------------------------------------------ */
function buildHierarchy() {
  var org = { id: 'ORG000', code: 'ORG', name: 'PMUK', level: 'ORG', parentId: null, ancestor_path: ['ORG000'] };
  DB.org = org; DB.nodes.push(org);
  var brSeq = 1, brStemSeq = 0;
  for (var d = 0; d < 5; d++) {
    var div = { id: 'D' + (d + 1), code: 'DV' + (d + 1), name: DIV_NAMES[d] + ' Division', level: 'DIV', parentId: org.id };
    div.ancestor_path = ['ORG000', div.id]; DB.nodes.push(div);
    for (var r = 0; r < 3; r++) {
      var reg = { id: div.id + 'R' + (r + 1), code: 'RG' + (d + 1) + (r + 1), name: REG_STEMS[d * 3 + r] + ' Region', level: 'REG', parentId: div.id };
      reg.ancestor_path = div.ancestor_path.concat(reg.id); DB.nodes.push(reg);
      for (var a = 0; a < 3; a++) {
        var area = { id: reg.id + 'A' + (a + 1), code: 'AR' + (d + 1) + (r + 1) + (a + 1), name: pick(AREA_STEMS) + ' ' + REG_STEMS[d * 3 + r] + ' Area', level: 'AREA', parentId: reg.id };
        area.ancestor_path = reg.ancestor_path.concat(area.id); DB.nodes.push(area);
        for (var b = 0; b < 3; b++) {
          var prog = (brSeq === 7) ? 'PME' : (RNG() < 0.52 ? 'Split' : 'United');
          var br = { id: 'BR' + String(brSeq).padStart(3, '0'), code: 'B' + String(1000 + brSeq), name: BR_STEMS[brStemSeq % BR_STEMS.length] + ((brStemSeq >= BR_STEMS.length) ? ' ' + (Math.floor(brStemSeq / BR_STEMS.length) + 1) : '') + ' Branch', level: 'BRANCH', parentId: area.id, program: prog };
          br.ancestor_path = area.ancestor_path.concat(br.id); DB.nodes.push(br); brSeq++; brStemSeq++;
        }
      }
    }
  }
  DB.nodes.forEach(function (n) { DB.byId[n.id] = n; });
}
function branches() { return DB.nodes.filter(function (n) { return n.level === 'BRANCH'; }); }
function childrenOf(id) { return DB.nodes.filter(function (n) { return n.parentId === id; }); }
function sidesOf(br) { return br.program === 'United' ? ['PMF'] : br.program === 'PME' ? ['PME'] : br.program === 'PMF' ? ['PMF'] : ['PME', 'PMF']; }
function bucketOf(br, side) { return br.program === 'United' ? 'United' : side; }

/* ---- staff ---------------------------------------------------------------- */
function buildStaff() {
  var idSeq = 641000;
  branches().forEach(function (br) {
    sidesOf(br).forEach(function (side) {
      var count = rnd(4, 6);
      for (var i = 0; i < count; i++) {
        var samity = rnd(4, 38);
        var member = samity * rnd(22, 31) + rnd(0, 24);
        var outstanding = member * rnd(8500, 24000); /* BDT minor units */
        DB.staff.push({
          staff_id: pad10(idSeq), name: pick(GIVEN) + ' ' + pick(SUR), staff_type: pick(STAFF_TYPES),
          branch_id: br.id, program: side,
          values: { samity_no: samity, member_no: member, loan_outstanding: outstanding }, states: {}, programCheck: false
        });
        idSeq += rnd(70, 130);
      }
    });
  });
  DB.staff.sort(function (a, b) { return a.staff_id < b.staff_id ? -1 : 1; });

  /* Engineered A17: several staff missing loan_outstanding (NOT_SUPPLIED) across branches */
  var a17 = []; for (var k = 60; k < DB.staff.length && a17.length < 7; k += 137) { var v = DB.staff[k]; v.values.loan_outstanding = null; v.states.loan_outstanding = 'NOT_SUPPLIED'; a17.push(v); }
  DB._a17 = a17;

  /* Engineered A8: three United branches whose whole group has samity_no = 0 */
  var a8 = branches().filter(function (br) { return br.program === 'United'; }).slice(0, 3);
  a8.forEach(function (br) { DB.staff.filter(function (s) { return s.branch_id === br.id; }).forEach(function (s) { s.values.samity_no = 0; }); });
  DB._a8 = a8;

  /* Program-Check mismatch: a handful of staff tagged for the side their branch does not run (weekly skip-and-flag) */
  var pc = []; branches().filter(function (br) { return br.program === 'United'; }).slice(6, 11).forEach(function (br) {
    var s = { staff_id: pad10(idSeq), name: pick(GIVEN) + ' ' + pick(SUR), staff_type: pick(STAFF_TYPES), branch_id: br.id, program: 'PME', values: { samity_no: rnd(4, 20), member_no: rnd(90, 300), loan_outstanding: rnd(600000, 3000000) }, states: {}, programCheck: true };
    DB.staff.push(s); pc.push(s); idSeq += 111;
  });
  DB._programCheck = pc;
  DB._heldForCrosswalk = 3; /* rows held pending identity crosswalk (display) */

  /* Zero-staff branch that still carries a target -> unallocated rollup */
  var empty = branches().filter(function (br) { return br.program === 'United'; })[13];
  if (empty) { DB.staff = DB.staff.filter(function (s) { return s.branch_id !== empty.id; }); DB._emptyBranch = empty; }
}

/* ---- weight configs (BR-WEIGHT-RESOLUTION-MATRIX, GEO_THEN_SCOPE) ---------- */
function buildWeights() {
  /* Global baseline (BR-GLOBAL-DEFAULT-WEIGHT-BASELINE): per-indicator, all metrics */
  DB.baseline = { samity_no: 333400, member_no: 333300, loan_outstanding: 333300 };
  var brs = branches();
  var customBranch = brs.find(function (b) { return b.program !== 'United'; }) || brs[0];
  var overdueBranch = brs[5];
  var splitScoped = brs.find(function (b) { return b.program === 'Split'; });
  DB.weightConfigs = [
    /* an AREA-level custom on M1 -> inherited by its branches (INHERITED_UNSCOPED) */
    { nodeId: brs[0].parentId, scope: null, metricId: 'M1', weights: { samity_no: 500000, member_no: 300000, loan_outstanding: 200000 } },
    /* a BRANCH-level custom on M6 (NODE_UNSCOPED) — weight overdue on the loan book */
    { nodeId: overdueBranch.id, scope: null, metricId: 'M6', weights: { samity_no: 100000, member_no: 100000, loan_outstanding: 800000 } }
  ];
  if (splitScoped) DB.weightConfigs.push({ nodeId: splitScoped.id, scope: 'PMF', metricId: 'M2', weights: { samity_no: 250000, member_no: 250000, loan_outstanding: 500000 } });
  DB._customBranch = customBranch; DB._overdueBranch = overdueBranch; DB._splitScoped = splitScoped;
}

/* resolveWeight -> {weights, mode, outcome, sourceNodeId, sourceScope, ladder[]} */
function resolveWeight(branchId, side, metricId) {
  var br = DB.byId[branchId];
  var path = br.ancestor_path.slice().reverse(); /* branch -> ... -> org */
  var ladder = [];
  var winner = null;
  path.forEach(function (nid) {
    var node = DB.byId[nid];
    var here = DB.weightConfigs.filter(function (c) { return c.nodeId === nid && c.metricId === metricId; });
    var applicable = here.filter(function (c) { return c.scope === null || c.scope === side; });
    var scoped = applicable.find(function (c) { return c.scope === side; });
    var unscoped = applicable.find(function (c) { return c.scope === null; });
    var chosen = scoped || unscoped || null;
    var otherSideOnly = here.length > 0 && applicable.length === 0;
    var entry = { nodeId: nid, level: node.level, name: node.name, hasCustom: here.length > 0, applicable: applicable.length > 0, chosen: false, shadowed: false, scope: chosen ? chosen.scope : null, transparent: otherSideOnly };
    if (!winner && chosen) { winner = { node: node, config: chosen, isBranch: nid === branchId }; entry.chosen = true; }
    ladder.push(entry);
  });
  /* mark shadowed: any applicable custom below the winner never applies */
  var reachedWinner = false;
  ladder.forEach(function (e) { if (e.chosen) { reachedWinner = true; return; } if (reachedWinner && e.hasCustom) e.shadowed = true; });

  if (winner) {
    var pos = winner.isBranch ? 'NODE' : 'INHERITED';
    var sc = winner.config.scope ? 'SCOPED' : 'UNSCOPED';
    return { weights: winner.config.weights, mode: winner.isBranch ? 'Custom' : 'Inherited', outcome: pos + '_' + sc, sourceNodeId: winner.node.id, sourceName: winner.node.name, sourceScope: winner.config.scope, ladder: ladder };
  }
  return { weights: DB.baseline, mode: 'Default', outcome: 'GLOBAL_UNSCOPED', sourceNodeId: 'ORG000', sourceName: 'PMUK', sourceScope: null, ladder: ladder };
}

/* ---- periods (60-week split-week calendar) -------------------------------- */
function buildPeriods() {
  var days = []; for (var w = 0; w < 60; w++) days.push(7);
  days[0] = 4; days[59] = 4; /* first/last 4-day partials */
  [8, 13, 22, 27, 35, 40, 48, 53].forEach(function (i, k) { days[i] = (k % 2 === 0) ? 3 : 4; }); /* month-boundary partials */
  var months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  var cursor = new Date(2026, 6, 1); var total = 0;
  for (var i2 = 0; i2 < 60; i2++) {
    var start = new Date(cursor);
    var end = new Date(cursor); end.setDate(end.getDate() + days[i2] - 1);
    var lbl = 'Week ' + (i2 + 1) + ' (' + start.getDate() + '-' + months[start.getMonth() === 6 ? 0 : (start.getMonth() + 6) % 12] + ' to ' + end.getDate() + '-' + months[end.getMonth() === 6 ? 0 : (end.getMonth() + 6) % 12] + ')';
    DB.periods.push({ period_id: 'FY26W' + String(i2 + 1).padStart(2, '0'), week: i2 + 1, label: 'Week ' + (i2 + 1), longLabel: lbl, days: days[i2], start_date: start.toISOString().slice(0, 10), startIso: start.toISOString() });
    cursor.setDate(cursor.getDate() + days[i2]); total += days[i2];
  }
  DB.totalDays = total; DB.currentWeek = 6;
}

/* ---- targets: annual per (branch,side,metric); weekly split; current week -- */
function annualFor(metricId) {
  if (metricId === 'M1') return rnd(120, 520);            /* count */
  if (metricId === 'M6') return rnd(-900000, 400000);     /* overdue, may be negative */
  return rnd(1200000, 9000000);                            /* BDT balance/amount metrics */
}
function buildTargets() {
  var cw = DB.currentWeek;
  var days = DB.periods.map(function (p) { return p.days; });
  branches().forEach(function (br) {
    sidesOf(br).forEach(function (side) {
      cascadeMetrics().forEach(function (m) {
        var annual = annualFor(m.id);
        var key = br.id + '|' + side + '|' + m.id;
        var raw = annual * (days[cw - 1] / DB.totalDays);
        DB.targets[key] = { annual: annual, weekRaw: raw, weekRounded: roundHalfAwayFromZero(raw) };
      });
    });
  });
  /* Engineered negative targets on M1 (HIGHER_IS_BETTER) -> triggers alert +
     BR-NEGATIVE-TARGET-POLICY FLOOR_AT_ZERO_WITH_LABEL (published "Maintain") */
  var pool = branches().slice(3); var negBranches = []; var worst = 0;
  for (var i = 0; i < pool.length && negBranches.length < 9; i += 13) {
    var b = pool[i]; var side = sidesOf(b)[0]; var t = DB.targets[b.id + '|' + side + '|M1'];
    if (t) { t.weekRounded = -(rnd(3, 12)); worst = Math.min(worst, t.weekRounded); negBranches.push(b); }
  }
  DB._negBranches = negBranches; DB._negWorst = worst;
}

/* ---- COMPUTE the run + rollups + self-test -------------------------------- */
function staffOf(branchId, side) { return DB.staff.filter(function (s) { return s.branch_id === branchId && s.program === side; }); }
function computeRun() {
  var groups = [], staffTargets = {}, selftestTotal = 0, selftestOk = 0;
  branches().forEach(function (br) {
    sidesOf(br).forEach(function (side) {
      var staff = staffOf(br.id, side);
      if (staff.length === 0) return;
      cascadeMetrics().forEach(function (m) {
        var key = br.id + '|' + side + '|' + m.id;
        var tgt = DB.targets[key]; if (!tgt) return;
        var wc = resolveWeight(br.id, side, m.id);
        var weights = ACT_IND.map(function (ind) { return wc.weights[ind.id] || 0; });
        var gi = {
          branchId: br.id, side: side, metricId: m.id, groupTarget: tgt.weekRounded,
          indicators: ACT_IND.map(function (ind) { return { id: ind.id, ordinal: ind.ordinal }; }),
          weights: weights,
          staff: staff.map(function (s) { return { staff_id: s.staff_id, values: ACT_IND.map(function (ind) { return { state: s.states[ind.id] === 'NOT_SUPPLIED' ? 'NOT_SUPPLIED' : 'SUPPLIED', value: s.states[ind.id] === 'NOT_SUPPLIED' ? null : s.values[ind.id] }; }) }; })
        };
        var res = cascade(gi);
        res.branchId = br.id; res.side = side; res.metricId = m.id; res.bucket = bucketOf(br, side); res.resolution = wc;
        groups.push(res);
        if (!res.error) {
          selftestTotal++; if (res.invariantOk) selftestOk++;
          res.rows.forEach(function (r) {
            var pub = derivePublished(r.finalTarget, m.policy || 'PUBLISH_AS_IS');
            staffTargets[r.staff_id + '|' + side + '|' + m.id] = { staff_id: r.staff_id, side: side, metricId: m.id, branchId: br.id, finalTarget: r.finalTarget, publishedTarget: pub[0], publishedLabel: pub[1], exclusionReason: null, ratios: r.ratios.map(function (x) { return x ? frNum(x) : null; }), weightedScore: frNum(r.weightedScore), exactShare: frNum(r.exactShare), floor: Number(r.floor), remainder: frNum(r.remainder), rank: r.rank, bonusUnit: r.bonusUnit };
          });
          res.excludedRows.forEach(function (s) {
            staffTargets[s.staff_id + '|' + side + '|' + m.id] = { staff_id: s.staff_id, side: side, metricId: m.id, branchId: br.id, finalTarget: null, publishedTarget: null, publishedLabel: null, exclusionReason: 'MISSING_INDICATOR_VALUE' };
          });
        }
      });
    });
  });

  /* rollups: per (nodeId, metricId, sideBucket in All/United/PME/PMF) */
  var rollups = {};
  function addRoll(nodeId, metricId, sideKey, target, sumFinal, sumPub, staffCount, renorm, excl) {
    var k = nodeId + '|' + metricId + '|' + sideKey;
    var r = rollups[k] || (rollups[k] = { nodeId: nodeId, metricId: metricId, side: sideKey, target: null, sumFinal: 0, sumPublished: 0, staffCount: 0, renorm: false, excludedStaffCount: 0, isBranch: DB.byId[nodeId].level === 'BRANCH' });
    if (target != null) r.target = (r.target || 0) + target;
    r.sumFinal += sumFinal; r.sumPublished += sumPub; r.staffCount += staffCount; r.renorm = r.renorm || renorm; r.excludedStaffCount += excl;
  }
  groups.forEach(function (g) {
    if (g.error) return;
    var m = metricById(g.metricId);
    var pubSum = 0, staffCt = 0, exCt = g.excludedStaffIds.length;
    g.rows.forEach(function (r) { staffCt++; var st = staffTargets[r.staff_id + '|' + g.side + '|' + g.metricId]; pubSum += (st && st.publishedTarget != null ? st.publishedTarget : r.finalTarget); });
    var tgt = DB.targets[g.branchId + '|' + g.side + '|' + g.metricId].weekRounded;
    var br = DB.byId[g.branchId];
    br.ancestor_path.forEach(function (nid) {
      addRoll(nid, g.metricId, 'All', tgt, g.sumFinal, pubSum, staffCt, g.renormalised, exCt);
      addRoll(nid, g.metricId, g.bucket, tgt, g.sumFinal, pubSum, staffCt, g.renormalised, exCt);
    });
  });
  /* zero-staff branches that still carry a target -> unallocated (carried up every level) */
  branches().forEach(function (br) { sidesOf(br).forEach(function (side) { if (staffOf(br.id, side).length > 0) return; cascadeMetrics().forEach(function (m) { var t = DB.targets[br.id + '|' + side + '|' + m.id]; if (!t) return; br.ancestor_path.forEach(function (nid) { addRoll(nid, m.id, 'All', t.weekRounded, 0, 0, 0, false, 0); addRoll(nid, m.id, bucketOf(br, side), t.weekRounded, 0, 0, 0, false, 0); }); }); }); });
  /* program-check excluded staff appear in Results, flagged, never inside a cascade group */
  (DB._programCheck || []).forEach(function (s) { cascadeMetrics().forEach(function (m) { staffTargets[s.staff_id + '|' + s.program + '|' + m.id] = { staff_id: s.staff_id, side: s.program, metricId: m.id, branchId: s.branch_id, finalTarget: null, publishedTarget: null, publishedLabel: null, exclusionReason: 'PROGRAM_CHECK' }; }); });
  Object.keys(rollups).forEach(function (k) {
    var r = rollups[k];
    if (!r.isBranch) r.status = 'running';
    else if (r.staffCount === 0) r.status = (r.target != null ? 'unalloc' : 'zero');
    else if (r.target != null && r.sumFinal !== r.target) r.status = 'unalloc';
    else if (r.renorm) r.status = 'renorm';
    else r.status = 'proved';
    r.publishedExceedsTargetBy = (r.target != null) ? (r.sumPublished - r.target) : 0;
  });

  /* negative-target summary (BR-NEGATIVE-TARGET-ALERT) */
  var negOcc = 0, negBr = {};
  branches().forEach(function (br) { sidesOf(br).forEach(function (side) { var t = DB.targets[br.id + '|' + side + '|M1']; if (t && t.weekRounded < 0) { negOcc++; negBr[br.id] = 1; } }); });

  DB.results = {
    groups: groups, staffTargets: staffTargets, rollups: rollups,
    negativeSummary: negOcc > 0 ? { metricId: 'M1', occurrenceCount: negOcc, branchCount: Object.keys(negBr).length, worstValue: DB._negWorst, state: 'Open', summaryId: 'NTS-1' } : null,
    selftest: { total: selftestTotal, ok: selftestOk }
  };
  return DB.results;
}

/* ---- boot the dataset (once) ---------------------------------------------- */
function generateAll() { buildHierarchy(); buildStaff(); buildWeights(); buildPeriods(); buildTargets(); computeRun(); }

/* expose internals to later chunks (same IIFE scope via window namespace) */
var PMUK = window.__PMUK = {
  $: $, esc: esc, pad10: pad10, fr: fr, frNum: frNum, cascade: cascade, roundHalfAwayFromZero: roundHalfAwayFromZero,
  derivePublished: derivePublished, DB: DB, ACT_IND: ACT_IND, isCascadeActive: isCascadeActive, cascadeMetrics: cascadeMetrics,
  metricById: metricById, branches: branches, childrenOf: childrenOf, sidesOf: sidesOf, bucketOf: bucketOf,
  resolveWeight: resolveWeight, staffOf: staffOf, computeRun: computeRun, generateAll: generateAll, rnd: rnd, pick: pick
};

/* ============================================================================
   APP STATE, ROLES, FORMATTING, SHARED UI, ROUTER, SHELL
   ============================================================================ */
var USERS = {
  demo_admin: { username: 'demo_admin', displayName: 'A. Hossain (ADT)', roles: ['ADT_ADMINISTRATOR'], orgScope: [] },
  demo_analyst: { username: 'demo_analyst', displayName: 'R. Begum (Planning)', roles: ['PLANNING_ANALYST'], orgScope: ['D1'] },
  demo_reviewer: { username: 'demo_reviewer', displayName: 'K. Islam (Reviewer)', roles: ['AREA_BRANCH_REVIEWER'], orgScope: [] },
  demo_auditor: { username: 'demo_auditor', displayName: 'S. Rahman (Auditor)', roles: ['AUDITOR'], orgScope: [] }
};
var ROLE_LABEL = { ADT_ADMINISTRATOR: 'ADT Administrator', PLANNING_ANALYST: 'Planning Analyst', AREA_BRANCH_REVIEWER: 'Area/Branch Reviewer', AUDITOR: 'Auditor' };
var UNRESTRICTED = ['ADT_ADMINISTRATOR', 'AUDITOR'];

var STATE = {
  user: null, theme: 'daylight', route: '/run-lifecycle',
  selectedNodeId: 'ORG000', scope: null, focusMetricId: 'M1', focusIndicatorId: 'samity_no',
  week: 6, run: { state: 'Computed', week: 'FY26W06' }, finaliseAttempted: false, negAck: false,
  findingAcks: {}, expanded: {}, tour: { open: false, step: 0 }
};

/* set reviewer scope to a real area once hierarchy exists */
function initScopes() { var area = DB.nodes.find(function (n) { return n.level === 'AREA'; }); if (area) USERS.demo_reviewer.orgScope = [area.id]; }

/* ---- role capabilities + org scoping -------------------------------------- */
function hasRole() { var a = [].slice.call(arguments); return STATE.user && STATE.user.roles.some(function (r) { return a.indexOf(r) >= 0; }); }
var CAP = {
  weightsWrite: ['ADT_ADMINISTRATOR'], catalogueWrite: ['ADT_ADMINISTRATOR'],
  import: ['PLANNING_ANALYST', 'ADT_ADMINISTRATOR'], compute: ['PLANNING_ANALYST', 'ADT_ADMINISTRATOR'],
  finalise: ['PLANNING_ANALYST', 'ADT_ADMINISTRATOR'], ack: ['PLANNING_ANALYST', 'ADT_ADMINISTRATOR'],
  verify: ['AUDITOR', 'PLANNING_ANALYST']
};
function can(capKey) { return hasRole.apply(null, CAP[capKey] || []); }
function scopedNodeIds() { if (!STATE.user) return null; if (STATE.user.roles.some(function (r) { return UNRESTRICTED.indexOf(r) >= 0; })) return null; return STATE.user.orgScope; }
function nodeInScope(nodeId) {
  var scope = scopedNodeIds(); if (scope === null) return true; if (!scope.length) return false;
  var node = DB.byId[nodeId]; if (!node) return false;
  if (node.ancestor_path.some(function (a) { return scope.indexOf(a) >= 0; })) return true; /* node within scope subtree */
  return scope.some(function (sc) { return DB.byId[sc] && DB.byId[sc].ancestor_path.indexOf(nodeId) >= 0; }); /* ancestor of scope */
}
function branchInScope(nodeId) { var scope = scopedNodeIds(); if (scope === null) return true; if (!scope.length) return false; return DB.byId[nodeId].ancestor_path.some(function (a) { return scope.indexOf(a) >= 0; }); }

/* ---- formatting (lib/format.ts) ------------------------------------------- */
var LOC = 'en-BD';
function nf(v, digits) { try { return Math.abs(v).toLocaleString(LOC, { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 }); } catch (e) { return String(v); } }
function fmtMoney(v) { var d = Number.isInteger(v) ? 0 : 2; var core = 'Tk ' + nf(v, d); return v < 0 ? '(' + core + ')' : core; }
function fmtCount(v) { var core = nf(v, 0); return v < 0 ? '(' + core + ')' : core; }
function fmtMetric(m, v) { if (v == null) return '<span class="pkDim">—</span>'; return (m && (m.unit === 'count')) ? fmtCount(v) : fmtMoney(v); }
function fmtWeight(micro) { return (micro / 1000000).toFixed(6); }
function directionLabel(d) { return d === 'HIGHER_IS_BETTER' ? 'higher is better' : d === 'LOWER_IS_BETTER' ? 'lower is better' : 'not set'; }

/* ---- shared UI builders --------------------------------------------------- */
var HUE = { proved: 'pkBadgeProved', drift: 'pkBadgeDrift', blocked: 'pkBadgeBlocked', derived: 'pkBadgeDerived', azure: 'pkBadgeAzure', verd: 'pkBadgeVerd', neutral: 'pkBadgeNeutral', solid: 'pkBadgeSolid' };
function badge(hue, text, dot) { return '<span class="pkBadge ' + (HUE[hue] || HUE.solid) + '">' + (dot ? '<span class="pkBadgeDot"></span>' : '') + esc(text) + '</span>'; }
function callout(tone, html) { var c = { blocked: 'calloutBlocked', drift: 'calloutDrift', proved: 'calloutProved', derived: 'calloutDerived', azure: 'calloutAzure', neutral: '' }[tone] || ''; return '<div class="callout ' + c + '">' + html + '</div>'; }
function proof(state, labelHtml) {
  var cls = state === 'proved' ? 'isProved' : state === 'finalised' ? 'isFinalised' : state === 'stale' ? 'isStale' : 'isUnproved';
  return '<div class="pkProof ' + cls + '"><div class="pkProofRule"></div>' + (labelHtml ? '<div class="pkProofStatus">' + labelHtml + '</div>' : '') + '</div>';
}
function spine(steps) {
  return '<div class="pkSpine">' + steps.map(function (s, i) {
    return '<div class="pkSpineRow"><div class="pkSpineIdx">' + (i + 1) + '</div><div class="pkSpineBody pkSpineAnim" style="animation-delay:' + (i * 45) + 'ms"><div class="pkSpineLbl">' + s.label + '</div><div class="pkSpineVal">' + s.detail + '</div></div></div>';
  }).join('') + '</div>';
}
function emptyState(title, body, actLabel, act) { return '<div class="emptyState"><h4>' + esc(title) + '</h4><p style="max-width:60ch;margin:0 auto 10px">' + esc(body) + '</p>' + (actLabel ? '<button class="pkBtn pkBtnXs" data-act="' + act + '">' + esc(actLabel) + '</button>' : '') + '</div>'; }

/* ---- audit trail + toast + download --------------------------------------- */
function audit(action, detail, before, after) { DB.audit.unshift({ ts: new Date().toISOString(), actor: STATE.user ? STATE.user.displayName : '—', role: STATE.user ? STATE.user.roles.map(function (r) { return ROLE_LABEL[r]; }).join(', ') : '—', action: action, detail: detail || '', before: before == null ? '' : String(before), after: after == null ? '' : String(after) }); }
function toast(msg) { var t = document.createElement('div'); t.textContent = msg; t.style.cssText = 'position:fixed;left:50%;bottom:64px;transform:translateX(-50%);background:var(--surface);border:1px solid var(--rule-medium);border-radius:6px;padding:8px 14px;font-size:12px;z-index:80;box-shadow:0 6px 24px rgb(var(--shadow-rgb)/.25)'; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
function download(filename, text) { try { var blob = new Blob([text], { type: 'text/csv;charset=utf-8' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1500); toast('Downloaded ' + filename); } catch (e) { toast('Download blocked by the browser'); } }
function csvRow(cells) { return cells.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }

/* ---- theme ---------------------------------------------------------------- */
function applyTheme(t) { STATE.theme = t; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('pmuk.replica.theme', t); } catch (e) { } }

/* ---- navigation tabs (TopBar.tsx, real order + grouping) ------------------- */
var TAB_GROUPS = [
  { group: 'Home', tabs: [['/overview', 'Overview']] },
  { group: 'Each week', tabs: [['/roster-import', 'Roster Import'], ['/target-import', 'Target Import'], ['/run-lifecycle', 'Run Lifecycle']] },
  { group: 'Check', tabs: [['/rollups', 'Rollups'], ['/results', 'Results'], ['/reconciliation', 'Reconciliation'], ['/staff-audit', 'Staff Audit']] },
  { group: 'Set up', tabs: [['/weight-matrix', 'Weight Matrix'], ['/indicators', 'Indicators'], ['/metrics', 'Metrics'], ['/branch-targets', 'Branch Targets'], ['/legend', 'States & Legend']] }
];
var ROUTE_TITLE = { '/overview': 'Overview', '/weight-matrix': 'Weight Matrix', '/indicators': 'Indicator Catalogue', '/metrics': 'Metric Catalogue', '/branch-targets': 'Branch Targets', '/roster-import': 'Roster Import', '/target-import': 'Target Import', '/results': 'Results', '/staff-audit': 'Staff Audit', '/rollups': 'Rollups', '/reconciliation': 'Reconciliation', '/run-lifecycle': 'Run Lifecycle', '/legend': 'States & Legend' };

var SCREENS = {}; /* filled by later chunks */
var ACTS = {};    /* action dispatch table, filled by screens */

/* ---- router --------------------------------------------------------------- */
function currentRoute() { var h = (location.hash || '').replace(/^#/, ''); var base = h.split('/').slice(0, 2).join('/') || ''; if (h.indexOf('/staff-audit') === 0) return '/staff-audit'; return ROUTE_TITLE[base] ? base : (ROUTE_TITLE['/' + h] ? '/' + h : '/overview'); }
function routeParam() { var h = (location.hash || '').replace(/^#/, ''); if (h.indexOf('/staff-audit/') === 0) return decodeURIComponent(h.slice('/staff-audit/'.length)); return null; }
function navigate(route) { location.hash = route; }

function render() {
  if (!STATE.user) { renderLogin(); return; }
  STATE.route = currentRoute();
  var app = $('#app');
  var scr = SCREENS[STATE.route] || SCREENS['/run-lifecycle'];
  app.innerHTML = shellHtml(scr);
  var host = $('#scrollArea');
  try { host.innerHTML = scr.render(); } catch (e) { host.innerHTML = callout('blocked', '<b>Render error:</b> ' + esc(e.message)); if (window.console) console.error(e); }
  host.classList.remove('screenEnter'); void host.offsetWidth; host.classList.add('screenEnter'); /* retrigger entrance */
  wireShell();
  if (scr.wire) try { scr.wire(); } catch (e2) { if (window.console) console.error(e2); }
  renderInspector();
  if (STATE.tour.open) renderTour();
}

/* ---- shell ---------------------------------------------------------------- */
function shellHtml(scr) {
  var st = DB.results.selftest;
  var showInspector = STATE.route === 'weight-matrix' || STATE.route === '/weight-matrix';
  var shellCls = 'shell' + (showInspector ? '' : ' noInspector');
  return '' +
    header() +
    '<main><div class="' + shellCls + '">' +
    rail() +
    '<section class="workspace">' + topbar(scr) + '<div class="scrollArea" id="scrollArea"></div></section>' +
    (showInspector ? '<aside class="inspector" id="inspectorRail"></aside>' : '') +
    '</div></main>' +
    footer(st) +
    (STATE.tour.open ? '' : '<button class="pkBtn pkBtnPrimary tourFab" data-act="tour-open">▶ Guided tour</button>');
}
function header() {
  var u = STATE.user;
  var roleOpts = Object.keys(USERS).map(function (k) { return '<option value="' + k + '"' + (u.username === k ? ' selected' : '') + '>' + esc(USERS[k].displayName) + ' · ' + esc(ROLE_LABEL[USERS[k].roles[0]]) + '</option>'; }).join('');
  var themeOpts = ['daylight', 'dusk', 'slate'].map(function (t) { return '<option value="' + t + '"' + (STATE.theme === t ? ' selected' : '') + '>' + t + '</option>'; }).join('');
  return '<header class="appHeader">' +
    '<div class="brand"><span class="pkEyebrow">PMUK</span><b>Field-Staff Target-Setting</b></div>' +
    '<h1>' + esc(ROUTE_TITLE[STATE.route] || 'Screen') + '</h1>' +
    '<div class="spacer"></div>' +
    '<div class="hdrCtl">' +
    '<label class="inlineSel">Role <select class="pkInput" id="roleSwitch" title="Swap the signed-in demo user">' + roleOpts + '</select></label>' +
    '<label class="inlineSel">Theme <select class="pkInput" id="themeSwitch">' + themeOpts + '</select></label>' +
    badge('solid', ROLE_LABEL[u.roles[0]]) +
    '<button class="pkBtn pkBtnXs" data-act="logout">Sign out</button>' +
    '</div></header>';
}
function rail() {
  var scope = scopedNodeIds();
  var visible = DB.nodes.filter(function (n) { return nodeInScope(n.id); });
  function tree(parentId, depth) {
    return childrenOf(parentId).filter(function (n) { return nodeInScope(n.id); }).map(function (n) {
      var kids = childrenOf(n.id).filter(function (c) { return nodeInScope(c.id); });
      var open = STATE.expanded[n.id] || depth < 1;
      var sel = STATE.selectedNodeId === n.id;
      return '<div><div class="treeNode' + (sel ? ' isSel' : '') + '" style="padding-left:' + (6 + depth * 12) + 'px" data-act="select-node" data-node="' + n.id + '">' +
        (kids.length ? '<span class="twist" data-act="toggle-node" data-node="' + n.id + '">' + (open ? '▾' : '▸') + '</span>' : '<span class="twist"></span>') +
        '<span>' + esc(n.name) + '</span> <span class="nodeCode">' + esc(n.code) + '</span>' +
        (n.level === 'BRANCH' && n.program ? ' ' + badge(n.program === 'Split' ? 'verd' : 'solid', n.program === 'United' ? 'UNITED' : n.program) : '') +
        '</div>' + (kids.length && open ? tree(n.id, depth + 1) : '') + '</div>';
    }).join('');
  }
  var scopeNote = scope === null ? '' : (scope.length ? '<div class="railScopeNote">Scoped to your subtree (' + scope.map(function (s) { return esc(DB.byId[s].name); }).join(', ') + '). Other branches are hidden by access control.</div>' : '<div class="railScopeNote">No branches are in your scope — access control failing closed.</div>');
  var orgSel = STATE.selectedNodeId === 'ORG000';
  return '<aside class="rail"><div class="railHead"><span class="pkEyebrow">Org hierarchy</span></div>' +
    (nodeInScope('ORG000') ? '<div class="treeNode' + (orgSel ? ' isSel' : '') + '" data-act="select-node" data-node="ORG000"><span class="twist">▾</span><span>' + esc(DB.org.name) + '</span> <span class="nodeCode">ORG</span></div>' : '') +
    tree('ORG000', 0) + scopeNote + '</aside>';
}
function topbar(scr) {
  var n = DB.byId[STATE.selectedNodeId] || DB.org;
  var anc = n.ancestor_path.slice(0, -1).map(function (id) { return esc(DB.byId[id].name); }).join('  ›  ') || 'root of the hierarchy';
  var progBadge = n.level === 'BRANCH' ? badge(n.program === 'Split' ? 'verd' : 'solid', 'Branch · ' + (n.program === 'Split' ? 'Split (PME + PMF)' : n.program === 'United' ? 'UNITED → PMF side only' : n.program)) : badge('solid', ({ ORG: 'Organization', DIV: 'Division', REG: 'Region', AREA: 'Area' }[n.level] || n.level) + ' · mixed subtree');
  var wk = DB.periods[STATE.week - 1];
  var tabs = TAB_GROUPS.map(function (g, gi) {
    return '<div class="tabGroup">' + (gi > 0 ? '<span class="tabGroupRule"></span>' : '') + g.tabs.map(function (t) {
      var active = STATE.route === t[0];
      return '<a class="tab' + (active ? ' tabActive' : '') + '" href="#' + t[0] + '">' + esc(t[1]) + '</a>';
    }).join('') + '</div>';
  }).join('');
  return '<div class="topbar"><div class="selRow"><h2>' + esc(n.name) + '</h2>' + badge('solid', n.code) + progBadge +
    '<div class="selRight">' +
    '<label class="inlineSel">Week <select class="pkInput" id="weekPick">' + DB.periods.map(function (p) { return '<option value="' + p.week + '"' + (p.week === STATE.week ? ' selected' : '') + '>' + esc(p.label) + '</option>'; }).join('') + '</select></label>' +
    badge('solid', 'EN · BN pending') +
    '<button class="pkBtn pkBtnXs" data-act="verify-run">Verify run ⟲</button>' +
    '</div></div>' +
    '<div class="selPath">' + anc + '</div>' +
    '<div class="tabs">' + tabs + '</div>' +
    '<div class="ticketStrip">' + ['weight_config_version v14', 'rounding_mode FLOOR_TOWARD_NEG_INF', 'group_target_rounding HALF_AWAY_FROM_ZERO', 'decimal_context prec=34'].map(function (t) { return badge('solid', t); }).join(' ') + '</div>' +
    '</div>';
}
function renderInspector() {
  var host = $('#inspectorRail'); if (!host) return;
  var res = resolveWeight(pickBranchForInspector(), STATE.scope, STATE.focusMetricId);
  var m = metricById(STATE.focusMetricId);
  host.innerHTML = '<div class="pkEyebrow mb-2">Why this number — precedence ladder</div>' +
    '<div style="font-size:11px;margin-bottom:8px" class="pkDim">Metric <b>' + esc(STATE.focusMetricId) + '</b> · ' + esc(m ? m.name : '') + '<br>Program side ' + esc(STATE.scope || 'unscoped') + '</div>' +
    '<ul class="ladder">' + res.ladder.map(function (e) {
      return '<li class="' + (e.chosen ? 'winner' : e.shadowed ? 'shadowed' : '') + '"><b>' + esc(e.level) + '</b> · ' + esc(e.name) + '<br><span class="pkDim" style="font-size:10px">' + (e.chosen ? 'winner — ' + esc(res.outcome) : e.hasCustom ? (e.shadowed ? 'custom present but shadowed' : e.transparent ? 'custom for other side — transparent' : 'custom') : 'no custom here') + '</span></li>';
    }).join('') + '</ul>' +
    '<div style="font-size:10.5px;margin-top:8px" class="pkDim">Resolved: <b>' + esc(res.mode) + '</b> from ' + esc(res.sourceName) + '. Weights ' + ACT_IND.map(function (i) { return fmtWeight(res.weights[i.id] || 0); }).join(' / ') + '.</div>';
}
function pickBranchForInspector() { var n = DB.byId[STATE.selectedNodeId]; if (n && n.level === 'BRANCH') return n.id; var b = branches().filter(function (br) { return branchInScope(br.id); })[0]; return b ? b.id : branches()[0].id; }
function footer(st) {
  var ok = st.ok === st.total;
  return '<footer class="simFooter"><span>Simulation with invented data. The production system is private.</span><span class="spacer"></span>' +
    '<span class="' + (ok ? 'selftestOk' : 'selftestBad') + '" title="On load, every computed group is checked: Σ staff final targets == group target.">self-test: ' + (ok ? 'PASSED' : 'FAILED') + ' — exact-sum invariant on ' + st.ok + '/' + st.total + ' groups</span></footer>';
}

/* ---- shell wiring (delegation) -------------------------------------------- */
function wireShell() {
  var rs = $('#roleSwitch'); if (rs) rs.addEventListener('change', function () { STATE.user = USERS[this.value]; audit('Role switch', 'Signed-in demo user changed'); if (scopedNodeIds() && !nodeInScope(STATE.selectedNodeId)) STATE.selectedNodeId = STATE.user.orgScope[0] || 'ORG000'; render(); });
  var ts = $('#themeSwitch'); if (ts) ts.addEventListener('change', function () { applyTheme(this.value); });
  var wp = $('#weekPick'); if (wp) wp.addEventListener('change', function () { STATE.week = parseInt(this.value, 10); render(); });
}

/* global click delegation for [data-act] */
document.addEventListener('click', function (e) {
  var el = e.target.closest ? e.target.closest('[data-act]') : null; if (!el) return;
  var act = el.getAttribute('data-act');
  if (act === 'logout') { STATE.user = null; render(); return; }
  if (act === 'select-node') { STATE.selectedNodeId = el.getAttribute('data-node'); render(); return; }
  if (act === 'toggle-node') { e.stopPropagation(); var id = el.getAttribute('data-node'); STATE.expanded[id] = !STATE.expanded[id]; render(); return; }
  if (act === 'verify-run') { toast('Re-verification: Σ staff = group target holds on ' + DB.results.selftest.ok + '/' + DB.results.selftest.total + ' groups.'); return; }
  if (act === 'tour-open') { STATE.tour.open = true; STATE.tour.step = 0; renderTour(); return; }
  if (ACTS[act]) { ACTS[act](el, e); return; }
});
window.addEventListener('hashchange', function () { if (STATE.user) render(); });

/* ============================================================================
   LOGIN + CORE SCREENS (run-lifecycle, weight-matrix, results, staff-audit)
   ============================================================================ */
function renderLogin() {
  var app = $('#app');
  app.innerHTML = '<div class="loginPage"><form class="pkPanel loginCard" id="loginForm">' +
    '<div class="pkEyebrow">PMUK</div><h1 style="font-size:16px;margin-bottom:4px">Field-Staff Target-Setting</h1>' +
    '<p style="font-size:11px" class="pkDim">Sign in with your ADT account.</p>' +
    '<div class="field"><label class="pkEyebrow" for="lu">Username</label><input id="lu" class="pkInput pkFocusable" autocomplete="username" value="demo_admin"></div>' +
    '<div class="field"><label class="pkEyebrow" for="lp">Password</label><input id="lp" type="password" class="pkInput pkFocusable" autocomplete="current-password" value="simulation"></div>' +
    '<button type="submit" class="pkBtn pkBtnPrimary" style="width:100%;justify-content:center">Sign in</button>' +
    '<div class="demoAccts"><b>Simulation — any password works.</b> Quick sign-in as:<br>' +
    Object.keys(USERS).map(function (k) { return '<button type="button" class="pkBtn pkBtnXs" data-login="' + k + '" style="margin:4px 4px 0 0">' + esc(ROLE_LABEL[USERS[k].roles[0]]) + '</button>'; }).join('') +
    '</div></form></div>';
  var f = $('#loginForm');
  f.addEventListener('submit', function (e) { e.preventDefault(); doLogin($('#lu').value.trim() || 'demo_admin'); });
  f.querySelectorAll('[data-login]').forEach(function (b) { b.addEventListener('click', function () { doLogin(this.getAttribute('data-login')); }); });
}
function doLogin(username) {
  var u = USERS[username] || USERS.demo_admin;
  STATE.user = u; STATE.selectedNodeId = (scopedNodeIds() && u.orgScope[0]) ? u.orgScope[0] : 'ORG000';
  audit('Sign in', 'Session started (simulation)');
  location.hash = '/overview';
  render();
}

/* ---- Run Lifecycle -------------------------------------------------------- */
function preconditions() {
  var neg = DB.results.negativeSummary;
  return [
    { id: 'invariant_violation', label: 'Invariant check', satisfied: true, code: 'invariant_violation', detail: '' },
    { id: 'negative_target_unacknowledged', label: 'Negative-target acknowledgement', satisfied: !neg || STATE.negAck, code: 'negative_target_unacknowledged', detail: neg ? (neg.occurrenceCount + ' branch-week(s) carry a negative ' + neg.metricId + ' target across ' + neg.branchCount + ' branches (worst ' + neg.worstValue + '). Acknowledge on Reconciliation before finalising.') : '', remedy: 'reconciliation' },
    { id: 'config_integrity_blockers', label: 'Configuration-integrity findings', satisfied: true, code: 'config_integrity_blockers', detail: '' }
  ];
}
function stepBox(n, title, state, lockedBecause, body) {
  var tone = state === 'done' ? 'var(--proved-t)' : state === 'current' ? 'var(--azure-t)' : 'var(--dim)';
  return '<div class="pkPanel p-3 mb-2" style="border-left:3px solid ' + (state === 'locked' ? 'transparent' : tone) + ';opacity:' + (state === 'locked' ? '.65' : '1') + '">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:' + (state === 'locked' && !body ? '0' : '8px') + '">' +
    '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font-size:11px;border:1px solid ' + tone + ';color:' + tone + '">' + (state === 'done' ? '✓' : n) + '</span>' +
    '<b style="font-size:12.5px">' + esc(title) + '</b>' + (state === 'current' ? ' ' + badge('drift', 'do this next') : state === 'done' ? ' ' + badge('proved', 'done') : '') + '</div>' +
    (state === 'locked' && lockedBecause ? '<div class="pkDim" style="font-size:11px">' + esc(lockedBecause) + '</div>' : (body || '')) + '</div>';
}
SCREENS['/run-lifecycle'] = {
  render: function () {
    var run = STATE.run; var res = DB.results;
    var wiz = ['Draft', 'Computed', 'Finalised'].map(function (s, i) {
      var done = (i === 0) || (i === 1 && (run.state === 'Computed' || run.state === 'Finalised')) || (i === 2 && run.state === 'Finalised');
      var active = (i === 1 && run.state === 'Draft') || (i === 2 && run.state === 'Computed');
      return '<div class="wizStep ' + (done ? 'wizDone' : active ? 'wizActive' : '') + '"><div class="wizDot">' + (done ? '✓' : (i + 1)) + '</div><span style="font-size:11px">' + s + '</span></div>';
    }).join('<div class="wizLine"></div>');

    var computeBody = '<div class="pkPanel p-3" id="computePanel"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><div class="pkEyebrow">Compute</div>' +
      (can('compute') ? '<button class="pkBtn pkBtnPrimary pkBtnXs" data-act="rl-compute">Run compute</button>' : badge('neutral', 'Planning Analyst / Admin only')) + '</div>' +
      '<div id="computeProgress"><p style="font-size:11.5px" class="pkDim">' + esc(run.state) + '. ' + res.groups.filter(function (g) { return !g.error; }).length + ' branch+program+metric groups · ' + DB.staff.length + ' staff · ' + cascadeMetrics().length + ' cascade-active metrics.</p></div></div>';

    var neg = res.negativeSummary;
    var precs = preconditions();
    var allSat = precs.every(function (p) { return p.satisfied; });
    var gateBody = '<div class="pkEyebrow" style="margin-bottom:6px">Two separate checks, both enforced by the system</div>' +
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><p class="pkDim" style="font-size:11px;flex:1;max-width:70ch">Draft↔Computed is free and repeatable. Finalise is the one step that cannot be undone; the checks below are enforced server-side, not by this screen.</p>' +
      (can('finalise') ? '<button class="pkBtn pkBtnPrimary pkBtnXs" data-act="rl-finalise">' + (run.state === 'Finalised' ? 'Finalised' : STATE.finaliseAttempted && !allSat ? 'Retry Finalise' : 'Finalise Run') + '</button>' : badge('neutral', 'Planning Analyst / Admin only')) + '</div>';
    if (STATE.finaliseAttempted && run.state !== 'Finalised') {
      gateBody += precs.map(function (p) {
        if (p.satisfied) return callout('proved', '<b style="color:var(--proved-t)">' + esc(p.label) + ' satisfied.</b> On its own, this check no longer blocks Finalise.');
        return callout('blocked', '<b style="color:var(--blocked-t)"><span class="mono">' + esc(p.code) + '</span></b><div style="margin-top:4px">' + esc(p.detail) + '</div>' + (p.remedy ? '<button class="linkBtn" data-act="goto-recon" style="margin-top:6px">Resolve on Reconciliation →</button>' : ''));
      }).join('');
    } else if (run.state === 'Finalised') {
      gateBody += callout('proved', '<b style="color:var(--proved-t)">Run finalised.</b> Figures are frozen; a finalised run refuses recompute (409). Revise by superseding with a new run below.');
    }

    var exportBody = run.state === 'Finalised'
      ? exportPanel()
      : '';

    var supersede = run.state === 'Finalised' ? '<div class="pkPanel p-3 mb-3"><div class="pkEyebrow">Revise this week — supersede with a fresh Run</div><p class="pkDim" style="font-size:11px;max-width:95ch;line-height:1.55">This Run is <b>not</b> edited — it is the record of what was published. Superseding creates a <b>new Run for the same week</b>, which you compute and finalise as normal; both remain readable.</p>' +
      '<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap"><label class="field" style="flex:1;min-width:280px"><span class="pkEyebrow">Why is this week being recomputed?</span><input class="pkInput" id="supReason" placeholder="Management revised the August overdue target"></label>' +
      '<button class="pkBtn pkBtnXs" data-act="rl-supersede">Supersede this Run</button></div></div>' : '';

    return '<h3 class="screenTitle">Run Lifecycle — Draft → Computed → Finalised</h3>' +
      '<div class="wizard">' + wiz + '</div>' +
      stepBox(1, 'Create the run', 'done', null, '<div style="font-size:11px;line-height:1.55"><b class="mono">' + esc(run.week) + '</b> · ' + esc(run.state) + ' · roster pinned at import time.</div>') +
      stepBox(2, 'Compute the targets', run.state === 'Draft' ? 'current' : 'done', null, computeBody) +
      stepBox(3, 'Check the figures', run.state === 'Draft' ? 'locked' : run.state === 'Computed' ? 'current' : 'done', 'Nothing to check until the run has been computed.', runSummaryCard() + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="pkBtn pkBtnXs" data-act="goto-recon">Reconciliation</button><button class="pkBtn pkBtnXs" data-act="goto-rollups">Rollups</button><button class="pkBtn pkBtnXs" data-act="goto-results">Results</button></div>') +
      stepBox(4, 'Finalise', run.state === 'Finalised' ? 'done' : run.state === 'Computed' ? 'current' : 'locked', 'Compute the run first — there are no figures to finalise yet.', gateBody) +
      stepBox(5, 'Download the workbooks', run.state === 'Finalised' ? 'current' : 'locked', 'Only a finalised run can be exported — a computed run’s figures can still change.', exportBody) +
      supersede +
      '<div class="pkEyebrow" style="margin-top:18px;margin-bottom:6px">Reference</div>' +
      '<div class="grid2">' + pinnedCard() + auditCard() + '</div>';
  },
  wire: function () { }
};
function runSummaryCard() {
  var groups = DB.results.groups.filter(function (g) { return !g.error; });
  var br = {}, staff = {}; groups.forEach(function (g) { br[g.branchId + g.bucket] = 1; g.rows.forEach(function (r) { staff[r.staff_id] = 1; }); });
  return '<div class="summaryStrip">' +
    summaryCard('Branch+program groups', Object.keys(br).length, '') +
    summaryCard('Staff targeted', Object.keys(staff).length, '') +
    summaryCard('Cascade-active metrics', cascadeMetrics().length + ' × 1 basis', 'Principal (SC not supplied)') +
    summaryCard('Exact-sum proof', DB.results.selftest.ok + '/' + DB.results.selftest.total, 'groups foot exactly') +
    '</div>';
}
function summaryCard(label, value, note) { return '<div class="summaryCard"><div class="summaryLabel">' + esc(label) + '</div><div class="summaryValue num">' + esc(String(value)) + '</div><div class="summaryNote">' + esc(note || '') + '</div></div>'; }
function pinnedCard() {
  var rows = [['weight_resolution_comparator', 'GEO_THEN_SCOPE'], ['rounding_mode', 'FLOOR_TOWARD_NEG_INF'], ['group_target_rounding_mode', 'HALF_AWAY_FROM_ZERO'], ['degenerate_denominator_policy', 'RENORMALISE'], ['not_supplied_policy', 'EXCLUDE_STAFF_FROM_METRIC'], ['weight_config_version', '14'], ['decimal_context', 'prec=34']];
  return '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">Pinned on this Run — <span class="mono">rule_versions</span></div><table class="pkGrid" style="font-size:11px"><tbody>' + rows.map(function (r) { return '<tr><td class="mono" style="font-size:10.5px">' + r[0] + '</td><td class="mono" style="font-size:10.5px">' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>' +
    '<div style="margin-top:8px">' + callout('proved', '<b style="color:var(--proved-t)">Reproducibility check.</b> ' + (can('verify') ? '<button class="linkBtn" data-act="rl-verify">Recompute and compare →</button>' : 'Auditor / Planning Analyst only.') + ' <span id="verifyOut"></span>') + '</div></div>';
}
function auditCard() {
  return '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">Audit trail — who, when, before → after</div>' +
    '<table class="pkGrid tight"><thead><tr><th>When</th><th>Actor · role</th><th>Action</th><th>Detail</th></tr></thead><tbody>' +
    (DB.audit.length ? DB.audit.slice(0, 10).map(function (a) { return '<tr><td class="mono" style="font-size:9.5px">' + esc(a.ts.slice(5, 16).replace('T', ' ')) + '</td><td style="font-size:10px">' + esc(a.actor) + '<div class="pkDim" style="font-size:9px">' + esc(a.role) + '</div></td><td style="font-size:10.5px">' + esc(a.action) + (a.before || a.after ? '<div class="pkDim mono" style="font-size:9px">' + esc(a.before) + ' → ' + esc(a.after) + '</div>' : '') + '</td><td class="pkDim" style="font-size:10px">' + esc(a.detail) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="pkDim">No actions yet this session.</td></tr>') +
    '</tbody></table></div>';
}
ACTS['rl-compute'] = function () {
  var run = STATE.run; var host = $('#computeProgress'); if (!host) return;
  var panel = $('#computePanel'); if (panel) panel.classList.add('pkHalo');
  computeRun(); run.state = 'Draft';
  var total = DB.results.groups.filter(function (g) { return !g.error; }).length, done = 0, t0 = Date.now();
  host.innerHTML = '<div role="status"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px"><span>Computing… <span class="num" id="cpDone">0</span> of <span class="num">' + total + '</span> groups</span><span class="num pkDim" id="cpEl">0s elapsed</span></div><div class="pkSunken progressTrack"><div class="progressFill" id="cpFill" style="width:0%"></div></div></div>';
  var iv = setInterval(function () {
    done = Math.min(total, done + Math.ceil(total / 22));
    var pct = Math.round(done / total * 100);
    var f = $('#cpFill'); if (f) f.style.width = pct + '%';
    var d = $('#cpDone'); if (d) d.textContent = done;
    var el = $('#cpEl'); if (el) el.textContent = ((Date.now() - t0) / 1000).toFixed(1) + 's elapsed';
    if (done >= total) { clearInterval(iv); STATE.run.state = 'Computed'; audit('Compute run', 'Cascaded ' + total + ' groups; exact-sum invariant held', 'Draft', 'Computed'); if (panel) panel.classList.remove('pkHalo'); render(); }
  }, 70);
};
ACTS['rl-finalise'] = function () {
  STATE.finaliseAttempted = true;
  var precs = preconditions();
  if (precs.every(function (p) { return p.satisfied; })) { STATE.run.state = 'Finalised'; audit('Finalise run', 'Irreversible; preconditions satisfied', 'Computed', 'Finalised'); }
  render();
};
ACTS['rl-supersede'] = function () { var r = $('#supReason'); var reason = r ? r.value.trim() : ''; if (!reason) { toast('A reason is required — it is recorded against both Runs.'); return; } audit('Supersede run', reason, 'Finalised', 'new Draft'); STATE.run = { state: 'Draft', week: STATE.run.week }; STATE.finaliseAttempted = false; STATE.negAck = false; toast('A new Run was created for this week. Compute and finalise it as normal.'); render(); };
ACTS['rl-verify'] = function () { var o = $('#verifyOut'); if (o) o.innerHTML = badge(DB.results.selftest.ok === DB.results.selftest.total ? 'proved' : 'blocked', 'identical: true · ' + DB.results.selftest.ok + '/' + DB.results.selftest.total, true); audit('Reproducibility check', 'Recomputed from snapshot; identical'); };
ACTS['goto-recon'] = function () { navigate('/reconciliation'); };
ACTS['goto-rollups'] = function () { navigate('/rollups'); };
ACTS['goto-results'] = function () { navigate('/results'); };

/* ---- Weight Matrix -------------------------------------------------------- */
function computeCellState(indId, weights, res) {
  var v = weights[indId];
  if (v === undefined) return { kind: 'zero', display: fmtWeight(0), note: 'not used' };
  if (v === 0) return { kind: 'zero', display: fmtWeight(0), note: 'not used' };
  if (res.mode === 'Custom') return { kind: 'custom', display: fmtWeight(v), note: 'custom' };
  if (res.mode === 'Inherited') return { kind: 'inherited', display: fmtWeight(v), note: '↑' + res.sourceName.split(' ')[0] + (res.sourceScope ? ' ' + res.sourceScope : '') };
  return { kind: 'inherited', display: fmtWeight(v), note: '↑ORG' };
}
SCREENS['/weight-matrix'] = {
  render: function () {
    var branchId = pickBranchForInspector();
    var br = DB.byId[branchId];
    var mets = cascadeMetrics();
    var scopeEnabled = br.program === 'Split' || (br.level !== 'BRANCH');
    var scopeSeg = '<div class="pkSeg" role="radiogroup" aria-label="Program-side scope">' +
      [['PME', 'PME side'], ['PMF', 'PMF side'], ['', 'Unscoped']].map(function (o) {
        var on = (o[0] === '' ? STATE.scope === null : STATE.scope === o[0]);
        return '<button data-act="wm-scope" data-scope="' + o[0] + '"' + (!scopeEnabled ? ' disabled' : '') + ' class="' + (on ? 'isOn' : '') + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    var why = br.program !== 'Split' && br.level === 'BRANCH' ? 'United branch ' + br.code + ' — one program side only; a program-scoped set never applies.' : 'The closest level wins first; the program side then decides between sets saved at that level.';

    var cols = mets.map(function (m) { return { m: m, res: resolveWeight(branchId, STATE.scope, m.id) }; });
    var head = '<th class="rowhead"><div class="pkEyebrow">Indicator ↓ / Metric →</div><div class="pkDim" style="font-size:10px">' + ACT_IND.length + ' × ' + mets.length + ' cells</div></th>' +
      cols.map(function (c) {
        var modeHue = c.res.mode === 'Custom' ? 'verd' : c.res.mode === 'Inherited' ? 'azure' : 'solid';
        return '<th' + (STATE.focusMetricId === c.m.id ? ' style="background:var(--state-selected)"' : '') + '><span class="mono" style="font-size:11px">' + c.m.id + '</span> ' + (c.m.negative ? '<span class="mono" style="font-size:9px;color:var(--drift-t)" title="carries negative targets">−ve</span>' : '') + '<div style="font-size:10px" class="pkDim">' + esc(c.m.name) + '</div><div style="margin-top:4px">' + badge(modeHue, c.res.mode) + '</div><div class="pkDim mono" style="font-size:9px;margin-top:2px">' + c.res.outcome.toLowerCase() + ' · ' + c.m.unit + '</div></th>';
      }).join('');
    var body = ACT_IND.map(function (ind) {
      return '<tr><th class="rowhead"><span class="mono" style="font-size:9.5px" class="pkDim">' + ind.code + '</span> <span style="font-size:11.5px">' + esc(ind.name) + '</span>' + (!ind.mapped ? ' <span title="not mapped" style="color:var(--drift-t)">⚑</span>' : '') + '</th>' +
        cols.map(function (c) {
          var cs = computeCellState(ind.id, c.res.weights, c.res);
          var focused = STATE.focusMetricId === c.m.id && STATE.focusIndicatorId === ind.id;
          return '<td class="cell state' + cs.kind.charAt(0).toUpperCase() + cs.kind.slice(1) + (focused ? ' cellFocus' : '') + '" data-act="wm-focus" data-m="' + c.m.id + '" data-i="' + ind.id + '"><span class="val num">' + cs.display + '</span><span class="note">' + esc(cs.note) + '</span></td>';
        }).join('') + '</tr>';
    }).join('');
    var foot = '<th class="rowhead" title="each metric column’s weights must add up to 1.000000">Σ = 1.000000</th>' +
      cols.map(function (c) {
        var sum = ACT_IND.reduce(function (a, ind) { return a + (c.res.weights[ind.id] || 0); }, 0) / 1000000;
        var proved = Math.abs(sum - 1) < 1e-9;
        return '<td><div style="text-align:right"><span class="num" style="font-size:13px;font-weight:500;color:' + (proved ? 'inherit' : 'var(--blocked-t)') + '">' + sum.toFixed(6) + '</span></div>' + proof(proved ? 'proved' : 'unproved', '<span style="color:' + (proved ? 'var(--proved)' : 'var(--blocked)') + ';font-size:10.5px">' + (proved ? 'Proved · adds up to 1.000000' : 'Off by ' + (sum - 1).toFixed(6)) + '</span>') + '</td>';
      }).join('');

    var editor = '';
    if (STATE.wmEdit) {
      var em = metricById(STATE.wmEdit.metricId);
      var w = STATE.wmEdit.weights;
      var sum = ACT_IND.reduce(function (a, ind) { return a + (parseFloat(w[ind.id]) || 0); }, 0);
      var ok = Math.abs(sum - 1) < 1e-9;
      editor = '<div class="pkPanel p-3 mt-3"><div class="pkEyebrow mb-2">Edit weight set — ' + esc(em.id) + ' ' + esc(em.name) + ' at ' + esc(br.name) + (STATE.scope ? ' · ' + STATE.scope + ' side' : ' · unscoped') + '</div>' +
        ACT_IND.map(function (ind) { return '<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px"><span style="width:150px">' + esc(ind.name) + '</span><input class="pkInput num" style="width:120px" data-act="wm-edit-input" data-i="' + ind.id + '" value="' + esc(w[ind.id]) + '"><button class="pkBtn pkBtnXs" data-act="wm-edit-rem" data-i="' + ind.id + '">use remainder</button></label>'; }).join('') +
        '<div style="font-size:12px;margin:6px 0">Σ = <b class="num" style="color:' + (ok ? 'var(--proved-t)' : 'var(--blocked-t)') + '">' + sum.toFixed(6) + '</b> ' + (ok ? badge('proved', 'sums to 1.000000') : badge('blocked', (sum - 1 > 0 ? '+' : '') + (sum - 1).toFixed(6) + ' — will not save')) + '</div>' +
        '<button class="pkBtn pkBtnPrimary pkBtnXs" data-act="wm-edit-save"' + (ok ? '' : ' disabled') + '>Save weight set</button> <button class="pkBtn pkBtnXs" data-act="wm-edit-cancel">Cancel</button>' +
        '<p class="pkDim" style="font-size:10px;margin-top:6px">BR-WEIGHT-SUM-PER-SCOPE: a save is blocked unless the column sums to exactly 1.000000. No silent auto-rescale (BR-INDICATOR-ADD-BLOCKS-INCOMPLETE-SAVE).</p></div>';
    }

    var editHint = can('weightsWrite')
      ? '<button class="pkBtn pkBtnXs" data-act="wm-edit-open" data-m="' + STATE.focusMetricId + '">Edit the ' + esc(STATE.focusMetricId) + ' weight set</button>'
      : badge('neutral', 'Weight edit — ADT Administrator only');

    return '<h3 class="screenTitle">Weight Matrix</h3>' +
      '<p class="leadP">Indicators (rows) by cascading metrics (columns), for <b>' + esc(br.name) + '</b> and the program side you have selected. Each metric column’s weights must add up to exactly 1.000000, on its own.</p>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap">' + scopeSeg + '<span class="pkDim" style="font-size:10.5px;max-width:70ch">' + esc(why) + '</span></div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">' + editHint + '<span class="pkDim" style="font-size:10.5px">Selected cell drives the precedence ladder on the right.</span></div>' +
      '<div class="pkPanel p-3" style="overflow:auto"><table class="wm"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody><tfoot><tr>' + foot + '</tr></tfoot></table></div>' +
      editor;
  },
  wire: function () { }
};
ACTS['wm-focus'] = function (el) { STATE.focusMetricId = el.getAttribute('data-m'); STATE.focusIndicatorId = el.getAttribute('data-i'); render(); };
ACTS['wm-scope'] = function (el) { var s = el.getAttribute('data-scope'); STATE.scope = s || null; render(); };
ACTS['wm-edit-open'] = function (el) { var br = DB.byId[pickBranchForInspector()]; var res = resolveWeight(br.id, STATE.scope, STATE.focusMetricId); var w = {}; ACT_IND.forEach(function (ind) { w[ind.id] = ((res.weights[ind.id] || 0) / 1000000).toFixed(6); }); STATE.wmEdit = { metricId: STATE.focusMetricId, weights: w }; render(); };
ACTS['wm-edit-cancel'] = function () { STATE.wmEdit = null; render(); };
ACTS['wm-edit-rem'] = function (el) { var id = el.getAttribute('data-i'); var w = STATE.wmEdit.weights; var others = ACT_IND.reduce(function (a, ind) { return a + (ind.id === id ? 0 : (parseFloat(w[ind.id]) || 0)); }, 0); w[id] = Math.max(0, 1 - others).toFixed(6); render(); };
ACTS['wm-edit-save'] = function () {
  var br = DB.byId[pickBranchForInspector()]; var w = STATE.wmEdit.weights; var micro = {}; ACT_IND.forEach(function (ind) { micro[ind.id] = Math.round((parseFloat(w[ind.id]) || 0) * 1000000); });
  DB.weightConfigs = DB.weightConfigs.filter(function (c) { return !(c.nodeId === br.id && c.scope === STATE.scope && c.metricId === STATE.wmEdit.metricId); });
  DB.weightConfigs.push({ nodeId: br.id, scope: STATE.scope, metricId: STATE.wmEdit.metricId, weights: micro });
  audit('Weight set saved', STATE.wmEdit.metricId + ' at ' + br.name + (STATE.scope ? ' / ' + STATE.scope : ''), 'weight_config v14', 'v15 (staged)');
  STATE.wmEdit = null; computeRun(); toast('Weight set saved. A Computed run for this period is now stale until recomputed.'); render();
};
document.addEventListener('input', function (e) { var el = e.target.closest ? e.target.closest('[data-act="wm-edit-input"]') : null; if (!el || !STATE.wmEdit) return; STATE.wmEdit.weights[el.getAttribute('data-i')] = el.value; var host = $('#scrollArea'); /* light re-render of sum only */ render(); var again = $('[data-act="wm-edit-input"][data-i="' + el.getAttribute('data-i') + '"]'); if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); } });

/* ---- Results (StaffTargetGrid) -------------------------------------------- */
SCREENS['/results'] = {
  render: function () {
    var f = STATE.results || (STATE.results = { metric: 'M6', basis: 'P', div: '', reg: '', area: '', branch: '', staffId: '' });
    if (!isCascadeActive(metricById(f.metric))) f.metric = 'M1';
    var st = DB.results.staffTargets;
    var rows = Object.keys(st).map(function (k) { return st[k]; }).filter(function (r) { return r.metricId === f.metric && branchInScope(r.branchId); });
    if (f.branch) rows = rows.filter(function (r) { return r.branchId === f.branch; });
    else if (f.area) rows = rows.filter(function (r) { return DB.byId[r.branchId].ancestor_path.indexOf(f.area) >= 0; });
    else if (f.reg) rows = rows.filter(function (r) { return DB.byId[r.branchId].ancestor_path.indexOf(f.reg) >= 0; });
    else if (f.div) rows = rows.filter(function (r) { return DB.byId[r.branchId].ancestor_path.indexOf(f.div) >= 0; });
    if (f.staffId) rows = rows.filter(function (r) { return r.staff_id.indexOf(f.staffId) >= 0; });
    rows.sort(function (a, b) { return a.staff_id < b.staff_id ? -1 : 1; });
    var m = metricById(f.metric);

    var opts = function (level, parent, val) { return '<option value="">All</option>' + DB.nodes.filter(function (n) { return n.level === level && (!parent || n.parentId === parent) && nodeInScope(n.id); }).map(function (n) { return '<option value="' + n.id + '"' + (val === n.id ? ' selected' : '') + '>' + esc(n.name) + '</option>'; }).join(''); };
    var metOpts = cascadeMetrics().map(function (mm) { return '<option value="' + mm.id + '"' + (f.metric === mm.id ? ' selected' : '') + '>' + mm.id + ' · ' + esc(mm.name) + '</option>'; }).join('');

    var body = rows.slice(0, 400).map(function (r) {
      var s = DB.staff.find(function (x) { return x.staff_id === r.staff_id && x.program === r.side; }) || DB.staff.find(function (x) { return x.staff_id === r.staff_id; });
      var br = DB.byId[r.branchId];
      var pub = r.exclusionReason ? '<span class="pkDim">—</span>' : (r.publishedLabel ? '<b class="num">' + fmtMetric(m, r.publishedTarget) + '</b> ' + badge('derived', r.publishedLabel) : fmtMetric(m, r.publishedTarget));
      return '<tr><td><a class="mono num" href="#/staff-audit/' + encodeURIComponent(r.staff_id) + '" style="letter-spacing:.02em">' + r.staff_id + '</a></td>' +
        '<td>' + esc(s ? s.name : '—') + '</td><td class="mono" style="font-size:11px">' + esc(s ? s.staff_type : '—') + '</td>' +
        '<td>' + badge(r.side === 'PMF' && br.program === 'United' ? 'solid' : 'verd', br.program === 'United' ? 'UNITED' : r.side) + '</td>' +
        '<td style="font-size:11px">' + esc(br.name) + ' <span class="mono pkDim" style="font-size:9.5px">' + br.code + '</span></td>' +
        '<td class="n num">' + (s && s.values.samity_no != null ? s.values.samity_no : '—') + '</td>' +
        '<td class="n num">' + (s ? s.values.member_no : '—') + '</td>' +
        '<td class="n num">' + (s && s.values.loan_outstanding != null ? s.values.loan_outstanding.toLocaleString(LOC) : '<span class="pkDim">not supplied</span>') + '</td>' +
        '<td class="n">' + (r.finalTarget != null ? fmtMetric(m, r.finalTarget) : '<span class="pkDim">—</span>') + '</td>' +
        '<td class="n">' + pub + '</td>' +
        '<td>' + (r.exclusionReason === 'PROGRAM_CHECK' ? badge('blocked', 'Excluded · Program-Check') : r.exclusionReason ? badge('drift', 'Excluded · not supplied') : '—') + '</td></tr>';
    }).join('');

    var groupProof = '';
    if (f.branch) {
      var g = DB.results.groups.find(function (gg) { return gg.branchId === f.branch && gg.metricId === f.metric && !gg.error; });
      if (g) groupProof = '<div class="pkPanel p-3 mb-3">' + proof(g.invariantOk ? 'proved' : 'unproved', '<span style="color:' + (g.invariantOk ? 'var(--proved)' : 'var(--blocked)') + '">' + (g.invariantOk ? 'Proved — Σ staff = branch target' : 'Not proved') + '</span><span class="num">' + fmtMetric(m, g.sumFinal) + ' ' + (g.invariantOk ? '=' : '≠') + ' ' + fmtMetric(m, g.groupTarget) + '</span>') + '</div>';
    }

    return '<h3 class="screenTitle">Results — ' + rows.length.toLocaleString(LOC) + ' rows this scope</h3>' +
      '<p class="leadP">Look up a member of staff and check their figures against the columns you already know from the workbook. Sorted by <span class="mono">staff_id</span>, ascending, character by character.</p>' +
      '<div class="fieldRow">' +
      '<label class="field"><span class="pkEyebrow">Metric</span><select class="pkInput" id="rMetric">' + metOpts + '</select></label>' +
      '<label class="field"><span class="pkEyebrow">Basis</span><select class="pkInput" id="rBasis"><option value="P"' + (f.basis === 'P' ? ' selected' : '') + '>Principal</option><option value="SC"' + (f.basis === 'SC' ? ' selected' : '') + '>With SC</option></select></label>' +
      '<label class="field"><span class="pkEyebrow">Division</span><select class="pkInput" id="rDiv">' + opts('DIV', '', f.div) + '</select></label>' +
      '<label class="field"><span class="pkEyebrow">Region</span><select class="pkInput" id="rReg"' + (f.div ? '' : ' disabled') + '>' + opts('REG', f.div, f.reg) + '</select></label>' +
      '<label class="field"><span class="pkEyebrow">Area</span><select class="pkInput" id="rArea"' + (f.reg ? '' : ' disabled') + '>' + opts('AREA', f.reg, f.area) + '</select></label>' +
      '<label class="field"><span class="pkEyebrow">Branch</span><select class="pkInput" id="rBranch"' + (f.area ? '' : ' disabled') + '>' + opts('BRANCH', f.area, f.branch) + '</select></label>' +
      '<label class="field"><span class="pkEyebrow">Staff ID</span><input class="pkInput mono" id="rStaff" value="' + esc(f.staffId) + '" placeholder="0000641000" style="width:130px"></label>' +
      '<button class="pkBtn pkBtnXs" data-act="r-clear">Clear all</button></div>' +
      (f.basis === 'SC' ? callout('drift', '<b>“Not supplied” is not a zero.</b> The Service-Charge basis has no calculation rule yet, so it is blocked — rows carry <span class="mono">input_state = NOT_SUPPLIED</span>.') : '') +
      groupProof +
      '<div class="pkPanel" style="overflow:auto"><table class="pkGrid"><thead><tr><th>staff_id</th><th>Name</th><th>Type</th><th>Program</th><th>Branch</th><th class="n">Samity</th><th class="n">Member</th><th class="n">Outstanding (Tk)</th><th class="n">Final (P)</th><th class="n">Published (P)</th><th>Exclusion</th></tr></thead><tbody>' + (body || '<tr><td colspan="11" class="pkDim" style="padding:16px">No rows for this scope.</td></tr>') + '</tbody></table></div>' +
      '<div style="margin-top:10px">' + callout('proved', '<b>Leading zeros matter.</b> Staff IDs are shown in a fixed-width font with a slashed zero, and are written to Excel as text on export so leading zeros are kept.') + '</div>';
  },
  wire: function () {
    var f = STATE.results;
    function set(id, key, cascadeReset) { var el = $('#' + id); if (el) el.addEventListener('change', function () { f[key] = this.value; if (cascadeReset) cascadeReset(); render(); }); }
    set('rMetric', 'metric'); set('rBasis', 'basis');
    set('rDiv', 'div', function () { f.reg = f.area = f.branch = ''; });
    set('rReg', 'reg', function () { f.area = f.branch = ''; });
    set('rArea', 'area', function () { f.branch = ''; });
    set('rBranch', 'branch');
    var s = $('#rStaff'); if (s) s.addEventListener('change', function () { f.staffId = this.value.trim(); render(); });
  }
};
ACTS['r-clear'] = function () { STATE.results = { metric: 'M6', basis: 'P', div: '', reg: '', area: '', branch: '', staffId: '' }; render(); };

/* ---- Staff Audit (AuditWaterfall) ----------------------------------------- */
SCREENS['/staff-audit'] = {
  render: function () {
    var sa = STATE.audit || (STATE.audit = { metric: 'M6', basis: 'P' });
    if (!isCascadeActive(metricById(sa.metric))) sa.metric = 'M1';
    var staffId = routeParam();
    if (!staffId) { var any = Object.keys(DB.results.staffTargets).map(function (k) { return DB.results.staffTargets[k]; }).find(function (r) { return r.metricId === sa.metric && r.finalTarget != null && branchInScope(r.branchId); }); staffId = any ? any.staff_id : DB.staff[0].staff_id; }
    /* find the focal row for this metric */
    var focal = Object.keys(DB.results.staffTargets).map(function (k) { return DB.results.staffTargets[k]; }).find(function (r) { return r.staff_id === staffId && r.metricId === sa.metric; });
    var m = metricById(sa.metric);
    var metOpts = cascadeMetrics().map(function (mm) { return '<option value="' + mm.id + '"' + (sa.metric === mm.id ? ' selected' : '') + '>' + mm.code + ' — ' + esc(mm.name) + '</option>'; }).join('');
    var controls = '<div class="fieldRow" style="margin:0"><label class="field"><span class="pkEyebrow">Metric</span><select class="pkInput" id="saMetric">' + metOpts + '</select></label>' +
      '<div class="pkSeg" role="radiogroup"><button data-act="sa-basis" data-b="P" class="' + (sa.basis === 'P' ? 'isOn' : '') + '">Principal</button><button data-act="sa-basis" data-b="SC" class="' + (sa.basis === 'SC' ? 'isOn' : '') + '">With SC</button></div></div>';
    var title = '<div><h3 class="screenTitle">Staff Audit — every step behind one staff member’s target, checked against the group total</h3></div>';
    var header = '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;margin-bottom:10px">' + title + controls + '</div>';

    if (sa.basis === 'SC') return header + '<div class="pkPanel p-3">' + badge('neutral', 'Not supplied') + '<p style="font-size:12px;margin-top:8px">The Service-Charge basis has no calculation rule yet, and is blocked. Rows are written <span class="mono">input_state = NOT_SUPPLIED</span> — not the same as a zero, so it carries no status colour.</p></div>';
    if (!focal || focal.finalTarget == null) return header + callout('blocked', 'Staff <span class="mono num">' + esc(staffId) + '</span> has no cascaded target for <span class="mono">' + esc(sa.metric) + '</span> in this run (they may be excluded, or on the other side). Pick a different metric, or open a staff row from Results.');

    var g = DB.results.groups.find(function (gg) { return gg.branchId === focal.branchId && gg.metricId === sa.metric && gg.side === focal.side && !gg.error; });
    var staffRec = DB.staff.find(function (x) { return x.staff_id === staffId && x.program === focal.side; }) || DB.staff.find(function (x) { return x.staff_id === staffId; });
    var br = DB.byId[focal.branchId];
    var groupRows = g.rows.map(function (r) { return DB.results.staffTargets[r.staff_id + '|' + focal.side + '|' + sa.metric]; }).filter(Boolean);
    var wc = g.resolution;
    var indKeys = ACT_IND.map(function (i) { return i.id; });
    var leftover = g.groupTarget - g.rows.reduce(function (a, r) { return a + Number(r.floor); }, 0);
    var truncSum = groupRows.reduce(function (a, r) { return a + Math.trunc(r.exactShare); }, 0);
    var sumFin = groupRows.reduce(function (a, r) { return a + r.finalTarget; }, 0);
    var proved = sumFin === g.groupTarget;

    var steps = [
      { label: 'Contribution ratios — value / group denominator', detail: indKeys.map(function (k, i) { return (i ? ' · ' : '') + '<span class="mono pkDim" style="font-size:10px">' + DB.byId2(k) + '</span> <span class="num">' + (focal.ratios[i] != null ? focal.ratios[i].toFixed(5) : '—') + '</span>'; }).join('') },
      { label: 'Resolved weights — <b>configured</b>, with provenance', detail: indKeys.map(function (k, i) { return (i ? ' · ' : '') + '<span class="mono pkDim" style="font-size:10px">' + DB.byId2(k) + '</span> <b class="num">' + fmtWeight(wc.weights[k] || 0) + '</b>'; }).join('') + '<div style="margin-top:6px">' + badge(wc.mode === 'Custom' ? 'verd' : wc.mode === 'Inherited' ? 'azure' : 'solid', wc.mode, true) + ' <span class="mono pkDim" style="font-size:10px">' + wc.outcome + '</span> ← ' + esc(wc.sourceName) + '</div>' },
      { label: 'Effective weights — post-renormalisation', detail: g.renormalised ? '<span class="num">' + indKeys.map(function (k, i) { return g.effectiveWeights[i].toFixed(6); }).join(' / ') + '</span> ' + badge('drift', 'renormalised ×' + g.rescaleFactor.toFixed(6) + ' · ' + g.excludedIndicatorIds.length + ' excluded', true) : '<span class="num">' + indKeys.map(function (k, i) { return fmtWeight(wc.weights[k] || 0); }).join(' / ') + '</span> <span class="pkDim" style="font-size:11px">identical to configured</span>' },
      { label: 'Weighted score — Σ over all indicators, zeros included', detail: indKeys.map(function (k, i) { return (i ? ' + ' : '') + '<span class="num">' + g.effectiveWeights[i].toFixed(6) + '</span>(' + (focal.ratios[i] != null ? focal.ratios[i].toFixed(5) : '0.00000') + ')'; }).join('') + ' = <b class="num">' + focal.weightedScore.toFixed(6) + '</b>' + (g.renormalised ? ' <span class="pkDim" style="font-size:10px">(effective weights, post-renormalisation)</span>' : '') },
      { label: 'Exact share — full precision, no intermediate rounding', detail: '<b class="num">' + focal.weightedScore.toFixed(6) + '</b> × ' + fmtMetric(m, g.groupTarget) + ' = <b class="num">' + focal.exactShare.toFixed(2) + '</b>' },
      { label: 'Floor — <b>mathematical floor, toward −∞</b>', detail: '<span class="mono">floor</span>(' + focal.exactShare.toFixed(2) + ') = <b class="num">' + focal.floor.toLocaleString(LOC) + '</b> <span class="pkDim">remainder</span> <b class="num">' + focal.remainder.toFixed(2) + '</b>' },
      { label: 'Rank among remainders — descending, ties by ascending staff_id', detail: '<b>#' + focal.rank + '</b> of ' + groupRows.length + ' · leftover to distribute <b class="num">' + leftover + '</b>' },
      { label: 'Bonus unit & final target', detail: (focal.bonusUnit ? badge('proved', '+1 unit awarded', true) : badge('neutral', '+0 — remainder outside the leftover set')) + ' <span class="pkDim">' + focal.floor.toLocaleString(LOC) + ' + ' + focal.bonusUnit + ' =</span> <b style="font-size:15px">' + fmtMetric(m, focal.finalTarget) + '</b>' }
    ];

    var groupTable = '<table class="pkGrid" style="font-size:11px"><thead><tr><th>staff_id</th><th>Name</th>' + indKeys.map(function (k) { return '<th class="n mono">r·' + DB.byId2(k) + '</th>'; }).join('') + '<th class="n">weighted</th><th class="n">exact share</th><th class="n">floor</th><th class="n">rem.</th><th class="n">rank</th><th class="n">bonus</th><th class="n">FINAL</th></tr></thead><tbody>' +
      groupRows.map(function (r) {
        var s2 = DB.staff.find(function (x) { return x.staff_id === r.staff_id && x.program === focal.side; });
        return '<tr class="' + (r.staff_id === staffId ? 'isSel' : '') + '"><td class="mono num">' + r.staff_id + '</td><td>' + esc(s2 ? s2.name : '—') + '</td>' + indKeys.map(function (k, i) { return '<td class="n num">' + (r.ratios[i] != null ? r.ratios[i].toFixed(5) : '—') + '</td>'; }).join('') + '<td class="n num">' + r.weightedScore.toFixed(6) + '</td><td class="n num">' + r.exactShare.toFixed(2) + '</td><td class="n num">' + r.floor.toLocaleString(LOC) + '</td><td class="n num">' + r.remainder.toFixed(2) + '</td><td class="n num">' + r.rank + '</td><td class="n num">' + (r.bonusUnit ? '+1' : '—') + '</td><td class="n" style="font-weight:500">' + fmtMetric(m, r.finalTarget) + '</td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><td colspan="' + (2 + indKeys.length) + '" class="pkDim">Σ across the group</td><td class="n num">' + groupRows.reduce(function (a, r) { return a + r.weightedScore; }, 0).toFixed(6) + '</td><td class="n num">' + groupRows.reduce(function (a, r) { return a + r.exactShare; }, 0).toFixed(2) + '</td><td class="n num">' + groupRows.reduce(function (a, r) { return a + r.floor; }, 0).toLocaleString(LOC) + '</td><td class="pkDim">leftover</td><td class="n num">' + leftover + '</td><td class="n num">+' + leftover + '</td><td class="n" style="font-weight:500">' + fmtMetric(m, sumFin) + '</td></tr></tfoot></table>';

    var disclosure = '<div class="pkPanel p-3"><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">' + badge('drift', 'Disclosure', true) + '<span class="pkEyebrow">This figure will not match the v8 workbook, by design</span></div>' +
      '<p style="font-size:11px">The validated workbook truncates <em>toward zero</em>; this system floors toward <b>−∞</b>. On this group:</p>' +
      '<table class="pkGrid tight"><thead><tr><th></th><th class="n">floor −∞ ' + badge('proved', 'this system') + '</th><th class="n">ROUNDDOWN ' + badge('blocked', 'workbook') + '</th></tr></thead><tbody>' +
      '<tr><td>Σ floor / trunc</td><td class="n num">' + groupRows.reduce(function (a, r) { return a + r.floor; }, 0).toLocaleString(LOC) + '</td><td class="n num">' + truncSum.toLocaleString(LOC) + '</td></tr>' +
      '<tr><td>leftover = target − Σ</td><td class="n num" style="color:var(--proved-t)">+' + leftover + '</td><td class="n num" style="color:var(--blocked-t)">' + (g.groupTarget - truncSum) + '</td></tr>' +
      '<tr><td>Exact-sum invariant</td><td class="n" style="color:var(--proved-t)">holds</td><td class="n" style="color:var(--blocked-t)">breaks</td></tr></tbody></table></div>';

    return header +
      '<p class="leadP">Staff <span class="mono num">' + esc(staffId) + '</span>' + (staffRec ? ' · ' + esc(staffRec.name) + ' (' + esc(staffRec.staff_type) + ')' : '') + ' · ' + esc(br.name) + ' (' + br.code + ') · <b>' + (br.program === 'United' ? 'UNITED' : focal.side) + '</b> side · <span class="mono">' + sa.metric + ' ' + esc(m.name) + '</span> · group target <b>' + fmtMetric(m, g.groupTarget) + '</b> across ' + groupRows.length + ' staff.</p>' +
      '<div class="twoCol"><div class="pkPanel p-3"><div class="pkEyebrow mb-2">The working — 8 steps, in the order the system runs them</div>' + spine(steps) + '</div>' + disclosure + '</div>' +
      '<div class="pkPanel p-3 mt-3"><div class="pkEyebrow mb-2">Group reconciliation — ' + esc(br.name) + ' (' + br.code + ') · ' + (br.program === 'United' ? 'UNITED' : focal.side) + ' · ' + sa.metric + ' · Principal</div><div style="overflow:auto">' + groupTable + '</div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:8px"><div style="width:360px">' + proof(proved ? 'proved' : 'unproved', '<span style="color:' + (proved ? 'var(--proved)' : 'var(--drift)') + '">' + (proved ? 'Proved — Σ staff = branch target' : 'Not proved') + '</span><span class="num">' + fmtMetric(m, sumFin) + ' ' + (proved ? '=' : '≠') + ' ' + fmtMetric(m, g.groupTarget) + '</span>') + '</div></div></div>';
  },
  wire: function () { var el = $('#saMetric'); if (el) el.addEventListener('change', function () { STATE.audit.metric = this.value; render(); }); }
};
ACTS['sa-basis'] = function (el) { STATE.audit.basis = el.getAttribute('data-b'); render(); };
DB.byId2 = function (indId) { var i = DB.indicators.find(function (x) { return x.id === indId; }); return i ? i.code : indId; };

/* ============================================================================
   EXPORTS (CSV) + remaining screens + guided tour + boot
   ============================================================================ */
function exportPanel() {
  var finalised = STATE.run.state === 'Finalised';
  return '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">Export — both from a Finalised run</div>' +
    (finalised ? '' : callout('drift', 'These download now for the demo, but in the real system a workbook is only taken from a <b>Finalised</b> run — a computed run’s figures can still change.')) +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="pkBtn pkBtnXs" data-act="export-portal">Portal upload (CSV)</button>' +
    '<button class="pkBtn pkBtnXs" data-act="export-transparency">Transparency long-format (CSV)</button>' +
    '<button class="pkBtn pkBtnXs" data-act="export-transfer">Staff-transfer report (CSV)</button></div>' +
    '<p class="pkDim" style="font-size:10px;margin-top:6px">Staff ids export as text so leading zeros survive; columns the system does not compute are left blank, never 0.</p></div>';
}
ACTS['export-portal'] = function () {
  var mets = cascadeMetrics(); var st = DB.results.staffTargets;
  var head = ['staff_id', 'name', 'branch_code', 'program'].concat(mets.map(function (m) { return m.id + ' Final (P)'; }));
  var lines = [csvRow(head)];
  DB.staff.forEach(function (s) {
    var br = DB.byId[s.branch_id];
    var cells = ["'" + s.staff_id, s.name, br.code, br.program === 'United' ? 'UNITED' : s.program];
    mets.forEach(function (m) { var r = st[s.staff_id + '|' + s.program + '|' + m.id]; cells.push(r && r.publishedTarget != null ? r.publishedTarget : ''); });
    lines.push(csvRow(cells));
  });
  audit('Export', 'Portal upload workbook (CSV)'); download('PMUK_Weekly_Staff_Targets_W' + STATE.week + '.csv', lines.join('\n'));
};
ACTS['export-transparency'] = function () {
  var st = DB.results.staffTargets;
  var lines = [csvRow(['run_id', 'staff_id', 'branch_code', 'side', 'metric', 'weighted_score', 'exact_share', 'floor', 'remainder', 'rank', 'bonus_unit', 'final_target', 'published_target', 'published_label'])];
  Object.keys(st).forEach(function (k) { var r = st[k]; if (r.finalTarget == null) return; var br = DB.byId[r.branchId]; lines.push(csvRow([STATE.run.week, "'" + r.staff_id, br.code, r.side, r.metricId, r.weightedScore.toFixed(6), r.exactShare.toFixed(2), r.floor, r.remainder.toFixed(2), r.rank, r.bonusUnit, r.finalTarget, r.publishedTarget, r.publishedLabel || ''])); });
  audit('Export', 'Transparency long-format workbook (CSV)'); download('PMUK_Branch_Target_Weightage_W' + STATE.week + '.csv', lines.join('\n'));
};
ACTS['export-transfer'] = function () {
  var sample = DB.staff.slice(0, 6);
  var lines = [csvRow(['staff_id', 'name', 'from_branch', 'to_branch', 'week', 'kind'])];
  sample.forEach(function (s, i) { if (i % 2) return; var to = branches()[(i + 3) % branches().length]; lines.push(csvRow(["'" + s.staff_id, s.name, DB.byId[s.branch_id].code, to.code, 'W' + STATE.week, 'BRANCH_CHANGED'])); });
  audit('Export', 'Staff-transfer report (CSV)'); download('PMUK_Staff_Transfers_W' + STATE.week + '.csv', lines.join('\n'));
};

/* ---- Rollups -------------------------------------------------------------- */
SCREENS['/rollups'] = {
  render: function () {
    var rl = STATE.roll || (STATE.roll = { side: 'All', metric: cascadeMetrics()[0].id, path: [] });
    var currentId = rl.path.length ? rl.path[rl.path.length - 1] : 'ORG000';
    if (!nodeInScope(currentId)) { rl.path = []; currentId = scopedNodeIds() && STATE.user.orgScope[0] ? STATE.user.orgScope[0] : 'ORG000'; }
    var m = metricById(rl.metric);
    function rowFor(nodeId) { return DB.results.rollups[nodeId + '|' + rl.metric + '|' + rl.side]; }
    var kids = childrenOf(currentId).filter(function (n) { return nodeInScope(n.id); });
    var curRow = rowFor(currentId);

    var metOpts = cascadeMetrics().map(function (mm) { return '<option value="' + mm.id + '"' + (rl.metric === mm.id ? ' selected' : '') + '>' + esc(mm.name) + '</option>'; }).join('');
    var pathBits = ['PMUK'].concat(rl.path.map(function (id) { return DB.byId[id].name; })).join('  ›  ');
    var attention = Object.keys(DB.results.rollups).map(function (k) { return DB.results.rollups[k]; }).filter(function (r) { return r.side === 'All' && DB.byId[r.nodeId].ancestor_path.indexOf(currentId) >= 0 && r.isBranch && (r.status === 'unalloc' || r.status === 'zero'); });

    var table = kids.length ? '<div class="pkPanel" style="overflow:auto"><table class="pkGrid"><thead><tr><th>' + ({ ORG: 'Division', DIV: 'Region', REG: 'Area', AREA: 'Branch' }[DB.byId[currentId].level] || 'Group') + '</th><th class="n">Staff</th><th class="n">Given to staff</th><th class="n">Shown to staff</th><th class="n">Branch target</th><th class="n">Difference</th><th>Does it add up?</th></tr></thead><tbody>' +
      kids.map(function (c) {
        var r = rowFor(c.id); var hasTarget = r && r.target != null; var delta = hasTarget ? r.sumFinal - r.target : null;
        var canDescend = childrenOf(c.id).length > 0;
        var statusCell = !r ? '<span class="pkDim">no row</span>' : !hasTarget ? '<span class="pkDim" title="running total of branches below">running total</span>' :
          proof(r.status === 'proved' || r.status === 'renorm' ? 'proved' : 'unproved', badge(r.status === 'proved' ? 'proved' : r.status === 'renorm' ? 'drift' : r.status === 'zero' ? 'neutral' : 'drift', { proved: 'Proved', renorm: 'Proved · renormalised', zero: '0 staff', unalloc: 'Populated with exceptions', running: 'running' }[r.status] || r.status, r.status !== 'zero'));
        return '<tr' + (canDescend ? ' data-act="roll-descend" data-node="' + c.id + '" style="cursor:pointer"' : '') + '><td style="font-size:11.5px">' + (canDescend ? '<span class="pkDim">› </span>' : '') + esc(c.name) + ' <span class="pkDim mono" style="font-size:9px">' + c.code + '</span>' + (c.level === 'BRANCH' && c.program === 'United' && rl.side !== 'United' ? ' ' + badge('derived', 'UNITED') : '') + '</td>' +
          '<td class="n num">' + (r ? r.staffCount.toLocaleString(LOC) : '—') + (r && r.excludedStaffCount ? ' <span class="pkDim" style="font-size:9px">(' + r.excludedStaffCount + ' excl.)</span>' : '') + '</td>' +
          '<td class="n">' + (r ? fmtMetric(m, r.sumFinal) : '—') + '</td>' +
          '<td class="n">' + (r ? fmtMetric(m, r.sumPublished) + (r.publishedExceedsTargetBy > 0 ? ' ' + badge('derived', '&gt;target') : '') : '—') + '</td>' +
          '<td class="n">' + (hasTarget ? fmtMetric(m, r.target) : '<span class="pkDim">no target here</span>') + '</td>' +
          '<td class="n">' + (delta == null || delta === 0 ? '<span class="pkDim">—</span>' : '<span class="num" style="color:var(--drift-t)">' + (delta > 0 ? '+' : '') + delta.toLocaleString(LOC) + '</span>') + '</td>' +
          '<td>' + statusCell + '</td></tr>';
      }).join('') + '</tbody></table></div>' : callout('neutral', 'This is a branch — the lowest level. Its individual staff targets are on Results; the full working is on Staff Audit.');

    return '<h3 class="screenTitle">Rollups — do the staff targets still add up to the branch target?</h3>' +
      '<p class="leadP">The system splits each branch target across its staff. This screen adds them back up — <b>branch → area → region → division → organisation</b> — and checks: does “Given to staff” equal the “Branch target”? Start at the summary; drill in only if it tells you to.</p>' +
      '<div class="fieldRow"><label class="field"><span class="pkEyebrow">Program</span><select class="pkInput" id="rollSide"><option value="All"' + (rl.side === 'All' ? ' selected' : '') + '>All (every program combined)</option><option value="United"' + (rl.side === 'United' ? ' selected' : '') + '>UNITED</option><option value="PME"' + (rl.side === 'PME' ? ' selected' : '') + '>PME</option><option value="PMF"' + (rl.side === 'PMF' ? ' selected' : '') + '>PMF</option></select></label>' +
      '<label class="field"><span class="pkEyebrow">Metric</span><select class="pkInput" id="rollMetric">' + metOpts + '</select></label>' +
      (rl.path.length ? '<button class="pkBtn pkBtnXs" data-act="roll-up">↑ Up a level</button>' : '') + '</div>' +
      '<div class="pkDim" style="font-size:11px;margin-bottom:6px">' + esc(pathBits) + '</div>' +
      '<div class="summaryStrip">' + summaryCard('Branch target', curRow && curRow.target != null ? striptags(fmtMetric(m, curRow.target)) : '—', curRow && curRow.target != null ? '' : 'set on branches only') +
      summaryCard('Given to staff', curRow ? striptags(fmtMetric(m, curRow.sumFinal)) : '—', '') +
      summaryCard('Staff', curRow ? curRow.staffCount.toLocaleString(LOC) : '—', '') +
      summaryCard('Need attention', attention.length, 'branch rows below here') + '</div>' +
      (attention.length ? callout('drift', '<b>' + attention.length + ' rows below this point need attention.</b> Drill in to see why.') : '') +
      table +
      '<div style="margin-top:12px">' + exportPanel() + '</div>';
  },
  wire: function () {
    var s = $('#rollSide'); if (s) s.addEventListener('change', function () { STATE.roll.side = this.value; render(); });
    var m = $('#rollMetric'); if (m) m.addEventListener('change', function () { STATE.roll.metric = this.value; render(); });
  }
};
function striptags(h) { return String(h).replace(/<[^>]*>/g, ''); }
ACTS['roll-descend'] = function (el) { STATE.roll.path.push(el.getAttribute('data-node')); render(); };
ACTS['roll-up'] = function () { STATE.roll.path.pop(); render(); };

/* ---- Reconciliation ------------------------------------------------------- */
var FINDINGS = [
  { id: 'INCOMPLETE_SET', action: 'BLOCK_COMPUTE', ack: false, why: 'A stored set lacks a row for an active indicator. Defensive only under A9 — unreachable via the API.' },
  { id: 'MISSING_ROOT_BASELINE', action: 'BLOCK_COMPUTE', ack: false, why: 'A cascaded metric has no ORGANIZATION-level unscoped set ⇒ A10’s fallback cannot terminate.' },
  { id: 'SUM_DRIFT', action: 'BLOCK_COMPUTE', ack: false, why: 'A stored set does not sum to 1.0 within tolerance. Reachable via seed/migration only.' },
  { id: 'METRIC_UNCONFIGURED_AT_CUSTOMISED_NODE', action: 'WARN', ack: true, why: 'A metric resolves to the root baseline by OMISSION at a node that already customises another metric.' },
  { id: 'SHADOWED_SCOPED_CONFIG', action: 'WARN', ack: true, why: 'A nearer unscoped Custom shadows a farther program-scoped one — the farther row can never apply.' },
  { id: 'ORPHANED_SCOPED_CONFIG', action: 'WARN', ack: true, why: 'A program-scoped Custom that can never win because every branch in its subtree is non-Split.' },
  { id: 'UNMAPPED_ACTIVE_INDICATOR', action: 'WARN', ack: true, why: 'An active indicator with no source mapping. Harmless at weight 0; an A8 renormalisation the moment anyone weights it.' }
];
SCREENS['/reconciliation'] = {
  render: function () {
    var neg = DB.results.negativeSummary;
    var a17 = Object.keys(DB.results.staffTargets).map(function (k) { return DB.results.staffTargets[k]; }).filter(function (r) { return r.exclusionReason === 'MISSING_INDICATOR_VALUE'; }).length;
    var pcCount = (DB._programCheck || []).length;
    var exCards = [];
    if (neg) exCards.push(negCard(neg));
    exCards.push(excCard('Program-Check Mismatch', pcCount, 'A staff Program tag does not match the branch. Weekly: skip-and-flag (target withheld, row flagged); annual: hard block.', 'drift', true));
    exCards.push(excCard('Staff excluded — indicator not supplied', a17, 'A17: excluded from that metric only, flagged, never a substituted 0.', 'drift', false));
    exCards.push(excCard('Duplicate staff id in file', 0, 'Same id twice on the same program side — first row wins, later rejected. (Caught at roster import.)', 'drift', true));
    exCards.push(excCard('Held for crosswalk', DB._heldForCrosswalk || 0, 'An import row held for identity resolution — visible, never dropped.', 'neutral', true));

    var blockN = 0, warnN = 0;
    var sweep = FINDINGS.map(function (f) {
      var acked = STATE.findingAcks[f.id];
      var count = 0; /* intended zero state */
      if (f.action === 'BLOCK_COMPUTE') blockN += count; else warnN += acked ? 0 : count;
      return '<div class="pkPanel p-3"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px"><span class="mono" style="font-size:11px;font-weight:500;word-break:break-all">' + f.id + '</span>' + badge('proved', '0', true) + '</div><p class="pkDim" style="font-size:10.5px;line-height:1.5">' + esc(f.why) + '</p><div style="display:flex;gap:6px;align-items:center;margin-top:8px">' + badge(f.action === 'BLOCK_COMPUTE' ? 'blocked' : 'drift', f.action) + (f.ack ? (can('ack') ? '<button class="pkBtn pkBtnXs" data-act="ack-finding" data-id="' + f.id + '"' + (acked ? ' disabled' : '') + '>' + (acked ? 'Acknowledged' : 'Acknowledge') + '</button>' : badge('neutral', 'ack: Analyst/Admin')) : badge('solid', 'cannot be acknowledged')) + '</div></div>';
    }).join('');

    return '<h3 class="screenTitle">Reconciliation — one list of problems, and the configuration sweep behind it</h3>' +
      '<p class="leadP">Five groups, each with an exact count. There is no chart here on purpose — these counts have to be read exactly.</p>' +
      '<div class="cardGrid">' + exCards.join('') + '</div>' +
      '<p class="leadP"><b>A separate check.</b> The cards above catch bad data in this week’s targets. The list below catches a broken weight <em>configuration</em> instead. ' + FINDINGS.length + ' of the 9 known configuration problems are wired up in this build.</p>' +
      '<div class="sweepHeader" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div class="pkEyebrow">Configuration-integrity sweep</div><div style="display:flex;gap:8px;align-items:center">' + badge('proved', blockN + ' blocking', true) + badge('drift', warnN + ' warning', true) + '<button class="pkBtn pkBtnXs" data-act="verify-run">Re-sweep</button></div></div>' +
      callout('proved', '<b style="color:var(--proved-t)">The three BLOCK_COMPUTE codes return zero — that is the intended state, not an empty panel.</b> A missing weight set has no sum that both keeps weights at 1.0 and invents no number, so the only options are refuse or fabricate.') +
      '<div class="cardGrid">' + sweep + '</div>';
  },
  wire: function () { }
};
function negCard(neg) {
  var acked = neg.state === 'Acknowledged' || STATE.negAck;
  return '<div class="pkPanel p-3"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span>' + badge('drift', (acked ? 0 : 1) + ' open', true) + '</span>' + (can('ack') ? '<button class="pkBtn pkBtnXs" data-act="ack-neg"' + (acked ? ' disabled' : '') + ' aria-pressed="' + acked + '">' + (acked ? 'Acknowledged' : 'Acknowledge') + '</button>' : badge('neutral', 'ack: Analyst/Admin')) + '</div>' +
    '<h4 style="font-size:12.5px;margin-top:6px">Negative Target — Higher-is-Better</h4>' +
    '<p class="pkDim" style="font-size:10.5px;line-height:1.5;margin:0">' + neg.occurrenceCount + ' branch-week' + (neg.occurrenceCount === 1 ? '' : 's') + ' carry negative ' + neg.metricId + ' targets across ' + neg.branchCount + ' branches (worst ' + neg.worstValue + ') — aggregated per (batch × metric), never one row per occurrence.</p>' +
    '<div class="mono pkDim" style="font-size:10px;margin-top:8px">Can be acknowledged · Blocks Finalise until it is</div>' +
    (acked ? '<div class="pkDim" style="font-size:10px;margin-top:6px">Acknowledged by ' + esc(STATE.user.displayName) + '</div>' : '') + '</div>';
}
function excCard(title, count, body, hue, queue) {
  return '<div class="pkPanel p-3"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' + badge(count ? hue : 'proved', count + ' open', true) + (queue ? '<button class="pkBtn pkBtnXs" data-act="noop">Open queue →</button>' : badge('neutral', 'not acknowledgeable')) + '</div><h4 style="font-size:12.5px;margin-top:6px">' + esc(title) + '</h4><p class="pkDim" style="font-size:10.5px;margin-top:4px;line-height:1.5">' + esc(body) + '</p></div>';
}
ACTS['ack-neg'] = function () { STATE.negAck = true; if (DB.results.negativeSummary) DB.results.negativeSummary.state = 'Acknowledged'; audit('Acknowledge', 'Negative-target alert (M1) acknowledged — unblocks Finalise', 'Open', 'Acknowledged'); toast('Acknowledged. The Finalise gate’s negative-target precondition is now satisfied.'); render(); };
ACTS['ack-finding'] = function (el) { var id = el.getAttribute('data-id'); STATE.findingAcks[id] = true; audit('Acknowledge finding', id); render(); };
ACTS['noop'] = function () { toast('Queue view is out of scope for this replica.'); };

/* ---- Roster Import -------------------------------------------------------- */
function validateRoster(rows) {
  var errorsByRow = [], seen = {}, byStripped = {}, sides = {};
  rows.forEach(function (r, i) {
    var line = i + 2;
    if (!r.staff_type || !r.branch) errorsByRow.push({ line: line, code: 'missing_required_field', field: !r.staff_type ? 'Staff Type' : 'Branch' });
    if (r.staff_id && r.staff_id.length !== 10) errorsByRow.push({ line: line, code: 'staff_id_length_anomaly', field: 'staff_id' });
    var key = r.staff_id + '|' + r.program;
    if (seen[key]) errorsByRow.push({ line: line, code: 'duplicate_staff_id_in_file', field: 'staff_id' }); seen[key] = 1;
    (sides[r.staff_id] = sides[r.staff_id] || {})[r.program] = 1;
    var stripped = (r.staff_id || '').replace(/^0+/, '');
    (byStripped[stripped] = byStripped[stripped] || []).push(r.staff_id);
  });
  var bothSides = Object.keys(sides).filter(function (id) { return Object.keys(sides[id]).length > 1; });
  var collisions = Object.keys(byStripped).filter(function (s) { var set = {}; byStripped[s].forEach(function (x) { set[x] = 1; }); return Object.keys(set).length > 1; });
  var rejected = errorsByRow.filter(function (e) { return e.code === 'missing_required_field'; }).length;
  var dup = errorsByRow.filter(function (e) { return e.code === 'duplicate_staff_id_in_file'; }).length;
  var ok = rows.length - rejected;
  return { rowCount: rows.length, counts: { ok: ok, rejected: rejected, held_for_crosswalk: 0, excluded_program_check: 0, staff_on_both_program_sides: bothSides.length }, errorsByRow: errorsByRow, collisions: collisions };
}
function sampleRosterRows(broken) {
  var rows = DB.staff.slice(0, 24).map(function (s) { var br = DB.byId[s.branch_id]; return { staff_id: s.staff_id, name: s.name, staff_type: s.staff_type, branch: br.name, program: s.program, samity: s.values.samity_no, member: s.values.member_no, outstanding: s.values.loan_outstanding }; });
  if (broken) {
    rows[3].staff_type = ''; /* missing required */
    rows[5].staff_id = rows[5].staff_id.replace(/^0/, ''); /* length anomaly + leading-zero collision */
    rows.push(Object.assign({}, rows[7])); /* duplicate */
    rows.push({ staff_id: rows[9].staff_id, name: rows[9].name, staff_type: 'CM', branch: rows[9].branch, program: rows[9].program === 'PMF' ? 'PME' : 'PMF', samity: 5, member: 120, outstanding: 900000 }); /* both sides */
  }
  return rows;
}
var CHECK_COPY = {
  missing_required_field: { t: 'Missing required information', e: 'These rows will be REJECTED — they cannot be imported.', f: 'Fill the named column, then upload again.' },
  staff_id_length_anomaly: { t: 'Staff ID is an unusual length', e: 'Imported, but flagged — a mistyped id can attach a target to the wrong person.', f: 'Check these ids; leading zeros are significant.' },
  duplicate_staff_id_in_file: { t: 'The same staff ID repeats on the SAME program side', e: 'Only the FIRST row is imported; the later one is rejected.', f: 'Remove the repeat, or correct the wrong id.' },
  staff_on_both_program_sides: { t: 'Staff ID posted on both program sides', e: 'Not an error — both import; marked Split for the week, a separate target from each side.', f: 'Confirm this is intended; no action needed if so.' }
};
SCREENS['/roster-import'] = {
  render: function () {
    var rv = STATE.rosterReview;
    var upload = '<section class="pkPanel p-3" id="rosterUpload"><h3 style="font-size:13px;font-weight:500;margin:0 0 8px">Upload staff information workbook</h3>' +
      '<p style="font-size:11px" class="pkDim" style="max-width:60ch">An <code>.xlsx</code>/<code>.csv</code>, one row per field staff member, with branch, program and indicator figures. Parsed and validated before anything is written — zero database writes before Commit.</p>' +
      (can('import') ? '<div class="fieldRow" style="margin-top:8px"><label class="dropZone" id="rosterDrop">Drop a CSV here, or click to choose<input type="file" id="rosterFile" accept=".csv,.xlsx" style="display:none"></label>' +
        '<button class="pkBtn pkBtnXs" data-act="roster-sample">Load built-in sample</button><button class="pkBtn pkBtnXs" data-act="roster-broken">Load a broken variant</button></div>'
        : callout('neutral', 'Uploading is a Planning Analyst / Administrator action. Sign in as one to try it.')) +
      '</section>';

    var review = '';
    if (rv) {
      var v = rv.validation; var total = v.counts.ok + v.counts.rejected + v.counts.held_for_crosswalk + v.counts.excluded_program_check;
      var footed = total === v.rowCount;
      var groups = {};
      v.errorsByRow.forEach(function (e) { var k = e.code + '|' + (e.field || ''); (groups[k] = groups[k] || { code: e.code, field: e.field, lines: [] }).lines.push(e.line); });
      var gArr = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.lines.length - a.lines.length; });
      review = '<div class="wizard"><div class="wizStep wizDone"><div class="wizDot">✓</div><span style="font-size:11px">Upload</span></div><div class="wizLine"></div><div class="wizStep wizDone"><div class="wizDot">✓</div><span style="font-size:11px">Sheet → week</span></div><div class="wizLine"></div><div class="wizStep wizActive"><div class="wizDot">3</div><span style="font-size:11px">Validate &amp; reconcile</span></div><div class="wizLine"></div><div class="wizStep"><div class="wizDot">4</div><span style="font-size:11px">Commit</span></div></div>' +
        callout(v.counts.rejected ? 'drift' : 'proved', 'Parsed ' + v.rowCount + ' row(s). This file would commit <b>' + v.counts.ok + '</b>, reject <b>' + v.counts.rejected + '</b>, hold <b>0</b> for crosswalk and exclude <b>0</b> by Program-Check' + (v.counts.staff_on_both_program_sides ? ', and record <b>' + v.counts.staff_on_both_program_sides + '</b> second posting(s) for staff on both sides' : '') + '. Nothing has been written yet.') +
        '<div class="twoCol"><div class="pkPanel p-3"><div class="pkEyebrow mb-2">Row states must reconcile to the input count</div><div class="rowStateGrid">' +
        [['Committed', v.counts.ok, '--proved'], ['Rejected', v.counts.rejected, '--blocked'], ['Held for crosswalk', v.counts.held_for_crosswalk, '--derived'], ['Excluded (Program-Check)', v.counts.excluded_program_check, '--drift']].map(function (c) { return '<div class="rowStateCell"><div class="rowStateValue num" style="color:var(' + c[2] + ')">' + c[1].toLocaleString(LOC) + '</div><div class="rowStateLabel">' + c[0] + '</div></div>'; }).join('') +
        '</div><div style="margin-top:9px">' + proof(footed ? 'proved' : 'unproved', '<span style="color:' + (footed ? 'var(--proved)' : 'var(--blocked)') + '">' + (footed ? 'Proved — states sum to the input count' : 'Unproved') + '</span><span class="num">' + total + ' of ' + v.rowCount + '</span>') + '</div></div>' +
        '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">Sanity checks — ' + gArr.reduce(function (a, g) { return a + g.lines.length; }, 0) + ' row finding(s)</div>' +
        (gArr.length || v.collisions.length ? gArr.map(function (g) { var c = CHECK_COPY[g.code] || { t: g.code, e: '', f: '' }; var rej = g.code === 'missing_required_field'; return callout(rej ? 'blocked' : 'drift', '<b>' + g.lines.length + ' row(s) — ' + esc(c.t) + (g.field ? ' (' + esc(g.field) + ')' : '') + '</b><div style="font-size:10.5px;margin-top:3px">' + esc(c.e) + ' ' + esc(c.f) + '</div><div class="pkDim mono" style="font-size:9.5px;margin-top:4px">' + g.code + ' · rows ' + g.lines.slice(0, 20).join(', ') + '</div>'); }).join('') + v.collisions.map(function (s) { return callout('drift', '<b>Two staff IDs collide once leading zeros are stripped</b><div style="font-size:10.5px;margin-top:3px">Both import, but any system that drops leading zeros would merge them. Confirm they are genuinely two people.</div>'); }).join('') : callout('proved', '<b>Sanity checks passed.</b> No missing fields, no staff-id anomalies, no program mismatches and no id collisions.')) + '</div></div>' +
        '<div style="margin-top:12px">' + (can('import') ? '<button class="pkBtn pkBtnPrimary" data-act="roster-commit">Commit this roster</button>' : '') + '</div>';
    } else {
      review = emptyState('No roster import to review yet', 'Upload a staff information workbook above (or load the built-in sample). This screen then shows the row-level verdicts for it.', 'Load built-in sample', 'roster-sample');
    }
    return '<h3 class="screenTitle">Roster Import — who is where this week</h3><p class="leadP">Three steps, and the preview is binding: validation reports exactly what commit will do. Every row reaches exactly one terminal state and the four counts sum to the input count.</p>' + upload + '<div style="margin-top:12px">' + review + '</div>';
  },
  wire: function () {
    var inp = $('#rosterFile'), drop = $('#rosterDrop');
    if (drop && inp) {
      drop.addEventListener('click', function () { inp.click(); });
      drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('drag'); });
      drop.addEventListener('dragleave', function () { drop.classList.remove('drag'); });
      drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('drag'); var f = e.dataTransfer.files[0]; if (f) readRosterFile(f); });
      inp.addEventListener('change', function () { if (inp.files[0]) readRosterFile(inp.files[0]); });
    }
  }
};
function readRosterFile(file) {
  if (/\.xlsx$/i.test(file.name)) { toast('This offline replica parses CSV directly. Export your sheet as CSV, or use the built-in sample.'); return; }
  var r = new FileReader();
  r.onload = function () { try { var rows = parseCsvRoster(String(r.result)); STATE.rosterReview = { validation: validateRoster(rows) }; audit('Roster upload (check)', file.name + ' — ' + rows.length + ' rows, zero-write validation'); render(); } catch (e) { toast('Could not read that CSV.'); } };
  r.readAsText(file);
}
function parseCsvRoster(text) {
  var lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); }); var head = lines.shift().split(',').map(function (h) { return h.trim().toLowerCase(); });
  function idx(names) { for (var i = 0; i < names.length; i++) { var j = head.indexOf(names[i]); if (j >= 0) return j; } return -1; }
  var iId = idx(['staff_id', 'staff id', 'id']), iType = idx(['staff_type', 'type']), iBr = idx(['branch']), iProg = idx(['program', 'side']);
  return lines.map(function (l) { var c = l.split(','); return { staff_id: (c[iId] || '').trim(), staff_type: (c[iType] || '').trim(), branch: (c[iBr] || '').trim(), program: (c[iProg] || '').trim() }; });
}
ACTS['roster-sample'] = function () { STATE.rosterReview = { validation: validateRoster(sampleRosterRows(false)) }; audit('Roster upload (check)', 'Built-in sample — zero-write validation'); render(); };
ACTS['roster-broken'] = function () { STATE.rosterReview = { validation: validateRoster(sampleRosterRows(true)) }; audit('Roster upload (check)', 'Broken variant — zero-write validation'); render(); };
ACTS['roster-commit'] = function () { var v = STATE.rosterReview.validation; audit('Roster commit', 'Committed ' + v.counts.ok + ', rejected ' + v.counts.rejected, 'staged', 'committed'); toast('Committed ' + v.counts.ok + ' row(s). Rejected ' + v.counts.rejected + '. (simulation)'); };
/* downloadable roster sample CSVs */
ACTS['roster-dl-sample'] = function () { download('roster_sample.csv', rosterCsv(sampleRosterRows(false))); };
ACTS['roster-dl-broken'] = function () { download('roster_broken.csv', rosterCsv(sampleRosterRows(true))); };
function rosterCsv(rows) { return [csvRow(['staff_id', 'name', 'staff_type', 'branch', 'program', 'samity', 'member', 'outstanding'])].concat(rows.map(function (r) { return csvRow(["'" + r.staff_id, r.name, r.staff_type, r.branch, r.program, r.samity, r.member, r.outstanding]); })).join('\n'); }

/* ---- Target Import -------------------------------------------------------- */
SCREENS['/target-import'] = {
  render: function () {
    var tv = STATE.targetReview;
    var sheets = cascadeMetrics();
    var upload = '<div class="pkEyebrow">Target file import · one workbook, the whole fiscal year</div><h3 class="screenTitle">Upload the branch target workbook</h3>' +
      '<p class="leadP">One sheet per metric, one column per week. A single upload writes <b>every week of the year</b> (60 weeks under the split-week calendar). Weeks you have already finalised are left as they are unless you name them. Nothing is written until you commit.</p>' +
      '<section class="pkPanel p-3" id="targetUpload">' + (can('import') ? '<div class="fieldRow"><button class="pkBtn pkBtnXs" data-act="target-sample">Load built-in sample</button><button class="pkBtn pkBtnXs" data-act="target-broken">Load a broken variant (a merged week column)</button><button class="pkBtn pkBtnXs" data-act="target-dl">Download a sample CSV</button></div>' : callout('neutral', 'Uploading is a Planning Analyst / Administrator action.')) + '</section>';
    var review = '';
    if (tv) {
      var ok = !tv.broken;
      var matchTotal = branches().reduce(function (a, b) { return a + sidesOf(b).length; }, 0);
      var blockOf = function (m) { return m.id === 'M6' ? 'BR..DR (overdue block)' : 'BT..DT (2nd / balance block)'; };
      var verdictRows = sheets.map(function (m, i) { var matched = (!ok && i === 0) ? 59 : 60; var acc = matched === 60; return '<tr><td>' + esc(m.name) + ' <span class="mono pkDim" style="font-size:9px">' + m.id + '</span></td><td class="mono" style="font-size:10.5px">' + blockOf(m) + '</td><td class="n num">' + matched + ' / 60</td><td>' + badge(acc ? 'proved' : 'blocked', acc ? 'accepted' : 'refused', true) + '</td></tr>'; }).join('') +
        '<tr class="isMuted"><td>Working Days <span class="mono pkDim" style="font-size:9px">ref</span></td><td class="mono" style="font-size:10.5px">not a metric</td><td class="n">—</td><td>' + badge('neutral', 'excluded') + '</td></tr>';
      review = '<div class="pkEyebrow">Step 2 · what this file contains</div>' +
        callout(ok ? 'proved' : 'blocked', ok ? 'Every metric sheet yielded its 60 “Week N (…)” columns.' : 'One sheet yielded only 59 columns — two “Week N” headers were merged by a manual edit. A sheet with fewer than 60 is refused whole; nothing from it is saved.') +
        '<div class="pkPanel p-3" style="overflow:auto;margin-bottom:12px"><div class="pkEyebrow mb-2">Per-sheet column-match verdict</div><table class="pkGrid"><thead><tr><th>Sheet</th><th>Week block consumed</th><th class="n">Columns matched</th><th>Verdict</th></tr></thead><tbody>' + verdictRows + '</tbody></table></div>' +
        '<div class="summaryStrip">' + summaryCard('Branch×side rows', matchTotal.toLocaleString(LOC), 'in the workbook') + summaryCard('Resolved', matchTotal.toLocaleString(LOC), 'Zone folded to Region, case-insensitive') + summaryCard('Unmatched', 0, 'every branch found') + summaryCard('Duplicate labels', 0, 'none') + '</div>' +
        '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">Step 3 · which metric does each sheet carry? (required, never inferred)</div>' +
        sheets.map(function (m) { return '<label style="display:flex;align-items:center;gap:8px;font-size:11px;margin-bottom:6px"><span style="flex:1">' + esc(m.name) + ' sheet</span><select class="pkInput"><option>' + m.id + ' — ' + esc(m.name) + '</option><option>— exclude —</option></select></label>'; }).join('') +
        '<label style="display:flex;align-items:center;gap:8px;font-size:11px"><span style="flex:1">Working Days sheet</span><select class="pkInput"><option>— exclude —</option></select></label></div>' +
        '<div class="pkPanel p-3 mt-2"><div class="pkEyebrow mb-2">Step 4 · finalised weeks</div><p class="pkDim" style="font-size:10.5px;margin:0 0 6px;max-width:90ch;line-height:1.5">These weeks have a Finalised Run and are left untouched unless you tick one. Revising a finalised week changes figures behind a run that has already been acted on.</p><div style="display:flex;gap:12px;flex-wrap:wrap">' + [3, 4, 5].map(function (w) { return '<label style="display:flex;align-items:center;gap:5px;font-size:11px"><input type="checkbox"> Week ' + w + '</label>'; }).join('') + '</div></div>' +
        '<div style="margin-top:12px">' + (ok && can('import') ? '<button class="pkBtn pkBtnPrimary" data-act="target-commit">Commit targets</button>' : ok ? '' : badge('blocked', 'Fix the merged column and re-upload')) + '</div>';
    } else {
      review = emptyState('No target file loaded yet', 'Load the built-in sample to see the per-sheet 60-column verdict, the branch-match report and the sheet→metric mapping.', 'Load built-in sample', 'target-sample');
    }
    return upload + '<div style="margin-top:12px">' + review + '</div>';
  },
  wire: function () { }
};
ACTS['target-sample'] = function () { STATE.targetReview = { sheets: cascadeMetrics().length + 1, broken: false }; audit('Target upload (check)', 'Built-in sample — 60-column verdict'); render(); };
ACTS['target-broken'] = function () { STATE.targetReview = { sheets: cascadeMetrics().length + 1, broken: true }; audit('Target upload (check)', 'Broken variant — merged week column'); render(); };
ACTS['target-commit'] = function () { audit('Target commit', 'Wrote 60 weeks × ' + cascadeMetrics().length + ' metrics', 'staged', 'committed'); toast('Targets written for 60 weeks. (simulation)'); };
ACTS['target-dl'] = function () { var head = ['Zone', 'Area', 'Branch', 'Type'].concat(DB.periods.map(function (p) { return 'Week ' + p.week + ' (' + p.longLabel.split('(')[1]; })); download('target_sample.csv', csvRow(head) + '\n' + branches().slice(0, 8).map(function (b) { return csvRow([DB.byId[b.parentId].name, DB.byId[b.parentId].name, b.name, b.program].concat(DB.periods.map(function () { return rnd(3, 14); }))); }).join('\n')); };

/* ---- Indicators / Metrics / Branch Targets / Legend ----------------------- */
SCREENS['/indicators'] = {
  render: function () {
    var showInactive = STATE.showInactiveInd;
    var rows = DB.indicators.filter(function (i) { return showInactive || i.active; }).map(function (i) {
      var used = DB.weightConfigs.some(function (c) { return (c.weights[i.id] || 0) > 0; }) || (i.active && (DB.baseline[i.id] || 0) > 0);
      return '<tr class="' + (i.addedOn ? 'isSel' : '') + '"><td class="mono">' + i.id + '</td><td class="mono" style="font-size:11px">' + i.code + '</td><td>' + esc(i.name) + '</td><td class="n num">' + i.ordinal + '</td><td>' + i.unit + '</td><td>' + (i.mapped ? badge('proved', 'mapped', true) : badge('drift', 'no source mapping', true)) + '</td><td class="n num">' + (used ? cascadeMetrics().length : 0) + '</td><td style="font-size:11px">' + (used ? cascadeMetrics().map(function (m) { return m.id; }).join(', ') : '<span class="pkDim">none — inert at weight 0</span>') + '</td><td>' + (can('catalogueWrite') ? '<label style="display:flex;gap:5px;align-items:center;font-size:10.5px"><input type="checkbox" ' + (i.active ? 'checked' : '') + ' data-act="ind-toggle" data-id="' + i.id + '">' + (i.active ? badge('proved', 'active') : badge('neutral', 'inactive')) + '</label>' : (i.active ? badge('proved', 'active') : badge('neutral', 'inactive'))) + '</td></tr>';
    }).join('');
    var addFlow = [
      { label: '<span class="mono">POST /indicators</span>', detail: 'Admin adds <span class="mono">disbursement_amount</span> (DISB), ordinal 40. Response: <span class="mono">{weight_rows_seeded: 6}</span>.' },
      { label: 'Seeded at weight 0 in every existing set', detail: 'One IndicatorWeight row at <span class="num">0.000000</span> in every stored configuration, same transaction.' },
      { label: 'Nothing is invalidated', detail: 'Every metric column still sums to exactly <span class="num">1.000000</span>.' },
      { label: '<b>The block lands at the RAISE</b>', detail: 'Raising a weight above 0 without rebalancing is refused: <span class="mono">weight_sum_invalid</span>. Save stays refused until the column adds up again.' }
    ];
    return '<h3 class="screenTitle">Indicator Catalogue — admin-addable, no code change, no deployment</h3>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:11px;margin:6px 0 10px"><input type="checkbox" ' + (showInactive ? 'checked' : '') + ' data-act="ind-show-inactive"> Show inactive <b>(' + DB.indicators.filter(function (i) { return !i.active; }).length + ')</b></label>' +
      '<p class="leadP">Indicators are <b>data</b>, not code. Usage is worked out from the weights, never recorded separately — an indicator counts as used wherever it carries a weight above 0.</p>' +
      (can('catalogueWrite') ? '<div class="pkPanel p-3 mb-3"><div class="pkEyebrow mb-2">Add an indicator</div><div class="fieldRow" style="margin:0"><input class="pkInput" id="indName" placeholder="Indicator name"><input class="pkInput mono" id="indCode" placeholder="CODE" style="width:100px"><button class="pkBtn pkBtnXs" data-act="ind-add">+ Add an indicator</button></div><p class="pkDim" style="font-size:10px;margin-top:6px">Seeds a 0-weight row into every existing weight configuration — nothing already saved stops being valid.</p></div>' : '') +
      '<div class="pkPanel" style="overflow:auto"><table class="pkGrid"><thead><tr><th>indicator_id</th><th>code</th><th>Name</th><th class="n">ordinal</th><th>unit</th><th>Source mapping</th><th class="n">Sets w&gt;0</th><th>Used by</th><th>State</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="grid2 mt-3"><div class="pkPanel p-3"><div class="pkEyebrow mb-2">What happens when you add an indicator — and where it gets blocked</div>' + spine(addFlow) + '</div>' +
      '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">Source mappings</div><table class="pkGrid tight"><thead><tr><th>indicator</th><th>import_kind</th><th>source_header</th></tr></thead><tbody>' + DB.indicators.map(function (i) { return '<tr class="' + (i.mapped ? '' : 'isMuted') + '"><td class="mono">' + i.id + '</td><td class="mono">roster_weekly</td><td>' + (i.source ? '<span class="mono">' + i.source + '</span>' : badge('drift', 'none', true)) + '</td></tr>'; }).join('') + '</tbody></table>' + callout('blocked', '<b style="color:var(--blocked-t)">409 <span class="mono">indicator_has_nonzero_weights</span></b><p style="margin-top:6px">An indicator carrying a non-zero weight cannot be deactivated. Zero the weight first, or supply a successor — retirement is a state change, never a hard delete.</p>') + '</div></div>';
  },
  wire: function () { }
};
ACTS['ind-show-inactive'] = function (el) { STATE.showInactiveInd = el.querySelector ? el.checked : !STATE.showInactiveInd; STATE.showInactiveInd = $('[data-act="ind-show-inactive"]').checked; render(); };
ACTS['ind-toggle'] = function (el) { var id = el.getAttribute('data-id'); var i = DB.indicators.find(function (x) { return x.id === id; }); if (i.active && (DB.baseline[i.id] || 0) > 0) { toast('409 indicator_has_nonzero_weights — zero its weight first.'); render(); return; } i.active = el.checked; audit('Indicator ' + (i.active ? 'activate' : 'deactivate'), i.name); render(); };
ACTS['ind-add'] = function () { var name = ($('#indName') || {}).value, code = ($('#indCode') || {}).value; if (!name || !code) { toast('Name and code are required.'); return; } DB.indicators.push({ id: code.toLowerCase(), code: code.toUpperCase(), name: name, ordinal: 40 + DB.indicators.length, unit: 'count', mapped: false, active: false, source: null, addedOn: new Date().toISOString().slice(0, 10) }); audit('Add indicator', name + ' (' + code + ') — seeded 0-weight rows'); toast('Added. Seeded a 0-weight row into every configuration.'); render(); };

SCREENS['/metrics'] = {
  render: function () {
    var casc = cascadeMetrics().length;
    var rows = DB.metrics.map(function (m) {
      var role = isCascadeActive(m) ? 'CASCADED' : (m.composite ? 'DERIVED_DISPLAY (composite)' : m.componentOf ? 'DERIVED_DISPLAY' : (m.active ? 'CASCADED' : 'inactive'));
      return '<tr class="' + (!m.active ? 'isMuted' : '') + '"' + (m.composite ? ' style="box-shadow:inset 2px 0 0 var(--derived)"' : '') + '><td class="mono">' + m.id + '</td><td>' + esc(m.name) + (m.componentOf ? ' <span class="mono pkDim" style="font-size:9.5px">component of ' + m.componentOf + '</span>' : '') + '</td><td>' + m.unit + (m.unit === '?' ? ' ' + badge('blocked', 'UNVERIFIED') : '') + '</td><td>' + badge(m.direction === 'HIGHER_IS_BETTER' ? 'proved' : 'drift', directionLabel(m.direction)) + '</td><td>' + badge(role.indexOf('CASCADED') === 0 ? 'verd' : 'derived', role, true) + '</td><td>' + (m.negative ? badge('solid', 'negative targets do occur') : m.active ? badge('proved', 'populated', true) : badge('drift', 'inactive', true)) + '</td><td>' + (m.policy ? '<span class="mono" style="font-size:10px">' + m.policy + '</span>' : '<span class="pkDim">—</span>') + '</td><td>' + (can('catalogueWrite') ? '<label style="display:flex;gap:5px;align-items:center;font-size:11px"><input type="checkbox" ' + (m.active ? 'checked' : '') + ' data-act="met-toggle" data-id="' + m.id + '"> active</label>' : (m.active ? 'active' : 'inactive')) + '</td><td class="pkDim" style="font-size:10.5px">' + (m.blockedOn ? '<span class="mono" style="color:var(--blocked-t)">' + m.blockedOn + '</span>' : '—') + '</td></tr>';
    }).join('');
    return '<h3 class="screenTitle">Metric Catalogue — ' + DB.metrics.length + ' rows, ' + casc + ' cascading</h3>' +
      '<p class="leadP">Every metric needs a <b>direction</b> (higher or lower is better — no default; someone must choose it) and a <b>rule for negative targets</b>. M4 (LEAP) and M5 are defined but inactive.</p>' +
      '<div class="pkPanel" style="overflow:auto"><table class="pkGrid"><thead><tr><th>metric_id</th><th>Name</th><th>unit</th><th>Direction</th><th>role</th><th>Source data</th><th>Negative-target policy</th><th>Toggle</th><th>Blocked on</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="grid2 mt-3"><div class="pkPanel p-3"><div class="pkEyebrow mb-2">Composition authority — M3 vs its three products</div><div class="pkSeg mb-2"><button class="' + (DB.compositeAuthority === 'composite' ? 'isOn' : '') + '" data-act="met-authority" data-v="composite">Composite authoritative</button><button class="' + (DB.compositeAuthority === 'components' ? 'isOn' : '') + '" data-act="met-authority" data-v="components">Components authoritative</button></div>' +
      callout('derived', DB.compositeAuthority === 'composite' ? '<b>M3</b> is cascaded to staff; its three parts are shown for information only.' : 'The three savings <b>products</b> are each cascaded separately; <b>M3</b> is the display total, a sum of already-exact figures.') + '</div>' +
      '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">The guard against double-counting</div>' + callout('blocked', '<b style="color:var(--blocked-t)">409 <span class="mono">composite_and_components_both_cascaded</span></b>') + '<p style="font-size:11px;margin-top:8px">Exactly one of {composite, component set} may be CASCADED (BR-COMPOSITE-METRIC-NO-DOUBLE-APPORTIONMENT). Re-checked at compute preflight, since config can drift after save.</p></div></div>';
  },
  wire: function () { }
};
ACTS['met-toggle'] = function (el) { var m = metricById(el.getAttribute('data-id')); m.active = el.checked; audit('Metric ' + (m.active ? 'activate' : 'deactivate'), m.name); computeRun(); render(); };
ACTS['met-authority'] = function (el) { DB.compositeAuthority = el.getAttribute('data-v'); audit('Composition authority', DB.compositeAuthority); computeRun(); if (STATE.results && !isCascadeActive(metricById(STATE.results.metric))) STATE.results.metric = 'M1'; render(); };

SCREENS['/branch-targets'] = {
  render: function () {
    var br = DB.byId[pickBranchForInspector()]; var side = sidesOf(br)[0];
    var t = DB.targets[br.id + '|' + side + '|M1'] || {};
    var annual = t.annual || 300;
    var weekly = DB.periods.map(function (p) { var raw = annual * (p.days / DB.totalDays); var rounded = roundHalfAwayFromZero(raw); return { week: p.week, label: p.label, days: p.days, start: p.start_date, raw: raw, rounded: rounded, residual: rounded - raw }; });
    var sumRaw = weekly.reduce(function (a, w) { return a + w.raw; }, 0), sumRounded = weekly.reduce(function (a, w) { return a + w.rounded; }, 0), resid = weekly.reduce(function (a, w) { return a + w.residual; }, 0);
    var tol = 0.01 * annual, within = Math.abs(sumRaw - annual) <= tol;
    var rows = weekly.map(function (w) { return '<tr><td class="mono">' + w.week + '</td><td style="font-size:11px">' + esc(w.label) + ' ' + (w.days < 7 ? badge('drift', w.days + 'd partial') : '<span class="mono pkDim" style="font-size:9.5px">' + w.days + 'd</span>') + '</td><td class="n mono" style="font-size:11px">' + w.raw.toFixed(4) + '</td><td class="n num" style="font-weight:500">' + w.rounded + '</td><td class="n num" style="color:var(--drift-t)">' + w.residual.toFixed(6) + '</td><td class="n">' + badge('proved', 'within 0.5') + '</td></tr>'; }).join('');
    return '<h3 class="screenTitle">Branch Targets — the supplied figure, the rounded figure, and the rounding difference</h3>' +
      '<p class="leadP">The weekly figure supplied is <b>not a whole number</b>. Staff targets are whole numbers, so they can never add up to it exactly. The group target is rounded <b>once, at import, half away from zero</b>, and the figure before rounding is kept.</p>' +
      callout('proved', '<b>Import verdict:</b> sheet accepted — all 60 “Week N (…)” columns matched (2nd block, balance metrics). A sheet with fewer than 60 is refused whole.') +
      '<div class="pkPanel p-3 mb-3" style="overflow:auto"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><div class="pkEyebrow">' + esc(br.name) + ' · ' + side + ' · M1 Good Loanee Increase</div>' + badge('solid', 'HALF_AWAY_FROM_ZERO') + '</div>' +
      '<table class="pkGrid"><thead><tr><th>wk</th><th>Fiscal week</th><th class="n">target_value_raw</th><th class="n">target_value</th><th class="n">rounding_residual</th><th class="n">rounding_ok</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="pkDim" style="font-size:10.5px;margin-top:8px">The first and last week of the year are 4-day partials; a Period may be 1–7 days, never required to be exactly 7 (split-week method — 60 weeks).</p></div>' +
      '<div class="grid2"><div class="pkPanel p-3"><div class="pkEyebrow mb-2">Rounding negatives the same way as positives was a deliberate choice</div><table class="pkGrid tight"><thead><tr><th>supplied</th><th class="n">half away from zero ' + badge('proved', 'in use') + '</th><th class="n">half up ' + badge('blocked', 'rejected') + '</th></tr></thead><tbody><tr><td class="mono">824.5</td><td class="n num">825</td><td class="n num">825</td></tr><tr><td class="mono">−824.5</td><td class="n num">(825)</td><td class="n num" style="color:var(--blocked-t)">(824)</td></tr></tbody></table><p class="pkDim" style="font-size:10.5px;margin-top:8px">Half up would shrink every negative Overdue target the same way, every cycle, forever.</p></div>' +
      '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">Weekly total checked against the annual target — warns, never blocks</div><div class="statGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">' +
      [['Annual target', fmtCount(annual), ''], ['Σ weekly (raw)', sumRaw.toFixed(3), 'the figure compared'], ['Σ weekly (rounded)', fmtCount(sumRounded), 'shown, not compared'], ['Rounding residual Σ', resid.toFixed(3), '60 × ≤0.5 = ≤30'], ['Difference (raw − annual)', (sumRaw - annual).toFixed(3), '']].map(function (c) { return '<div><div class="pkEyebrow" style="font-size:9px">' + c[0] + '</div><div class="num" style="font-size:16px;font-weight:500">' + c[1] + '</div><div class="pkDim" style="font-size:9px">' + c[2] + '</div></div>'; }).join('') + '</div>' +
      '<div style="margin-top:8px">' + proof(within ? 'proved' : 'unproved', '<span style="color:' + (within ? 'var(--proved)' : 'var(--drift)') + '">' + (within ? 'Reconciled' : 'Drift warning') + '</span><span class="pkDim">tolerance <span class="num">' + tol.toFixed(3) + '</span> · 1% of annual</span>') + '</div></div></div>';
  },
  wire: function () { }
};

SCREENS['/legend'] = {
  render: function () {
    var HUES = [['--proved', 'Proved', 'The staff targets add up to the group target exactly. Shown as a double line.'], ['--drift', 'Drift', 'Totals outside tolerance, weights renormalised, or a setting that can never apply. It warns; it never blocks.'], ['--blocked', 'Blocked', 'A Program-Check Mismatch, a total that does not add up, or a fault affecting a whole import batch.'], ['--derived', 'Derived', 'Figures the system worked out itself (input_state = DERIVED), plus display-only combined figures.'], ['--verdigris-500', 'Selected / active scope', 'What you clicked vs what you are looking at — different colours.'], ['--azure-500', 'Primary action', 'Compute, Save, links.']];
    var PROOF = [['proved', 'Proved', 'A double line. The staff targets add up to the group target, exactly.'], ['unproved', 'Unproved / drift', 'A single line in the drift colour, with the exact difference at its right-hand end.'], ['stale', 'Stale-Computed', 'The inputs changed since this run computed. A Finalised run never shows it.'], ['finalised', 'Finalised', 'The double line is ruled off — nothing further can be added.']];
    var DOMAIN = [['Zero, deliberate', 'A deliberate zero — this metric is not used here. A real value, not a blank.'], ['Unset', 'No row stored at all. Compute cannot run until it is set.'], ['Renormalised out', 'A weight was set, but its group denominator is zero. The set weight is struck through and the weight actually used is shown.'], ['Excluded (Program-Check)', 'The row is written and flagged, but left out of the add-up check.'], ['Excluded — indicator not supplied', 'Applies to one metric at a time. Flagged, never replaced with a 0.'], ['Shown to staff ≠ given to staff', 'The negative-target policy lifted a figure up to zero. Both figures are always shown together.']];
    var OUTCOME = [['NODE_SCOPED', 'Custom'], ['NODE_UNSCOPED', 'Custom'], ['INHERITED_SCOPED', 'Inherited'], ['INHERITED_UNSCOPED', 'Inherited'], ['GLOBAL_SCOPED', 'Default (unreachable — by design)'], ['GLOBAL_UNSCOPED', 'Default (every unconfigured metric)']];
    return '<h3 class="screenTitle">States and legend — what every colour, mark and state means</h3>' +
      '<div class="grid3"><div class="pkPanel p-3"><div class="pkEyebrow mb-2">What each colour means</div>' + HUES.map(function (h) { return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--rule-weak)"><span style="width:14px;height:14px;border-radius:3px;flex:none;margin-top:2px;background:var(' + h[0] + ')"></span><div><div style="font-size:11.5px;font-weight:500">' + h[1] + '</div><div class="pkDim" style="font-size:10px">' + h[2] + '</div></div></div>'; }).join('') + '</div>' +
      '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">The line that shows whether a total adds up</div>' + PROOF.map(function (p) { return '<div style="padding:6px 0;border-bottom:1px solid var(--rule-weak)"><div style="font-size:11.5px;font-weight:500">' + p[1] + '</div><div style="max-width:160px;margin:4px 0">' + proof(p[0], null) + '</div><div class="pkDim" style="font-size:10px">' + p[2] + '</div></div>'; }).join('') + '</div>' +
      '<div class="pkPanel p-3"><div class="pkEyebrow mb-2">States specific to this system</div><table class="pkGrid tight"><tbody>' + DOMAIN.map(function (d) { return '<tr><td style="width:120px;font-weight:500">' + d[0] + '</td><td class="pkDim">' + d[1] + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="pkPanel p-3 mt-3"><div class="pkEyebrow mb-2"><span class="mono">resolution_outcome</span> — all six values</div><table class="pkGrid tight"><thead><tr><th>resolution_outcome</th><th>resolved_mode</th></tr></thead><tbody>' + OUTCOME.map(function (o) { return '<tr><td class="mono">' + o[0] + '</td><td>' + o[1] + '</td></tr>'; }).join('') + '</tbody></table></div>';
  },
  wire: function () { }
};

/* ---- Guided tour ---------------------------------------------------------- */
var TOUR = [
  { route: '/run-lifecycle', sel: '#roleSwitch', title: '1 · Who is signed in', body: 'Swap the demo user here. Admin and Auditor see the whole hierarchy; Planning Analyst and Reviewer are scoped to their own subtree, and actions (compute, weight edit) are gated by role.' },
  { route: '/run-lifecycle', sel: '.rail', title: '2 · The org hierarchy', body: 'Division → Region → Area → Branch. Select a branch to scope the Weight Matrix and Branch Targets. United branches hold one combined bucket; Split branches have PME and PMF sides.' },
  { route: '/roster-import', sel: '#rosterUpload', title: '3 · Roster import', body: 'Upload (or load the sample). Validation is binding and zero-write: it reports exactly what commit will do, with the real error codes — leading-zero anomalies, duplicates, both-sides postings.' },
  { route: '/target-import', sel: '#targetUpload', title: '4 · Target import', body: 'One workbook writes all 60 fiscal weeks (split-week calendar). Each sheet must yield exactly 60 “Week N” columns or the whole sheet is refused; try the broken variant.' },
  { route: '/weight-matrix', sel: '.wm', title: '5 · Weight matrix', body: 'Indicators × metrics; each column sums to exactly 1.000000. The precedence ladder on the right shows which level supplied each weight (Custom / Inherited / Default).' },
  { route: '/run-lifecycle', sel: '#computePanel', title: '6 · Compute', body: 'Draft → Computed. The engine divides each branch target across its staff — Largest-Remainder Method, floor toward −∞, deterministic tie-break. Every group foots exactly (see the self-test in the footer).' },
  { route: '/results', sel: '.pkGrid', title: '7 · Results', body: 'Per-staff targets, filterable by metric and hierarchy. Final vs Published — a negative target on a higher-is-better metric is floored to 0 and labelled Maintain.' },
  { route: '/staff-audit', sel: '.pkSpine', title: '8 · Staff audit', body: 'The signature screen: all eight derivation steps for one staff member, closed by the exact-sum proof rule, with the deliberate floor-vs-ROUNDDOWN disclosure.' },
  { route: '/rollups', sel: '.summaryStrip', title: '9 · Rollups', body: 'The staff targets added back up, branch → organisation. The one question: does “Given to staff” equal the branch target? Drill in only where it flags attention.' },
  { route: '/reconciliation', sel: '.cardGrid', title: '10 · Reconciliation & finalise', body: 'The negative-target alert must be acknowledged before Finalise — acknowledge it here, then finalise the run on Run Lifecycle. That is the whole weekly loop.' }
];
function renderTour() {
  var old = $('#tourPanel'); if (old) old.remove();
  document.querySelectorAll('.tourHighlight').forEach(function (e) { e.classList.remove('tourHighlight'); });
  if (!STATE.tour.open) return;
  var step = TOUR[STATE.tour.step];
  var panel = document.createElement('div'); panel.className = 'tourPanel'; panel.id = 'tourPanel';
  panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><h4>Guided tour</h4><button class="pkBtn pkBtnXs" data-act="tour-close">✕</button></div>' +
    '<div class="tourBody"><b>' + esc(step.title) + '</b><br>' + esc(step.body) + '</div>' +
    '<div class="tourNav"><button class="pkBtn pkBtnXs" data-act="tour-prev"' + (STATE.tour.step === 0 ? ' disabled' : '') + '>← Back</button>' +
    '<div class="tourDots">' + TOUR.map(function (_, i) { return '<span class="tourDot' + (i === STATE.tour.step ? ' on' : '') + '"></span>'; }).join('') + '</div><div class="spacer"></div>' +
    (STATE.tour.step === TOUR.length - 1 ? '<button class="pkBtn pkBtnPrimary pkBtnXs" data-act="tour-close">Finish</button>' : '<button class="pkBtn pkBtnPrimary pkBtnXs" data-act="tour-next">Next →</button>') + '</div>';
  document.body.appendChild(panel);
  setTimeout(function () { var t = document.querySelector(step.sel); if (t) { t.classList.add('tourHighlight'); try { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { } } }, 60);
}
ACTS['tour-close'] = function () { STATE.tour.open = false; renderTour(); render(); };
ACTS['tour-next'] = function () { STATE.tour.step = Math.min(TOUR.length - 1, STATE.tour.step + 1); goTour(); };
ACTS['tour-prev'] = function () { STATE.tour.step = Math.max(0, STATE.tour.step - 1); goTour(); };
function goTour() { var step = TOUR[STATE.tour.step]; if (currentRoute() !== step.route) { navigate(step.route); } else { render(); } }

/* ---- Overview (landing) --------------------------------------------------- */
SCREENS['/overview'] = {
  render: function () {
    var r = DB.results, st = r.selftest;
    var computed = {}; r.groups.forEach(function (g) { if (!g.error) g.rows.forEach(function (x) { computed[x.staff_id] = 1; }); });
    var a17 = Object.keys(r.staffTargets).map(function (k) { return r.staffTargets[k]; }).filter(function (x) { return x.exclusionReason === 'MISSING_INDICATOR_VALUE'; }).length;
    var neg = r.negativeSummary; var renorm = r.groups.filter(function (g) { return !g.error && g.renormalised; }).length;
    var okProof = st.ok === st.total;

    var flow = [['1', 'Upload staff roster', 'who is where, and their portfolio', '/roster-import'], ['2', 'Load branch targets', 'what each branch must achieve', '/target-import'], ['3', 'Compute', 'divide each branch target across its staff', '/run-lifecycle'], ['4', 'Finalise', 'freeze it — gated & irreversible', '/run-lifecycle'], ['5', 'Export', 'two workbooks for the portal', '/run-lifecycle']];
    var quick = [['/weight-matrix', 'Weight Matrix', 'How the division is weighted — with a live precedence ladder.', 'verd'], ['/run-lifecycle', 'Run Lifecycle', 'Draft → Computed → Finalised, with the finalise gate.', 'azure'], ['/results', 'Results', 'Per-staff targets for any branch, filterable.', 'azure'], ['/staff-audit', 'Staff Audit', 'Every step behind one target — proven against the group.', 'derived'], ['/rollups', 'Rollups', 'Do the staff targets still add up to the branch target?', 'proved'], ['/reconciliation', 'Reconciliation', 'Exceptions this week + the configuration sweep.', 'drift']];

    var hero = '<div class="heroPanel pkRise">' +
      '<div class="pkEyebrow">PMUK · Field-Staff Target-Setting</div>' +
      '<h2 class="heroTitle">One branch target, divided fairly across its field staff — and provable to the last taka.</h2>' +
      '<p class="heroSub">Each week the system takes a target for every branch and splits it across that branch’s officers, weighted by their own portfolio. Every figure is reproducible, and the staff targets always add up to the branch target exactly. This is a faithful, offline simulation of the real product — with invented data.</p>' +
      '<div class="heroCta"><button class="pkBtn pkBtnPrimary" data-act="tour-open">▶ Start the 10-step guided tour</button>' +
      '<a class="pkBtn" href="#/run-lifecycle">Go to this week’s run</a>' +
      '<a class="pkBtn" href="#/staff-audit">See a target proven →</a></div>' +
      '</div>';

    var kpis = '<div class="summaryStrip pkRise" style="animation-delay:40ms">' +
      summaryCard('Branches', branches().length.toLocaleString(LOC), branches().filter(function (b) { return b.program === 'Split'; }).length + ' Split · rest United/PME') +
      summaryCard('Field staff', Object.keys(computed).length.toLocaleString(LOC), 'targeted this run') +
      summaryCard('Cascade-active metrics', cascadeMetrics().length + ' of ' + DB.metrics.length, 'M4 LEAP + M5 defined, inactive') +
      summaryCard('Exact-sum proof', st.ok + '/' + st.total, okProof ? 'every group foots exactly' : 'CHECK FAILED') +
      '</div>';

    var signals = '<div class="cardGrid pkRise" style="animation-delay:80ms">' +
      miniSignal('Run state', STATE.run.state, STATE.run.state === 'Finalised' ? 'proved' : 'azure', 'Week ' + STATE.week) +
      miniSignal('Negative-target alerts', neg ? neg.occurrenceCount : 0, neg ? 'drift' : 'proved', neg ? 'higher-is-better, worst ' + neg.worstValue + ' · must be acknowledged' : 'none this week') +
      miniSignal('Staff excluded (A17)', a17, a17 ? 'drift' : 'proved', 'missing a weighted indicator — flagged, never zeroed') +
      miniSignal('Renormalised groups (A8)', renorm, renorm ? 'drift' : 'proved', 'zero-history indicator — weight rescaled, disclosed') +
      '</div>';

    var week = '<div class="pkPanel p-3 pkRise" style="animation-delay:120ms;margin-bottom:12px"><div class="pkEyebrow mb-2">The shape of a week</div><div class="flowRow">' +
      flow.map(function (f, i) { return (i ? '<span class="flowArrow">→</span>' : '') + '<a class="flowStep" href="#' + f[3] + '"><span class="flowNum">' + f[0] + '</span><span class="flowLbl">' + esc(f[1]) + '</span><span class="flowDesc">' + esc(f[2]) + '</span></a>'; }).join('') +
      '</div><p class="pkDim" style="font-size:10.5px;margin:8px 0 0">Steps 1–2 are independent; both must be done before Compute.</p></div>';

    var DOTC = { verd: '--verdigris-500', azure: '--azure-500', derived: '--derived', proved: '--proved', drift: '--drift' };
    var explore = '<div class="pkEyebrow mb-2 pkRise" style="animation-delay:150ms">Explore the system</div><div class="quickGrid pkRise" style="animation-delay:160ms">' +
      quick.map(function (q) { return '<a class="quickCard" href="#' + q[0] + '"><span class="quickDot" style="background:var(' + (DOTC[q[3]] || '--azure-500') + ')" aria-hidden="true"></span><span class="quickTitle">' + esc(q[1]) + '</span><span class="quickDesc">' + esc(q[2]) + '</span></a>'; }).join('') + '</div>';

    return hero + kpis + signals + week + explore +
      '<p class="pkDim pkRise" style="animation-delay:200ms;font-size:10.5px;margin-top:14px;max-width:100ch">You are signed in as <b>' + esc(STATE.user.displayName) + '</b> (' + esc(ROLE_LABEL[STATE.user.roles[0]]) + '). Swap roles in the header to see how scope and available actions change — an Administrator sees the whole hierarchy; a Planning Analyst or Reviewer is scoped to their own subtree.</p>';
  },
  wire: function () { }
};
function miniSignal(label, value, hue, note) {
  return '<div class="pkPanel p-3" style="display:flex;flex-direction:column;gap:2px"><div class="pkEyebrow">' + esc(label) + '</div><div style="display:flex;align-items:center;gap:8px;margin-top:2px"><span style="font-size:22px;font-weight:500" class="num">' + esc(String(value)) + '</span>' + badge(hue, hue === 'proved' ? 'clear' : hue === 'drift' ? 'attention' : 'live', true) + '</div><div class="pkDim" style="font-size:10px;line-height:1.4">' + esc(note) + '</div></div>';
}

/* ---- BOOT ----------------------------------------------------------------- */
function boot() {
  try { var t = localStorage.getItem('pmuk.replica.theme'); if (t) STATE.theme = t; } catch (e) { }
  applyTheme(STATE.theme);
  generateAll(); initScopes();
  audit('System', 'Replica booted — seeded dummy data generated, run computed');
  /* self-test to console */
  var st = DB.results.selftest;
  if (window.console) console.log('[PMUK replica] self-test — exact-sum invariant on ' + st.ok + '/' + st.total + ' groups: ' + (st.ok === st.total ? 'PASSED' : 'FAILED'));
  render();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

/* @@APPEND@@ */
})();
