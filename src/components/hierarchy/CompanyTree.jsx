// Recursive account tree + breadcrumb for the company Hierarchy tab.
// Renders the focused company inside its full tree (root down through
// every descendant), highlights the focused node, and offers a compact
// parent-company picker that is cycle-safe. Pure display over the store;
// all reads flow through useStore() so links stay live.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import { Badge, Select, useToast, moneyK } from '../UI.jsx';
import { useStore, getCompany, getCompanies } from '../../lib/store.js';
import {
  getAncestors, getChildren, getDescendants, buildTree,
  parentIdOf, setParentCompany, subtreeOpenPipeline, seedHierarchyExamples,
} from '../../lib/hierarchy.js';
import './hierarchy.css';

// One node in the recursive tree. Opens by default when it sits on the
// path to the focused company (so the focus is always visible on load).
function TreeNode({ node, depth, focusId, pathIds }) {
  const onPath = pathIds.has(node.company.id);
  const [open, setOpen] = useState(depth === 0 || onPath);
  const kids = node.children || [];
  const hasKids = kids.length > 0;
  const isFocus = node.company.id === focusId;
  const pipeline = subtreeOpenPipeline(node.company.id);

  return (
    <div className="rh-node">
      <div className={`rh-row${isFocus ? ' rh-row-focus' : ''}`} style={{ paddingLeft: depth * 20 }}>
        {hasKids ? (
          <button
            type="button"
            className="rh-toggle"
            aria-label={open ? 'Collapse' : 'Expand'}
            aria-expanded={open}
            onClick={() => setOpen(o => !o)}
          >
            <Icon name={open ? 'chevronDown' : 'chevronRight'} size={15} />
          </button>
        ) : (
          <span className="rh-toggle rh-toggle-leaf" aria-hidden="true" />
        )}
        <span className="rh-ico" aria-hidden="true"><Icon name="building" size={15} /></span>
        {isFocus ? (
          <span className="rh-name rh-name-focus clip">{node.company.name}</span>
        ) : (
          <Link to={`/companies/${node.company.id}`} className="rh-name link clip">{node.company.name}</Link>
        )}
        <span className="rh-meta">
          {hasKids && <Badge tone="default" className="t-xs">{kids.length} sub</Badge>}
          {pipeline > 0 && <span className="rh-pipe t-xs">{moneyK(pipeline)} open</span>}
        </span>
      </div>
      {hasKids && open && (
        <div className="rh-children">
          {kids.map(child => (
            <TreeNode key={child.company.id} node={child} depth={depth + 1} focusId={focusId} pathIds={pathIds} />
          ))}
        </div>
      )}
    </div>
  );
}

// Cycle-safe parent selector. Excludes the company itself and any of its
// descendants so a choice can never form a loop.
function ParentPicker({ companyId }) {
  const toast = useToast();
  const co = getCompany(companyId);
  const current = parentIdOf(co) || '';
  const descIds = new Set(getDescendants(companyId).map(c => c.id));
  const candidates = getCompanies()
    .filter(c => c.id !== companyId && !descIds.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const onChange = (e) => {
    const r = setParentCompany(companyId, e.target.value || null);
    if (r && r.error) return toast(r.message, 'risk');
    toast(e.target.value ? 'Parent company set' : 'Detached to top level');
  };

  return (
    <div className="rh-picker">
      <label className="rh-picker-label t-sm muted" htmlFor="rh-parent">Parent company</label>
      <Select id="rh-parent" value={current} onChange={onChange}>
        <option value="">No parent (top-level account)</option>
        {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
    </div>
  );
}

export default function CompanyTree({ companyId }) {
  useStore();                       // subscribe for reactivity
  useEffect(() => { seedHierarchyExamples(); }, []);
  const co = getCompany(companyId);
  if (!co) return null;

  const ancestors = getAncestors(companyId);           // immediate..root
  const root = ancestors.length ? ancestors[ancestors.length - 1] : co;
  const tree = buildTree(root.id);
  const pathIds = new Set([companyId, ...ancestors.map(a => a.id)]);
  const breadcrumb = [...ancestors].reverse();          // root..immediate parent
  const children = getChildren(companyId);

  const standalone = ancestors.length === 0 && children.length === 0;

  return (
    <div className="rh-tree-wrap">
      {breadcrumb.length > 0 && (
        <nav className="rh-crumb t-sm" aria-label="Account hierarchy breadcrumb">
          {breadcrumb.map((a, i) => (
            <span key={a.id} className="row gap-1" style={{ alignItems: 'center' }}>
              <Link to={`/companies/${a.id}`} className="link">{a.name}</Link>
              <Icon name="chevronRight" size={13} />
            </span>
          ))}
          <span className="fw-6" style={{ color: 'var(--ink)' }}>{co.name}</span>
        </nav>
      )}

      {standalone ? (
        <div className="rh-empty">
          <div className="rh-empty-ico" aria-hidden="true"><Icon name="building" size={22} /></div>
          <div className="fw-6">No sub-companies yet</div>
          <div className="muted t-sm">Link this account to a parent, or make it the parent of others, to build a corporate hierarchy.</div>
        </div>
      ) : (
        <div className="rh-tree" role="tree" aria-label="Account tree">
          {tree && <TreeNode node={tree} depth={0} focusId={companyId} pathIds={pathIds} />}
        </div>
      )}

      <ParentPicker companyId={companyId} />
    </div>
  );
}
