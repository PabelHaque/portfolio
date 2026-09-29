/* ══════════════════════════════════════════════════════════════════════════════
   MFS Registration Portal — demo replica logic
   ALL DATA IN THIS FILE IS INVENTED. No real staff, branch, account, wallet or
   NID value from the production system appears here.
   Business rules, state names and formulas are copied from the real code and
   cited with their source path in comments.
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── Seeded PRNG so the dataset is identical on every reload ───────────────── */
let _s = 20260929;
const rnd = () => { _s = (_s * 1664525 + 1013904223) >>> 0; return _s / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pad = (n, w) => String(n).padStart(w, '0');

/* ── Business rules — copied verbatim from source ──────────────────────────── */
const RULES = {
  // providers/models.py → Provider.wallet_number_pattern
  WALLET_RE: /^01[3-9]\d{8}$/,
  // accounts/models.py → mobile validation
  MOBILE_RE: /^(?:\+?88)?01[3-9]\d{8}$/,
  // registrations/views.py → routing number validation (9 digits, digits only)
  ROUTING_RE: /^\d{9}$/,
  // registrations/views.py → org name check is a case-insensitive substring test
  ORG_NAME: 'padakhep manabik unnayan kendra',
  // providers/services/* → shop name is prefixed unless already prefixed
  shopName: b => (b.toLowerCase().startsWith('padakhep') ? b : 'Padakhep-' + b),
  // providers/views.py → when exactly one submission is selected SL renders as '01'
  slFor: (idx, total) => (total === 1 ? '01' : pad(idx + 1, 2)),
};

/* ── 13-state workflow — registrations/models.py RegistrationSubmission.Status ── */
const STATES = {
  DRAFT:                          { en:'Draft',                          bn:'খসড়া',                              cls:'draft',      at:'Branch User' },
  SUBMITTED_BY_BRANCH:            { en:'Submitted by Branch',            bn:'শাখা কর্তৃক Submit করা হয়েছে',      cls:'submitted',  at:'Regional Finance & Accounts Admin' },
  RETURNED_BY_REGION:             { en:'Returned for Correction',        bn:'সংশোধনের জন্য ফেরত দেওয়া হয়েছে',   cls:'correction', at:'Branch User' },
  VERIFIED_BY_REGION:             { en:'Verified by Region',             bn:'অঞ্চল কর্তৃক Verify করা হয়েছে',     cls:'verified',   at:'Head Office Finance / System Admin' },
  SENT_TO_HO:                     { en:'Sent to Head Office',            bn:'প্রধান কার্যালয়ে প্রেরিত',            cls:'ho',         at:'HO Finance Officer' },
  HO_REVIEWED:                    { en:'Reviewed by Head Office',        bn:'প্রধান কার্যালয় কর্তৃক পর্যালোচিত',   cls:'ready',      at:'System Admin — Pre-Registration Check' },
  RETURNED_BY_HO:                 { en:'Returned by Head Office',        bn:'প্রধান কার্যালয় কর্তৃক ফেরত',        cls:'correction', at:'Branch User' },
  REJECTED:                       { en:'Rejected',                       bn:'বাতিল করা হয়েছে',                   cls:'rejected',   at:'Closed — Rejected' },
  PENDING_PRE_REGISTRATION_CHECK: { en:'Pending Pre-Registration Check', bn:'প্রি-রেজিস্ট্রেশন যাচাই অপেক্ষমাণ',  cls:'ho',         at:'System Admin — Pre-Registration Check' },
  PRE_REGISTRATION_ISSUE_FOUND:   { en:'Pre-Registration Issue Found',   bn:'প্রি-রেজিস্ট্রেশন সমস্যা পাওয়া গেছে', cls:'correction', at:'Head Office / System Admin' },
  READY_FOR_OUTPUT:               { en:'Ready for Output',               bn:'আউটপুটের জন্য প্রস্তুত',             cls:'ready',      at:'System Admin / Output Generation' },
  OUTPUT_GENERATED:               { en:'Output Generated',               bn:'আউটপুট তৈরি হয়েছে',                 cls:'generated',  at:'Completed' },
  ADMIN_BYPASS_READY_FOR_OUTPUT:  { en:'Admin Bypass — Ready for Output',bn:'অ্যাডমিন বাইপাস — আউটপুট প্রস্তুত',  cls:'bypass',     at:'System Admin / Output Generation (Bypass)' },
};

/* Happy-path order used to render the timeline strip */
const FLOW = ['DRAFT','SUBMITTED_BY_BRANCH','VERIFIED_BY_REGION','SENT_TO_HO','HO_REVIEWED',
              'PENDING_PRE_REGISTRATION_CHECK','READY_FOR_OUTPUT','OUTPUT_GENERATED'];
const TL_LABEL = { DRAFT:'Draft', SUBMITTED_BY_BRANCH:'Submitted', VERIFIED_BY_REGION:'Region verified',
  SENT_TO_HO:'Sent to HO', HO_REVIEWED:'HO reviewed', PENDING_PRE_REGISTRATION_CHECK:'Pre-registration check',
  READY_FOR_OUTPUT:'Ready for output', OUTPUT_GENERATED:'Output generated' };

/* ── Allowed transitions per role — registrations/views.py region and ho views ── */
const ACTIONS = {
  REGION_ADMIN: {
    SUBMITTED_BY_BRANCH: [
      { to:'VERIFIED_BY_REGION',  label:'Verify',               bn:'Verify করুন',                cls:'btn-success', icon:'check-circle',      reason:false },
      { to:'SENT_TO_HO',          label:'Send to Head Office',  bn:'প্রধান কার্যালয়ে পাঠান',      cls:'btn-primary', icon:'send',              reason:false },
      { to:'RETURNED_BY_REGION',  label:'Return for Correction',bn:'সংশোধনের জন্য ফেরত পাঠান',  cls:'btn-warning', icon:'arrow-counterclockwise', reason:true },
      { to:'REJECTED',            label:'Reject',               bn:'বাতিল করুন',                 cls:'btn-danger',  icon:'x-circle',          reason:true },
    ],
  },
  HO_FINANCE: {
    SENT_TO_HO: [
      { to:'HO_REVIEWED',    label:'Mark as HO Reviewed', bn:'HO পর্যালোচিত হিসেবে চিহ্নিত করুন', cls:'btn-success', icon:'check2-circle', reason:false },
      { to:'RETURNED_BY_HO', label:'Return to Region',    bn:'অঞ্চলে ফেরত পাঠান',                cls:'btn-warning', icon:'arrow-counterclockwise', reason:true },
      { to:'REJECTED',       label:'Reject',              bn:'বাতিল করুন',                       cls:'btn-danger',  icon:'x-circle', reason:true },
    ],
  },
  SYSTEM_ADMIN: {
    VERIFIED_BY_REGION:             [{ to:'PENDING_PRE_REGISTRATION_CHECK', label:'Queue Pre-Registration Check', bn:'প্রি-রেজিস্ট্রেশন যাচাইয়ে পাঠান', cls:'btn-primary', icon:'search',        reason:false }],
    HO_REVIEWED:                    [{ to:'PENDING_PRE_REGISTRATION_CHECK', label:'Queue Pre-Registration Check', bn:'প্রি-রেজিস্ট্রেশন যাচাইয়ে পাঠান', cls:'btn-primary', icon:'search',        reason:false }],
    PENDING_PRE_REGISTRATION_CHECK: [
      { to:'READY_FOR_OUTPUT',             label:'Mark Clear (both providers)', bn:'ক্লিয়ার চিহ্নিত করুন', cls:'btn-success', icon:'shield-check', reason:false },
      { to:'PRE_REGISTRATION_ISSUE_FOUND', label:'Flag Issue',                  bn:'সমস্যা চিহ্নিত করুন',  cls:'btn-danger',  icon:'exclamation-octagon', reason:true },
    ],
    PRE_REGISTRATION_ISSUE_FOUND:   [{ to:'PENDING_PRE_REGISTRATION_CHECK', label:'Requeue Check', bn:'পুনরায় যাচাই', cls:'btn-secondary', icon:'arrow-repeat', reason:true }],
  },
};
/* Admin bypass is available from any non-final state — registrations/views.py admin_bypass */
const BYPASS_BLOCKED = ['DRAFT','OUTPUT_GENERATED','REJECTED','ADMIN_BYPASS_READY_FOR_OUTPUT'];

/* Return reasons — registrations/views.py return reason list */
const RETURN_REASONS = [
  'Account name does not match the cheque',
  'Account number incomplete or leading zeros dropped',
  'Cheque image unreadable',
  'Routing number is not 9 digits',
  'Bank branch name missing',
  'Wallet number already registered to another branch',
  'Branch address incomplete',
  'Contact person details missing',
  'Other (see note)',
];

/* ── Invented hierarchy: 4 divisions × 3 regions × 2 areas × 3 branches ────── */
const DIVISIONS = ['Uttarpath','Dakshinpath','Purbachal','Pashchimghat'];
const REGION_MAP = {
  Uttarpath:    ['Shonadanga Region','Nilkamal Region','Haldighat Region'],
  Dakshinpath:  ['Meghdubi Region','Chandratala Region','Rupganj Region'],
  Purbachal:    ['Alokpur Region','Bilashpur Region','Srijoni Region'],
  Pashchimghat: ['Tarakuli Region','Kushumpur Region','Baniyachar Region'],
};
const AREA_MAP = {
  'Shonadanga Region':['Shonadanga Sadar Area','Kolatia Area'], 'Nilkamal Region':['Nilkamal Area','Debipur Area'],
  'Haldighat Region':['Haldighat Area','Morolganj Area'],       'Meghdubi Region':['Meghdubi Sadar Area','Jhilpar Area'],
  'Chandratala Region':['Chandratala Area','Beltoli Area'],      'Rupganj Region':['Rupganj Sadar Area','Kanchanpur Area'],
  'Alokpur Region':['Alokpur Sadar Area','Shimulia Area'],       'Bilashpur Region':['Bilashpur Area','Nayanpur Area'],
  'Srijoni Region':['Srijoni Area','Padmabil Area'],             'Tarakuli Region':['Tarakuli Sadar Area','Gopalhat Area'],
  'Kushumpur Region':['Kushumpur Area','Bakultala Area'],        'Baniyachar Region':['Baniyachar Area','Rangadhona Area'],
};
const BRANCH_STEMS = ['Shimulbari','Kanthalia','Betagi','Joypara','Amtali','Sonargram','Bakultola','Nimtola',
  'Pipulbaria','Chandanpur','Doyarpar','Shaplabil','Godhulibazar','Titashpar','Bishnupara','Kadamtoli',
  'Nabinpara','Jolshiri','Dharmapasha','Ranirchar','Bagerhat Para','Kismatpur','Tulsighat','Mahishgram'];
const BANKS = ['Pubali Bank PLC','Agrani Bank PLC','Janata Bank PLC','Sonali Bank PLC','Rupali Bank PLC',
  'IFIC Bank PLC','Dutch-Bangla Bank PLC','Islami Bank Bangladesh PLC','City Bank PLC','BRAC Bank PLC'];
const FIRST = ['Habibur','Shahnaz','Moniruzzaman','Rehana','Golam','Sultana','Abdus','Nurjahan','Tanvir',
  'Shirin','Mokbul','Roksana','Jashim','Ferdousi','Anwarul','Momtaz','Delwar','Sakhina','Mizanur','Rabeya'];
const LAST = ['Rahman','Parvin','Sarkar','Bhuiyan','Talukder','Chowdhury','Mondol','Sikder','Molla','Pramanik',
  'Howlader','Biswas','Majumder','Gazi','Khandaker'];
const person = () => pick(FIRST) + ' ' + pick(LAST);

/* Invented wallet/mobile numbers — pass RULES.WALLET_RE but obviously patterned */
let _wal = 0;
const walletNo = () => '0191' + pad(1000000 + (++_wal) * 7, 7);
let _mob = 0;
const mobileNo = () => '0175' + pad(2000000 + (++_mob) * 13, 7);
/* Invented NID — 10-digit legacy format, obviously patterned */
let _nid = 0;
const nidNo = () => '19' + pad(90000000 + (++_nid) * 41, 8);
/* Invented account numbers — obviously patterned, keeps leading zeros */
let _acc = 0;
const accountNo = () => pad(11000000000 + (++_acc) * 1111, 13);
const routingNo = () => pad(int(100, 299), 3) + pad(int(100, 999), 3) + pad(int(100, 999), 3);
const dateStr = (m, d) => `2026-${pad(m, 2)}-${pad(d, 2)}`;

/* ── Build the hierarchy tree ─────────────────────────────────────────────── */
const BRANCHES = [];
let _bn = 0, _stem = 0;
DIVISIONS.forEach(div => REGION_MAP[div].forEach(reg => AREA_MAP[reg].forEach(area => {
  for (let k = 0; k < 3; k++) {
    const stem = BRANCH_STEMS[(_stem++) % BRANCH_STEMS.length];
    const n = ++_bn;
    BRANCHES.push({
      id: n, division: div, region: reg, area,
      name: `${stem} Branch`,
      code: `${pad(100 + n, 3)}-${pad(int(1, 12), 2)}-${2004 + (n % 19)}`,
      address: `${stem} Bazar, ${area.replace(' Area','')}, ${reg.replace(' Region','')}`,
      district: reg.replace(' Region',''),
      thana: `${stem} Sadar`,
      officers: Array.from({ length: int(4, 6) }, () => ({ name: person(), mobile: mobileNo() })),
    });
  }
})));

/* Programme is derived from hierarchy naming in the real system
   (registrations/views.py select_program). Here it is assigned deterministically. */
const PROGRAMS = ['PME','PMF','GENERAL'];
const programFor = i => PROGRAMS[i % 7 === 0 ? 0 : i % 5 === 0 ? 1 : 2];

/* ── Generate submissions across all 13 states ────────────────────────────── */
const STATE_MIX = [
  'DRAFT','DRAFT','DRAFT',
  'SUBMITTED_BY_BRANCH','SUBMITTED_BY_BRANCH','SUBMITTED_BY_BRANCH','SUBMITTED_BY_BRANCH','SUBMITTED_BY_BRANCH',
  'RETURNED_BY_REGION','RETURNED_BY_REGION',
  'VERIFIED_BY_REGION','VERIFIED_BY_REGION','VERIFIED_BY_REGION',
  'SENT_TO_HO','SENT_TO_HO','SENT_TO_HO','SENT_TO_HO',
  'HO_REVIEWED','HO_REVIEWED',
  'RETURNED_BY_HO',
  'REJECTED','REJECTED',
  'PENDING_PRE_REGISTRATION_CHECK','PENDING_PRE_REGISTRATION_CHECK','PENDING_PRE_REGISTRATION_CHECK',
  'PRE_REGISTRATION_ISSUE_FOUND','PRE_REGISTRATION_ISSUE_FOUND',
  'READY_FOR_OUTPUT','READY_FOR_OUTPUT','READY_FOR_OUTPUT','READY_FOR_OUTPUT','READY_FOR_OUTPUT','READY_FOR_OUTPUT',
  'OUTPUT_GENERATED','OUTPUT_GENERATED','OUTPUT_GENERATED','OUTPUT_GENERATED','OUTPUT_GENERATED',
  'ADMIN_BYPASS_READY_FOR_OUTPUT','ADMIN_BYPASS_READY_FOR_OUTPUT',
];

function buildSubmissions() {
  const out = [];
  STATE_MIX.forEach((status, i) => {
    const br = BRANCHES[i % BRANCHES.length];
    const prog = programFor(i);
    const prov = i % 2 === 0 ? 'bkash' : 'nagad';
    const created = dateStr(int(4, 8), int(1, 28));
    const wallet = walletNo();
    /* name mismatch flag — registrations/views.py registration_submit_final
       triggers when account_name does not contain the org name (case-insensitive) */
    const mismatch = (i === 8 || i === 25);
    const accName = mismatch ? `${br.name.split(' ')[0]} Samity Fund` : 'Padakhep Manabik Unnayan Kendra';
    const s = {
      id: i + 1,
      sl: pad(i + 1, 2),
      program: prog,
      division: br.division, region: br.region, area: br.area,
      branch_name: br.name, branch_code: br.code, branch_id: br.id,
      short_code: wallet,
      shop_name: RULES.shopName(br.name.replace(' Branch','')),
      branch_address: br.address,
      police_station: br.thana,
      district: br.district,
      email_address: `${br.code.split('-')[0]}@padakhep.example`,
      account_name: accName,
      account_number: accountNo(),
      bank_name: pick(BANKS),
      bank_branch_name: `${br.name.replace(' Branch','')} Branch`,
      bank_branch_routing_number: routingNo(),
      wallet_number: wallet,
      mfs_mobile_number: wallet,
      mfs_provider: prov,
      contact_person_name: br.officers[0].name,
      contact_person_designation: 'Branch Manager',
      contact_mobile_number: br.officers[0].mobile,
      status,
      created_at: created,
      submitted_at: status === 'DRAFT' ? null : dateStr(int(5, 9), int(1, 28)),
      cheque_image: status === 'DRAFT' && i % 3 === 0 ? null : 'cheque_placeholder.png',
      bank_certificate: i % 4 === 0 ? 'bank_certificate.pdf' : null,
      nid_copy: i % 3 === 0 ? 'nid_copy.pdf' : null,
      authorization_letter: i % 5 === 0 ? 'authorization.pdf' : null,
      name_mismatch_flag: mismatch,
      name_mismatch_value: mismatch ? accName : '',
      bypass_enabled: status === 'ADMIN_BYPASS_READY_FOR_OUTPUT',
      bypass_reason: status === 'ADMIN_BYPASS_READY_FOR_OUTPUT'
        ? 'Provider confirmed by phone; written reply pending. Approved by Finance Director.' : '',
      pre_reg: null,
      confirmation: null,
      comments: [],
    };
    /* Pre-registration result — BR-004-02: both providers must be CLEAR to pass
       (providers/views.py pre_registration_upload) */
    if (['PENDING_PRE_REGISTRATION_CHECK','PRE_REGISTRATION_ISSUE_FOUND','READY_FOR_OUTPUT','OUTPUT_GENERATED'].includes(status)) {
      const issue = status === 'PRE_REGISTRATION_ISSUE_FOUND';
      s.pre_reg = {
        sent_at: dateStr(8, int(1, 20)),
        bkash_status: issue && i % 2 === 0 ? 'EXISTS' : 'CLEAR',
        nagad_status: issue && i % 2 !== 0 ? 'EXISTS' : 'CLEAR',
        bkash_remarks: issue && i % 2 === 0 ? 'Wallet already active under another merchant code' : '',
        nagad_remarks: issue && i % 2 !== 0 ? 'Number found in existing merchant list' : '',
        reply_uploaded_at: status === 'PENDING_PRE_REGISTRATION_CHECK' ? null : dateStr(8, int(21, 28)),
      };
    }
    if (status === 'OUTPUT_GENERATED') {
      s.confirmation = {
        bkash_confirmed_on: i % 3 === 0 ? dateStr(9, int(1, 15)) : null,
        nagad_confirmed_on: i % 4 === 0 ? dateStr(9, int(5, 20)) : null,
      };
    }
    /* Comment / status-history thread */
    if (status !== 'DRAFT') {
      s.comments.push({ role:'BRANCH_USER', by: br.officers[0].name, staff_id:'BR-' + pad(br.id, 4),
        prev:'DRAFT', next:'SUBMITTED_BY_BRANCH', text:'Submitted with cheque copy attached.', at: s.submitted_at });
    }
    if (['RETURNED_BY_REGION'].includes(status)) {
      s.comments.push({ role:'REGION_ADMIN', by: person(), staff_id:'RG-' + pad(int(100, 999), 4),
        prev:'SUBMITTED_BY_BRANCH', next:'RETURNED_BY_REGION', text: RETURN_REASONS[0], at: dateStr(8, int(1, 20)) });
    }
    if (['VERIFIED_BY_REGION','SENT_TO_HO','HO_REVIEWED','PENDING_PRE_REGISTRATION_CHECK',
         'PRE_REGISTRATION_ISSUE_FOUND','READY_FOR_OUTPUT','OUTPUT_GENERATED'].includes(status)) {
      s.comments.push({ role:'REGION_ADMIN', by: person(), staff_id:'RG-' + pad(int(100, 999), 4),
        prev:'SUBMITTED_BY_BRANCH', next:'VERIFIED_BY_REGION', text:'Cheque and account name cross-checked. Verified.', at: dateStr(8, int(2, 22)) });
    }
    if (['HO_REVIEWED','PENDING_PRE_REGISTRATION_CHECK','READY_FOR_OUTPUT','OUTPUT_GENERATED'].includes(status) && i % 2 === 0) {
      s.comments.push({ role:'HO_FINANCE', by: person(), staff_id:'HO-' + pad(int(10, 99), 4),
        prev:'SENT_TO_HO', next:'HO_REVIEWED', text:'Bank details reconciled against branch ledger.', at: dateStr(8, int(20, 28)) });
    }
    if (status === 'REJECTED') {
      s.comments.push({ role:'REGION_ADMIN', by: person(), staff_id:'RG-' + pad(int(100, 999), 4),
        prev:'SUBMITTED_BY_BRANCH', next:'REJECTED', text:'Duplicate request — branch already holds an active wallet.', at: dateStr(7, int(5, 25)) });
    }
    if (status === 'ADMIN_BYPASS_READY_FOR_OUTPUT') {
      s.comments.push({ role:'SYSTEM_ADMIN', by: person(), staff_id:'SA-0001',
        prev:'PENDING_PRE_REGISTRATION_CHECK', next:'ADMIN_BYPASS_READY_FOR_OUTPUT', text: s.bypass_reason, at: dateStr(9, int(10, 25)) });
    }
    out.push(s);
  });
  return out;
}

/* ── Account Change Requests (changes app) ────────────────────────────────── */
const ACR_TYPES = ['Bank account number change','Bank branch change','Wallet number change',
  'Contact person change','Branch address correction'];
function buildACRs() {
  return Array.from({ length: 9 }, (_, i) => {
    const br = BRANCHES[(i * 7) % BRANCHES.length];
    const st = ['SUBMITTED_BY_BRANCH','SUBMITTED_BY_BRANCH','VERIFIED_BY_REGION','SENT_TO_HO',
                'HO_REVIEWED','READY_FOR_OUTPUT','OUTPUT_GENERATED','RETURNED_BY_REGION','REJECTED'][i];
    return {
      id: i + 1, seq: pad(i + 1, 3), program: programFor(i + 3),
      region: br.region, area: br.area, branch_name: br.name, branch_code: br.code,
      change_type: ACR_TYPES[i % ACR_TYPES.length],
      mfs_provider: i % 2 === 0 ? 'bkash' : 'nagad',
      old_value: i % 3 === 0 ? accountNo() : walletNo(),
      new_value: i % 3 === 0 ? accountNo() : walletNo(),
      reason: ['Bank merged the branch and reissued the account','Previous holder transferred out',
               'Cheque book reissued with new account series','Branch relocated'][i % 4],
      status: st, created_at: dateStr(int(7, 9), int(1, 28)),
      contact_person_name: br.officers[0].name,
    };
  });
}

/* ── Audit log — audit/models.py AuditLog.action_type choices ─────────────── */
const AUDIT_TYPES = ['LOGIN','LOGOUT','PASSWORD_CHANGE','DRAFT_SAVED','SUBMITTED','VERIFIED','RETURNED',
  'REJECTED','SENT_TO_HO','HO_REVIEWED','HO_REJECTED','OUTPUT_GENERATED','CHEQUE_EXPORTED','USER_CREATED',
  'USER_UPDATED','USER_DEACTIVATED','HIERARCHY_IMPORT','USERLIST_IMPORT','ADMIN_BYPASS','ADMIN_EDIT',
  'SUBMISSION_DELETED'];
const AUDIT_CLS = { LOGIN:'draft', LOGOUT:'draft', PASSWORD_CHANGE:'draft', DRAFT_SAVED:'draft',
  SUBMITTED:'submitted', VERIFIED:'verified', RETURNED:'correction', REJECTED:'rejected',
  SENT_TO_HO:'ho', HO_REVIEWED:'ready', HO_REJECTED:'rejected', OUTPUT_GENERATED:'generated',
  CHEQUE_EXPORTED:'generated', USER_CREATED:'submitted', USER_UPDATED:'submitted',
  USER_DEACTIVATED:'rejected', HIERARCHY_IMPORT:'ho', USERLIST_IMPORT:'ho', ADMIN_BYPASS:'bypass',
  ADMIN_EDIT:'correction', SUBMISSION_DELETED:'rejected' };
const ROLE_LABEL = { SYSTEM_ADMIN:'System Admin', REGION_ADMIN:'Regional Finance & Accounts Admin',
  HO_FINANCE:'HO Finance Officer', BRANCH_USER:'Branch User' };

function buildAudit(subs) {
  const rows = [];
  let id = 0;
  subs.forEach(s => {
    s.comments.forEach(c => {
      const map = { SUBMITTED_BY_BRANCH:'SUBMITTED', VERIFIED_BY_REGION:'VERIFIED',
        RETURNED_BY_REGION:'RETURNED', REJECTED:'REJECTED', SENT_TO_HO:'SENT_TO_HO',
        HO_REVIEWED:'HO_REVIEWED', ADMIN_BYPASS_READY_FOR_OUTPUT:'ADMIN_BYPASS' };
      rows.push({ id: ++id, action_type: map[c.next] || 'ADMIN_EDIT', staff_id: c.staff_id,
        role: c.role, user: c.by, submission_id: s.id, branch_code: s.branch_code,
        region_name: s.region, prev: c.prev, next: c.next, comment: c.text, at: c.at + ' ' + pad(int(9, 17), 2) + ':' + pad(int(0, 59), 2) });
    });
    if (s.status === 'OUTPUT_GENERATED') {
      rows.push({ id: ++id, action_type:'OUTPUT_GENERATED', staff_id:'SA-0001', role:'SYSTEM_ADMIN',
        user:'Demo Administrator', submission_id: s.id, branch_code: s.branch_code, region_name: s.region,
        prev:'READY_FOR_OUTPUT', next:'OUTPUT_GENERATED',
        comment: `${s.mfs_provider === 'bkash' ? 'bKash' : 'Nagad'} pack generated`, at: dateStr(9, int(10, 26)) + ' 11:' + pad(int(0, 59), 2) });
    }
  });
  ['LOGIN','HIERARCHY_IMPORT','USERLIST_IMPORT','USER_CREATED','PASSWORD_CHANGE','CHEQUE_EXPORTED',
   'USER_DEACTIVATED','LOGOUT'].forEach(t => {
    rows.push({ id: ++id, action_type: t, staff_id:'SA-0001', role:'SYSTEM_ADMIN', user:'Demo Administrator',
      submission_id: null, branch_code:'', region_name:'', prev:'', next:'',
      comment: { LOGIN:'Signed in from 10.20.x.x', HIERARCHY_IMPORT:'Imported 72 branches from CSV',
        USERLIST_IMPORT:'Imported 24 branch users', USER_CREATED:'Created regional admin account',
        PASSWORD_CHANGE:'Forced password change completed', CHEQUE_EXPORTED:'Exported 14 cheque images as ZIP',
        USER_DEACTIVATED:'Deactivated transferred officer account', LOGOUT:'Signed out' }[t],
      at: dateStr(9, int(20, 27)) + ' ' + pad(int(8, 18), 2) + ':' + pad(int(0, 59), 2) });
  });
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

/* ── Output column headers — providers/services/* openpyxl writers ────────── */
const BKASH_COLS = ['SL','Shop Name','Branch Name','Short Code','Branch Address','Police Station','District',
  'Account Name','Account Number','Bank Name','Bank Branch Name','Routing Number','Email Address',
  'MFS Mobile Number','Contact Person Name','Designation','Contact Mobile Number'];
const NAGAD_COLS = ['SL','Merchant Name','Outlet Name','Branch Code','Outlet Address','Thana','District',
  'Bank Account Name','Bank Account Number','Bank Name','Bank Branch','Routing Number','Email',
  'Wallet Number','Authorized Person','Designation','Mobile Number'];

/* ── i18n — keys and values taken from static/i18n/{en,bn}.json ───────────── */
const I18N = {
  en: { login:'Sign In', logout:'Sign Out', staffId:'Staff ID', mobile:'Mobile Number', password:'Password',
    changePassword:'Change Password', dashboard:'Dashboard', mySubmissions:'My Submissions',
    newRegistration:'New Registration', program:'Program', division:'Division', region:'Region', area:'Area',
    branch:'Branch', branchCode:'Branch Code', branchEmail:'Branch Email', branchAddress:'Branch Address',
    branchName:'Branch Name', walletNumber:'MFS Wallet Number', policeStation:'Police Station / Thana',
    district:'District', accountName:'Account Name', accountNumber:'Account Number', bankName:'Bank Name',
    bankBranch:'Bank Branch Name', routingNumber:'Bank Routing Number', chequeImage:'Cheque Image',
    status:'Status', submit:'Submit', submitFinal:'Submit Final', saveDraft:'Save Draft', back:'Back',
    verify:'Verify', returnForCorrection:'Return for Correction', reject:'Reject',
    sendToHO:'Send to Head Office', markReviewed:'Mark as HO Reviewed', review:'Review',
    generateOutput:'Generate Output', preview:'Preview', download:'Download',
    correctionNote:'Correction Note', rejectionReason:'Rejection Reason', verificationNote:'Verification Note',
    pendingReview:'Pending Review', allCaughtUp:'No submissions pending your review. All caught up!',
    noSubmissionsYet:'No submissions yet.', totalBranches:'Total Branches', verified:'Verified',
    returned:'Returned', language:'Language', systemSettings:'System Settings',
    accountNameHelp:'Enter exactly as printed on the cheque',
    accountNumberHelp:'Enter the complete account number as shown on your cheque or bank statement',
    routingNumberHelp:'9-digit bank routing number — no spaces or dashes',
    walletNumberPlaceholder:'01XXXXXXXXX', branchEmailPlaceholder:'branch@padakhep.example',
    branchAddressPlaceholder:'Full postal address: Village, Post Office, Upazila, District',
    submitInstruction:'Please verify all fields before final submission. Submitted forms cannot be edited without returning for correction.',
    reviewInstruction:'Please review all information carefully before taking action.',
    officeHoursWarning:'Data entry is available from 10:00 AM to 5:00 PM. Please try again during office hours.',
    firstLoginWarning:'You must change your password before continuing.' },
  bn: { login:'প্রবেশ করুন', logout:'সাইন আউট', staffId:'স্টাফ আইডি', mobile:'মোবাইল নম্বর', password:'পাসওয়ার্ড',
    changePassword:'পাসওয়ার্ড পরিবর্তন', dashboard:'ড্যাশবোর্ড', mySubmissions:'আমার জমা',
    newRegistration:'নতুন নিবন্ধন', program:'প্রোগ্রাম', division:'বিভাগ', region:'অঞ্চল', area:'এরিয়া',
    branch:'শাখা', branchCode:'শাখা কোড', branchEmail:'শাখার ই-মেইল', branchAddress:'শাখার ঠিকানা',
    branchName:'শাখার নাম', walletNumber:'MFS Wallet নম্বর', policeStation:'থানা / উপজেলা',
    district:'জেলা', accountName:'হিসাবের নাম', accountNumber:'হিসাব নম্বর', bankName:'ব্যাংকের নাম',
    bankBranch:'ব্যাংক শাখার নাম', routingNumber:'Routing Number', chequeImage:'চেকের ছবি',
    status:'অবস্থা', submit:'Submit', submitFinal:'চূড়ান্তভাবে Submit করুন', saveDraft:'খসড়া সংরক্ষণ',
    back:'ফিরে যান', verify:'Verify করুন', returnForCorrection:'সংশোধনের জন্য ফেরত পাঠান',
    reject:'বাতিল করুন', sendToHO:'প্রধান কার্যালয়ে পাঠান', markReviewed:'HO পর্যালোচিত চিহ্নিত করুন',
    review:'পর্যালোচনা', generateOutput:'আউটপুট তৈরি করুন', preview:'প্রিভিউ', download:'ডাউনলোড',
    correctionNote:'সংশোধনের নোট', rejectionReason:'বাতিলের কারণ', verificationNote:'যাচাইয়ের নোট',
    pendingReview:'পর্যালোচনা অপেক্ষমাণ', allCaughtUp:'আপনার পর্যালোচনার জন্য কোনো জমা নেই।',
    noSubmissionsYet:'এখনো কোনো জমা নেই।', totalBranches:'মোট শাখা', verified:'Verify হয়েছে',
    returned:'ফেরত', language:'ভাষা', systemSettings:'সিস্টেম সেটিংস',
    accountNameHelp:'চেকের পাতায় যেভাবে আছে, সেভাবেই লিখুন (ইংরেজিতে)',
    accountNumberHelp:'চেক বা ব্যাংক স্টেটমেন্টে যেভাবে আছে সম্পূর্ণ হিসাব নম্বর লিখুন',
    routingNumberHelp:'৯ সংখ্যার Routing Number, শুধু সংখ্যা',
    walletNumberPlaceholder:'০১XXXXXXXXX', branchEmailPlaceholder:'branch@padakhep.example',
    branchAddressPlaceholder:'সম্পূর্ণ ডাক ঠিকানা: গ্রাম, ডাকঘর, উপজেলা, জেলা',
    submitInstruction:'চূড়ান্তভাবে Submit করার আগে সব তথ্য যাচাই করুন। Submit করার পর সংশোধনের জন্য ফেরত না পাঠালে সম্পাদনা করা যাবে না।',
    reviewInstruction:'সিদ্ধান্ত নেওয়ার আগে সব তথ্য মনোযোগ দিয়ে পর্যালোচনা করুন।',
    officeHoursWarning:'তথ্য প্রদান সকাল ১০টা থেকে বিকাল ৫টার মধ্যে করা যাবে।',
    firstLoginWarning:'চালিয়ে যাওয়ার আগে আপনাকে পাসওয়ার্ড পরিবর্তন করতে হবে।' },
};

/* ── Guided tour ─────────────────────────────────────────────────────────── */
const TOUR = [
  { title:'Sign in as a Branch User', desc:'The real portal signs users in with a staff ID or mobile number and a role card. Click to jump there.', role:'BRANCH_USER', screen:'branch-dashboard' },
  { title:'Start a registration', desc:'Programme is derived from the branch hierarchy, so the branch user never picks it manually. Hierarchy fields arrive read-only.', role:'BRANCH_USER', screen:'reg-form' },
  { title:'Validation fires on submit', desc:'Wallet must match ^01[3-9]\\d{8}$, routing must be 9 digits, and the account name is checked against the organisation name.', role:'BRANCH_USER', screen:'reg-form', action:'demoValidate' },
  { title:'Region verifies — maker/checker', desc:'The branch cannot approve its own work. Switch role and the same record exposes Verify, Return and Send-to-HO.', role:'REGION_ADMIN', screen:'region-queue' },
  { title:'Head Office review layer', desc:'This layer is optional — System Settings can switch it off, and VERIFIED_BY_REGION then flows straight to the pre-registration check.', role:'HO_FINANCE', screen:'ho-queue' },
  { title:'Pre-registration existence check', desc:'BR-004-02: both bKash and Nagad must come back CLEAR before a record reaches READY_FOR_OUTPUT.', role:'SYSTEM_ADMIN', screen:'pre-reg' },
  { title:'Generate the provider packs', desc:'Select approved records and download the bKash or Nagad pack. Column headers are the real ones from the openpyxl writers.', role:'SYSTEM_ADMIN', screen:'output-hub' },
  { title:'Everything is audited', desc:'Every transition writes an append-only audit row with the actor, the previous state and the new state.', role:'SYSTEM_ADMIN', screen:'audit' },
];

/* ══ CSV export (browser download) ═══════════════════════════════════════════ */
function toCSV(cols, rows) {
  const esc = v => { const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
}
function downloadCSV(name, cols, rows) {
  const blob = new Blob(['﻿' + toCSV(cols, rows)], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ══ ALPINE APP STATE ════════════════════════════════════════════════════════ */
function appState() {
  return {
    /* ── session ── */
    screen: 'login',
    role: null,
    lang: 'bn',
    loginRole: null,
    loginMode: 'STAFF_ID',
    loginId: '',
    loginPass: '',
    loginError: '',
    toast: null,
    modal: null,

    /* ── data ── */
    branches: BRANCHES,
    subs: [],
    acrs: [],
    audit: [],
    batches: [],
    settings: { ho_review_required:true, login_mode:'BOTH', default_language:'bn', acr_open:true, force_password_change:false },
    STATES, FLOW, TL_LABEL, ACTIONS, RULES, RETURN_REASONS, ROLE_LABEL, AUDIT_TYPES, AUDIT_CLS,
    BKASH_COLS, NAGAD_COLS, TOUR, BYPASS_BLOCKED, DIVISIONS,

    /* ── ui state ── */
    sel: null,
    branchTab: 'all',
    listFilters: { status:'', program:'', region:'', division:'', provider:'', q:'' },
    section: null,
    auditFilters: { action:'', region:'', q:'' },
    outputTab: 'MFS',
    picked: [],
    actionModal: null,
    form: {}, formErrors: {}, formTouched: false,
    tourOpen: false, tourStep: -1, tourDone: [],
    showValidationDemo: false,

    /* ── lifecycle ── */
    init() {
      this.subs = buildSubmissions();
      this.acrs = buildACRs();
      /* Give the demo branch a spread of states so the branch screens show the
         full pipeline rather than a single row. */
      const demoBranch = BRANCHES[3];
      ['DRAFT','SUBMITTED_BY_BRANCH','RETURNED_BY_REGION','PRE_REGISTRATION_ISSUE_FOUND','OUTPUT_GENERATED']
        .forEach(st => {
          const hit = this.subs.find(x => x.status === st && x.branch_id !== demoBranch.id);
          if (hit) {
            hit.branch_id   = demoBranch.id;
            hit.branch_name = demoBranch.name;
            hit.branch_code = demoBranch.code;
            hit.division    = demoBranch.division;
            hit.region      = demoBranch.region;
            hit.area        = demoBranch.area;
          }
        });
      this.audit = buildAudit(this.subs);
      this.batches = this.subs.filter(s => s.status === 'OUTPUT_GENERATED')
        .slice(0, 5).map((s, i) => ({
          id: i + 1,
          provider: s.mfs_provider,
          type: ['BKASH_EXCEL','NAGAD_ZIP','ALL_ZIP','BKASH_DOCX','NAGAD_EXCEL'][i],
          submission_ids: this.subs.filter(x => x.status === 'OUTPUT_GENERATED').slice(i, i + int(2, 4)).map(x => x.id),
          record_count: int(2, 4),
          by: 'Demo Administrator',
          at: dateStr(9, 26 - i * 3) + ' 1' + i + ':' + pad(int(10, 55), 2),
        }));
    },

    /* ── branch-side helpers (branch_dashboard.html / own_submissions.html) ── */
    branchCount(tab) {
      const all = this.branchScoped;
      if (tab === 'all') return all.length;
      if (tab === 'draft') return all.filter(s => s.status === 'DRAFT').length;
      if (tab === 'submitted') return all.filter(s => !['DRAFT','RETURNED_BY_REGION','RETURNED_BY_HO'].includes(s.status)).length;
      return all.filter(s => ['RETURNED_BY_REGION','RETURNED_BY_HO'].includes(s.status)).length;
    },
    get branchBlocked() {
      return this.branchScoped.some(s => s.name_mismatch_flag || s.status === 'PRE_REGISTRATION_ISSUE_FOUND');
    },
    get branchAcrs() { return this.acrs.slice(0, 3); },
    /* The branch list shows a 5-dot pipeline: Branch, Region, HO, Output, Done */
    branchPipeline(s) {
      const stage = { DRAFT:0, SUBMITTED_BY_BRANCH:1, RETURNED_BY_REGION:1, REJECTED:1,
        VERIFIED_BY_REGION:2, SENT_TO_HO:2, HO_REVIEWED:3, RETURNED_BY_HO:2,
        PENDING_PRE_REGISTRATION_CHECK:3, PRE_REGISTRATION_ISSUE_FOUND:3,
        READY_FOR_OUTPUT:3, ADMIN_BYPASS_READY_FOR_OUTPUT:3, OUTPUT_GENERATED:4 }[s.status] || 0;
      return ['Branch','Region','HO','Output','Done'].map((label, i) => ({
        label, state: i < stage ? 'done' : (i === stage ? 'current' : ''),
      }));
    },
    /* Dot colour for the branch dashboard's .sdot indicator */
    stateColor(st) {
      return { draft:'#64748B', submitted:'#2563EB', correction:'#D97706', verified:'#059669',
        ready:'#059669', generated:'#0891B2', rejected:'#DC2626', ho:'#7C3AED',
        bypass:'#B45309' }[this.stateCls(st)] || '#64748B';
    },

    /* ── officer credentials (core/models.py OfficerCredential) ── */
    credentials: [
      { type:'Initiator',   name:'Ferdousi Talukder', designation:'Finance Officer',   staff_id:'HO-0142' },
      { type:'Approver',    name:'Anwarul Majumder',  designation:'Head of Finance',   staff_id:'HO-0027' },
      { type:'EDS Officer', name:null,                designation:null,                staff_id:null },
    ],
    /* ── office hours (core/models.py OfficeHourSetting) ── */
    officeHours: { name:'Default data-entry window', active:'1', start:'09:00', end:'22:00',
      message:'Data entry is available from 10:00 AM to 5:00 PM. Please try again during office hours.' },
    /* ── cheque verification (registrations/models.py ChequeVerification) ── */
    chequeStatus: {},
    get chequePending() {
      return this.subs.filter(s => s.status !== 'DRAFT' && !this.chequeStatus[s.id]);
    },
    get chequeVerified() { return Object.values(this.chequeStatus).filter(v => v === 'VERIFIED').length; },
    get chequeMismatch() { return Object.values(this.chequeStatus).filter(v => v === 'MISMATCH').length; },
    markCheque(s, verdict) {
      this.chequeStatus[s.id] = verdict;
      this.audit.unshift({ id:this.audit.length+1, action_type:'ADMIN_EDIT', staff_id:'SA-0001',
        role:'SYSTEM_ADMIN', user:'Demo Administrator', submission_id:s.id, branch_code:s.branch_code,
        region_name:s.region, prev:'', next:'',
        comment:'Cheque marked ' + verdict, at:'2026-09-29 12:20' });
      this.notify(s.branch_name + ' cheque marked ' + verdict + '. Advisory only — it does not block output.',
        verdict === 'VERIFIED' ? 'success' : 'warning');
    },
    get coveredBranches() {
      return new Set(this.subs.filter(s => s.status !== 'DRAFT').map(s => s.branch_id)).size;
    },

    /* ── login type picker (role first, then credentials) ── */
    pickType(r) { this.loginRole = r; this.loginError = ''; },
    screenTitle() {
      return { 'admin-dashboard':'Dashboard', 'sub-list':'All Submissions', 'sub-detail':'Submission Detail',
        'output-hub':'Generate Output', 'output-history':'Output History', 'pre-reg':'Pre-Registration Check',
        'audit':'Reports & Audit', 'settings':'System Settings', 'holds':'Holds & Flags',
        'acr-list':'Account Change Requests', 'region-queue':'Regional Review Queue',
        'ho-queue':'Head Office Review Queue', 'templates':'Print Templates',
        'coverage':'Coverage Report', 'cheque-verify':'Cheque Verification', 'role-hub':'Dashboard',
        'credentials':'Credential & Officer Setup', 'office-hours':'Office Hours' }[this.screen] || '';
    },
    get acrApproved() { return this.acrs.filter(a => ['HO_REVIEWED','READY_FOR_OUTPUT'].includes(a.status)).length; },
    get acrSent() { return this.acrs.filter(a => a.status === 'OUTPUT_GENERATED').length; },
    get coverageRows() {
      return [...new Set(this.branches.map(b => b.region))].sort().map(region => {
        const rows = this.subs.filter(s => s.region === region);
        const branches = this.branches.filter(b => b.region === region).length;
        const submitted = rows.filter(s => s.status !== 'DRAFT').length;
        const generated = rows.filter(s => s.status === 'OUTPUT_GENERATED').length;
        return { region, branches, submitted, generated,
                 pct: branches ? Math.round((submitted / branches) * 100) : 0 };
      });
    },

    /* ── i18n ── */
    t(k) { return (I18N[this.lang] && I18N[this.lang][k]) || I18N.en[k] || k; },
    stateLabel(s) { const m = STATES[s]; return m ? (this.lang === 'bn' ? m.bn : m.en) : s; },
    stateCls(s) { return STATES[s] ? STATES[s].cls : 'draft'; },
    provLabel(p) { return p === 'bkash' ? 'bKash' : 'Nagad'; },

    /* ── auth ── */
    doLogin() {
      this.loginError = '';
      if (!this.loginId.trim()) { this.loginError = this.loginMode === 'STAFF_ID' ? 'Staff ID is required.' : 'Mobile number is required.'; return; }
      if (!this.loginPass) { this.loginError = 'Password is required.'; return; }
      this.role = this.loginRole;
      this.screen = this.homeFor(this.loginRole);
      this.notify('Signed in as ' + ROLE_LABEL[this.loginRole] + ' (simulated).', 'success');
    },
    logout() { this.role = null; this.screen = 'login'; this.sel = null; this.loginId = ''; this.loginPass = ''; },
    homeFor(r) {
      return { BRANCH_USER:'branch-dashboard', REGION_ADMIN:'role-hub',
               HO_FINANCE:'role-hub', SYSTEM_ADMIN:'admin-dashboard' }[r];
    },
    switchRole(r) {
      this.role = r; this.sel = null; this.picked = [];
      this.screen = this.homeFor(r);
      this.notify('Now viewing as ' + ROLE_LABEL[r] + '. Visible data and actions changed.', 'info');
    },
    go(s) { this.screen = s; this.sel = null; window.scrollTo(0, 0); },

    /* ── notifications ── */
    notify(msg, kind) {
      this.toast = { msg, kind: kind || 'info' };
      clearTimeout(this._tt);
      this._tt = setTimeout(() => { this.toast = null; }, 4200);
    },

    /* ── scoped data per role ── */
    get myBranch() { return BRANCHES[3]; },
    get myRegion() { return BRANCHES[3].region; },
    get mySubs() { return this.subs.filter(s => s.branch_id === this.myBranch.id || s.region === this.myRegion).slice(0, 9); },
    get branchScoped() {
      const mine = this.subs.filter(s => s.branch_id === this.myBranch.id);
      return mine.length ? mine : this.subs.slice(0, 6);
    },
    get branchFiltered() {
      const t = this.branchTab, all = this.branchScoped;
      if (t === 'all') return all;
      if (t === 'draft') return all.filter(s => s.status === 'DRAFT');
      if (t === 'submitted') return all.filter(s => !['DRAFT','RETURNED_BY_REGION','RETURNED_BY_HO'].includes(s.status));
      return all.filter(s => ['RETURNED_BY_REGION','RETURNED_BY_HO'].includes(s.status));
    },
    get regionQueue() { return this.subs.filter(s => s.status === 'SUBMITTED_BY_BRANCH'); },
    get regionDone() { return this.subs.filter(s => ['VERIFIED_BY_REGION','SENT_TO_HO','RETURNED_BY_REGION','REJECTED'].includes(s.status)); },
    get hoQueue() { return this.subs.filter(s => s.status === 'SENT_TO_HO'); },
    get hoDone() { return this.subs.filter(s => ['HO_REVIEWED','RETURNED_BY_HO'].includes(s.status)); },
    get preRegNotSent() { return this.subs.filter(s => ['VERIFIED_BY_REGION','HO_REVIEWED'].includes(s.status)); },
    get preRegWaiting() { return this.subs.filter(s => s.status === 'PENDING_PRE_REGISTRATION_CHECK'); },
    get preRegIssues() { return this.subs.filter(s => s.status === 'PRE_REGISTRATION_ISSUE_FOUND'); },
    get outputReady() { return this.subs.filter(s => ['READY_FOR_OUTPUT','ADMIN_BYPASS_READY_FOR_OUTPUT'].includes(s.status)); },
    get holds() {
      return this.subs.filter(s => s.name_mismatch_flag || s.status === 'PRE_REGISTRATION_ISSUE_FOUND' || s.status === 'REJECTED');
    },
    get adminList() {
      const f = this.listFilters, q = f.q.trim().toLowerCase();
      return this.subs.filter(s =>
        (!f.status || s.status === f.status) &&
        (!f.program || s.program === f.program) &&
        (!f.region || s.region === f.region) &&
        (!f.division || s.division === f.division) &&
        (!f.provider || s.mfs_provider === f.provider) &&
        (!q || s.branch_name.toLowerCase().includes(q) || s.branch_code.toLowerCase().includes(q) ||
               s.wallet_number.includes(q) || s.account_number.includes(q)));
    },
    get allRegions() { return [...new Set(this.subs.map(s => s.region))].sort(); },
    get auditFiltered() {
      const f = this.auditFilters, q = f.q.trim().toLowerCase();
      return this.audit.filter(r =>
        (!f.action || r.action_type === f.action) &&
        (!f.region || r.region_name === f.region) &&
        (!q || (r.user || '').toLowerCase().includes(q) || (r.branch_code || '').toLowerCase().includes(q) ||
               (r.staff_id || '').toLowerCase().includes(q))).slice(0, 120);
    },

    /* ── dashboard stats ── */
    countBy(st) { return this.subs.filter(s => s.status === st).length },
    get stats() {
      const c = st => this.countBy(st);
      return {
        total: this.subs.length,
        draft: c('DRAFT'),
        pendingRegion: c('SUBMITTED_BY_BRANCH'),
        pendingHO: c('SENT_TO_HO'),
        preReg: c('PENDING_PRE_REGISTRATION_CHECK') + c('PRE_REGISTRATION_ISSUE_FOUND'),
        ready: c('READY_FOR_OUTPUT') + c('ADMIN_BYPASS_READY_FOR_OUTPUT'),
        generated: c('OUTPUT_GENERATED'),
        rejected: c('REJECTED'),
        returned: c('RETURNED_BY_REGION') + c('RETURNED_BY_HO'),
        flagged: this.subs.filter(s => s.name_mismatch_flag).length,
        bkashConfirmed: this.subs.filter(s => s.confirmation && s.confirmation.bkash_confirmed_on).length,
        nagadConfirmed: this.subs.filter(s => s.confirmation && s.confirmation.nagad_confirmed_on).length,
        batches: this.batches.length,
      };
    },
    get programBreakdown() {
      return PROGRAMS.map(p => {
        const rows = this.subs.filter(s => s.program === p);
        return { program: p, total: rows.length,
          pending: rows.filter(s => ['SUBMITTED_BY_BRANCH','SENT_TO_HO','PENDING_PRE_REGISTRATION_CHECK'].includes(s.status)).length,
          ready: rows.filter(s => ['READY_FOR_OUTPUT','ADMIN_BYPASS_READY_FOR_OUTPUT'].includes(s.status)).length,
          done: rows.filter(s => s.status === 'OUTPUT_GENERATED').length };
      });
    },
    /* median verification days — dashboard tile (core/views.py admin_dashboard) */
    get medianVerifyDays() {
      const d = this.subs.filter(s => s.submitted_at && s.comments.some(c => c.next === 'VERIFIED_BY_REGION'))
        .map(s => { const v = s.comments.find(c => c.next === 'VERIFIED_BY_REGION');
          return Math.max(1, Math.round((new Date(v.at) - new Date(s.submitted_at)) / 864e5)); })
        .filter(n => n > 0 && n < 90).sort((a, b) => a - b);
      if (!d.length) return '—';
      const m = Math.floor(d.length / 2);
      return (d.length % 2 ? d[m] : ((d[m - 1] + d[m]) / 2)).toFixed(1);
    },

    /* ── submission detail ── */
    open(s) { this.sel = s; this.screen = 'sub-detail'; window.scrollTo(0, 0); },
    /* Verbatim port of RegistrationSubmission.get_timeline (registrations/models.py).
       Steps: Submitted, Regional Review, [HO Finance Review], Pre-Registration Check,
       Output Generation. State is done | current | error | pending. */
    timelineFor(s) {
      const hoRequired = this.settings.ho_review_required;
      const steps = [
        { key:'submit', label:'Submitted',       icon:'bi-upload' },
        { key:'region', label:'Regional Review', icon:'bi-person-check' },
      ];
      if (hoRequired) steps.push({ key:'ho', label:'HO Finance Review', icon:'bi-building' });
      steps.push({ key:'pre_reg', label:'Pre-Registration Check', icon:'bi-search' });
      steps.push({ key:'output',  label:'Output Generation',      icon:'bi-file-earmark-check' });

      const preRegIdx = hoRequired ? 3 : 2;
      const order = {
        DRAFT: -1, SUBMITTED_BY_BRANCH: 0, RETURNED_BY_REGION: 1, VERIFIED_BY_REGION: 1,
        SENT_TO_HO: 2, HO_REVIEWED: 2, REJECTED: 1,
        PENDING_PRE_REGISTRATION_CHECK: preRegIdx, PRE_REGISTRATION_ISSUE_FOUND: preRegIdx,
        READY_FOR_OUTPUT: preRegIdx + 1, OUTPUT_GENERATED: preRegIdx + 2,
        ADMIN_BYPASS_READY_FOR_OUTPUT: preRegIdx + 1,
      };
      const isError = ['RETURNED_BY_REGION','REJECTED','PRE_REGISTRATION_ISSUE_FOUND'].includes(s.status);
      const cur = order[s.status] !== undefined ? order[s.status] : -1;
      return steps.map((st, i) => Object.assign({}, st, {
        state: i < cur ? 'done' : (i === cur ? (isError ? 'error' : 'current') : 'pending'),
      }));
    },
    /* The detail page shows a friendlier label than the raw state name
       (submission_detail.html). */
    currentStatusLabel(s) {
      return { DRAFT:'Draft', SUBMITTED_BY_BRANCH:'Pending Regional Review',
        RETURNED_BY_REGION:'Returned for Correction', VERIFIED_BY_REGION:'Verified by Region',
        SENT_TO_HO:'Sent to HO Finance', HO_REVIEWED:'HO Finance Reviewed ✓',
        PENDING_PRE_REGISTRATION_CHECK:'Pending Pre-Registration Check',
        PRE_REGISTRATION_ISSUE_FOUND:'Pre-Registration Issue Found', REJECTED:'Rejected',
        READY_FOR_OUTPUT:'Ready for Output', OUTPUT_GENERATED:'Output Generated',
        ADMIN_BYPASS_READY_FOR_OUTPUT:'Admin Bypass — Ready for Output' }[s.status] || s.status;
    },
    availableActions(s) {
      const byRole = ACTIONS[this.role];
      return (byRole && byRole[s.status]) || [];
    },
    canBypass(s) { return this.role === 'SYSTEM_ADMIN' && !BYPASS_BLOCKED.includes(s.status); },

    /* ── transitions ── */
    askAction(s, act) {
      this.actionModal = { sub:s, act, reason:'', reasonPick: act.reason ? RETURN_REASONS[0] : '', confirmText:'' };
    },
    askBypass(s) {
      this.actionModal = { sub:s, act:{ to:'ADMIN_BYPASS_READY_FOR_OUTPUT', label:'Admin Bypass',
        reason:true, bypass:true, cls:'btn-danger' }, reason:'', reasonPick:'', confirmText:'' };
    },
    commitAction() {
      const m = this.actionModal; if (!m) return;
      const note = (m.reasonPick && m.reasonPick !== 'Other (see note)' ? m.reasonPick + (m.reason ? ' — ' + m.reason : '') : m.reason).trim();
      if (m.act.reason && !note) { this.notify('A reason is required for this action.', 'danger'); return; }
      /* admin_bypass requires the literal confirmation word BYPASS
         (registrations/views.py admin_bypass) */
      if (m.act.bypass && m.confirmText !== 'BYPASS') { this.notify('Type BYPASS exactly to confirm the override.', 'danger'); return; }
      const s = m.sub, prev = s.status;
      s.status = m.act.to;
      if (m.act.bypass) { s.bypass_enabled = true; s.bypass_reason = note; }
      if (m.act.to === 'READY_FOR_OUTPUT' && s.pre_reg) {
        s.pre_reg.bkash_status = 'CLEAR'; s.pre_reg.nagad_status = 'CLEAR';
        s.pre_reg.reply_uploaded_at = dateStr(9, 27);
      }
      if (m.act.to === 'PENDING_PRE_REGISTRATION_CHECK' && !s.pre_reg) {
        s.pre_reg = { sent_at: dateStr(9, 27), bkash_status:'', nagad_status:'', bkash_remarks:'', nagad_remarks:'', reply_uploaded_at:null };
      }
      s.comments.push({ role:this.role, by:'Demo ' + ROLE_LABEL[this.role],
        staff_id:{ SYSTEM_ADMIN:'SA-0001', REGION_ADMIN:'RG-0101', HO_FINANCE:'HO-0011', BRANCH_USER:'BR-0004' }[this.role],
        prev, next:m.act.to, text:note || 'No note recorded.', at:dateStr(9, 29) });
      this.audit.unshift({ id: this.audit.length + 1,
        action_type:{ VERIFIED_BY_REGION:'VERIFIED', RETURNED_BY_REGION:'RETURNED', REJECTED:'REJECTED',
          SENT_TO_HO:'SENT_TO_HO', HO_REVIEWED:'HO_REVIEWED', RETURNED_BY_HO:'RETURNED',
          ADMIN_BYPASS_READY_FOR_OUTPUT:'ADMIN_BYPASS' }[m.act.to] || 'ADMIN_EDIT',
        staff_id:'DEMO', role:this.role, user:'Demo ' + ROLE_LABEL[this.role], submission_id:s.id,
        branch_code:s.branch_code, region_name:s.region, prev, next:m.act.to,
        comment:note || '', at:dateStr(9, 29) + ' 12:00' });
      this.notify(`${s.branch_name} → ${this.stateLabel(m.act.to)}`, 'success');
      this.actionModal = null;
    },
    bulk(act) {
      const rows = this.regionQueue.filter(s => this.picked.includes(s.id));
      if (!rows.length) { this.notify('Select at least one submission first.', 'warning'); return; }
      rows.forEach(s => {
        const prev = s.status; s.status = act.to;
        s.comments.push({ role:this.role, by:'Demo ' + ROLE_LABEL[this.role], staff_id:'RG-0101',
          prev, next:act.to, text:'Bulk action from region queue.', at:dateStr(9, 29) });
      });
      this.notify(`${rows.length} submission(s) → ${this.stateLabel(act.to)}`, 'success');
      this.picked = [];
    },

    /* ── registration form ── */
    startForm() {
      const b = this.myBranch;
      this.form = { program: programFor(b.id), division:b.division, region:b.region, area:b.area,
        branch_name:b.name, branch_code:b.code, mfs_provider:'bkash',
        wallet_number:'', email_address:'', branch_address:b.address, police_station:b.thana, district:b.district,
        account_name:'', account_number:'', bank_name:'', bank_branch_name:'', bank_branch_routing_number:'',
        contact_person_name:b.officers[0].name, contact_person_designation:'Branch Manager',
        contact_mobile_number:b.officers[0].mobile,
        cheque_image:null, bank_certificate:null, nid_copy:null, authorization_letter:null };
      this.formErrors = {}; this.formTouched = false;
      this.screen = 'reg-form'; window.scrollTo(0, 0);
    },
    editDraft(s) {
      this.form = Object.assign({}, s); this.form._editing = s.id;
      this.formErrors = {}; this.formTouched = false;
      this.screen = 'reg-form'; window.scrollTo(0, 0);
    },
    /* Validation messages are the real ones from registrations/forms.py + views.py */
    validateForm() {
      const f = this.form, e = {};
      if (!f.wallet_number) e.wallet_number = 'This field is required.';
      else if (!RULES.WALLET_RE.test(f.wallet_number)) e.wallet_number = 'Enter a valid 11-digit Bangladeshi mobile number starting 013–019.';
      if (!f.email_address) e.email_address = 'This field is required.';
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email_address)) e.email_address = 'Enter a valid email address.';
      if (!f.branch_address) e.branch_address = 'This field is required.';
      if (!f.police_station) e.police_station = 'This field is required.';
      if (!f.district) e.district = 'This field is required.';
      if (!f.account_name) e.account_name = 'This field is required.';
      if (!f.account_number) e.account_number = 'This field is required.';
      else if (!/^\d{6,20}$/.test(f.account_number)) e.account_number = 'Account number must contain digits only — keep all leading zeros.';
      if (!f.bank_name) e.bank_name = 'This field is required.';
      if (!f.bank_branch_name) e.bank_branch_name = 'This field is required.';
      if (!f.bank_branch_routing_number) e.bank_branch_routing_number = 'This field is required.';
      else if (!RULES.ROUTING_RE.test(f.bank_branch_routing_number)) e.bank_branch_routing_number = 'Routing number must be exactly 9 digits, digits only.';
      if (!f.cheque_image) e.cheque_image = 'A cheque image is required before final submission.';
      this.formErrors = e; this.formTouched = true;
      return Object.keys(e).length === 0;
    },
    /* Org name check — registrations/views.py registration_submit_final */
    get nameMismatch() {
      const n = (this.form.account_name || '').toLowerCase();
      return n.length > 0 && !n.includes(RULES.ORG_NAME);
    },
    fakeUpload(field) {
      this.form[field] = { name: field + '_placeholder.png', size:'184 KB' };
      delete this.formErrors[field];
      this.notify('Placeholder attached (no real file leaves your browser).', 'info');
    },
    saveDraft() {
      const f = this.form;
      if (f._editing) {
        const s = this.subs.find(x => x.id === f._editing);
        Object.assign(s, f, { status:'DRAFT' });
      } else {
        this.subs.unshift(this.formToSub('DRAFT'));
      }
      this.notify('Draft saved. You can finish it later.', 'success');
      this.screen = 'branch-subs';
    },
    submitFinal() {
      if (!this.validateForm()) { this.notify('Please fix the highlighted fields.', 'danger'); return; }
      const f = this.form;
      let s;
      if (f._editing) { s = this.subs.find(x => x.id === f._editing); Object.assign(s, f); }
      else { s = this.formToSub('SUBMITTED_BY_BRANCH'); this.subs.unshift(s); }
      s.status = 'SUBMITTED_BY_BRANCH';
      s.submitted_at = dateStr(9, 29);
      s.name_mismatch_flag = this.nameMismatch;
      s.name_mismatch_value = this.nameMismatch ? f.account_name : '';
      s.comments.push({ role:'BRANCH_USER', by:'Demo Branch User', staff_id:'BR-0004',
        prev:'DRAFT', next:'SUBMITTED_BY_BRANCH', text:'Submitted with cheque copy attached.', at:dateStr(9, 29) });
      this.audit.unshift({ id:this.audit.length + 1, action_type:'SUBMITTED', staff_id:'BR-0004',
        role:'BRANCH_USER', user:'Demo Branch User', submission_id:s.id, branch_code:s.branch_code,
        region_name:s.region, prev:'DRAFT', next:'SUBMITTED_BY_BRANCH', comment:'Final submission',
        at:dateStr(9, 29) + ' 12:05' });
      this.notify(this.nameMismatch
        ? 'Submitted — but the account name does not match the organisation name. It has been flagged for admin review.'
        : 'Submitted to the Regional Finance & Accounts Admin.', this.nameMismatch ? 'warning' : 'success');
      this.screen = 'branch-subs';
    },
    formToSub(status) {
      const f = this.form, b = this.myBranch;
      return Object.assign({}, f, {
        id: Math.max(...this.subs.map(s => s.id)) + 1,
        sl: pad(this.subs.length + 1, 2),
        branch_id: b.id,
        short_code: f.wallet_number,
        mfs_mobile_number: f.wallet_number,
        shop_name: RULES.shopName(b.name.replace(' Branch','')),
        status,
        created_at: dateStr(9, 29),
        submitted_at: status === 'DRAFT' ? null : dateStr(9, 29),
        name_mismatch_flag: false, name_mismatch_value:'',
        bypass_enabled:false, bypass_reason:'',
        pre_reg:null, confirmation:null, comments:[],
      });
    },

    /* ── output generation ── */
    togglePick(id) {
      const i = this.picked.indexOf(id);
      if (i === -1) this.picked.push(id); else this.picked.splice(i, 1);
    },
    pickAll(rows) {
      this.picked = this.picked.length === rows.length ? [] : rows.map(r => r.id);
    },
    get pickedRows() { return this.outputReady.filter(s => this.picked.includes(s.id)); },
    rowFor(s, i, total, provider) {
      const sl = RULES.slFor(i, total);
      return provider === 'bkash'
        ? [sl, s.shop_name, s.branch_name, s.short_code, s.branch_address, s.police_station, s.district,
           s.account_name, s.account_number, s.bank_name, s.bank_branch_name, s.bank_branch_routing_number,
           s.email_address, s.mfs_mobile_number, s.contact_person_name, s.contact_person_designation, s.contact_mobile_number]
        : [sl, 'Padakhep Manabik Unnayan Kendra', s.shop_name, s.branch_code, s.branch_address, s.police_station,
           s.district, s.account_name, s.account_number, s.bank_name, s.bank_branch_name,
           s.bank_branch_routing_number, s.email_address, s.wallet_number, s.contact_person_name,
           s.contact_person_designation, s.contact_mobile_number];
    },
    generate(kind) {
      const rows = this.pickedRows;
      if (!rows.length) { this.notify('Select at least one approved submission.', 'warning'); return; }
      const provider = kind.startsWith('BKASH') ? 'bkash' : 'nagad';
      const cols = provider === 'bkash' ? BKASH_COLS : NAGAD_COLS;
      const data = rows.map((s, i) => this.rowFor(s, i, rows.length, provider));
      const stamp = '20260929';
      const fname = { BKASH_EXCEL:`bKash_Registration_${stamp}.csv`, NAGAD_EXCEL:`Nagad_Registration_${stamp}.csv`,
        ALL_ZIP:`All_Documents_${stamp}.csv` }[kind] || `${kind}_${stamp}.csv`;
      downloadCSV(fname, cols, data);
      this.batches.unshift({ id:this.batches.length + 1, provider, type:kind,
        submission_ids: rows.map(r => r.id), record_count: rows.length, by:'Demo Administrator',
        at: dateStr(9, 29) + ' 12:10' });
      rows.forEach(s => {
        const prev = s.status; s.status = 'OUTPUT_GENERATED';
        s.confirmation = s.confirmation || { bkash_confirmed_on:null, nagad_confirmed_on:null };
        this.audit.unshift({ id:this.audit.length + 1, action_type:'OUTPUT_GENERATED', staff_id:'SA-0001',
          role:'SYSTEM_ADMIN', user:'Demo Administrator', submission_id:s.id, branch_code:s.branch_code,
          region_name:s.region, prev, next:'OUTPUT_GENERATED',
          comment:`${this.provLabel(provider)} pack generated`, at:dateStr(9, 29) + ' 12:10' });
      });
      this.picked = [];
      this.notify(`${fname} downloaded — ${rows.length} record(s). Status moved to Output Generated.`, 'success');
    },
    regenerate(b) {
      const rows = this.subs.filter(s => b.submission_ids.includes(s.id));
      if (!rows.length) { this.notify('Those submissions are no longer available.', 'warning'); return; }
      const cols = b.provider === 'bkash' ? BKASH_COLS : NAGAD_COLS;
      downloadCSV(`${b.type}_rerun_20260929.csv`, cols, rows.map((s, i) => this.rowFor(s, i, rows.length, b.provider)));
      this.notify(`Re-downloaded batch #${b.id} (${rows.length} record(s)).`, 'success');
    },
    batchLabel(t) {
      return { BKASH_EXCEL:'bKash Excel', BKASH_DOCX:'bKash Word Document', NAGAD_EXCEL:'Nagad Excel',
        NAGAD_REG_DOCX:'Nagad Registration Letter', NAGAD_LOI_DOCX:'Nagad Letter of Interest',
        NAGAD_ZIP:'Nagad Complete Package (ZIP)', ALL_ZIP:'All Documents (ZIP)' }[t] || t;
    },
    branchNamesFor(b) {
      return this.subs.filter(s => b.submission_ids.includes(s.id)).map(s => s.branch_name);
    },
    exportAudit() {
      downloadCSV('audit_log_20260929.csv',
        ['Timestamp','Action','Staff ID','Role','User','Submission','Branch Code','Region','From','To','Comment'],
        this.auditFiltered.map(r => [r.at, r.action_type, r.staff_id, ROLE_LABEL[r.role] || r.role, r.user,
          r.submission_id || '', r.branch_code, r.region_name, r.prev, r.next, r.comment]));
      this.notify('Audit log exported as CSV.', 'success');
    },
    exportList() {
      downloadCSV('submissions_20260929.csv',
        ['SL','Program','Division','Region','Area','Branch','Branch Code','Provider','Wallet','Account Name',
         'Account Number','Bank','Routing','Status','Submitted'],
        this.adminList.map(s => [s.sl, s.program, s.division, s.region, s.area, s.branch_name, s.branch_code,
          this.provLabel(s.mfs_provider), s.wallet_number, s.account_name, s.account_number, s.bank_name,
          s.bank_branch_routing_number, STATES[s.status].en, s.submitted_at || '']));
      this.notify('Submission list exported as CSV.', 'success');
    },

    /* ── pre-registration ── */
    sendPreReg() {
      const rows = this.preRegNotSent;
      if (!rows.length) { this.notify('Nothing waiting to be sent.', 'warning'); return; }
      downloadCSV('pre_registration_check_20260929.csv',
        ['SL','Branch Name','Branch Code','Region','Wallet Number','bKash Status','bKash Remarks','Nagad Status','Nagad Remarks'],
        rows.map((s, i) => [pad(i + 1, 2), s.branch_name, s.branch_code, s.region, s.wallet_number, '', '', '', '']));
      rows.forEach(s => {
        const prev = s.status;
        s.status = 'PENDING_PRE_REGISTRATION_CHECK';
        s.pre_reg = { sent_at:dateStr(9, 29), bkash_status:'', nagad_status:'', bkash_remarks:'', nagad_remarks:'', reply_uploaded_at:null };
        s.comments.push({ role:'SYSTEM_ADMIN', by:'Demo Administrator', staff_id:'SA-0001',
          prev, next:'PENDING_PRE_REGISTRATION_CHECK', text:'Sent to providers for existence check.', at:dateStr(9, 29) });
      });
      this.notify(`${rows.length} record(s) exported and moved to Pending Pre-Registration Check.`, 'success');
    },
    applyPreReg(s, verdict) {
      const prev = s.status;
      /* BR-004-02 — both providers must be CLEAR (providers/views.py pre_registration_upload) */
      if (verdict === 'CLEAR') {
        s.pre_reg = Object.assign(s.pre_reg || {}, { bkash_status:'CLEAR', nagad_status:'CLEAR', reply_uploaded_at:dateStr(9, 29) });
        s.status = 'READY_FOR_OUTPUT';
      } else {
        s.pre_reg = Object.assign(s.pre_reg || {}, { bkash_status:'EXISTS',
          bkash_remarks:'Wallet already active under another merchant code', reply_uploaded_at:dateStr(9, 29) });
        s.status = 'PRE_REGISTRATION_ISSUE_FOUND';
      }
      s.comments.push({ role:'SYSTEM_ADMIN', by:'Demo Administrator', staff_id:'SA-0001', prev, next:s.status,
        text: verdict === 'CLEAR' ? 'Both providers replied CLEAR.' : 'Provider reply shows an existing wallet.', at:dateStr(9, 29) });
      this.notify(`${s.branch_name} → ${this.stateLabel(s.status)}`, verdict === 'CLEAR' ? 'success' : 'warning');
    },

    /* ── settings ── */
    toggleHO(alreadySet) {
      if (!alreadySet) this.settings.ho_review_required = !this.settings.ho_review_required;
      this.notify(this.settings.ho_review_required
        ? 'HO review layer ON — VERIFIED_BY_REGION now routes through SENT_TO_HO.'
        : 'HO review layer OFF — VERIFIED_BY_REGION now flows straight to the pre-registration check.', 'info');
    },
    clearFlag(s) {
      s.name_mismatch_flag = false;
      s.comments.push({ role:'SYSTEM_ADMIN', by:'Demo Administrator', staff_id:'SA-0001',
        prev:s.status, next:s.status, text:'Name mismatch flag cleared after manual verification against the cheque.', at:dateStr(9, 29) });
      this.notify('Flag cleared — the submission can proceed.', 'success');
    },

    /* ── guided tour ── */
    openTour() { this.tourOpen = true; if (this.tourStep < 0) this.tourStep = 0; },
    runStep(i) {
      const s = TOUR[i];
      this.tourStep = i;
      if (!this.tourDone.includes(i)) this.tourDone.push(i);
      if (!this.role) { this.role = s.role; }
      else if (s.role && s.role !== this.role) { this.role = s.role; }
      if (s.screen === 'reg-form' && this.screen !== 'reg-form') this.startForm();
      else this.screen = s.screen;
      if (s.action === 'demoValidate') {
        this.form.wallet_number = '01234'; this.form.bank_branch_routing_number = '1234';
        this.form.account_name = 'Shimulbari Samity Fund';
        this.validateForm();
      }
      window.scrollTo(0, 0);
      const el = document.querySelector('.page-body');
      if (el) { el.classList.remove('tour-highlight'); void el.offsetWidth; el.classList.add('tour-highlight'); }
    },
    nextStep() { if (this.tourStep < TOUR.length - 1) this.runStep(this.tourStep + 1); },
    prevStep() { if (this.tourStep > 0) this.runStep(this.tourStep - 1); },
    resetTour() { this.tourStep = -1; this.tourDone = []; this.logout(); this.tourOpen = false; },
  };
}
