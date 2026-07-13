// Sheets - a real in-app spreadsheet, the companion to Drive. A workbook
// picker, sheet tabs, a scrollable A1 grid with a live formula engine, a
// formula bar, and a formatting toolbar. Every control writes to the
// local-first sheets store (src/lib/sheets-data.js). Upload OR build
// spreadsheets that actually compute, inside Rally.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useSheets, getWorkbooks, getWorkbook, workbookStats,
  computeSheet, formatCellValue, colLabel, numToCol, colToNum,
  createWorkbook, renameWorkbook, deleteWorkbook,
  addSheet, renameSheet, deleteSheet, setActiveSheet,
  addRows, addCols, setCell, clearCell, SHEET_FUNCTIONS,
} from '../lib/sheets-data.js';
import {
  Button, Card, Badge, PageTitle, Modal, Field, Input,
  EmptyState, useToast,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

const FILLS = [
  { key: 'none', label: 'None', bg: null },
  { key: 'indigo', label: 'Indigo', bg: 'rgba(91,75,245,.16)' },
  { key: 'teal', label: 'Teal', bg: 'rgba(14,165,163,.16)' },
  { key: 'amber', label: 'Amber', bg: 'rgba(179,114,26,.18)' },
  { key: 'green', label: 'Green', bg: 'rgba(26,127,82,.16)' },
  { key: 'red', label: 'Red', bg: 'rgba(192,57,43,.16)' },
];
const FMTS = [
  { key: 'auto', label: 'Auto' },
  { key: 'number', label: '1,234' },
  { key: 'currency', label: '$' },
  { key: 'percent', label: '%' },
  { key: 'text', label: 'Text' },
];

function askRook(prompt) {
  window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } }));
}

/* ============================================================
   WORKBOOK PICKER (left rail)
   ============================================================ */
