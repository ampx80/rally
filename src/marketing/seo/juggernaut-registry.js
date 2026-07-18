// ============================================================
// JUGGERNAUT REGISTRY  (isolated best-in-class SEO track)
// Aggregates every juggernaut ENTRY file under ./juggernauts into one
// deduped, slug-indexed set. This is a SEPARATE track from the ~1977
// thin /pages entries: juggernaut pages live at /guides/:slug and are
// large, interactive, deeply-researched surfaces.
//
// HOW PAGE-BUILDER AGENTS REGISTER A NEW GUIDE
// 1. Drop a file in src/marketing/seo/juggernauts/<slug>.js that
//    default-exports EITHER one entry object OR an array of entries
//    (see the block contract in juggernaut-render usage + the seed
//    file crm-for-startups.js for a full worked example).
// 2. Add one import + array push in the JUGGERNAUT_MODULES list below.
//    Keep it additive: append a line, never reorder or remove.
// That is the whole registration. The prerender and the /guides/:slug
// React route both read from here, so one edit lights the page up in
// the static build, the sitemap, llms.txt, and the live SPA.
//
// Import resilience: each module is wrapped so a single malformed or
// missing entry file cannot break the whole build. A bad module is
// skipped with a console.warn and every other guide still ships.
//
// ASCII only. NO em-dash / en-dash.
// ============================================================

// --- registered guide modules (append new lines here) ------------------
import crmForStartups from './juggernauts/crm-for-startups.js';
import hubspotAlternative from './juggernauts/hubspot-alternative.js';
import crmRoiCalculator from './juggernauts/crm-roi-calculator.js';
import bestAiCrm from './juggernauts/best-ai-crm.js';
import bestCrmForSmallBusiness from './juggernauts/best-crm-for-small-business.js';
import leadManagementGuide from './juggernauts/lead-management-guide.js';
import crmMigrationGuide from './juggernauts/crm-migration-guide.js';
import salesforceAlternative from './juggernauts/salesforce-alternative.js';
import pipedriveAlternative from './juggernauts/pipedrive-alternative.js';
import zohoCrmAlternative from './juggernauts/zoho-crm-alternative.js';
import bestAiSalesTools from './juggernauts/best-ai-sales-tools.js';
import whatIsACrm from './juggernauts/what-is-a-crm.js';
import salesPipelineManagement from './juggernauts/sales-pipeline-management.js';
import crmVsSpreadsheet from './juggernauts/crm-vs-spreadsheet.js';
import revenueOperationsGuide from './juggernauts/revenue-operations-guide.js';
import salesForecastingGuide from './juggernauts/sales-forecasting-guide.js';
import mondayCrmAlternative from './juggernauts/monday-crm-alternative.js';
import gohighlevelAlternative from './juggernauts/gohighlevel-alternative.js';
import keapAlternative from './juggernauts/keap-alternative.js';
import closeCrmAlternative from './juggernauts/close-crm-alternative.js';
import freshsalesAlternative from './juggernauts/freshsales-alternative.js';
import copperCrmAlternative from './juggernauts/copper-crm-alternative.js';
import bestFreeCrm from './juggernauts/best-free-crm.js';
import bestCrmForRealEstate from './juggernauts/best-crm-for-real-estate.js';
import bestCrmForSaas from './juggernauts/best-crm-for-saas.js';
import bestCrmForAgencies from './juggernauts/best-crm-for-agencies.js';
import bestCrmForConsultants from './juggernauts/best-crm-for-consultants.js';
import salesAutomationGuide from './juggernauts/sales-automation-guide.js';
import accountBasedMarketingGuide from './juggernauts/account-based-marketing-guide.js';
import b2bSalesProcess from './juggernauts/b2b-sales-process.js';
import crmAdoptionGuide from './juggernauts/crm-adoption-guide.js';
import customerOnboardingGuide from './juggernauts/customer-onboarding-guide.js';
import leadScoringGuide from './juggernauts/lead-scoring-guide.js';
import salesEmailSequences from './juggernauts/sales-email-sequences.js';
import salesKpisAndMetrics from './juggernauts/sales-kpis-and-metrics.js';
import whatIsCpq from './juggernauts/what-is-cpq.js';
import bestCrmForNonprofits from './juggernauts/best-crm-for-nonprofits.js';
import bestCrmForEcommerce from './juggernauts/best-crm-for-ecommerce.js';
import bestCrmForInsurance from './juggernauts/best-crm-for-insurance.js';
import bestCrmForFinancialAdvisors from './juggernauts/best-crm-for-financial-advisors.js';
import bestCrmForManufacturing from './juggernauts/best-crm-for-manufacturing.js';
import bestCrmForHealthcare from './juggernauts/best-crm-for-healthcare.js';
import salesEnablementGuide from './juggernauts/sales-enablement-guide.js';
import coldEmailGuide from './juggernauts/cold-email-guide.js';
import salesDiscoveryCallGuide from './juggernauts/sales-discovery-call-guide.js';
import handlingSalesObjections from './juggernauts/handling-sales-objections.js';
import winLossAnalysisGuide from './juggernauts/win-loss-analysis-guide.js';
import salesQuotaSettingGuide from './juggernauts/sales-quota-setting-guide.js';
import crmVsMarketingAutomation from './juggernauts/crm-vs-marketing-automation.js';
import salesCompensationPlansGuide from './juggernauts/sales-compensation-plans-guide.js';
import salesforceVsHubspot from './juggernauts/salesforce-vs-hubspot.js';
import hubspotVsPipedrive from './juggernauts/hubspot-vs-pipedrive.js';
import salesforceVsPipedrive from './juggernauts/salesforce-vs-pipedrive.js';
import microsoftDynamicsAlternative from './juggernauts/microsoft-dynamics-alternative.js';
import sugarcrmAlternative from './juggernauts/sugarcrm-alternative.js';
import bitrix24Alternative from './juggernauts/bitrix24-alternative.js';
import netsuiteCrmAlternative from './juggernauts/netsuite-crm-alternative.js';
import bestCrmForConstruction from './juggernauts/best-crm-for-construction.js';
import bestCrmForRecruiting from './juggernauts/best-crm-for-recruiting.js';
import bestCrmForLawFirms from './juggernauts/best-crm-for-law-firms.js';
import bestCrmForB2b from './juggernauts/best-crm-for-b2b.js';
import salesTerritoryManagementGuide from './juggernauts/sales-territory-management-guide.js';
import customerRetentionGuide from './juggernauts/customer-retention-guide.js';
import salesCoachingGuide from './juggernauts/sales-coaching-guide.js';

