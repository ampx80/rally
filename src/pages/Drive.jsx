// Drive - a Google-Drive-class file engine that lives INSIDE Rally. Folders +
// files in grid or list, breadcrumb navigation, upload (local-first: real
// image previews via data-URL), create / rename / move / star / trash /
// restore, and smart views (Recent, Starred, Shared with me, Trash). A file
// detail drawer carries an image preview, metadata, version history, an
// activity feed, and real per-node sharing: people permissions (viewer /
// commenter / editor) plus a shareable link. A storage bar with a file-type
// breakdown rounds it out. Spreadsheet files open in Sheets. Every control is
// wired to the local-first pub/sub store in src/lib/drive-data.js.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDrive, getNode, getChildren, descendantCount, folderSize, breadcrumb,
  sortNodes, recentFiles, starredNodes, trashedNodes, sharedWithMe,
  accessList, isSharedNode, getShare, getPermissions, storageStats,
  driveUsers, driveUser, currentUserId,
  FILE_TYPES, typeMeta, ROLES, roleLabel, fmtBytes,
  createFolder, uploadFile, inferType, renameNode, canMove, moveNode,
  toggleStar, trashNode, restoreNode, emptyTrash, deleteNode,
  setPermission, removePermission, setLinkShare, shareUrl, getNodes,
} from '../lib/drive-data.js';
import {
  Button, Card, Badge, Avatar, PageTitle, SectionHeader, Field, Input, Select,
  Modal, EmptyState, Tabs, ProgressBar, useToast, relTime, monthDay,
} from '../components/UI.jsx';
import { Icon } from '../components/icons.jsx';

function askRook(prompt) {
  window.dispatchEvent(new CustomEvent('rally:rook', { detail: { prompt } }));
}

const VIEWS = [
  { id: 'drive', label: 'My Drive', icon: 'home' },
  { id: 'recent', label: 'Recent', icon: 'clock' },
  { id: 'starred', label: 'Starred', icon: 'star' },
  { id: 'shared', label: 'Shared with me', icon: 'users' },
  { id: 'trash', label: 'Trash', icon: 'trash' },
];
const SORTS = [
  { value: 'name|asc', label: 'Name (A-Z)' },
  { value: 'modifiedAt|desc', label: 'Last modified' },
  { value: 'size|desc', label: 'Size (largest)' },
];

const nameNoExt = (n = '') => n.replace(/\.[a-z0-9]+$/i, '');