function WorkbookRail({ workbooks, activeWbId, onOpen, onNew, onRename, onDelete }) {
  return (
    <div className="col gap-2" style={{ width: 268, flex: 'none' }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div className="stat-label">Workbooks</div>
        <Button size="sm" variant="ghost" onClick={onNew}><Icon name="plus" size={15} /> New</Button>
      </div>
      <div className="col gap-1">
        {workbooks.map((wb) => {
          const s = workbookStats(wb);
          const on = wb.id === activeWbId;
          return (
            <div key={wb.id} className="row-host" role="button" tabIndex={0}
              onClick={() => onOpen(wb.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(wb.id); } }}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '.7rem .8rem', cursor: 'pointer',
                borderRadius: 'var(--r-md)', border: '1px solid', position: 'relative',
                borderColor: on ? 'var(--accent)' : 'var(--line)',
                background: on ? 'var(--accent-50)' : 'var(--paper)',
                boxShadow: on ? 'var(--shadow-sm)' : 'none', transition: 'border-color .15s, background .15s',
              }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flex: 'none', color: '#fff', background: on ? 'var(--accent)' : 'var(--n-400)' }}>
                <Icon name={wb.icon || 'grid'} size={18} />
              </span>
              <div className="col" style={{ minWidth: 0, gap: 2, flex: 1 }}>
                <div className="fw-7 clip" style={{ fontSize: '.98rem' }}>{wb.name}</div>
                <div className="t-xs muted">{s.sheets} sheet{s.sheets > 1 ? 's' : ''} - {s.formulas} formula{s.formulas === 1 ? '' : 's'}</div>
              </div>
              <div className="reveal row gap-1" style={{ flex: 'none' }}>
                <button className="btn btn-quiet" title="Rename" aria-label="Rename workbook" onClick={(e) => { e.stopPropagation(); onRename(wb); }} style={{ padding: '.2rem .3rem' }}><Icon name="edit" size={14} /></button>
                <button className="btn btn-quiet" title="Delete" aria-label="Delete workbook" onClick={(e) => { e.stopPropagation(); onDelete(wb); }} style={{ padding: '.2rem .3rem', color: 'var(--risk)' }}><Icon name="trash" size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <Card pad className="col gap-1" style={{ background: 'var(--n-25)' }}>
        <div className="row gap-1" style={{ color: 'var(--accent-600)' }}><Icon name="sparkles" size={15} /><span className="fw-7 t-sm">Rally is the spreadsheet</span></div>
        <div className="t-xs muted">NetSuite makes you export to Excel. Here your models live next to the deal book and compute in place.</div>
      </Card>
    </div>
  );
}

/* ============================================================
   FORMULA HELP
   ============================================================ */
function FormulaHelp({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Formula reference" width={520}>
      <div className="col gap-2">
        <div className="t-sm muted">Start any cell with <span className="mono">=</span> to compute. Use cell refs (<span className="mono">A1</span>), ranges (<span className="mono">A1:A9</span>), arithmetic <span className="mono">+ - * / ^</span>, parentheses, and <span className="mono">&amp;</span> to join text.</div>
        <div className="col gap-1">
          {SHEET_FUNCTIONS.map((f) => (
            <div key={f.name} className="row between" style={{ padding: '.5rem .1rem', borderBottom: '1px solid var(--n-50)', gap: 12 }}>
              <div className="mono fw-7" style={{ color: 'var(--accent-600)', flex: 'none', width: 190 }}>{f.sig}</div>
              <div className="t-sm muted" style={{ textAlign: 'right' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   THE SPREADSHEET
   ============================================================ */
export default function Sheets() {
  useSheets();
  const toast = useToast();
  const workbooks = getWorkbooks();

  const [activeWbId, setActiveWbId] = useState(workbooks[0]?.id || null);
  const wb = getWorkbook(activeWbId) || workbooks[0];
  const sheetId = wb?.activeSheetId || wb?.sheets[0]?.id;
  const sheet = wb?.sheets.find((s) => s.id === sheetId) || wb?.sheets[0];

  const [sel, setSel] = useState('A1');       // selected cell id
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [nameModal, setNameModal] = useState(null); // { mode, wb?, value }
  const gridRef = useRef(null);
  const inlineRef = useRef(null);
  const focusInline = useRef(false); // only pull focus into the cell when the edit began in the grid

  // Keep a valid selected workbook if the active one is deleted.
  useEffect(() => {
    if (!getWorkbook(activeWbId) && workbooks[0]) setActiveWbId(workbooks[0].id);
  }, [activeWbId, workbooks]);

  // When selection changes (and we are not editing), reset the draft to raw.
  useEffect(() => {
    if (!editing) setDraft(sheet?.cells[sel]?.raw || '');
  }, [sel, sheetId, activeWbId]); // eslint-disable-line

  useEffect(() => {
    if (editing && focusInline.current && inlineRef.current) { inlineRef.current.focus(); inlineRef.current.select?.(); }
    if (!editing) focusInline.current = false;
  }, [editing]);

  const computed = useMemo(() => (sheet ? computeSheet(sheet) : {}), [sheet]);

  if (!wb || !sheet) {
    return (
      <div className="page-in">
        <PageTitle eyebrow="Delivery" title="Sheets" />
        <Card><EmptyState icon="📊" title="No workbooks yet" body="Create your first spreadsheet to get started." action={<Button onClick={() => { const w = createWorkbook('Untitled workbook'); setActiveWbId(w.id); }}>New workbook</Button>} /></Card>
      </div>
    );
  }

  const cols = sheet.cols, rows = sheet.rows;
  const selCell = sheet.cells[sel] || {};
  const selRef = parseSel(sel);

  /* ----- editing / commit ----- */
  function beginEdit(initial) {
    focusInline.current = true;
    setDraft(initial != null ? initial : (sheet.cells[sel]?.raw || ''));
    setEditing(true);
  }
  function commitDraft(nextSel) {
    setCell(wb.id, sheet.id, sel, { raw: draft });
    setEditing(false);
    if (nextSel) setSel(nextSel);
  }
  function cancelEdit() { setEditing(false); setDraft(sheet.cells[sel]?.raw || ''); }

  function move(dCol, dRow) {
    const r = parseSel(sel);
    const c = Math.max(1, Math.min(cols, r.col + dCol));
    const rw = Math.max(1, Math.min(rows, r.row + dRow));
    setSel(numToCol(c) + rw);
  }

  function onGridKeyDown(e) {
    if (editing) return; // the inline input owns keys while editing
    const k = e.key;
    if (k === 'ArrowUp') { e.preventDefault(); move(0, -1); return; }
    if (k === 'ArrowDown') { e.preventDefault(); move(0, 1); return; }
    if (k === 'ArrowLeft') { e.preventDefault(); move(-1, 0); return; }
    if (k === 'ArrowRight' || k === 'Tab') { e.preventDefault(); move(1, 0); return; }
    if (k === 'Enter') { e.preventDefault(); beginEdit(); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); clearCell(wb.id, sheet.id, sel); setDraft(''); return; }
    if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); beginEdit(k); }
  }

  function onInlineKeyDown(e) {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); const r = parseSel(sel); commitDraft(numToCol(r.col) + Math.min(rows, r.row + 1)); requestAnimationFrame(() => gridRef.current?.focus()); }
    else if (e.key === 'Tab') { e.preventDefault(); const r = parseSel(sel); commitDraft(numToCol(Math.min(cols, r.col + 1)) + r.row); requestAnimationFrame(() => gridRef.current?.focus()); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); requestAnimationFrame(() => gridRef.current?.focus()); }
  }

  /* ----- toolbar mutators (act on selected cell) ----- */
  const patchSel = (patch) => setCell(wb.id, sheet.id, sel, patch);
  const toggleBold = () => patchSel({ bold: !selCell.bold });
  const setAlign = (align) => patchSel({ align });
  const setFmt = (fmt) => patchSel({ fmt });
  const setBg = (bg) => patchSel({ bg });

  /* ----- workbook / sheet actions ----- */
  const openNewWorkbook = () => setNameModal({ mode: 'newWorkbook', value: 'Untitled workbook' });
  const submitName = () => {
    const v = (nameModal.value || '').trim();
    if (nameModal.mode === 'newWorkbook') { const w = createWorkbook(v || 'Untitled workbook'); setActiveWbId(w.id); toast('Workbook created'); }
    else if (nameModal.mode === 'renameWorkbook') { renameWorkbook(nameModal.wb.id, v); }
    else if (nameModal.mode === 'newSheet') { addSheet(wb.id, v); }
    else if (nameModal.mode === 'renameSheet') { renameSheet(wb.id, nameModal.sheetId, v); }
    setNameModal(null);
  };
  const removeWorkbook = (target) => {
    if (workbooks.length <= 1) return toast('Keep at least one workbook', 'warn');
    deleteWorkbook(target.id);
    if (target.id === activeWbId) setActiveWbId(workbooks.find((w) => w.id !== target.id)?.id || null);
    toast('Workbook deleted');
  };

  const stats = workbookStats(wb);
  const selDisplay = computed[sel]?.error || formatCellValue(computed[sel]?.value, selCell.fmt);

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="Delivery"
        title="Sheets"
        sub="Spreadsheets that actually compute, right inside Rally."
        action={
          <div className="row gap-1">
            <Button variant="ghost" onClick={() => setHelpOpen(true)}><span className="mono fw-7">fx</span> Functions</Button>
            <Button variant="ghost" onClick={() => askRook(`Explain the "${wb.name}" spreadsheet: ${wb.sheets.map((s) => s.name).join(', ')}. What is it modeling and what would you change?`)}><Icon name="sparkles" size={16} /> Ask Rook</Button>
            <Button variant="accent" onClick={openNewWorkbook}><Icon name="plus" size={16} /> New workbook</Button>
          </div>
        }
      />

      <div className="row gap-3" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <WorkbookRail
          workbooks={workbooks}
          activeWbId={wb.id}
          onOpen={(id) => { setActiveWbId(id); setSel('A1'); setEditing(false); }}
          onNew={openNewWorkbook}
          onRename={(target) => setNameModal({ mode: 'renameWorkbook', wb: target, value: target.name })}
          onDelete={removeWorkbook}
        />

        <div className="col gap-2" style={{ flex: 1, minWidth: 340 }}>
          {/* Workbook header */}
          <div className="row between wrap" style={{ gap: 8 }}>
            <div className="col" style={{ gap: 2, minWidth: 0 }}>
              <h3 style={{ margin: 0 }} className="clip">{wb.name}</h3>
              <div className="t-sm muted clip">{wb.desc}</div>
            </div>
            <div className="row gap-1" style={{ flex: 'none' }}>
              <Badge tone="accent">{stats.formulas} live formulas</Badge>
              <Badge>{stats.filled} cells</Badge>
            </div>
          </div>

          {/* Toolbar */}
          <Card pad={false} className="row wrap" style={{ padding: '.5rem .6rem', gap: 8, alignItems: 'center' }}>
            <ToolBtn active={selCell.bold} onClick={toggleBold} title="Bold"><span style={{ fontWeight: 800 }}>B</span></ToolBtn>
            <Divider />
            <ToolBtn active={(selCell.align || 'left') === 'left'} onClick={() => setAlign('left')} title="Align left"><AlignIcon dir="left" /></ToolBtn>
            <ToolBtn active={selCell.align === 'center'} onClick={() => setAlign('center')} title="Align center"><AlignIcon dir="center" /></ToolBtn>
            <ToolBtn active={selCell.align === 'right'} onClick={() => setAlign('right')} title="Align right"><AlignIcon dir="right" /></ToolBtn>
            <Divider />
            <div className="row" style={{ background: 'var(--n-100)', borderRadius: 'var(--r-sm)', padding: 3, gap: 2 }}>
              {FMTS.map((f) => {
                const on = (selCell.fmt || 'auto') === f.key;
                return <button key={f.key} onClick={() => setFmt(f.key)} className="btn btn-sm" title={`Format: ${f.label}`}
                  style={{ background: on ? 'var(--paper)' : 'transparent', color: on ? 'var(--ink)' : 'var(--n-600)', boxShadow: on ? 'var(--shadow-sm)' : 'none', fontWeight: on ? 700 : 600, padding: '.34rem .6rem' }}>{f.label}</button>;
              })}
            </div>
            <Divider />
            <div className="row gap-1" title="Cell fill">
              {FILLS.map((f) => {
                const on = (selCell.bg || null) === f.bg;
                return <button key={f.key} onClick={() => setBg(f.bg)} aria-label={`Fill ${f.label}`} title={f.label}
                  style={{ width: 22, height: 22, borderRadius: 6, cursor: 'pointer', flex: 'none', background: f.bg || 'var(--paper)', border: on ? '2px solid var(--accent)' : '1px solid var(--line-strong)', position: 'relative' }}>
                  {f.key === 'none' && <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--n-400)' }}>x</span>}
                </button>;
              })}
            </div>
            <div className="spacer" />
            <Button size="sm" variant="ghost" onClick={() => addRows(wb.id, sheet.id, 10)} title="Add 10 rows"><Icon name="plus" size={14} /> Rows</Button>
            <Button size="sm" variant="ghost" onClick={() => addCols(wb.id, sheet.id, 1)} title="Add a column"><Icon name="plus" size={14} /> Col</Button>
          </Card>

          {/* Formula bar */}
          <div className="row" style={{ gap: 8, alignItems: 'stretch' }}>
            <div className="row center mono fw-7" style={{ width: 64, flex: 'none', border: '1px solid var(--line-strong)', borderRadius: 'var(--r-sm)', background: 'var(--n-25)', color: 'var(--accent-600)' }}>{sel}</div>
            <div className="row center" style={{ width: 34, flex: 'none', color: 'var(--n-600)', fontStyle: 'italic', fontWeight: 700 }}>fx</div>
            <input
              className="input mono"
              value={editing ? draft : (selCell.raw || '')}
              placeholder="Enter a value or start with = for a formula"
              onFocus={() => { if (!editing) { setDraft(selCell.raw || ''); setEditing(true); } }}
              onChange={(e) => { setDraft(e.target.value); if (!editing) setEditing(true); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); const r = parseSel(sel); commitDraft(numToCol(r.col) + Math.min(rows, r.row + 1)); }
                else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
              }}
              style={{ flex: 1 }}
            />
          </div>

          {/* The grid */}
          <div
            ref={gridRef}
            tabIndex={0}
            onKeyDown={onGridKeyDown}
            className="card"
            style={{ padding: 0, overflow: 'auto', maxHeight: '62vh', outline: 'none' }}
          >
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', minWidth: '100%', fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr>
                  <th style={{ ...cornerStyle }} />
                  {range(1, cols).map((c) => {
                    const active = c === selRef.col;
                    return <th key={c} style={{ ...colHeadStyle, ...(active ? activeHeadStyle : null) }}>{colLabel(c)}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {range(1, rows).map((r) => (
                  <tr key={r}>
                    <td style={{ ...rowHeadStyle, ...(r === selRef.row ? activeHeadStyle : null) }}>{r}</td>
                    {range(1, cols).map((c) => {
                      const id = numToCol(c) + r;
                      const cell = sheet.cells[id];
                      const isSel = id === sel;
                      const comp = computed[id];
                      const isFormula = cell && String(cell.raw || '')[0] === '=';
                      const display = comp ? (comp.error || formatCellValue(comp.value, cell?.fmt)) : '';
                      const align = cell?.align || (comp && typeof comp.value === 'number' ? 'right' : 'left');
                      return (
                        <td
                          key={id}
                          onClick={() => { if (!(isSel && editing)) { setSel(id); setEditing(false); } }}
                          onDoubleClick={() => { setSel(id); beginEdit(); }}
                          style={{
                            ...cellStyle,
                            textAlign: align,
                            fontWeight: cell?.bold ? 700 : 400,
                            background: comp?.error ? 'var(--risk-bg)' : (cell?.bg || (isSel ? 'var(--accent-50)' : 'transparent')),
                            color: comp?.error ? 'var(--risk)' : (isFormula ? 'var(--ink)' : 'inherit'),
                            outline: isSel ? '2px solid var(--accent)' : 'none',
                            outlineOffset: -2,
                            position: 'relative', zIndex: isSel ? 1 : 0,
                          }}
                          title={cell?.raw && isFormula ? cell.raw : undefined}
                        >
                          {isSel && editing ? (
                            <input
                              ref={inlineRef}
                              className="mono"
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={onInlineKeyDown}
                              onBlur={() => { if (editing) commitDraft(); }}
                              style={{ width: '100%', border: 'none', outline: 'none', background: 'var(--paper)', font: 'inherit', padding: 0, color: 'var(--ink)' }}
                            />
                          ) : (
                            <span className="clip" style={{ display: 'block' }}>{display}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected cell readout */}
          <div className="row between wrap t-sm muted" style={{ gap: 8 }}>
            <div className="row gap-1">
              <span className="mono fw-7" style={{ color: 'var(--accent-600)' }}>{sel}</span>
              <span>{selCell.raw ? (String(selCell.raw)[0] === '=' ? 'formula' : 'value') : 'empty'}</span>
              {selDisplay !== '' && <span>= <span className="fw-6" style={{ color: 'var(--ink)' }}>{selDisplay}</span></span>}
            </div>
            <div className="t-xs">Double-click or type to edit. Enter commits, Tab moves right, arrows navigate.</div>
          </div>

          {/* Sheet tabs */}
          <div className="row wrap" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            {wb.sheets.map((s) => {
              const on = s.id === sheet.id;
              return (
                <button key={s.id}
                  onClick={() => { setActiveSheet(wb.id, s.id); setSel('A1'); setEditing(false); }}
                  onDoubleClick={() => setNameModal({ mode: 'renameSheet', sheetId: s.id, value: s.name })}
                  className="btn btn-sm"
                  style={{ background: on ? 'var(--accent-50)' : 'transparent', color: on ? 'var(--accent-700)' : 'var(--n-600)', border: on ? '1px solid var(--accent-300)' : '1px solid var(--line)', fontWeight: on ? 700 : 600, borderRadius: 'var(--r-pill)' }}>
                  {s.name}
                  {on && wb.sheets.length > 1 && (
                    <span role="button" tabIndex={0} aria-label="Delete sheet"
                      onClick={(e) => { e.stopPropagation(); deleteSheet(wb.id, s.id); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); deleteSheet(wb.id, s.id); } }}
                      style={{ marginLeft: 6, opacity: .6, cursor: 'pointer' }}><Icon name="x" size={12} /></span>
                  )}
                </button>
              );
            })}
            <button onClick={() => setNameModal({ mode: 'newSheet', value: `Sheet ${wb.sheets.length + 1}` })} className="btn btn-quiet btn-sm" title="Add sheet"><Icon name="plus" size={14} /></button>
          </div>
        </div>
      </div>

      <FormulaHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      <Modal
        open={!!nameModal}
        onClose={() => setNameModal(null)}
        title={nameModal?.mode?.startsWith('rename') ? 'Rename' : (nameModal?.mode === 'newSheet' ? 'New sheet' : 'New workbook')}
        width={440}
        footer={<><Button variant="ghost" onClick={() => setNameModal(null)}>Cancel</Button><Button onClick={submitName}>Save</Button></>}
      >
        <Field label="Name">
          <Input autoFocus value={nameModal?.value || ''} onChange={(e) => setNameModal({ ...nameModal, value: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') submitName(); }} />
        </Field>
      </Modal>
    </div>
  );
}

/* ============================================================
   SMALL PRESENTATION HELPERS
   ============================================================ */
function parseSel(id) { const m = /^([A-Z]+)(\d+)$/.exec(id) || ['A1', 'A', '1']; return { col: colToNum(m[1]), row: parseInt(m[2], 10) }; }
function range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; }

function ToolBtn({ active, onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} aria-pressed={!!active}
      style={{ width: 32, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer', borderRadius: 'var(--r-sm)', flex: 'none',
        border: '1px solid', borderColor: active ? 'var(--accent)' : 'var(--line-strong)',
        background: active ? 'var(--accent-50)' : 'var(--paper)', color: active ? 'var(--accent-700)' : 'var(--ink-2)' }}>
      {children}
    </button>
  );
}
function Divider() { return <span style={{ width: 1, height: 20, background: 'var(--line)', flex: 'none' }} />; }
function AlignIcon({ dir }) {
  const lines = dir === 'left' ? [14, 10, 14, 8] : dir === 'center' ? [14, 10, 14, 10] : [14, 8, 14, 10];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      {[3, 6, 9, 12].map((y, i) => {
        const w = lines[i]; const x = dir === 'right' ? 14 - w : dir === 'center' ? (16 - w) / 2 : 2;
        return <line key={y} x1={x} y1={y} x2={x + w} y2={y} />;
      })}
    </svg>
  );
}

const cornerStyle = { position: 'sticky', top: 0, left: 0, zIndex: 5, width: 46, minWidth: 46, height: 30, background: 'var(--n-50)', borderRight: '1px solid var(--line-strong)', borderBottom: '1px solid var(--line-strong)' };
const colHeadStyle = { position: 'sticky', top: 0, zIndex: 4, minWidth: 104, width: 104, height: 30, fontSize: '.76rem', fontWeight: 700, letterSpacing: '.04em', color: 'var(--n-600)', textAlign: 'center', background: 'var(--n-50)', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line-strong)', userSelect: 'none' };
const rowHeadStyle = { position: 'sticky', left: 0, zIndex: 3, width: 46, minWidth: 46, fontSize: '.76rem', fontWeight: 700, color: 'var(--n-600)', textAlign: 'center', background: 'var(--n-50)', borderRight: '1px solid var(--line-strong)', borderBottom: '1px solid var(--line)', userSelect: 'none' };
const activeHeadStyle = { background: 'var(--accent-50)', color: 'var(--accent-700)' };
const cellStyle = { minWidth: 104, width: 104, maxWidth: 104, height: 30, padding: '0 8px', fontSize: '.92rem', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--n-50)', cursor: 'cell', whiteSpace: 'nowrap', overflow: 'hidden' };