const JUGGERNAUT_MODULES = [
  crmForStartups,
  hubspotAlternative,
  crmRoiCalculator,
  bestAiCrm,
  bestCrmForSmallBusiness,
  leadManagementGuide,
  crmMigrationGuide,
  salesforceAlternative,
  pipedriveAlternative,
  zohoCrmAlternative,
  bestAiSalesTools,
  whatIsACrm,
  salesPipelineManagement,
  crmVsSpreadsheet,
  revenueOperationsGuide,
  salesForecastingGuide,
  mondayCrmAlternative,
  gohighlevelAlternative,
  keapAlternative,
  closeCrmAlternative,
  freshsalesAlternative,
  copperCrmAlternative,
  bestFreeCrm,
  bestCrmForRealEstate,
  bestCrmForSaas,
  bestCrmForAgencies,
  bestCrmForConsultants,
  salesAutomationGuide,
  accountBasedMarketingGuide,
  b2bSalesProcess,
  crmAdoptionGuide,
  customerOnboardingGuide,
  leadScoringGuide,
  salesEmailSequences,
  salesKpisAndMetrics,
  whatIsCpq,
  bestCrmForNonprofits,
  bestCrmForEcommerce,
  bestCrmForInsurance,
  bestCrmForFinancialAdvisors,
  bestCrmForManufacturing,
  bestCrmForHealthcare,
  salesEnablementGuide,
  coldEmailGuide,
  salesDiscoveryCallGuide,
  handlingSalesObjections,
  winLossAnalysisGuide,
  salesQuotaSettingGuide,
  crmVsMarketingAutomation,
  salesCompensationPlansGuide,
  salesforceVsHubspot,
  hubspotVsPipedrive,
  salesforceVsPipedrive,
  microsoftDynamicsAlternative,
  sugarcrmAlternative,
  bitrix24Alternative,
  netsuiteCrmAlternative,
  bestCrmForConstruction,
  bestCrmForRecruiting,
  bestCrmForLawFirms,
  bestCrmForB2b,
  salesTerritoryManagementGuide,
  customerRetentionGuide,
  salesCoachingGuide,
  // e.g. import aiSalesForecasting from './juggernauts/ai-sales-forecasting.js';
  //      then add: aiSalesForecasting,
];
// -----------------------------------------------------------------------

const REQUIRED_FIELDS = ['slug', 'title', 'blocks'];

function isValidEntry(e) {
  if (!e || typeof e !== 'object') return false;
  for (const f of REQUIRED_FIELDS) {
    if (f === 'blocks') { if (!Array.isArray(e.blocks)) return false; }
    else if (!e[f]) return false;
  }
  return true;
}

function collect() {
  const out = [];
  const seen = new Set();
  for (const mod of JUGGERNAUT_MODULES) {
    let entries;
    try {
      entries = Array.isArray(mod) ? mod : [mod];
    } catch (err) {
      if (typeof console !== 'undefined') console.warn('juggernaut-registry: skipped a module,', err && err.message);
      continue;
    }
    for (const raw of entries) {
      if (!isValidEntry(raw)) {
        if (typeof console !== 'undefined') console.warn('juggernaut-registry: skipped invalid entry', raw && raw.slug);
        continue;
      }
      if (seen.has(raw.slug)) {
        if (typeof console !== 'undefined') console.warn('juggernaut-registry: duplicate slug ignored:', raw.slug);
        continue;
      }
      seen.add(raw.slug);
      out.push(normalize(raw));
    }
  }
  return out;
}

function normalize(raw) {
  return {
    category: 'Guides',
    updated: raw.updated || raw.published || '2026-07-13',
    published: raw.published || raw.updated || '2026-07-13',
    author: raw.author || 'Ardovo',
    toc: raw.toc !== false,
    ...raw,
  };
}

export const JUGGERNAUTS = collect();
export const bySlug = new Map(JUGGERNAUTS.map((e) => [e.slug, e]));
export const getJuggernaut = (slug) => bySlug.get(slug) || null;
export const juggernautSlugs = () => JUGGERNAUTS.map((e) => e.slug);

/* Lightweight list for sitemap / llms.txt / hub cards. */
export const juggernautSitemapList = () => JUGGERNAUTS.map((e) => ({
  slug: e.slug,
  title: e.title,
  updated: e.updated,
  summary: typeof e.intro === 'string' ? e.intro : Array.isArray(e.intro) ? e.intro[0] : (e.metaDescription || ''),
}));

export default JUGGERNAUTS;
