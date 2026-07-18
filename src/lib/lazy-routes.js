// Code-splitting toolkit for Ardovo's router. Today App.jsx eager-imports all
// ~35 product + marketing pages at the top of the module, so the initial
// bundle carries every screen (plus recharts, pptxgenjs, the full icon set)
// before the user sees the first paint. This module converts the heavy screens
// to React.lazy so each becomes its own chunk fetched on navigation.
//
// The main thread adopts this by importing `productPages` / `marketingPages`
// and rendering routes with `withSuspense(...)` (see docs/PERF.md for the exact
// App.jsx diff). The dynamic import() specifiers below are static strings, so
// Vite/Rollup can statically analyze and split them at build time.
//
// This file is JSX-free on purpose (.js). The Suspense wrapper uses
// React.createElement so no build-tool JSX handling is needed here.
// ASCII only. NO em-dash / en-dash.

import React, { Suspense } from 'react';

/*
  lazyWithRetry(loader)
  React.lazy plus a one-time reload guard. When a user has an old tab open and
  a new deploy ships, the hashed chunk URL can 404 ("Failed to fetch dynamically
  imported module"). We catch that once, set a sessionStorage flag, and hard
  reload to pull the fresh index. Without this, code-split apps throw a blank
  error boundary after any deploy while a stale tab is open.
*/
export function lazyWithRetry(loader) {
  return React.lazy(() =>
    loader().catch((err) => {
      const KEY = 'rally_chunk_reloaded';
      const alreadyReloaded = sessionStorage.getItem(KEY) === '1';
      if (!alreadyReloaded) {
        sessionStorage.setItem(KEY, '1');
        window.location.reload();
        // Return a never-resolving promise while the reload happens.
        return new Promise(() => {});
      }
      throw err;
    })
  );
}

/*
  PageFallback
  Suspense fallback shown while a route chunk loads. Deliberately quiet: a
  centered accent spinner on a min-height stage so the layout does not jump.
  Honors prefers-reduced-motion (no spin, static dots) and announces "Loading"
  to assistive tech via role="status".
*/
export function PageFallback({ label = 'Loading' }) {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spinner = React.createElement('span', {
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      border: '3px solid var(--n-100, #e9ecf1)',
      borderTopColor: 'var(--accent, #5b4bf5)',
      display: 'inline-block',
      animation: reduce ? 'none' : 'rallySpin .7s linear infinite',
    },
  });
  const styleTag = React.createElement('style', null,
    '@keyframes rallySpin{to{transform:rotate(360deg)}}');
  return React.createElement(
    'div',
    {
      role: 'status',
      'aria-live': 'polite',
      style: {
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        color: 'var(--n-600, #5b6474)',
      },
    },
    styleTag,
    spinner,
    React.createElement('span', { style: { fontWeight: 600, fontSize: '.95rem' } }, label + '...')
  );
}

/*
  withSuspense(LazyComponent, fallback?)
  Returns a React element that renders the lazy component inside a Suspense
  boundary with PageFallback. Use inside <Route element={...}>.

    <Route path="/reports" element={withSuspense(productPages.Reports)} />
*/
export function withSuspense(LazyComponent, fallback) {
  return React.createElement(
    Suspense,
    { fallback: fallback || React.createElement(PageFallback) },
    React.createElement(LazyComponent, null)
  );
}

// --------------------------------------------------------------------------
// Lazy page registries. Each value is a real code-split chunk. Import these in
// App.jsx and delete the matching eager `import X from './pages/X.jsx'` lines.
// Detail pages, chart-heavy pages, and the doc builder (pptxgenjs) are the
// biggest wins; they are rarely the first screen a user lands on.
// --------------------------------------------------------------------------

export const productPages = {
  CommandCenter: lazyWithRetry(() => import('../pages/CommandCenter.jsx')),
  Leads: lazyWithRetry(() => import('../pages/Leads.jsx')),
  Deals: lazyWithRetry(() => import('../pages/Deals.jsx')),
  DealDetail: lazyWithRetry(() => import('../pages/DealDetail.jsx')),
  Contacts: lazyWithRetry(() => import('../pages/Contacts.jsx')),
  ContactDetail: lazyWithRetry(() => import('../pages/ContactDetail.jsx')),
  Companies: lazyWithRetry(() => import('../pages/Companies.jsx')),
  CompanyDetail: lazyWithRetry(() => import('../pages/CompanyDetail.jsx')),
  Activities: lazyWithRetry(() => import('../pages/Activities.jsx')),
  Forecasting: lazyWithRetry(() => import('../pages/Forecasting.jsx')),
  Campaigns: lazyWithRetry(() => import('../pages/Campaigns.jsx')),
  Sequences: lazyWithRetry(() => import('../pages/Sequences.jsx')),
  Projects: lazyWithRetry(() => import('../pages/Projects.jsx')),
  Inbox: lazyWithRetry(() => import('../pages/Inbox.jsx')),
  Products: lazyWithRetry(() => import('../pages/Products.jsx')),
  Quotes: lazyWithRetry(() => import('../pages/Quotes.jsx')),
  QuoteDetail: lazyWithRetry(() => import('../pages/QuoteDetail.jsx')),
  Studio: lazyWithRetry(() => import('../pages/Studio.jsx')),
  DocBuilder: lazyWithRetry(() => import('../pages/DocBuilder.jsx')),
  Invoices: lazyWithRetry(() => import('../pages/Invoices.jsx')),
  Dashboards: lazyWithRetry(() => import('../pages/Dashboards.jsx')),
  Reports: lazyWithRetry(() => import('../pages/Reports.jsx')),
  Workflows: lazyWithRetry(() => import('../pages/Workflows.jsx')),
  Integrations: lazyWithRetry(() => import('../pages/Integrations.jsx')),
  Team: lazyWithRetry(() => import('../pages/Team.jsx')),
  AuditLog: lazyWithRetry(() => import('../pages/AuditLog.jsx')),
  ImportData: lazyWithRetry(() => import('../pages/ImportData.jsx')),
  Settings: lazyWithRetry(() => import('../pages/Settings.jsx')),
};

