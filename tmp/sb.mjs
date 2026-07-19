// stub:react
var useState = () => [];
var useEffect = () => {
};

// src/lib/sheets-data.js
var LS_KEY = "rally_sheets_v1";
var SHEET_FUNCTIONS = [
  { name: "SUM", sig: "SUM(A1:A9)", desc: "Add a range or list of numbers." },
  { name: "AVERAGE", sig: "AVERAGE(B2:B6)", desc: "Mean of the numeric values." },
  { name: "MIN", sig: "MIN(C2:C6)", desc: "Smallest number." },
  { name: "MAX", sig: "MAX(C2:C6)", desc: "Largest number." },
  { name: "COUNT", sig: "COUNT(A2:A9)", desc: "How many numeric cells." },
  { name: "IF", sig: "IF(D2>1, F2*0.25, 0)", desc: "Branch on a condition." },
  { name: "ROUND", sig: "ROUND(E2, 0)", desc: "Round to N decimal places." },
  { name: "CONCAT", sig: 'CONCAT("Rep ", A2)', desc: "Join text together." },
  { name: "ABS", sig: "ABS(B2-C2)", desc: "Absolute value." }
];
var FormulaError = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
};
function colToNum(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n;
}
function numToCol(n) {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
function colLabel(n) {
  return numToCol(n);
}
function parseRef(id) {
  const m = /^([A-Z]+)(\d+)$/.exec(id);
  if (!m) throw new FormulaError("#REF!");
  return { col: colToNum(m[1]), row: parseInt(m[2], 10) };
}
function rangeIds(from, to) {
  const a = parseRef(from), b = parseRef(to);
  const c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col);
  const r1 = Math.min(a.row, b.row), r2 = Math.max(a.row, b.row);
  const ids = [];
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) ids.push(numToCol(c) + r);
  return ids;
}
function toNum(v) {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v == null || v === "") return 0;
  const n = Number(v);
  if (isNaN(n)) throw new FormulaError("#VALUE!");
  return n;
}
function toStr(v) {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
}
function truthy(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (v == null || v === "") return false;
  return true;
}
function compareVals(l, r, op) {
  let cmp;
  if (typeof l === "number" && typeof r === "number") cmp = l - r;
  else cmp = toStr(l).localeCompare(toStr(r));
  switch (op) {
    case "=":
      return cmp === 0;
    case "<>":
      return cmp !== 0;
    case "<":
      return cmp < 0;
    case ">":
      return cmp > 0;
    case "<=":
      return cmp <= 0;
    case ">=":
      return cmp >= 0;
    default:
      throw new FormulaError("#ERR!");
  }
}
function tokenize(src) {
  const toks = [];
  let i = 0;
  const isDigit = (c) => c >= "0" && c <= "9";
  const isAlpha = (c) => c >= "A" && c <= "Z" || c >= "a" && c <= "z";
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "	" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === '"') {
      let j = i + 1, str = "";
      while (j < src.length && src[j] !== '"') {
        str += src[j];
        j++;
      }
      toks.push({ t: "str", v: str });
      i = j + 1;
      continue;
    }
    if (isDigit(c) || c === "." && isDigit(src[i + 1])) {
      let j = i, num = "";
      while (j < src.length && (isDigit(src[j]) || src[j] === ".")) {
        num += src[j];
        j++;
      }
      toks.push({ t: "num", v: parseFloat(num) });
      i = j;
      continue;
    }
    if (isAlpha(c)) {
      let j = i, id = "";
      while (j < src.length && (isAlpha(src[j]) || isDigit(src[j]) || src[j] === "_")) {
        id += src[j];
        j++;
      }
      toks.push({ t: "id", v: id });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "<>") {
      toks.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/^&=<>(),:%".indexOf(c) !== -1) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new FormulaError("#ERR!");
  }
  return toks;
}
function parseFormula(toks) {
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const isOp = (v) => {
    const t = peek();
    return t && t.t === "op" && (v == null || (Array.isArray(v) ? v.indexOf(t.v) !== -1 : t.v === v));
  };
  const expect = (v) => {
    const t = next();
    if (!t || t.v !== v) throw new FormulaError("#ERR!");
  };
  function parseExpr() {
    return parseCompare();
  }
  function parseCompare() {
    let left = parseConcat();
    while (isOp(["=", "<", ">", "<=", ">=", "<>"])) {
      const op = next().v;
      left = { k: "bin", op, left, right: parseConcat() };
    }
    return left;
  }
  function parseConcat() {
    let left = parseAdd();
    while (isOp("&")) {
      next();
      left = { k: "bin", op: "&", left, right: parseAdd() };
    }
    return left;
  }
  function parseAdd() {
    let left = parseMul();
    while (isOp(["+", "-"])) {
      const op = next().v;
      left = { k: "bin", op, left, right: parseMul() };
    }
    return left;
  }
  function parseMul() {
    let left = parsePow();
    while (isOp(["*", "/"])) {
      const op = next().v;
      left = { k: "bin", op, left, right: parsePow() };
    }
    return left;
  }
  function parsePow() {
    let left = parsePostfix();
    while (isOp("^")) {
      next();
      left = { k: "bin", op: "^", left, right: parsePostfix() };
    }
    return left;
  }
  function parsePostfix() {
    let node = parseUnary();
    while (isOp("%")) {
      next();
      node = { k: "unary", op: "%", arg: node };
    }
    return node;
  }
  function parseUnary() {
    if (isOp(["-", "+"])) {
      const op = next().v;
      return { k: "unary", op, arg: parseUnary() };
    }
    return parsePrimary();
  }
  function parsePrimary() {
    const t = peek();
    if (!t) throw new FormulaError("#ERR!");
    if (t.t === "num") {
      next();
      return { k: "num", v: t.v };
    }
    if (t.t === "str") {
      next();
      return { k: "str", v: t.v };
    }
    if (t.t === "op" && t.v === "(") {
      next();
      const e = parseExpr();
      expect(")");
      return e;
    }
    if (t.t === "id") {
      next();
      const name = t.v;
      if (isOp("(")) {
        next();
        const args = [];
        if (!isOp(")")) {
          args.push(parseExpr());
          while (isOp(",")) {
            next();
            args.push(parseExpr());
          }
        }
        expect(")");
        return { k: "func", name: name.toUpperCase(), args };
      }
      if (isOp(":")) {
        next();
        const t2 = next();
        if (!t2 || t2.t !== "id") throw new FormulaError("#ERR!");
        return { k: "range", from: name.toUpperCase(), to: t2.v.toUpperCase() };
      }
      const up = name.toUpperCase();
      if (up === "TRUE") return { k: "bool", v: true };
      if (up === "FALSE") return { k: "bool", v: false };
      return { k: "ref", id: up };
    }
    throw new FormulaError("#ERR!");
  }
  const ast = parseExpr();
  if (p < toks.length) throw new FormulaError("#ERR!");
  return ast;
}
function nodeValues(node, cv) {
  if (node.k === "range") return rangeIds(node.from, node.to).map((id) => cv(id));
  return [evalAst(node, cv)];
}
function evalAst(node, cv) {
  switch (node.k) {
    case "num":
      return node.v;
    case "str":
      return node.v;
    case "bool":
      return node.v;
    case "ref":
      return cv(node.id);
    case "range":
      throw new FormulaError("#VALUE!");
    // a bare range is not a scalar
    case "unary": {
      if (node.op === "%") return toNum(evalAst(node.arg, cv)) / 100;
      const v = toNum(evalAst(node.arg, cv));
      return node.op === "-" ? -v : v;
    }
    case "bin":
      return evalBin(node, cv);
    case "func":
      return evalFunc(node, cv);
    default:
      throw new FormulaError("#ERR!");
  }
}
function evalBin(node, cv) {
  if (node.op === "&") return toStr(evalAst(node.left, cv)) + toStr(evalAst(node.right, cv));
  if (["=", "<", ">", "<=", ">=", "<>"].indexOf(node.op) !== -1) return compareVals(evalAst(node.left, cv), evalAst(node.right, cv), node.op);
  const a = toNum(evalAst(node.left, cv)), b = toNum(evalAst(node.right, cv));
  switch (node.op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      if (b === 0) throw new FormulaError("#DIV/0!");
      return a / b;
    case "^":
      return Math.pow(a, b);
    default:
      throw new FormulaError("#ERR!");
  }
}
function evalFunc(node, cv) {
  const gather = () => node.args.reduce((acc, a) => acc.concat(nodeValues(a, cv)), []);
  const nums = () => gather().filter((v) => typeof v === "number" && !isNaN(v));
  const arg = (i) => evalAst(node.args[i], cv);
  switch (node.name) {
    case "SUM":
      return nums().reduce((s, x) => s + x, 0);
    case "AVERAGE": {
      const n = nums();
      if (!n.length) throw new FormulaError("#DIV/0!");
      return n.reduce((s, x) => s + x, 0) / n.length;
    }
    case "MIN": {
      const n = nums();
      return n.length ? Math.min(...n) : 0;
    }
    case "MAX": {
      const n = nums();
      return n.length ? Math.max(...n) : 0;
    }
    case "COUNT":
      return nums().length;
    case "COUNTA":
      return gather().filter((v) => v !== "" && v != null).length;
    case "ROUND": {
      const x = toNum(arg(0));
      const d = node.args.length > 1 ? toNum(arg(1)) : 0;
      const f = Math.pow(10, d);
      return Math.round(x * f) / f;
    }
    case "ABS":
      return Math.abs(toNum(arg(0)));
    case "IF": {
      const c = truthy(arg(0));
      if (c) return arg(1);
      return node.args.length > 2 ? arg(2) : false;
    }
    case "CONCAT":
    case "CONCATENATE":
      return gather().map(toStr).join("");
    default:
      throw new FormulaError("#NAME?");
  }
}
function evalRaw(raw, cv) {
  if (raw == null) return "";
  const s = String(raw);
  if (s[0] === "=") return evalAst(parseFormula(tokenize(s.slice(1))), cv);
  if (s.trim() === "") return "";
  const n = Number(s);
  if (!isNaN(n) && s.trim() !== "") return n;
  return s;
}
function computeSheet(sheet) {
  const cache = /* @__PURE__ */ new Map();
  const visiting = /* @__PURE__ */ new Set();
  const rawOf = (id) => {
    const c = sheet.cells[id];
    return c ? c.raw : "";
  };
  function cellValue(id) {
    if (cache.has(id)) return cache.get(id);
    if (visiting.has(id)) throw new FormulaError("#CYCLE!");
    visiting.add(id);
    let val;
    try {
      val = evalRaw(rawOf(id), cellValue);
    } finally {
      visiting.delete(id);
    }
    cache.set(id, val);
    return val;
  }
  const out = {};
  for (const id of Object.keys(sheet.cells)) {
    const c = sheet.cells[id];
    if (c.raw == null || c.raw === "") continue;
    try {
      out[id] = { value: cellValue(id), error: null };
    } catch (e) {
      out[id] = { value: null, error: e && e.code ? e.code : "#ERR!" };
    }
  }
  return out;
}
function formatCellValue(value, fmt) {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") return value;
  const n = value;
  if (fmt === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  if (fmt === "percent") return (n * 100).toFixed(1) + "%";
  if (fmt === "number") return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
function blankSheet(id, name, rows = 50, cols = 26) {
  return { id, name, rows, cols, cells: {} };
}
function cellsFrom(grid) {
  const cells = {};
  grid.forEach((row, ri) => {
    (row || []).forEach((spec, ci) => {
      if (spec == null) return;
      const id = numToCol(ci + 1) + (ri + 1);
      const cell = typeof spec === "object" ? { raw: String(spec.raw), ...spec } : { raw: String(spec) };
      if (typeof spec === "object") cell.raw = String(spec.raw);
      cells[id] = cell;
    });
  });
  return cells;
}
function buildSeed() {
  const H = (raw) => ({ raw, bold: true });
  const CUR = (raw) => ({ raw, fmt: "currency" });
  const PCT = (raw) => ({ raw, fmt: "percent" });
  const NUM = (raw) => ({ raw, fmt: "number" });
  const RGT = (raw) => ({ raw, align: "right" });
  const commission = blankSheet("sh_comm", "Commissions");
  commission.cells = cellsFrom([
    [H("Rep"), H("Deals Closed"), H("Quota"), H("Attainment"), H("Base Rate"), H("Commission"), H("Accelerator"), H("Total Payout")],
    ["Jordan Avery", CUR("940000"), CUR("900000"), PCT("=B2/C2"), PCT("0.08"), CUR("=B2*E2"), CUR("=IF(D2>1, F2*0.25, 0)"), CUR("=F2+G2")],
    ["Simone Diaz", CUR("610000"), CUR("750000"), PCT("=B3/C3"), PCT("0.08"), CUR("=B3*E3"), CUR("=IF(D3>1, F3*0.25, 0)"), CUR("=F3+G3")],
    ["Theo Bennett", CUR("780000"), CUR("750000"), PCT("=B4/C4"), PCT("0.08"), CUR("=B4*E4"), CUR("=IF(D4>1, F4*0.25, 0)"), CUR("=F4+G4")],
    ["Nina Kapoor", CUR("1320000"), CUR("1200000"), PCT("=B5/C5"), PCT("0.09"), CUR("=B5*E5"), CUR("=IF(D5>1, F5*0.25, 0)"), CUR("=F5+G5")],
    ["Marcus Hale", CUR("520000"), CUR("700000"), PCT("=B6/C6"), PCT("0.08"), CUR("=B6*E6"), CUR("=IF(D6>1, F6*0.25, 0)"), CUR("=F6+G6")],
    [H("Team"), { raw: "=SUM(B2:B6)", bold: true, fmt: "currency" }, { raw: "=SUM(C2:C6)", bold: true, fmt: "currency" }, { raw: "=B7/C7", bold: true, fmt: "percent" }, null, { raw: "=SUM(F2:F6)", bold: true, fmt: "currency" }, { raw: "=SUM(G2:G6)", bold: true, fmt: "currency" }, { raw: "=SUM(H2:H6)", bold: true, fmt: "currency" }],
    [],
    [{ raw: '=CONCAT("Blended attainment ", ROUND(D7*100,1), "%  -  payout ", H7)', bold: true }]
  ]);
  const budget = blankSheet("sh_budget", "FY Budget");
  budget.cells = cellsFrom([
    [H("Category"), H("Q1"), H("Q2"), H("Q3"), H("Q4"), H("Full Year"), H("% of Total")],
    ["Salaries", CUR("320000"), CUR("320000"), CUR("335000"), CUR("335000"), CUR("=SUM(B2:E2)"), PCT("=F2/F8")],
    ["Marketing", CUR("85000"), CUR("120000"), CUR("95000"), CUR("140000"), CUR("=SUM(B3:E3)"), PCT("=F3/F8")],
    ["Software", CUR("42000"), CUR("42000"), CUR("48000"), CUR("48000"), CUR("=SUM(B4:E4)"), PCT("=F4/F8")],
    ["Travel", CUR("18000"), CUR("26000"), CUR("22000"), CUR("31000"), CUR("=SUM(B5:E5)"), PCT("=F5/F8")],
    ["Facilities", CUR("55000"), CUR("55000"), CUR("55000"), CUR("58000"), CUR("=SUM(B6:E6)"), PCT("=F6/F8")],
    ["Contractors", CUR("60000"), CUR("40000"), CUR("75000"), CUR("50000"), CUR("=SUM(B7:E7)"), PCT("=F7/F8")],
    [H("Total"), { raw: "=SUM(B2:B7)", bold: true, fmt: "currency" }, { raw: "=SUM(C2:C7)", bold: true, fmt: "currency" }, { raw: "=SUM(D2:D7)", bold: true, fmt: "currency" }, { raw: "=SUM(E2:E7)", bold: true, fmt: "currency" }, { raw: "=SUM(F2:F7)", bold: true, fmt: "currency" }, { raw: "=F8/F8", bold: true, fmt: "percent" }],
    [],
    ["Peak quarter", { raw: "=MAX(B8:E8)", fmt: "currency" }, "Avg quarter", { raw: "=ROUND(AVERAGE(B8:E8),0)", fmt: "currency" }]
  ]);
  const pipeline = blankSheet("sh_pipe", "Pipeline Model");
  pipeline.cells = cellsFrom([
    [H("Stage"), H("Open Deals"), H("Avg Deal Size"), H("Win Prob"), H("Full Value"), H("Weighted Value")],
    ["Lead", NUM("24"), CUR("38000"), PCT("0.10"), CUR("=B2*C2"), CUR("=ROUND(B2*C2*D2,0)")],
    ["Qualified", NUM("18"), CUR("52000"), PCT("0.25"), CUR("=B3*C3"), CUR("=ROUND(B3*C3*D3,0)")],
    ["Discovery", NUM("12"), CUR("61000"), PCT("0.45"), CUR("=B4*C4"), CUR("=ROUND(B4*C4*D4,0)")],
    ["Proposal", NUM("8"), CUR("74000"), PCT("0.65"), CUR("=B5*C5"), CUR("=ROUND(B5*C5*D5,0)")],
    ["Negotiation", NUM("5"), CUR("92000"), PCT("0.85"), CUR("=B6*C6"), CUR("=ROUND(B6*C6*D6,0)")],
    [H("Pipeline"), { raw: "=SUM(B2:B6)", bold: true, fmt: "number" }, null, null, { raw: "=SUM(E2:E6)", bold: true, fmt: "currency" }, { raw: "=SUM(F2:F6)", bold: true, fmt: "currency" }],
    [],
    [{ raw: '=CONCAT("Coverage ", ROUND(E7/F7,1), "x  -  weighted forecast ", F7)', bold: true }]
  ]);
  const workbooks = [
    { id: "wb_comm", name: "Sales Commission Calculator", desc: "Attainment, accelerators, and payouts computed live.", icon: "dollar", createdAt: 0, activeSheetId: "sh_comm", sheets: [commission] },
    { id: "wb_budget", name: "FY Operating Budget", desc: "Quarterly plan with automatic totals and mix.", icon: "pie", createdAt: 0, activeSheetId: "sh_budget", sheets: [budget] },
    { id: "wb_pipe", name: "Pipeline Revenue Model", desc: "Probability-weighted forecast off the deal book.", icon: "trendUp", createdAt: 0, activeSheetId: "sh_pipe", sheets: [pipeline] }
  ];
  return { workbooks };
}
var state = load();
var subs = /* @__PURE__ */ new Set();
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.workbooks)) return s;
    }
  } catch {
  }
  const seed = buildSeed();
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(seed));
  } catch {
  }
  return seed;
}
function commit(next) {
  state = next;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
  }
  subs.forEach((fn) => fn(state));
}
function resetSheets() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
  }
  state = load();
  subs.forEach((fn) => fn(state));
}
function getSheetsState() {
  return state;
}
function useSheets(selector = (s) => s) {
  const [snap, setSnap] = useState(() => selector(state));
  useEffect(() => {
    const fn = (s) => setSnap(selector(s));
    subs.add(fn);
    fn(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}
var idc = 1;
var nid = (p) => `${p}_${Date.now().toString(36)}${(idc++).toString(36)}`;
var getWorkbooks = () => state.workbooks;
var getWorkbook = (id) => state.workbooks.find((w) => w.id === id);
var getSheet = (wbId, sheetId) => {
  const w = getWorkbook(wbId);
  return w ? w.sheets.find((s) => s.id === sheetId) : null;
};
function workbookStats(wb) {
  let filled = 0, formulas = 0;
  for (const sh of wb.sheets) {
    for (const id of Object.keys(sh.cells)) {
      const raw = sh.cells[id].raw;
      if (raw != null && raw !== "") {
        filled++;
        if (String(raw)[0] === "=") formulas++;
      }
    }
  }
  return { filled, formulas, sheets: wb.sheets.length };
}
function createWorkbook(name = "Untitled workbook") {
  const sheetId = nid("sh");
  const wb = {
    id: nid("wb"),
    name: name && name.trim() || "Untitled workbook",
    desc: "Built in Rally.",
    icon: "grid",
    createdAt: Date.now(),
    activeSheetId: sheetId,
    sheets: [blankSheet(sheetId, "Sheet 1")]
  };
  commit({ ...state, workbooks: [...state.workbooks, wb] });
  return wb;
}
function renameWorkbook(id, name) {
  if (!name || !name.trim()) return { error: "name" };
  commit({ ...state, workbooks: state.workbooks.map((w) => w.id === id ? { ...w, name: name.trim() } : w) });
  return { ok: true };
}
function deleteWorkbook(id) {
  commit({ ...state, workbooks: state.workbooks.filter((w) => w.id !== id) });
  return { ok: true };
}
function addSheet(wbId, name) {
  const w = getWorkbook(wbId);
  if (!w) return { error: "missing" };
  const sheetId = nid("sh");
  const sheet = blankSheet(sheetId, name || `Sheet ${w.sheets.length + 1}`);
  commit({ ...state, workbooks: state.workbooks.map((x) => x.id === wbId ? { ...x, sheets: [...x.sheets, sheet], activeSheetId: sheetId } : x) });
  return { sheet };
}
function renameSheet(wbId, sheetId, name) {
  if (!name || !name.trim()) return { error: "name" };
  commit({ ...state, workbooks: state.workbooks.map((w) => w.id !== wbId ? w : { ...w, sheets: w.sheets.map((s) => s.id === sheetId ? { ...s, name: name.trim() } : s) }) });
  return { ok: true };
}
function deleteSheet(wbId, sheetId) {
  const w = getWorkbook(wbId);
  if (!w || w.sheets.length <= 1) return { error: "last" };
  const remaining = w.sheets.filter((s) => s.id !== sheetId);
  const activeSheetId = w.activeSheetId === sheetId ? remaining[0].id : w.activeSheetId;
  commit({ ...state, workbooks: state.workbooks.map((x) => x.id === wbId ? { ...x, sheets: remaining, activeSheetId } : x) });
  return { ok: true };
}
function setActiveSheet(wbId, sheetId) {
  commit({ ...state, workbooks: state.workbooks.map((w) => w.id === wbId ? { ...w, activeSheetId: sheetId } : w) });
}
function addRows(wbId, sheetId, n = 10) {
  commit({ ...state, workbooks: state.workbooks.map((w) => w.id !== wbId ? w : { ...w, sheets: w.sheets.map((s) => s.id === sheetId ? { ...s, rows: Math.min(500, s.rows + n) } : s) }) });
}
function addCols(wbId, sheetId, n = 1) {
  commit({ ...state, workbooks: state.workbooks.map((w) => w.id !== wbId ? w : { ...w, sheets: w.sheets.map((s) => s.id === sheetId ? { ...s, cols: Math.min(52, s.cols + n) } : s) }) });
}
function setCell(wbId, sheetId, cellId, patch) {
  const workbooks = state.workbooks.map((w) => {
    if (w.id !== wbId) return w;
    return {
      ...w,
      sheets: w.sheets.map((s) => {
        if (s.id !== sheetId) return s;
        const prev = s.cells[cellId] || {};
        const nextCell = { ...prev, ...patch };
        const cells = { ...s.cells };
        const blankRaw = nextCell.raw == null || nextCell.raw === "";
        const blankFmt = !nextCell.bold && !nextCell.bg && (!nextCell.align || nextCell.align === "left") && (!nextCell.fmt || nextCell.fmt === "auto");
        if (blankRaw && blankFmt) delete cells[cellId];
        else cells[cellId] = nextCell;
        return { ...s, cells };
      })
    };
  });
  commit({ ...state, workbooks });
}
function clearCell(wbId, sheetId, cellId) {
  const workbooks = state.workbooks.map((w) => {
    if (w.id !== wbId) return w;
    return { ...w, sheets: w.sheets.map((s) => {
      if (s.id !== sheetId) return s;
      const cells = { ...s.cells };
      delete cells[cellId];
      return { ...s, cells };
    }) };
  });
  commit({ ...state, workbooks });
}
export {
  SHEET_FUNCTIONS,
  addCols,
  addRows,
  addSheet,
  clearCell,
  colLabel,
  colToNum,
  computeSheet,
  createWorkbook,
  deleteSheet,
  deleteWorkbook,
  formatCellValue,
  getSheet,
  getSheetsState,
  getWorkbook,
  getWorkbooks,
  numToCol,
  renameSheet,
  renameWorkbook,
  resetSheets,
  setActiveSheet,
  setCell,
  useSheets,
  workbookStats
};
