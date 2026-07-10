// Aggregates every generated-page dataset. Each module default-exports an
// array of normalized page entries. Order here = default hub/sitemap order.
// NO em-dash / en-dash.
import rankings from './rankings.js';
import versus from './versus.js';
import comparisons from './comparisons.js';
import alternatives from './alternatives.js';
import migrations from './migrations.js';
import features from './features.js';
import industries from './industries.js';
import roles from './roles.js';
import integrations from './integrations.js';
import usecases from './usecases.js';
import glossary from './glossary.js';
import guides from './guides.js';
import templates from './templates.js';
import pipelineTopics from './pipeline-topics.js';
import outreachTopics from './outreach-topics.js';
import metricsTopics from './metrics-topics.js';
import dataOpsTopics from './data-ops-topics.js';
import processTopics from './process-topics.js';

export default [
  rankings, versus, comparisons, alternatives, migrations,
  features, industries, roles, integrations, usecases,
  glossary, guides, templates,
  pipelineTopics, outreachTopics, metricsTopics, dataOpsTopics, processTopics,
];