/* ---------- a file/folder tile thumbnail ---------- */
function Thumb({ node, big = false }) {
  const meta = node.kind === 'folder' ? FILE_TYPES.folder : typeMeta(node.fileType);
  if (node.kind === 'file' && node.fileType === 'image' && node.preview) {
    return (
      <div className="dr-thumb" style={{ height: big ? 200 : 118 }}>
        <img src={node.preview} alt={node.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div className="dr-thumb dr-thumb--icon" style={{ height: big ? 200 : 118, background: `${meta.color}14` }}>
      <span style={{ color: meta.color }}><Icon name={meta.icon} size={big ? 54 : 40} stroke={1.4} /></span>
    </div>
  );
}

/* ---------- grid card ---------- */
function NodeCard({ node, onOpen, onMenu, onStar }) {
  const meta = node.kind === 'folder' ? FILE_TYPES.folder : typeMeta(node.fileType);
  const sub = node.kind === 'folder'
    ? `${descendantCount(node.id)} items`
    : `${meta.label} · ${fmtBytes(node.size)}`;
  return (
    <div className="dr-card card-hover" tabIndex={0} role="button"
      onClick={() => onOpen(node)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(node); }}
      onContextMenu={(e) => { e.preventDefault(); onMenu(node, e.clientX, e.clientY); }}>
      <Thumb node={node} />
      <div className="dr-card__body">
        <div className="row gap-1" style={{ alignItems: 'flex-start', minWidth: 0 }}>
          <span style={{ color: meta.color, flex: 'none', marginTop: 1 }}><Icon name={meta.icon} size={17} /></span>
          <div className="col" style={{ minWidth: 0, flex: 1 }}>
            <span className="dr-card__name clip" title={node.name}>{node.name}</span>
            <span className="t-xs muted clip">{sub}</span>
          </div>
        </div>
        <div className="dr-card__actions">
          <button className="dr-iconbtn" aria-label={node.starred ? 'Unstar' : 'Star'} title="Star"
            onClick={(e) => { e.stopPropagation(); onStar(node); }}>
            <Icon name="star" size={16} fill={node.starred ? '#e0a417' : 'none'} style={{ color: node.starred ? '#e0a417' : 'var(--n-400)' }} />
          </button>
          {isSharedNode(node.id) && <span className="dr-iconbtn" title="Shared" aria-hidden><Icon name="users" size={15} style={{ color: 'var(--accent-600)' }} /></span>}
          <button className="dr-iconbtn" aria-label="More actions" title="More"
            onClick={(e) => { e.stopPropagation(); onMenu(node, e.clientX, e.clientY); }}>
            <Icon name="more" size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- list row ---------- */
function NodeRow({ node, onOpen, onMenu, onStar }) {
  const meta = node.kind === 'folder' ? FILE_TYPES.folder : typeMeta(node.fileType);
  const owner = driveUser(node.ownerId);
  const isMe = node.ownerId === currentUserId();
  return (
    <tr className="row-host" onClick={() => onOpen(node)} style={{ cursor: 'pointer' }}
      onContextMenu={(e) => { e.preventDefault(); onMenu(node, e.clientX, e.clientY); }}>
      <td>
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <span style={{ color: meta.color, flex: 'none' }}><Icon name={meta.icon} size={20} /></span>
          <span className="clip fw-6" title={node.name}>{node.name}</span>
          {node.starred && <Icon name="star" size={14} fill="#e0a417" style={{ color: '#e0a417', flex: 'none' }} />}
          {isSharedNode(node.id) && <Icon name="users" size={14} style={{ color: 'var(--accent-600)', flex: 'none' }} />}
        </div>
      </td>
      <td className="t-sm muted hide-520">{isMe ? 'me' : (owner?.name || 'Teammate')}</td>
      <td className="t-sm muted hide-520">{relTime(node.modifiedAt)}</td>
      <td className="t-sm muted tnum">{node.kind === 'folder' ? '-' : fmtBytes(node.size)}</td>
      <td style={{ textAlign: 'right', width: 84 }}>
        <div className="row gap-1" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <button className="dr-iconbtn" aria-label="Star" onClick={() => onStar(node)}>
            <Icon name="star" size={15} fill={node.starred ? '#e0a417' : 'none'} style={{ color: node.starred ? '#e0a417' : 'var(--n-400)' }} />
          </button>
          <button className="dr-iconbtn" aria-label="More" onClick={(e) => onMenu(node, e.clientX, e.clientY)}>
            <Icon name="more" size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ---------- right-click / kebab context menu ---------- */
function ContextMenu({ menu, onClose, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = () => onClose();
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('click', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('click', close); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); window.removeEventListener('keydown', key); };
  }, [onClose]);
  if (!menu) return null;
  const pad = 8;
  const w = 210, h = actions.length * 40 + 12;
  const x = Math.min(menu.x, window.innerWidth - w - pad);
  const y = Math.min(menu.y, window.innerHeight - h - pad);
  return (
    <div ref={ref} className="dr-menu" style={{ left: x, top: y, width: w }} onClick={(e) => e.stopPropagation()}>
      {actions.map((a, i) => a.sep ? <div key={i} className="dr-menu__sep" /> : (
        <button key={i} className={`dr-menu__item${a.danger ? ' is-danger' : ''}`} onClick={() => { a.run(); onClose(); }}>
          <Icon name={a.icon} size={16} /> <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- people picker (add a share) ---------- */
function AddPeople({ node, onDone }) {
  const owner = node.ownerId;
  const taken = new Set([owner, ...getPermissions(node.id).map(p => p.userId)]);
  const options = driveUsers().filter(u => !taken.has(u.id));
  const [userId, setUserId] = useState(options[0]?.id || '');
  const [role, setRole] = useState('viewer');
  if (!options.length) return <div className="t-sm muted">Everyone on the team already has access.</div>;
  return (
    <div className="row gap-1" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div className="field" style={{ flex: 2, minWidth: 150 }}>
        <label>Add people</label>
        <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
          {options.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
      </div>
      <div className="field" style={{ flex: 1, minWidth: 110 }}>
        <label>Access</label>
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </Select>
      </div>
      <Button variant="primary" onClick={() => { if (userId) { setPermission(node.id, userId, role); onDone?.(); } }}>
        <Icon name="plus" size={16} /> Share
      </Button>
    </div>
  );
}

/* ---------- detail drawer ---------- */
function DetailDrawer({ nodeId, onClose, onOpenNode }) {
  const toast = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState('details');
  useDrive(); // re-render on any store change
  const node = nodeId ? getNode(nodeId) : null;
  useEffect(() => { setTab('details'); }, [nodeId]);
  if (!node) return null;
  const meta = node.kind === 'folder' ? FILE_TYPES.folder : typeMeta(node.fileType);
  const share = getShare(node.id);
  const people = accessList(node.id);
  const crumbs = breadcrumb(node.parentId);
  const location = crumbs.length ? crumbs.map(c => c.name).join(' / ') : 'My Drive';
  const copyLink = () => { try { navigator.clipboard.writeText(shareUrl(node.id)); } catch {} toast('Link copied to clipboard'); };
  const download = () => {
    if (node.fileType === 'image' && node.preview) {
      const a = document.createElement('a'); a.href = node.preview; a.download = node.name; document.body.appendChild(a); a.click(); a.remove();
      toast(`Downloading ${node.name}`);
    } else toast(`Preparing ${node.name} for download`);
  };
  const tabs = node.kind === 'file'
    ? [{ key: 'details', label: 'Details' }, { key: 'share', label: 'Share' }, { key: 'versions', label: 'Versions', count: (node.versions || []).length }, { key: 'activity', label: 'Activity' }]
    : [{ key: 'details', label: 'Details' }, { key: 'share', label: 'Share' }, { key: 'activity', label: 'Activity' }];

  return (
    <>
      <div className="dr-scrim" onClick={onClose} />
      <aside className="dr-drawer fade-up" role="dialog" aria-label={`Details for ${node.name}`}>
        <div className="dr-drawer__head">
          <div className="row gap-2" style={{ minWidth: 0 }}>
            <span style={{ color: meta.color, flex: 'none' }}><Icon name={meta.icon} size={22} /></span>
            <div className="clip fw-7" title={node.name} style={{ fontSize: '1.02rem' }}>{node.name}</div>
          </div>
          <button className="dr-iconbtn" aria-label="Close" onClick={onClose}><Icon name="x" size={19} /></button>
        </div>

        {node.kind === 'file' && (
          <div className="dr-preview">
            {node.fileType === 'image' && node.preview
              ? <img src={node.preview} alt={node.name} />
              : <div className="dr-preview__icon" style={{ background: `${meta.color}12` }}><span style={{ color: meta.color }}><Icon name={meta.icon} size={64} stroke={1.3} /></span></div>}
          </div>
        )}

        <div className="dr-drawer__actions">
          <Button size="sm" variant="ghost" onClick={() => toggleStar(node.id)}>
            <Icon name="star" size={15} fill={node.starred ? '#e0a417' : 'none'} style={{ color: node.starred ? '#e0a417' : 'inherit' }} /> {node.starred ? 'Starred' : 'Star'}
          </Button>
          {node.fileType === 'sheet' && (
            <Button size="sm" variant="accent" onClick={() => { onClose(); nav('/sheets'); }}>
              <Icon name="grid" size={15} /> Open in Sheets
            </Button>
          )}
          {node.kind === 'file' && <Button size="sm" variant="ghost" onClick={download}><Icon name="download" size={15} /> Download</Button>}
          <Button size="sm" variant="ghost" onClick={() => askRook(`Give me a quick brief on the file "${node.name}" in Rally Drive - what it is, why it matters to the deal, and who has access.`)}>
            <Icon name="sparkles" size={15} /> Ask Rook
          </Button>
        </div>

        <div style={{ padding: '0 1.2rem' }}>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>

        <div className="dr-drawer__scroll">
          {tab === 'details' && (
            <div className="col gap-2">
              <Meta label="Type" value={node.kind === 'folder' ? 'Folder' : meta.label} />
              {node.kind === 'file' && <Meta label="Size" value={fmtBytes(node.size)} />}
              {node.kind === 'folder' && <Meta label="Contains" value={`${descendantCount(node.id)} items · ${fmtBytes(folderSize(node.id))}`} />}
              <Meta label="Owner" value={node.ownerId === currentUserId() ? 'me' : (driveUser(node.ownerId)?.name || 'Teammate')} avatar={driveUser(node.ownerId)?.name} />
              <Meta label="Location" value={location} />
              <Meta label="Modified" value={monthDay(node.modifiedAt)} />
              <Meta label="Created" value={monthDay(node.createdAt)} />
            </div>
          )}

          {tab === 'share' && (
            <div className="col gap-3">
              <div className="col gap-2">
                <SectionHeader title="People with access" />
                {people.map(p => {
                  const u = driveUser(p.userId);
                  const isOwner = p.role === 'owner';
                  return (
                    <div key={p.userId} className="row gap-2 between">
                      <div className="row gap-2" style={{ minWidth: 0 }}>
                        <Avatar name={u?.name || 'Teammate'} size={34} />
                        <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
                          <span className="clip fw-6">{u?.name || 'Teammate'}{p.userId === currentUserId() ? ' (you)' : ''}</span>
                          <span className="clip t-xs muted">{u?.email || u?.title || ''}</span>
                        </div>
                      </div>
                      {isOwner ? <Badge tone="accent">Owner</Badge> : (
                        <div className="row gap-1">
                          <Select value={p.role} onChange={(e) => setPermission(node.id, p.userId, e.target.value)} style={{ width: 130, padding: '.4rem .5rem' }}>
                            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                          </Select>
                          <button className="dr-iconbtn" aria-label="Remove access" title="Remove" onClick={() => removePermission(node.id, p.userId)}><Icon name="x" size={16} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ marginTop: 4 }}><AddPeople node={node} onDone={() => {}} /></div>
              </div>

              <div className="dr-linkbox">
                <div className="row between" style={{ marginBottom: 8 }}>
                  <div className="row gap-2">
                    <span className="dr-linkbox__ic"><Icon name="link" size={18} /></span>
                    <div className="col" style={{ lineHeight: 1.2 }}>
                      <span className="fw-6">Link sharing</span>
                      <span className="t-xs muted">{share?.enabled ? `Anyone with the link can ${roleLabel(share.access).toLowerCase()}` : 'Off - only invited people'}</span>
                    </div>
                  </div>
                  <button className={`switch${share?.enabled ? ' on' : ''}`} aria-label="Toggle link sharing"
                    onClick={() => setLinkShare(node.id, { enabled: !share?.enabled, access: share?.access || 'viewer' })} />
                </div>
                {share?.enabled && (
                  <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                    <Select value={share.access} onChange={(e) => setLinkShare(node.id, { enabled: true, access: e.target.value })} style={{ width: 150, flex: 'none' }}>
                      {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </Select>
                    <div className="dr-linkurl clip">{shareUrl(node.id)}</div>
                    <Button size="sm" variant="ghost" onClick={copyLink}><Icon name="copy" size={15} /> Copy</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'versions' && (
            <div className="col gap-2">
              {(node.versions || []).length === 0 && <div className="t-sm muted">No version history yet.</div>}
              {(node.versions || []).map(v => (
                <div key={v.id} className="dr-version">
                  <div className="row gap-2" style={{ minWidth: 0 }}>
                    <Avatar name={driveUser(v.byId)?.name || 'Teammate'} size={30} />
                    <div className="col" style={{ minWidth: 0, lineHeight: 1.25 }}>
                      <span className="fw-6 clip">{v.label}{v.current && <Badge tone="ok" className="t-xs" style={{ marginLeft: 6 }}>Current</Badge>}</span>
                      <span className="t-xs muted clip">{(driveUser(v.byId)?.name || 'Teammate')} · {relTime(v.at)}</span>
                    </div>
                  </div>
                  <span className="t-xs muted tnum" style={{ flex: 'none' }}>{fmtBytes(v.size)}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'activity' && (
            <div className="col gap-2">
              {(node.activity || []).length === 0 && <div className="t-sm muted">No activity recorded yet.</div>}
              {(node.activity || []).map(a => (
                <div key={a.id} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                  <Avatar name={driveUser(a.byId)?.name || 'Teammate'} size={30} />
                  <div className="col" style={{ minWidth: 0, lineHeight: 1.35 }}>
                    <span className="t-sm"><b>{a.byId === currentUserId() ? 'You' : (driveUser(a.byId)?.name || 'Teammate')}</b> {a.text}</span>
                    <span className="t-xs muted">{relTime(a.at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Meta({ label, value, avatar }) {
  return (
    <div className="row between" style={{ alignItems: 'center' }}>
      <span className="t-sm muted" style={{ flex: 'none' }}>{label}</span>
      <span className="row gap-1 t-sm fw-6" style={{ minWidth: 0, justifyContent: 'flex-end', textAlign: 'right' }}>
        {avatar && <Avatar name={avatar} size={20} />}
        <span className="clip">{value}</span>
      </span>
    </div>
  );
}

/* ---------- storage breakdown modal ---------- */
function StorageModal({ open, onClose }) {
  useDrive();
  const s = storageStats();
  return (
    <Modal open={open} onClose={onClose} title="Storage" width={520}>
      <div className="col gap-2">
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div className="stat-value" style={{ fontSize: '2rem' }}>{fmtBytes(s.used)}</div>
          <div className="t-sm muted">of {fmtBytes(s.quota)} used</div>
        </div>
        <ProgressBar value={s.pct} height={12} color={s.pct > 90 ? 'var(--risk)' : 'var(--accent)'} />
        <div className="t-xs muted">{s.pct.toFixed(1)}% full{s.trash ? ` · ${fmtBytes(s.trash)} in Trash` : ''}</div>
        <div className="col gap-2" style={{ marginTop: 8 }}>
          {s.breakdown.map(b => {
            const meta = typeMeta(b.type);
            return (
              <div key={b.type} className="col gap-1">
                <div className="row between t-sm">
                  <span className="row gap-1"><span className="dot" style={{ background: meta.color }} /> {meta.label}</span>
                  <span className="muted tnum">{fmtBytes(b.bytes)}</span>
                </div>
                <ProgressBar value={s.used ? (b.bytes / s.used) * 100 : 0} height={6} color={meta.color} />
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- move dialog ---------- */
function MoveModal({ node, onClose }) {
  const toast = useToast();
  const [target, setTarget] = useState(node?.parentId || null);
  if (!node) return null;
  const folders = getNodes().filter(n => n.kind === 'folder' && !n.trashed && canMove(node.id, n.id));
  const opts = [{ id: null, name: 'My Drive', depth: 0 }, ...folders.map(f => ({ id: f.id, name: f.name, depth: breadcrumb(f.parentId).length + 1 }))];
  const submit = () => {
    const r = moveNode(node.id, target);
    if (r.error) toast(r.message, 'risk'); else toast(`Moved "${node.name}"`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Move "${node.name}"`} width={480}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}><Icon name="move" size={16} /> Move here</Button></>}>
      <div className="col gap-1" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {opts.map(o => (
          <button key={o.id || 'root'} className={`dr-movepick${target === o.id ? ' is-on' : ''}`}
            style={{ paddingLeft: 12 + o.depth * 16 }} onClick={() => setTarget(o.id)}>
            <Icon name={o.id ? 'folder' : 'home'} size={17} style={{ color: 'var(--accent-600)' }} />
            <span className="clip">{o.name}</span>
            {target === o.id && <Icon name="check" size={16} style={{ marginLeft: 'auto', color: 'var(--accent-600)' }} />}
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function Drive() {
  const driveState = useDrive(); // whole-state snapshot; new ref on every mutation
  const toast = useToast();
  const fileRef = useRef(null);

  const [view, setView] = useState('drive');
  const [folderId, setFolderId] = useState(null);
  const [layout, setLayout] = useState('grid');
  const [sort, setSort] = useState('name|asc');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [menu, setMenu] = useState(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [moving, setMoving] = useState(null);
  const [storageOpen, setStorageOpen] = useState(false);

  const [sortKey, sortDir] = sort.split('|');
  const stats = storageStats();

  // The active list for the current view.
  const baseList = useMemo(() => {
    if (view === 'recent') return recentFiles(120);
    if (view === 'starred') return starredNodes();
    if (view === 'shared') return sharedWithMe();
    if (view === 'trash') return trashedNodes();
    return getChildren(folderId).slice().sort(sortNodes(sortKey, sortDir));
  }, [view, folderId, sortKey, sortDir, driveState]); // driveState changes ref on every store mutation

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let l = baseList;
    if (q) l = l.filter(n => n.name.toLowerCase().includes(q));
    if (view !== 'drive') l = l.slice().sort(sortNodes(sortKey, sortDir));
    return l;
  }, [baseList, query, sortKey, sortDir, view]);

  const crumbs = view === 'drive' ? breadcrumb(folderId) : [];
  const counts = {
    starred: starredNodes().length,
    shared: sharedWithMe().length,
    trash: trashedNodes().length,
  };

  const openNode = (node) => {
    if (node.kind === 'folder' && view !== 'trash') { setView('drive'); setFolderId(node.id); setSelected(null); setQuery(''); }
    else setSelected(node.id);
  };
  const goCrumb = (id) => { setFolderId(id); setSelected(null); };
  const star = (node) => toggleStar(node.id);

  const doUpload = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const parent = view === 'drive' ? folderId : null;
    let done = 0;
    files.forEach(f => {
      const ft = f.type?.startsWith('image/') ? 'image' : inferType(f.name);
      const finish = (preview) => {
        uploadFile({ name: f.name, parentId: parent, fileType: ft, size: f.size, preview });
        done++;
        if (done === files.length) toast(`Uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
      };
      if (ft === 'image') {
        const reader = new FileReader();
        reader.onload = () => finish(reader.result);
        reader.onerror = () => finish(null);
        try { reader.readAsDataURL(f); } catch { finish(null); }
      } else finish(null);
    });
    if (view !== 'drive') setView('drive');
  };

  const submitFolder = () => {
    const r = createFolder(folderName, view === 'drive' ? folderId : null);
    if (r.error) return toast(r.message, 'risk');
    toast(`Created "${r.node.name}"`);
    setNewFolderOpen(false); setFolderName('');
  };
  const submitRename = () => {
    const r = renameNode(renaming.id, renameVal);
    if (r.error) return toast(r.message, 'risk');
    toast('Renamed'); setRenaming(null);
  };

  // Context-menu action set for a node.
  const menuActions = (node) => {
    if (view === 'trash' || node.trashed) {
      return [
        { icon: 'rotateCcw', label: 'Restore', run: () => { restoreNode(node.id); toast(`Restored "${node.name}"`); } },
        { icon: 'trash', label: 'Delete forever', danger: true, run: () => { const r = deleteNode(node.id); if (r.error) return toast(r.message, 'risk'); if (selected === node.id) setSelected(null); toast(`Deleted "${node.name}"`); } },
      ];
    }
    const acts = [
      { icon: node.kind === 'folder' ? 'folder' : 'eye', label: 'Open', run: () => openNode(node) },
      { icon: 'share2', label: 'Share', run: () => { setSelected(node.id); } },
      { icon: 'move', label: 'Move to', run: () => setMoving(node) },
      { icon: 'edit', label: 'Rename', run: () => { setRenaming(node); setRenameVal(node.name); } },
      { icon: 'star', label: node.starred ? 'Remove star' : 'Add star', run: () => star(node) },
    ];
    if (node.kind === 'file') acts.push({ icon: 'download', label: 'Download', run: () => { setSelected(node.id); toast(`Preparing ${node.name}`); } });
    if (node.fileType === 'sheet') acts.push({ icon: 'grid', label: 'Open in Sheets', run: () => window.location.assign('/sheets') });
    acts.push({ sep: true });
    acts.push({ icon: 'trash', label: 'Move to Trash', danger: true, run: () => { trashNode(node.id); toast(`"${node.name}" moved to Trash`); if (selected === node.id) setSelected(null); } });
    return acts;
  };

  const viewTitle = view === 'drive'
    ? (folderId ? getNode(folderId)?.name : 'My Drive')
    : VIEWS.find(v => v.id === view)?.label;
  const rookPrompt = view === 'drive' && folderId
    ? `Review the "${getNode(folderId)?.name}" folder in Rally Drive and tell me what documents we have, what is missing for the deal, and anything that looks out of date.`
    : 'Which files in Rally Drive were touched this week, and are any sensitive contracts shared too broadly?';

  return (
    <div className="page-in">
      <PageTitle
        eyebrow="Delivery"
        title="Drive"
        sub="Your files live where your revenue does - one permissioned home for every contract, deck, and model, attached to the accounts and deals they belong to."
        action={
          <>
            <Button variant="ghost" onClick={() => askRook(rookPrompt)}><Icon name="sparkles" size={16} /> <span className="hide-520">Ask Rook</span></Button>
            <Button variant="ghost" onClick={() => setNewFolderOpen(true)}><Icon name="folderPlus" size={16} /> <span className="hide-520">New folder</span></Button>
            <Button variant="primary" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Upload</Button>
          </>
        }
      />
      <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => { doUpload(e.target.files); e.target.value = ''; }} />

      <div className="dr-layout">
        {/* ----- sidebar ----- */}
        <aside className="dr-side">
          <nav className="col gap-1">
            {VIEWS.map(v => {
              const on = view === v.id;
              const badge = v.id === 'starred' ? counts.starred : v.id === 'shared' ? counts.shared : v.id === 'trash' ? counts.trash : null;
              return (
                <button key={v.id} className={`dr-viewbtn${on ? ' is-on' : ''}`} onClick={() => { setView(v.id); setFolderId(null); setSelected(null); setQuery(''); }}>
                  <Icon name={v.icon} size={18} />
                  <span className="clip">{v.label}</span>
                  {badge != null && badge > 0 && <span className="dr-viewbtn__count">{badge}</span>}
                </button>
              );
            })}
          </nav>

          <Card className="dr-storage" pad>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span className="fw-7 t-sm">Storage</span>
              <button className="link t-xs" onClick={() => setStorageOpen(true)}>Details</button>
            </div>
            <ProgressBar value={stats.pct} height={10} color={stats.pct > 90 ? 'var(--risk)' : 'var(--accent)'} />
            <div className="t-xs muted" style={{ marginTop: 6 }}>{fmtBytes(stats.used)} of {fmtBytes(stats.quota)}</div>
            <div className="col gap-1" style={{ marginTop: 10 }}>
              {stats.breakdown.slice(0, 4).map(b => (
                <div key={b.type} className="row between t-xs">
                  <span className="row gap-1"><span className="dot" style={{ background: typeMeta(b.type).color }} /> {typeMeta(b.type).label}</span>
                  <span className="muted tnum">{fmtBytes(b.bytes)}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="dr-tip">
            <Icon name="sparkles" size={15} style={{ color: 'var(--accent-600)' }} />
            <span className="t-xs muted">No second Drive to keep in sync. Every file inherits the account it belongs to.</span>
          </div>
        </aside>

        {/* ----- content ----- */}
        <section className="dr-main">
          <div className="dr-toolbar">
            <div className="row gap-1" style={{ minWidth: 0, flex: 1 }}>
              {view === 'drive' ? (
                <div className="row gap-1 dr-crumbs" style={{ minWidth: 0, flexWrap: 'wrap' }}>
                  <button className={`dr-crumb${!folderId ? ' is-cur' : ''}`} onClick={() => goCrumb(null)}>My Drive</button>
                  {crumbs.map((c) => (
                    <span key={c.id} className="row gap-1" style={{ minWidth: 0 }}>
                      <Icon name="chevronRight" size={14} style={{ color: 'var(--n-400)', flex: 'none' }} />
                      <button className={`dr-crumb${folderId === c.id ? ' is-cur' : ''}`} onClick={() => goCrumb(c.id)}>{c.name}</button>
                    </span>
                  ))}
                </div>
              ) : <div className="fw-7" style={{ fontSize: '1.05rem' }}>{viewTitle}</div>}
            </div>

            <div className="row gap-1" style={{ flex: 'none', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <div className="dr-search">
                <Icon name="search" size={16} style={{ color: 'var(--n-400)', flex: 'none' }} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in Drive" aria-label="Search Drive" />
                {query && <button className="dr-iconbtn" aria-label="Clear" onClick={() => setQuery('')}><Icon name="x" size={14} /></button>}
              </div>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 168, flex: 'none' }}>
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
              <div className="dr-toggle">
                <button className={layout === 'grid' ? 'is-on' : ''} onClick={() => setLayout('grid')} aria-label="Grid view" title="Grid"><Icon name="grid" size={17} /></button>
                <button className={layout === 'list' ? 'is-on' : ''} onClick={() => setLayout('list')} aria-label="List view" title="List"><Icon name="list" size={17} /></button>
              </div>
            </div>
          </div>

          {view === 'trash' && list.length > 0 && (
            <div className="dr-trashbar">
              <span className="t-sm muted">Items in Trash keep their sharing until deleted.</span>
              <Button size="sm" variant="danger" onClick={() => { emptyTrash(); toast('Trash emptied'); }}><Icon name="trash" size={15} /> Empty Trash</Button>
            </div>
          )}

          {list.length === 0 ? (
            <EmptyState
              icon={view === 'trash' ? '\u{1F5D1}️' : query ? '\u{1F50D}' : '\u{1F4C1}'}
              title={query ? 'No matches' : view === 'trash' ? 'Trash is empty' : view === 'starred' ? 'Nothing starred yet' : view === 'shared' ? 'Nothing shared with you' : 'This folder is empty'}
              body={query ? 'Try a different search term.' : view === 'drive' ? 'Upload a file or create a folder to get started. Files here stay attached to your accounts and deals.' : 'Star files and folders to find them fast, or share items with your team.'}
              action={view === 'drive' && !query ? <Button variant="primary" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Upload files</Button> : null}
            />
          ) : layout === 'grid' ? (
            <div className="dr-grid stagger">
              {list.map(n => <NodeCard key={n.id} node={n} onOpen={openNode} onStar={star} onMenu={(node, x, y) => setMenu({ node, x, y })} />)}
            </div>
          ) : (
            <Card pad={false} style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead><tr><th>Name</th><th className="hide-520">Owner</th><th className="hide-520">Modified</th><th>Size</th><th style={{ width: 84 }}></th></tr></thead>
                  <tbody>
                    {list.map(n => <NodeRow key={n.id} node={n} onOpen={openNode} onStar={star} onMenu={(node, x, y) => setMenu({ node, x, y })} />)}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      </div>

      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} actions={menuActions(menu.node)} />}
      {selected && <DetailDrawer nodeId={selected} onClose={() => setSelected(null)} onOpenNode={openNode} />}
      {moving && <MoveModal node={moving} onClose={() => setMoving(null)} />}
      <StorageModal open={storageOpen} onClose={() => setStorageOpen(false)} />

      <Modal open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="New folder" width={440}
        footer={<><Button variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancel</Button><Button variant="primary" onClick={submitFolder}>Create</Button></>}>
        <Field label="Folder name">
          <Input autoFocus value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="e.g. Vertex Robotics" onKeyDown={(e) => { if (e.key === 'Enter') submitFolder(); }} />
        </Field>
      </Modal>

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename" width={440}
        footer={<><Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button><Button variant="primary" onClick={submitRename}>Save</Button></>}>
        <Field label="Name">
          <Input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); }} />
        </Field>
      </Modal>

      <DriveStyles />
    </div>
  );
}

function DriveStyles() {
  return (
    <style>{`
    .dr-layout { display: grid; grid-template-columns: 232px 1fr; gap: 1.15rem; align-items: start; }
    .dr-side { position: sticky; top: 82px; display: flex; flex-direction: column; gap: 1rem; }
    .dr-viewbtn { display: flex; align-items: center; gap: .65rem; width: 100%; text-align: left; font-family: inherit; font-size: .96rem; font-weight: 600;
      color: var(--n-700); background: transparent; border: 1px solid transparent; border-radius: var(--r-sm); padding: .6rem .7rem; cursor: pointer; transition: background .12s, color .12s; }
    .dr-viewbtn:hover { background: var(--n-50); color: var(--ink); }
    .dr-viewbtn.is-on { background: var(--accent-50); color: var(--accent-600); border-color: var(--accent-300); }
    .dr-viewbtn__count { margin-left: auto; font-size: .74rem; font-weight: 700; background: var(--n-100); color: var(--n-600); border-radius: 999px; padding: .05rem .45rem; }
    .dr-viewbtn.is-on .dr-viewbtn__count { background: var(--accent-300); color: #fff; }
    .dr-storage { padding: 1rem 1.1rem !important; }
    .dr-tip { display: flex; gap: .55rem; align-items: flex-start; padding: .3rem .2rem; }

    .dr-main { min-width: 0; }
    .dr-toolbar { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .dr-crumbs { font-size: 1.02rem; }
    .dr-crumb { font-family: inherit; font-size: 1.02rem; font-weight: 700; color: var(--n-600); background: none; border: none; padding: .15rem .35rem; border-radius: 6px; cursor: pointer; }
    .dr-crumb:hover { background: var(--n-100); color: var(--ink); }
    .dr-crumb.is-cur { color: var(--ink); }
    .dr-search { display: flex; align-items: center; gap: .5rem; background: var(--paper); border: 1px solid var(--line-strong); border-radius: var(--r-sm); padding: .45rem .7rem; width: 220px; }
    .dr-search input { border: none; outline: none; background: transparent; font-size: .95rem; width: 100%; color: var(--ink); }
    .dr-toggle { display: flex; background: var(--n-100); border-radius: var(--r-sm); padding: 3px; gap: 2px; flex: none; }
    .dr-toggle button { border: none; background: transparent; color: var(--n-600); padding: .4rem .55rem; border-radius: 5px; cursor: pointer; display: grid; place-items: center; }
    .dr-toggle button.is-on { background: var(--paper); color: var(--accent-600); box-shadow: var(--shadow-sm); }
    .dr-trashbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--n-25); border: 1px solid var(--line); border-radius: var(--r-md); padding: .6rem .9rem; margin-bottom: 1rem; flex-wrap: wrap; }

    .dr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(212px, 1fr)); gap: 1rem; }
    .dr-card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); overflow: hidden; cursor: pointer; display: flex; flex-direction: column; }
    .dr-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .dr-thumb { width: 100%; overflow: hidden; display: grid; place-items: center; background: var(--n-50); }
    .dr-thumb--icon { background: var(--n-50); }
    .dr-card__body { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .7rem .8rem; border-top: 1px solid var(--line); }
    .dr-card__name { font-weight: 600; font-size: .95rem; color: var(--ink); }
    .dr-card__actions { display: flex; align-items: center; gap: 2px; flex: none; }
    .dr-iconbtn { border: none; background: transparent; color: var(--n-500, var(--n-600)); cursor: pointer; width: 30px; height: 30px; border-radius: 7px; display: inline-grid; place-items: center; transition: background .12s, color .12s; }
    .dr-iconbtn:hover { background: var(--n-100); color: var(--ink); }

    .dr-menu { position: fixed; z-index: 80; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); box-shadow: var(--shadow-lg); padding: 6px; animation: fadeUp .16s var(--ease) both; }
    .dr-menu__item { display: flex; align-items: center; gap: .6rem; width: 100%; text-align: left; font-family: inherit; font-size: .92rem; font-weight: 600; color: var(--ink); background: none; border: none; border-radius: 7px; padding: .55rem .65rem; cursor: pointer; }
    .dr-menu__item:hover { background: var(--n-50); }
    .dr-menu__item.is-danger { color: var(--risk); }
    .dr-menu__item.is-danger:hover { background: var(--risk-bg); }
    .dr-menu__sep { height: 1px; background: var(--line); margin: 5px 6px; }

    .dr-scrim { position: fixed; inset: 0; z-index: 65; background: rgba(16,20,30,.28); backdrop-filter: blur(2px); animation: fadeUp .2s ease; }
    .dr-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 66; width: min(440px, 100vw); background: var(--paper); border-left: 1px solid var(--line); box-shadow: var(--shadow-lg); display: flex; flex-direction: column; }
    .dr-drawer__head { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: 1rem 1.2rem; border-bottom: 1px solid var(--line); }
    .dr-preview { height: 220px; background: var(--n-50); display: grid; place-items: center; overflow: hidden; }
    .dr-preview img { width: 100%; height: 100%; object-fit: cover; }
    .dr-preview__icon { width: 100%; height: 100%; display: grid; place-items: center; }
    .dr-drawer__actions { display: flex; gap: .5rem; padding: .9rem 1.2rem; flex-wrap: wrap; border-bottom: 1px solid var(--line); }
    .dr-drawer__scroll { flex: 1; overflow-y: auto; padding: 1.1rem 1.2rem 2rem; }
    .dr-linkbox { border: 1px solid var(--line); border-radius: var(--r-md); padding: .9rem 1rem; background: var(--n-25); }
    .dr-linkbox__ic { width: 34px; height: 34px; border-radius: 9px; background: var(--accent-50); color: var(--accent-600); display: grid; place-items: center; flex: none; }
    .dr-linkurl { flex: 1; min-width: 120px; font-family: var(--font-mono); font-size: .78rem; color: var(--n-600); background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-sm); padding: .45rem .6rem; }
    .dr-version { display: flex; align-items: center; justify-content: space-between; gap: .75rem; border: 1px solid var(--line); border-radius: var(--r-sm); padding: .55rem .7rem; }
    .dr-movepick { display: flex; align-items: center; gap: .6rem; width: 100%; text-align: left; font-family: inherit; font-size: .95rem; font-weight: 600; color: var(--ink); background: none; border: 1px solid transparent; border-radius: var(--r-sm); padding: .55rem .7rem; cursor: pointer; }
    .dr-movepick:hover { background: var(--n-50); }
    .dr-movepick.is-on { background: var(--accent-50); border-color: var(--accent-300); color: var(--accent-600); }

    @media (max-width: 860px) {
      .dr-layout { grid-template-columns: 1fr !important; }
      .dr-side { position: static; flex-direction: column; }
      .dr-side nav { flex-direction: row; flex-wrap: wrap; }
      .dr-viewbtn { width: auto; }
      .dr-drawer { width: 100vw; }
    }
    `}</style>
  );
}
