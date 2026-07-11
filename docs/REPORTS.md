# Reports and Report Builder v2

Rally has two reporting surfaces:

- **Reports** (`/reports`, `src/pages/Reports.jsx`) - the original answers layer:
  a live KPI dashboard, a gallery of one-metric / one-dimension reports, and a
  simple builder modal. Engine: `src/lib/reports-data.js`.
- **Report Builder v2** (`/report-builder`, `src/pages/ReportBuilder.jsx`) - a
  drag-to-build workspace with multi-dimension reports, cohort analysis, and
  scheduled delivery. Engine: `src/lib/report-builder.js`. This document covers v2.

Everything computes deterministically off the live store (`src/lib/store.js`).
Custom report definitions and delivery schedules persist to `localStorage`
with pub/sub, so the page re-renders on any save or delete.

ASCII only across all report code. No em-dash / en-dash.

## The definition model

A report is a plain object:

    {
      id, title, desc,
      source: 'deals' | 'contacts' | 'companies' | 'activities',
      dimensions: [primaryDimId, secondaryDimId?],   // 1 or 2 group-by fields
      measure: { field: 'value' | null, agg: 'count'|'sum'|'avg'|'min'|'max' },
      filters: [{ field, op: 'is'|'isNot'|'contains'|'gt'|'lt', value }],
      viz: 'bar' | 'line' | 'area' | 'pie' | 'table' | 'kpi',
      dateRange: { field, preset: 'all'|'this_month'|'last_30'|'last_90'|'this_quarter'|'this_year' }
    }

Field catalog per source lives in `FIELDS` in `report-builder.js`. Each field has a
`role` (`dim` / `measure` / `date`) and a `type` (`money` / `percent` / `number` /
`text` / `date`) that drives value formatting.

## The engine

`runReport(def)` is pure and deterministic. It:

1. `reconcileDefinition(def)` - keeps the def internally valid (e.g. after a
   source change, measures / dims / date fields that no longer exist are dropped).
2. Filters records by the date-range window, then by the filter list.
3. Buckets rows by the primary dimension (and a secondary dimension when present,
   producing a multi-series / stacked result).
4. Aggregates each bucket by the measure aggregation.
5. Sorts (stage in pipeline order, temporal dims chronologically, else value desc).

Returns `{ rows, series, total, valueFormat, measureLabel, dimLabel, recordCount, kpi }`.
`series` is the list of secondary-dimension keys (empty for single-series).

Rendering is `src/components/reports2/VizPreview.jsx` (recharts, mirrors the look of
`Reports.jsx`). CSV export is `reportToCsv(def, computed)` + `downloadCsv(name, csv)`.

## Cohort analysis

`cohortAnalysis({ source, metric, maxOffset })` groups records into monthly cohorts
by creation month, then tracks each cohort across the following months.

- `conversion` (deals) - share of the cohort won by month N (percent).
- `value` (deals) - cumulative won value by month N (money).
- `count` (any source) - records created in that offset month.

Returns `{ cohorts, maxOffset, metric, format, avgByOffset }`, rendered as a heatmap
by `src/components/reports2/CohortGrid.jsx`.

## Scheduled delivery

A schedule renders a saved report on a cadence and emails it to a recipient list.

- Config model + persistence: `saveSchedule`, `loadSchedules`, `deleteSchedule`,
  `toggleSchedule`, `nextRun(cadence, hour)` in `report-builder.js`
  (`localStorage` key `rally_report_schedules_v1`, pub/sub).
- Cadences: `daily` (weekdays), `weekly` (Mondays), `monthly` (1st).
- `renderScheduleForDelivery(schedule)` produces the compact payload
  (title, recipients, rows, csv, totals) the delivery endpoint emails.
- UI: `src/components/reports2/ScheduleDialog.jsx` (add recipients, pick cadence /
  hour / format, "Send test now").

### Delivery endpoint - api/report-deliver.js

- `POST { action, deliveries: [payload] }` - renders each payload into an email
  (chart summary as HTML bars + CSV attachment) and sends via Resend. Used by
  "Send test now". Returns `{ ok, emailed, sent, count }`.
- `GET` (cron) - best-effort server sweep. If Supabase is configured, reads due
  rows from `rally_report_schedules`; otherwise no-ops (the demo store is
  client-side). Never errors.
- Email is a clean no-op (still `200`) when `RESEND_API_KEY` is absent.

Env: `RESEND_API_KEY`, `NOTIFY_FROM` (optional), `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` (optional durable schedules).

### Cron entry (vercel.json)

`vercel.json` is not edited by this feature (additive rule). To activate the daily
sweep, add:

    "crons": [
      { "path": "/api/report-deliver", "schedule": "0 13 * * *" }
    ]

(13:00 UTC = 08:00 America/New_York.) On Vercel Hobby, crons run once per day.

## Wiring (applied outside this feature's files)

- Route: add `<Route path="/report-builder" element={<ReportBuilder />} />` plus
  `report-builder` to `PRODUCT_SEGS` in `src/App.jsx`.
- Nav: a `{ to: '/report-builder', label: 'Report builder', icon: 'sliders' }` item
  under the Intelligence section in `src/App.jsx`.
- A "Build a report" link from `src/pages/Reports.jsx` to `/report-builder`.
- The cron entry above in `vercel.json`.
