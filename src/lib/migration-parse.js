/*
 * migration-parse.js
 *
 * Smart, format-tolerant parser + value-aware fuzzy column mapper for the
 * Ardovo data-migration engine. Pure functions only. No imports, no deps,
 * no side effects, no localStorage, no DOM. Browser-safe. ASCII only.
 *
 * EXPORTS
 * -------
 * sniffDelimiter(text) -> ',' | ';' | '\t' | '|'
 *   Guesses the delimiter of a delimited text blob by measuring column-count
 *   consistency across the first few non-empty lines (quotes respected).
 *   Falls back to ',' when ambiguous.
 *
 * parseAny(text, opts = {}) -> { headers, rows, format, delimiter }
 *   headers  : string[]                     (trimmed column names)
 *   rows     : Array<Record<string,string>> (every value stringified)
 *   format   : 'json' | 'csv' | 'ssv' | 'tsv' | 'psv' | 'unknown'
 *   delimiter: ',' | ';' | '\t' | '|'
 *   Accepts JSON arrays of objects, or comma/semicolon/tab/pipe delimited
 *   text with quoted fields, escaped quotes (""), CRLF, ragged rows, and
 *   blank-line skipping. Never throws; returns an empty unknown result on
 *   total failure. opts.delimiter forces a delimiter for delimited input.
 *
 * inferColumnType(values) ->
 *   'email'|'phone'|'url'|'date'|'currency'|'number'|'boolean'|'select'|'name'|'text'
 *   Value-based classification over up to ~200 non-empty samples.
 *
 * levenshtein(a, b) -> integer   (edit distance)
 * tokenSimilarity(a, b) -> number 0..1
 *   Blend of token-set Jaccard and per-token Levenshtein-ratio, on
 *   normalized (lowercased, alnum-tokenized) input.
 *
 * fuzzyAutoMap(headers, fields, opts = {}) ->
 *   { mapping, confidence, reasons, secondBest }
 *   fields = [{ key, label, required?, type?, synonyms?: string[] }]
 *   opts.rows (optional) parsed rows so column VALUES inform the match.
 *   Greedy, deterministic, stable, never throws. Leaves '' below threshold.
 *
 * SELF-CHECK EXAMPLES (comments, not executed)
 * --------------------------------------------
 * sniffDelimiter("a;b;c\n1;2;3") -> ';'
 * parseAny('[{"Name":"Ada","Email":"a@x.io"}]')
 *   -> { headers:['Name','Email'],
 *        rows:[{Name:'Ada',Email:'a@x.io'}], format:'json', delimiter:',' }
 * parseAny('n,e\r\n"Doe, J","d@x.io"\r\n')
 *   -> headers ['n','e'], rows [{ n:'Doe, J', e:'d@x.io' }], format 'csv'
 * inferColumnType(['a@x.io','b@y.com','c@z.net']) -> 'email'
 * inferColumnType(['(555) 123-4567','555.234.5678']) -> 'phone'
 * fuzzyAutoMap(['E-mail Address'], [{key:'email',label:'Email',type:'email'}],
 *   { rows:[{ 'E-mail Address':'a@x.io' }] })
 *   -> mapping['E-mail Address'] === 'email' with high confidence
 */

// ---------------------------------------------------------------------------
// Delimiter sniffing
// ---------------------------------------------------------------------------

var CANDIDATE_DELIMS = [',', ';', '\t', '|'];