export const marketingPages = {
  Home: lazyWithRetry(() => import('../marketing/Home.jsx')),
  Features: lazyWithRetry(() => import('../marketing/Features.jsx')),
  RookPage: lazyWithRetry(() => import('../marketing/RookPage.jsx')),
  Pricing: lazyWithRetry(() => import('../marketing/Pricing.jsx')),
  Security: lazyWithRetry(() => import('../marketing/Security.jsx')),
  Manifesto: lazyWithRetry(() => import('../marketing/Manifesto.jsx')),
  PagesHub: lazyWithRetry(() => import('../marketing/PagesHub.jsx')),
  SeoPage: lazyWithRetry(() => import('../marketing/SeoPage.jsx')),
};

/*
  ROUTE_SPLIT_MAP (data)
  Declarative description of every route App.jsx renders, tagged with which
  registry key backs it and a suggested named chunk. The main thread can either
  keep the hand-written <Routes> and swap element props, or drive the whole
  <Routes> block from this array. `eager: true` marks the routes worth keeping
  in the main bundle because they are the common landing screens (avoids a
  Suspense flash on the very first paint). Everything else splits.
*/
export const ROUTE_SPLIT_MAP = {
  product: [
    { path: '/app', page: 'CommandCenter', chunk: 'p-command-center', eager: true },
    { path: '/leads', page: 'Leads', chunk: 'p-leads' },
    { path: '/deals', page: 'Deals', chunk: 'p-deals', eager: true },
    { path: '/deals/:id', page: 'DealDetail', chunk: 'p-deal-detail' },
    { path: '/contacts', page: 'Contacts', chunk: 'p-contacts' },
    { path: '/contacts/:id', page: 'ContactDetail', chunk: 'p-contact-detail' },
    { path: '/companies', page: 'Companies', chunk: 'p-companies' },
    { path: '/companies/:id', page: 'CompanyDetail', chunk: 'p-company-detail' },
    { path: '/activities', page: 'Activities', chunk: 'p-activities' },
    { path: '/forecasting', page: 'Forecasting', chunk: 'p-forecasting', heavy: 'recharts' },
    { path: '/campaigns', page: 'Campaigns', chunk: 'p-campaigns' },
    { path: '/sequences', page: 'Sequences', chunk: 'p-sequences' },
    { path: '/projects', page: 'Projects', chunk: 'p-projects', heavy: 'recharts' },
    { path: '/inbox', page: 'Inbox', chunk: 'p-inbox', heavy: 'recharts' },
    { path: '/products', page: 'Products', chunk: 'p-products' },
    { path: '/quotes', page: 'Quotes', chunk: 'p-quotes', heavy: 'recharts' },
    { path: '/quotes/:id', page: 'QuoteDetail', chunk: 'p-quote-detail', heavy: 'recharts' },
    { path: '/studio', page: 'Studio', chunk: 'p-studio', heavy: 'recharts' },
    { path: '/studio/:id', page: 'DocBuilder', chunk: 'p-doc-builder', heavy: 'pptxgenjs' },
    { path: '/invoices', page: 'Invoices', chunk: 'p-invoices', heavy: 'recharts' },
    { path: '/dashboards', page: 'Dashboards', chunk: 'p-dashboards', heavy: 'recharts' },
    { path: '/reports', page: 'Reports', chunk: 'p-reports', heavy: 'recharts' },
    { path: '/workflows', page: 'Workflows', chunk: 'p-workflows', heavy: 'recharts' },
    { path: '/integrations', page: 'Integrations', chunk: 'p-integrations', heavy: 'recharts' },
    { path: '/team', page: 'Team', chunk: 'p-team' },
    { path: '/audit', page: 'AuditLog', chunk: 'p-audit' },
    { path: '/import', page: 'ImportData', chunk: 'p-import' },
    { path: '/settings', page: 'Settings', chunk: 'p-settings', heavy: 'recharts' },
  ],
  marketing: [
    { path: '/', page: 'Home', chunk: 'm-home', heavy: 'recharts', eager: true },
    { path: '/features', page: 'Features', chunk: 'm-features', heavy: 'recharts' },
    { path: '/product/rook', page: 'RookPage', chunk: 'm-rook', heavy: 'recharts' },
    { path: '/pricing', page: 'Pricing', chunk: 'm-pricing', heavy: 'recharts' },
    { path: '/security', page: 'Security', chunk: 'm-security', heavy: 'recharts' },
    { path: '/manifesto', page: 'Manifesto', chunk: 'm-manifesto', heavy: 'recharts' },
    { path: '/pages', page: 'PagesHub', chunk: 'm-pages-hub' },
    { path: '/pages/:slug', page: 'SeoPage', chunk: 'm-seo-page', heavy: 'recharts' },
  ],
};