// Split a single line into fields for a given delimiter, respecting double
// quotes and escaped quotes (""). Returns array of raw (still-unquoted-count)
// field strings. Used only for column-count consistency, so exact unquoting
// is not required here.
function splitLineRespectingQuotes(line, delim) {
  var fields = [];
  var cur = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line.charAt(i);
    if (ch === '"') {
      if (inQuotes && line.charAt(i + 1) === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delim && !inQuotes) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function firstNonEmptyLines(text, limit) {
  var normalized = String(text == null ? '' : text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var raw = normalized.split('\n');
  var out = [];
  for (var i = 0; i < raw.length && out.length < limit; i++) {
    if (raw[i].trim() !== '') out.push(raw[i]);
  }
  return out;
}

function sniffDelimiter(text) {
  var lines = firstNonEmptyLines(text, 8);
  if (lines.length === 0) return ',';

  var best = ',';
  var bestScore = -1;

  for (var d = 0; d < CANDIDATE_DELIMS.length; d++) {
    var delim = CANDIDATE_DELIMS[d];
    var counts = [];
    for (var i = 0; i < lines.length; i++) {
      counts.push(splitLineRespectingQuotes(lines[i], delim).length - 1); // delimiter count per line
    }

    // Total occurrences of this delimiter.
    var total = 0;
    for (var t = 0; t < counts.length; t++) total += counts[t];
    if (total === 0) continue; // delimiter never appears -> not a candidate

    // Consistency: how often the per-line delimiter count equals the mode.
    var freq = {};
    for (var c = 0; c < counts.length; c++) {
      var k = String(counts[c]);
      freq[k] = (freq[k] || 0) + 1;
    }
    var modeKey = null;
    var modeFreq = 0;
    for (var key in freq) {
      if (freq[key] > modeFreq || (freq[key] === modeFreq && Number(key) > Number(modeKey))) {
        modeFreq = freq[key];
        modeKey = key;
      }
    }
    var modeCount = Number(modeKey); // delimiters-per-line at the mode

    // Skip delimiters whose consistent column count is zero.
    if (modeCount <= 0) continue;

    var consistency = modeFreq / counts.length; // 0..1
    // Score favors consistency first, then more columns, then more lines.
    var score = consistency * 1000 + modeCount * 10 + Math.min(modeFreq, 5);

    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Delimited parsing (full RFC-4180-ish state machine)
// ---------------------------------------------------------------------------

// Parse the entire delimited document into an array of records (each an array
// of string cells). Handles quotes, escaped quotes, embedded delimiters and
// newlines inside quotes, CRLF, and trailing newline.
function parseDelimited(text, delim) {
  var records = [];
  var row = [];
  var cur = '';
  var inQuotes = false;
  var i = 0;
  var n = text.length;
  var fieldStarted = false;

  function endField() {
    row.push(cur);
    cur = '';
    fieldStarted = false;
  }
  function endRow() {
    endField();
    records.push(row);
    row = [];
  }

  while (i < n) {
    var ch = text.charAt(i);

    if (inQuotes) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cur += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      fieldStarted = true;
      i++;
      continue;
    }
    if (ch === delim) {
      endField();
      i++;
      continue;
    }
    if (ch === '\r') {
      if (text.charAt(i + 1) === '\n') i++;
      endRow();
      i++;
      continue;
    }
    if (ch === '\n') {
      endRow();
      i++;
      continue;
    }
    cur += ch;
    fieldStarted = true;
    i++;
  }

  // Flush the final field/row unless the doc ended exactly on a row break with
  // nothing pending.
  if (fieldStarted || cur !== '' || row.length > 0) {
    endRow();
  }

  return records;
}

function isBlankRecord(rec) {
  if (!rec || rec.length === 0) return true;
  for (var i = 0; i < rec.length; i++) {
    if (String(rec[i]).trim() !== '') return false;
  }
  return true;
}

function formatForDelimiter(delim) {
  if (delim === ';') return 'ssv';
  if (delim === '\t') return 'tsv';
  if (delim === '|') return 'psv';
  return 'csv';
}

function scalarToString(v) {
  if (v == null) return '';
  var t = typeof v;
  if (t === 'string') return v;
  if (t === 'number' || t === 'boolean') return String(v);
  // objects / arrays -> JSON string
  try {
    return JSON.stringify(v);
  } catch (e) {
    return String(v);
  }
}

function parseJsonArray(text) {
  var data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return null;
  }
  // Accept an array of objects. A single object becomes a one-row table.
  var arr;
  if (Array.isArray(data)) {
    arr = data;
  } else if (data && typeof data === 'object') {
    arr = [data];
  } else {
    return null;
  }

  var headers = [];
  var seen = {};
  for (var i = 0; i < arr.length; i++) {
    var obj = arr[i];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue;
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && !seen[key]) {
        seen[key] = true;
        headers.push(key);
      }
    }
  }
  if (headers.length === 0) return null;

  var rows = [];
  for (var r = 0; r < arr.length; r++) {
    var src = arr[r];
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue;
    var rowObj = {};
    for (var h = 0; h < headers.length; h++) {
      var hk = headers[h];
      rowObj[hk] = Object.prototype.hasOwnProperty.call(src, hk)
        ? scalarToString(src[hk])
        : '';
    }
    rows.push(rowObj);
  }

  return { headers: headers, rows: rows, format: 'json', delimiter: ',' };
}

function parseAny(text, opts) {
  opts = opts || {};
  var empty = { headers: [], rows: [], format: 'unknown', delimiter: ',' };

  try {
    var raw = text == null ? '' : String(text);
    var trimmed = raw.replace(/^\uFEFF/, '').trim(); // strip BOM for detection
    if (trimmed === '') return empty;

    // JSON path
    if (trimmed.charAt(0) === '[' || trimmed.charAt(0) === '{') {
      var jsonResult = parseJsonArray(trimmed);
      if (jsonResult) return jsonResult;
      // fall through to delimited on JSON failure
    }

    // Delimited path
    var body = raw.replace(/^\uFEFF/, '');
    var delim = opts.delimiter && CANDIDATE_DELIMS.indexOf(opts.delimiter) !== -1
      ? opts.delimiter
      : sniffDelimiter(body);

    var records = parseDelimited(body, delim);

    // Drop fully blank records.
    var clean = [];
    for (var i = 0; i < records.length; i++) {
      if (!isBlankRecord(records[i])) clean.push(records[i]);
    }
    if (clean.length === 0) return empty;

    var headerRec = clean[0];
    var headers = [];
    var usedNames = {};
    for (var h = 0; h < headerRec.length; h++) {
      var name = String(headerRec[h]).trim();
      if (name === '') name = 'column_' + (h + 1);
      // de-duplicate collisions deterministically
      var baseName = name;
      var dupIdx = 2;
      while (usedNames[name]) {
        name = baseName + '_' + dupIdx;
        dupIdx++;
      }
      usedNames[name] = true;
      headers.push(name);
    }

    var rows = [];
    for (var r = 1; r < clean.length; r++) {
      var rec = clean[r];
      var rowObj = {};
      for (var c = 0; c < headers.length; c++) {
        var cell = c < rec.length ? rec[c] : '';
        rowObj[headers[c]] = cell == null ? '' : String(cell);
      }
      rows.push(rowObj);
    }

    return {
      headers: headers,
      rows: rows,
      format: formatForDelimiter(delim),
      delimiter: delim
    };
  } catch (e) {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Value-based column type inference
// ---------------------------------------------------------------------------

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
var URL_RE = /^(https?:\/\/)[^\s]+$/i;
var DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
var BOOL_SET = { true: 1, false: 1, yes: 1, no: 1, y: 1, n: 1, '0': 1, '1': 1 };
var MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec';

function nonEmptySamples(values, cap) {
  var out = [];
  if (!values) return out;
  for (var i = 0; i < values.length && out.length < cap; i++) {
    var v = values[i];
    if (v == null) continue;
    var s = String(v).trim();
    if (s !== '') out.push(s);
  }
  return out;
}

function looksLikePhone(s) {
  if (!/[0-9]/.test(s)) return false;
  // Only phone-ish characters allowed.
  if (!/^[+()\-.\s0-9]+$/.test(s)) return false;
  var digits = s.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function looksLikeUrl(s) {
  if (URL_RE.test(s)) return true;
  // bare domain like example.com or www.example.co.uk (no spaces)
  if (/\s/.test(s)) return false;
  var stripped = s.replace(/^www\./i, '');
  return DOMAIN_RE.test(stripped) && /\.[a-z]{2,}$/i.test(stripped);
}

function looksLikeCurrency(s) {
  // leading or trailing currency symbol ($ e P), optionally with formatting.
  if (/^[$eP]\s?-?\d[\d,]*(\.\d+)?$/.test(s)) return true;
  if (/^-?\d[\d,]*(\.\d+)?\s?[$eP]$/.test(s)) return true;
  return false;
}

function looksLikeNumber(s) {
  // allow thousands commas, decimals, negative, and trailing percent
  return /^-?\d{1,3}(,\d{3})*(\.\d+)?%?$/.test(s) || /^-?\d+(\.\d+)?%?$/.test(s);
}

function looksLikeDate(s) {
  var lower = s.toLowerCase();
  // ISO / YYYY-MM-DD / with time
  if (/^\d{4}-\d{2}-\d{2}([t ]\d{2}:\d{2}(:\d{2})?(\.\d+)?z?([+-]\d{2}:?\d{2})?)?$/i.test(s)) return true;
  // MM/DD/YYYY or DD/MM/YYYY or with 2-digit year, slashes or dashes
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s)) return true;
  // Mon DD YYYY / Mon DD, YYYY / DD Mon YYYY
  if (/^[a-z]{3,9}\.?\s+\d{1,2},?\s+\d{2,4}$/i.test(lower)) {
    for (var i = 0; i < 12; i++) {
      if (lower.indexOf(MONTHS.split(' ')[i]) === 0) return true;
    }
  }
  if (/^\d{1,2}\s+[a-z]{3,9}\.?\s+\d{2,4}$/i.test(lower)) {
    var toks = lower.split(/\s+/);
    if (toks[1] && MONTHS.indexOf(toks[1].slice(0, 3)) !== -1) return true;
  }
  return false;
}

function looksLikeName(s) {
  if (/[0-9]/.test(s)) return false;
  var tokens = s.split(/\s+/).filter(function (t) { return t !== ''; });
  if (tokens.length < 1 || tokens.length > 4) return false;
  for (var i = 0; i < tokens.length; i++) {
    var tok = tokens[i];
    // allow internal hyphen/apostrophe (O'Brien, Smith-Jones)
    if (!/^[A-Za-z][A-Za-z'\-.]*$/.test(tok)) return false;
    if (!/^[A-Z]/.test(tok)) return false; // capitalized word
  }
  return true;
}

function ratio(count, total) {
  return total === 0 ? 0 : count / total;
}

function inferColumnType(values) {
  var samples = nonEmptySamples(values, 200);
  var n = samples.length;
  if (n === 0) return 'text';

  var cEmail = 0, cPhone = 0, cUrl = 0, cCurrency = 0, cNumber = 0, cBool = 0,
      cDate = 0, cName = 0;
  var distinct = {};
  var distinctCount = 0;

  for (var i = 0; i < n; i++) {
    var s = samples[i];
    var low = s.toLowerCase();

    if (!Object.prototype.hasOwnProperty.call(distinct, low)) {
      distinct[low] = 1;
      distinctCount++;
    }

    if (EMAIL_RE.test(s)) cEmail++;
    if (looksLikePhone(s)) cPhone++;
    if (looksLikeUrl(s)) cUrl++;
    if (looksLikeCurrency(s)) cCurrency++;
    if (looksLikeNumber(s)) cNumber++;
    if (BOOL_SET[low]) cBool++;
    if (looksLikeDate(s)) cDate++;
    if (looksLikeName(s)) cName++;
  }

  // Order matters: most specific first.
  if (ratio(cEmail, n) > 0.7) return 'email';
  if (ratio(cPhone, n) > 0.7) return 'phone';
  if (ratio(cUrl, n) > 0.7) return 'url';
  if (ratio(cCurrency, n) > 0.6) return 'currency';

  // boolean before number so 0/1 columns read as boolean when the whole
  // column is boolean-ish
  if (ratio(cBool, n) > 0.8) return 'boolean';

  if (ratio(cNumber, n) > 0.8 && ratio(cCurrency, n) <= 0.6) return 'number';
  if (ratio(cDate, n) > 0.7) return 'date';

  if (ratio(cName, n) > 0.7) return 'name';

  // select: low-cardinality categorical
  var cap = Math.max(2, Math.min(12, Math.floor(n / 4)));
  if (distinctCount <= cap && distinctCount < n) return 'select';

  return 'text';
}

// ---------------------------------------------------------------------------
// String similarity
// ---------------------------------------------------------------------------

function levenshtein(a, b) {
  a = a == null ? '' : String(a);
  b = b == null ? '' : String(b);
  if (a === b) return 0;
  var la = a.length;
  var lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  var prev = new Array(lb + 1);
  var curr = new Array(lb + 1);
  for (var j = 0; j <= lb; j++) prev[j] = j;

  for (var i = 1; i <= la; i++) {
    curr[0] = i;
    var ca = a.charCodeAt(i - 1);
    for (var k = 1; k <= lb; k++) {
      var cost = ca === b.charCodeAt(k - 1) ? 0 : 1;
      var del = prev[k] + 1;
      var ins = curr[k - 1] + 1;
      var sub = prev[k - 1] + cost;
      var m = del < ins ? del : ins;
      curr[k] = m < sub ? m : sub;
    }
    for (var t = 0; t <= lb; t++) prev[t] = curr[t];
  }
  return prev[lb];
}

function normalizeTokens(s) {
  var norm = String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (norm === '') return [];
  return norm.split(/\s+/);
}

function levRatio(a, b) {
  if (a === b) return 1;
  var maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function tokenSimilarity(a, b) {
  var ta = normalizeTokens(a);
  var tb = normalizeTokens(b);
  if (ta.length === 0 && tb.length === 0) return 1;
  if (ta.length === 0 || tb.length === 0) return 0;

  // Jaccard over token sets.
  var setA = {};
  for (var i = 0; i < ta.length; i++) setA[ta[i]] = 1;
  var setB = {};
  for (var j = 0; j < tb.length; j++) setB[tb[j]] = 1;

  var inter = 0;
  var union = {};
  var key;
  for (key in setA) { union[key] = 1; if (setB[key]) inter++; }
  for (key in setB) { union[key] = 1; }
  var unionCount = 0;
  for (key in union) unionCount++;
  var jaccard = unionCount === 0 ? 0 : inter / unionCount;

  // Best-match Levenshtein ratio: for each token in the smaller set, find the
  // best fuzzy partner in the other set, average the scores. Symmetric-ish.
  var small = ta.length <= tb.length ? ta : tb;
  var large = ta.length <= tb.length ? tb : ta;
  var sum = 0;
  for (var s = 0; s < small.length; s++) {
    var best = 0;
    for (var l = 0; l < large.length; l++) {
      var r = levRatio(small[s], large[l]);
      if (r > best) best = r;
    }
    sum += best;
  }
  var fuzzy = small.length === 0 ? 0 : sum / small.length;

  // Blend: token-set overlap plus fuzzy token matching.
  return 0.5 * jaccard + 0.5 * fuzzy;
}

// ---------------------------------------------------------------------------
// Fuzzy auto-mapping
// ---------------------------------------------------------------------------

var MAP_THRESHOLD = 0.45;

function columnValuesFor(header, rows) {
  var out = [];
  if (!rows || !rows.length) return out;
  for (var i = 0; i < rows.length && out.length < 200; i++) {
    var row = rows[i];
    if (row && Object.prototype.hasOwnProperty.call(row, header)) {
      out.push(row[header]);
    }
  }
  return out;
}

// Score a single (header, field) pair. Returns { score, reason }.
function scorePair(header, headerNorm, field, inferredType) {
  var label = field.label || field.key || '';
  var synonyms = field.synonyms || [];

  // (a) header string match signals (exact / synonym / substring)
  var headerMatch = 0;
  var matchNote = '';
  var labelNorm = String(label).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  var keyNorm = String(field.key || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  if (headerNorm !== '' && (headerNorm === labelNorm || headerNorm === keyNorm)) {
    headerMatch = 1;
    matchNote = 'exact header match';
  } else {
    // synonym exact / contains
    for (var i = 0; i < synonyms.length; i++) {
      var synNorm = String(synonyms[i]).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (synNorm === '') continue;
      if (headerNorm === synNorm) {
        headerMatch = Math.max(headerMatch, 0.95);
        matchNote = "matches synonym '" + synonyms[i] + "'";
      } else if (headerNorm.indexOf(synNorm) !== -1 || synNorm.indexOf(headerNorm) !== -1) {
        headerMatch = Math.max(headerMatch, 0.8);
        if (matchNote === '') matchNote = "contains synonym '" + synonyms[i] + "'";
      }
    }
    // label substring containment
    if (labelNorm !== '' && (headerNorm.indexOf(labelNorm) !== -1 || labelNorm.indexOf(headerNorm) !== -1)) {
      headerMatch = Math.max(headerMatch, 0.75);
      if (matchNote === '') matchNote = 'label substring match';
    }
    if (keyNorm !== '' && (headerNorm.indexOf(keyNorm) !== -1 || keyNorm.indexOf(headerNorm) !== -1)) {
      headerMatch = Math.max(headerMatch, 0.7);
      if (matchNote === '') matchNote = 'key substring match';
    }
  }

  // (b) token similarity against label and each synonym; keep the best.
  var sim = tokenSimilarity(header, label);
  for (var s = 0; s < synonyms.length; s++) {
    var ss = tokenSimilarity(header, synonyms[s]);
    if (ss > sim) sim = ss;
  }

  // (c) value-type agreement bonus.
  var typeBonus = 0;
  var typeNote = '';
  if (field.type && inferredType && inferredType !== 'text' && inferredType !== 'unknown') {
    if (field.type === inferredType) {
      typeBonus = 0.35;
      typeNote = 'values look like ' + inferredType + 's';
    } else if (
      (field.type === 'name' && inferredType === 'select') ||
      (field.type === 'select' && inferredType === 'name') ||
      (field.type === 'number' && inferredType === 'currency') ||
      (field.type === 'currency' && inferredType === 'number')
    ) {
      // near-miss families: mild reward
      typeBonus = 0.1;
    } else {
      // strong type disagreement dampens confidence a touch
      typeBonus = -0.1;
    }
  }

  // Blend the header signal and token similarity, then apply the type bonus.
  var base = 0.6 * headerMatch + 0.4 * sim;
  var score = base + typeBonus;
  if (score < 0) score = 0;
  if (score > 1) score = 1;

  return { score: score, matchNote: matchNote, typeNote: typeNote };
}

function fuzzyAutoMap(headers, fields, opts) {
  opts = opts || {};
  var mapping = {};
  var confidence = {};
  var reasons = {};
  var secondBest = {};

  var safeHeaders = Array.isArray(headers) ? headers : [];
  var safeFields = Array.isArray(fields) ? fields : [];
  var rows = Array.isArray(opts.rows) ? opts.rows : null;
  var threshold = typeof opts.threshold === 'number' ? opts.threshold : MAP_THRESHOLD;

  // Precompute inferred type per header (once) from values.
  var inferredByHeader = {};
  for (var h = 0; h < safeHeaders.length; h++) {
    var hdr = safeHeaders[h];
    inferredByHeader[hdr] = rows ? inferColumnType(columnValuesFor(hdr, rows)) : 'text';
  }

  // Build the full score matrix: candidates[header] = sorted list of
  // { field, key, score, matchNote, typeNote }.
  var candidates = {};
  for (var i = 0; i < safeHeaders.length; i++) {
    var header = safeHeaders[i];
    var headerNorm = String(header).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    var inferred = inferredByHeader[header];
    var list = [];
    for (var f = 0; f < safeFields.length; f++) {
      var field = safeFields[f];
      if (!field || field.key == null) continue;
      var res = scorePair(header, headerNorm, field, inferred);
      list.push({
        field: field,
        key: field.key,
        score: res.score,
        matchNote: res.matchNote,
        typeNote: res.typeNote,
        order: f
      });
    }
    // Deterministic sort: score desc, then original field order asc.
    list.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    });
    candidates[header] = list;

    // default outputs
    mapping[header] = '';
    confidence[header] = 0;
    reasons[header] = 'No confident match';
    if (list.length > 1) {
      secondBest[header] = { field: list[1].key, score: round3(list[1].score) };
    } else {
      secondBest[header] = { field: '', score: 0 };
    }
  }

  // Greedy assignment. Process headers in the order of their best score so the
  // strongest matches claim their field first. Deterministic tie-break by
  // header index.
  var order = [];
  for (var g = 0; g < safeHeaders.length; g++) {
    var hh = safeHeaders[g];
    var top = candidates[hh].length ? candidates[hh][0].score : 0;
    order.push({ header: hh, index: g, top: top });
  }
  order.sort(function (a, b) {
    if (b.top !== a.top) return b.top - a.top;
    return a.index - b.index;
  });

  var usedFields = {};
  for (var o = 0; o < order.length; o++) {
    var head = order[o].header;
    var cand = candidates[head];
    var chosen = null;
    var runnerUp = null;

    for (var c = 0; c < cand.length; c++) {
      if (usedFields[cand[c].key]) continue;
      if (!chosen) {
        chosen = cand[c];
      } else {
        runnerUp = cand[c];
        break;
      }
    }

    if (chosen && chosen.score >= threshold) {
      usedFields[chosen.key] = true;
      mapping[head] = chosen.key;
      confidence[head] = round3(chosen.score);
      reasons[head] = buildReason(head, chosen);
      if (runnerUp) {
        secondBest[head] = { field: runnerUp.key, score: round3(runnerUp.score) };
      }
    } else {
      mapping[head] = '';
      confidence[head] = chosen ? round3(chosen.score) : 0;
      reasons[head] = chosen
        ? 'Best guess ' + labelOf(chosen.field) + ' was below the confidence threshold'
        : 'No candidate fields';
      // secondBest already set from the full-matrix pass; refine to first
      // still-available runner-up if present.
      if (chosen) {
        secondBest[head] = { field: chosen.key, score: round3(chosen.score) };
      }
    }
  }

  return { mapping: mapping, confidence: confidence, reasons: reasons, secondBest: secondBest };
}

function labelOf(field) {
  return field && (field.label || field.key) ? (field.label || field.key) : 'field';
}

function round3(x) {
  return Math.round(x * 1000) / 1000;
}

function buildReason(header, chosen) {
  var parts = [];
  var lbl = labelOf(chosen.field);
  var sentence = "Matched '" + String(header) + "' to " + lbl;
  var extras = [];
  if (chosen.matchNote) extras.push(chosen.matchNote);
  if (chosen.typeNote) extras.push(chosen.typeNote);
  if (extras.length) {
    sentence += ' (' + extras.join('; ') + ')';
  }
  parts.push(sentence);
  return parts.join(' ');
}

export {
  sniffDelimiter,
  parseAny,
  inferColumnType,
  levenshtein,
  tokenSimilarity,
  fuzzyAutoMap
};
