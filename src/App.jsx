import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, NavLink, Link, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Icon } from './components/icons.jsx';
import { Avatar, useToast } from './components/UI.jsx';
import { getCurrentUser } from './lib/store.js';
import { useModules, moduleForRoute } from './lib/modules.js';
import { applyTheme, useTheme, toggleTheme } from './lib/theme.js';
import { useFocusTrap, useEscapeKey } from './lib/a11y.js';
import CommandK from './components/CommandK.jsx';
import RookDock from './components/RookDock.jsx';
import RecentPagesDock from './components/RecentPagesDock.jsx';
import TrainingMode from './components/TrainingMode.jsx';
import CoachTour from './components/training/CoachTour.jsx';
import TrainingAdmin from './pages/TrainingAdmin.jsx';
import GroupTraining from './pages/GroupTraining.jsx';
import LaunchScreen from './components/LaunchScreen.jsx';
import CommandCenter from './pages/CommandCenter.jsx';
import Deals from './pages/Deals.jsx';
import DealDetail from './pages/DealDetail.jsx';
import Contacts from './pages/Contacts.jsx';
import ContactDetail from './pages/ContactDetail.jsx';
import Companies from './pages/Companies.jsx';
import CompanyDetail from './pages/CompanyDetail.jsx';
import Activities from './pages/Activities.jsx';
import Dashboards from './pages/Dashboards.jsx';
import Integrations from './pages/Integrations.jsx';
import Leads from './pages/Leads.jsx';
import Forecasting from './pages/Forecasting.jsx';
import Campaigns from './pages/Campaigns.jsx';
import Sequences from './pages/Sequences.jsx';
import Inbox from './pages/Inbox.jsx';
import Products from './pages/Products.jsx';
import Quotes from './pages/Quotes.jsx';
import QuoteDetail from './pages/QuoteDetail.jsx';
import Invoices from './pages/Invoices.jsx';
import Reports from './pages/Reports.jsx';
import Workflows from './pages/Workflows.jsx';
import Team from './pages/Team.jsx';
import Settings from './pages/Settings.jsx';
import Projects from './pages/Projects.jsx';
import AuditLog from './pages/AuditLog.jsx';
import ImportData from './pages/ImportData.jsx';
import QualifyConfig from './pages/QualifyConfig.jsx';
import EmailCenter from './pages/EmailCenter.jsx';
import MigrationWizard from './pages/MigrationWizard.jsx';
import Training from './pages/Training.jsx';
import Atlas from './pages/Atlas.jsx';
import AgentCloud from './pages/AgentCloud.jsx';
import AgentStudio from './pages/AgentStudio.jsx';
import AgentApi from './pages/AgentApi.jsx';
import ContextGraph from './pages/ContextGraph.jsx';
import AgentEvals from './pages/AgentEvals.jsx';
import AgentTrust from './pages/AgentTrust.jsx';
import AgentExchange from './pages/AgentExchange.jsx';
import CloudAgents from './pages/CloudAgents.jsx';
import ExperienceLayer from './pages/ExperienceLayer.jsx';
import Studio from './pages/Studio.jsx';
import DocBuilder from './pages/DocBuilder.jsx';
import ForkStudio from './pages/ForkStudio.jsx';
import NightShift from './pages/NightShift.jsx';
import DealFilm from './pages/DealFilm.jsx';
import WindTunnel from './pages/WindTunnel.jsx';
import MarketingAutomations from './pages/MarketingAutomations.jsx';
import GhostDeals from './pages/GhostDeals.jsx';
import AskCanvas from './pages/AskCanvas.jsx';
import Forms from './pages/Forms.jsx';
import LandingPages from './pages/LandingPages.jsx';
import Lists from './pages/Lists.jsx';
import SmsAlerts from './pages/SmsAlerts.jsx';
import Scheduling from './pages/Scheduling.jsx';
import SupportTickets from './pages/SupportTickets.jsx';
import Permissions from './pages/Permissions.jsx';
import CustomObjects from './pages/CustomObjects.jsx';
import CustomObjectRecords from './pages/CustomObjectRecords.jsx';
import Scheduler from './pages/Scheduler.jsx';
import KnowledgeBase from './pages/KnowledgeBase.jsx';
import ServiceHub from './pages/ServiceHub.jsx';
import Duplicates from './pages/Duplicates.jsx';
import TaskQueue from './pages/TaskQueue.jsx';
import Playbooks from './pages/Playbooks.jsx';
import Attribution from './pages/Attribution.jsx';
import { MarketingShell } from './marketing/kit.jsx';
import Home from './marketing/Home.jsx';
import Features from './marketing/Features.jsx';
import RookPage from './marketing/RookPage.jsx';
import Pricing from './marketing/Pricing.jsx';
import Security from './marketing/Security.jsx';
import Manifesto from './marketing/Manifesto.jsx';
import PagesHub from './marketing/PagesHub.jsx';
import SeoPage from './marketing/SeoPage.jsx';
import Juggernaut from './marketing/Juggernaut.jsx';
import GuidesHub from './marketing/GuidesHub.jsx';
import ComingSoon, { isUnlocked } from './gate/ComingSoon.jsx';
import Intelligence from './pages/Intelligence.jsx';
import CustomerSuccess from './pages/CustomerSuccess.jsx';
import Territories from './pages/Territories.jsx';
import Goals from './pages/Goals.jsx';
import Notifications from './pages/Notifications.jsx';
import Developers from './pages/Developers.jsx';
import BillingPlans from './pages/BillingPlans.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Signatures from './pages/Signatures.jsx';
import SignDocument from './pages/SignDocument.jsx';
import ReportBuilder from './pages/ReportBuilder.jsx';
import AutomationLibrary from './pages/AutomationLibrary.jsx';
import Welcome from './pages/Welcome.jsx';
// Wave 6: leapfrog features (Genesis generative setup, Twin digital twin, Autopilot
// autonomous SDR, Workspaces agency/white-label, Conversations omni-inbox, Voice AI,
// Reviews reputation, Social planner, Academy courses, Flow visual workflow builder).
import Genesis from './pages/Genesis.jsx';
import Twin from './pages/Twin.jsx';
import Autopilot from './pages/Autopilot.jsx';
import Workspaces from './pages/Workspaces.jsx';
import WorkspaceDetail from './pages/WorkspaceDetail.jsx';
import Conversations from './pages/Conversations.jsx';
import Voice from './pages/Voice.jsx';
import Reviews from './pages/Reviews.jsx';
import Social from './pages/Social.jsx';
import Academy from './pages/Academy.jsx';
import Flow from './pages/Flow.jsx';
// Wave 7: gap-closers + leapfrogs (Funnels site builder, Payments text-to-pay,
// Surveys NPS/CSAT/CES, Ads cross-channel manager, Affiliates, Marketplace,
// DataSync ops hub, Sandboxes, Signals predictive intel, WarRoom deal cockpit).
import Funnels from './pages/Funnels.jsx';
import Payments from './pages/Payments.jsx';
import Surveys from './pages/Surveys.jsx';
import Ads from './pages/Ads.jsx';
import Affiliates from './pages/Affiliates.jsx';
import Marketplace from './pages/Marketplace.jsx';
import DataSync from './pages/DataSync.jsx';
import Sandboxes from './pages/Sandboxes.jsx';
import Signals from './pages/Signals.jsx';
import WarRoom from './pages/WarRoom.jsx';
// Wave 8: platform expansion (Grid Airtable-killer, Drive file engine, Sheets
// spreadsheet, App Manager module on/off, Roles deep permissions, Journeys
// orchestration, Marketing Hub unified command center).
import Grid from './pages/Grid.jsx';
import Drive from './pages/Drive.jsx';
import Sheets from './pages/Sheets.jsx';
import AppManager from './pages/AppManager.jsx';
import Roles from './pages/Roles.jsx';
import Journeys from './pages/Journeys.jsx';
import MarketingHub from './pages/MarketingHub.jsx';
// Liftoff: AI cinematic onboarding intake wizard -> activates modules + generates
// a per-role deck for every layer (exec/manager/sales/finance/...) + a master deck.
// /liftoff = the wizard (in-app), /liftoff/deck/:role = in-app decks,
// /deck/:role = chrome-free embeddable deck (for the marketing site + iframes).
import Liftoff from './pages/Liftoff.jsx';
// Agent economy flagships: Handshake (agent-to-agent A2A/AP2 deal room where the
// buyer's agent negotiates with ours) + Boardroom (autonomous revenue council
// that debates the real book and files a decision memo).
import Handshake from './pages/Handshake.jsx';
import Boardroom from './pages/Boardroom.jsx';
// Ardova Academy 2.0 - the learn-the-system-in-a-morning suite
import LearnHub from './pages/LearnHub.jsx';
import Arena from './pages/Arena.jsx';
import Momentum from './pages/Momentum.jsx';
import Replay from './pages/Replay.jsx';
import SkillMap from './pages/SkillMap.jsx';
import TrainingCompanion from './components/companion/TrainingCompanion.jsx';
import OsmosisCoach from './components/osmosis/OsmosisCoach.jsx';
import LiftoffDeck from './pages/LiftoffDeck.jsx';
// Back-office admin: signup tracking, growth metrics, filters, launch-into.
import Admin from './pages/Admin.jsx';
import { useAdminAccess } from './lib/access.js';
import HelpCenter from './marketing/help/HelpCenter.jsx';
import HelpArticle from './marketing/help/HelpArticle.jsx';
import StatusPage from './marketing/StatusPage.jsx';
import HelpWidget from './components/HelpWidget.jsx';
import NotificationBell from './components/notif/NotificationBell.jsx';
import Customers from './marketing/Customers.jsx';
import About from './marketing/About.jsx';
import Changelog from './marketing/Changelog.jsx';
import Careers from './marketing/Careers.jsx';
import Blog from './marketing/Blog.jsx';
import BlogPost from './marketing/BlogPost.jsx';
import DemoPage from './marketing/DemoPage.jsx';
import GetStarted from './marketing/GetStarted.jsx';
import EarlyAccess from './marketing/EarlyAccess.jsx';
import Legal from './marketing/Legal.jsx';
import AiTrust from './marketing/AiTrust.jsx';
import Compliance from './marketing/Compliance.jsx';
import Enterprise from './marketing/Enterprise.jsx';
import Login from './pages/Login.jsx';
import Recover from './pages/Recover.jsx';
import LoginHelp from './pages/LoginHelp.jsx';
import SecurityCenter from './pages/Security.jsx';
import DataExport from './pages/DataExport.jsx';
import VsAgentforce from './marketing/VsAgentforce.jsx';
import AgentEconomy from './marketing/AgentEconomy.jsx';
import { useDemo, isLockedPath, exitDemo } from './lib/demo-mode.js';
import { ACCESS_EVENT } from './lib/access-mode.js';
import HostedForm from './marketing/HostedForm.jsx';
import HostedLanding from './marketing/HostedLanding.jsx';
import BookMeeting from './marketing/BookMeeting.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';

// First path segment maps to the product app (everything else = marketing site).
const PRODUCT_SEGS = new Set(['app', 'leads', 'deals', 'contacts', 'companies', 'activities', 'forecasting', 'campaigns', 'sequences', 'projects', 'inbox', 'products', 'quotes', 'invoices', 'studio', 'dashboards', 'reports', 'workflows', 'integrations', 'team', 'settings', 'audit', 'import', 'intelligence', 'success', 'territories', 'goals', 'notifications', 'developers', 'billing-plans', 'onboarding', 'signatures', 'report-builder', 'welcome', 'fork', 'night-shift', 'film', 'wind-tunnel', 'automations', 'ghost-deals', 'canvas', 'forms', 'landing-pages', 'lists', 'sms', 'scheduling', 'tickets', 'permissions', 'objects', 'scheduler', 'kb', 'service', 'duplicates', 'queue', 'playbooks', 'attribution', 'genesis', 'twin', 'autopilot', 'workspaces', 'conversations', 'voice', 'reviews', 'social', 'academy', 'flow', 'funnels', 'payments', 'surveys', 'ads', 'affiliates', 'marketplace', 'datasync', 'sandboxes', 'signals', 'warroom', 'grid', 'drive', 'sheets', 'app-manager', 'email-center', 'roles', 'journeys', 'markethub', 'liftoff', 'admin', 'qualify', 'migrate', 'training', 'atlas',
  'agent-cloud', 'agent-studio', 'agent-api', 'context', 'agent-evals', 'agent-trust', 'agent-exchange', 'cloud-agents', 'experience', 'security-center', 'training-admin', 'group-training', 'data-export', 'handshake', 'boardroom', 'arena', 'momentum', 'replay', 'skills', 'learn']);

// ============================================================
// COMMAND SPINE navigation model
// ------------------------------------------------------------
// A 72px icon spine carries 7 primary destinations. Everything else - the
// long tail of ~75 secondary modules - lives in two places:
//   1. A 240px peek drawer, scoped to whichever spine item you hover/click.
//   2. The full-screen Apps overlay, grouped into 7 catalog categories.
// Every route from the old grouped sidebar is preserved below; nothing was
// deleted, it was reorganized. ALL_ITEMS is the single source of truth for
// icon/label per route - both the peek drawer and the Apps overlay read
// from it, so nothing can drift out of sync.
// ============================================================

// Flat catalog of every secondary destination. cat is one of the 7 Apps
// overlay categories: Customers, Pipeline, Marketing, Revenue, Analytics,
// Automation, Admin. (Command center / Home is the spine itself, so it is
// intentionally absent here.)
const ALL_ITEMS = [
  // Customers
  { to: '/contacts', label: 'Contacts', icon: 'users', cat: 'Customers' },
  { to: '/companies', label: 'Companies', icon: 'building', cat: 'Customers' },
  { to: '/conversations', label: 'Conversations', icon: 'messages', cat: 'Customers' },
  { to: '/voice', label: 'Voice AI', icon: 'mic', cat: 'Customers' },
  { to: '/inbox', label: 'Inbox', icon: 'inbox', cat: 'Customers' },
  { to: '/notifications', label: 'Notifications', icon: 'bell', cat: 'Customers' },
  { to: '/projects', label: 'Projects', icon: 'checkSquare', cat: 'Customers' },
  { to: '/success', label: 'Customer success', icon: 'shield', cat: 'Customers' },
  { to: '/scheduling', label: 'Scheduling', icon: 'calendar', cat: 'Customers' },
  { to: '/tickets', label: 'Support tickets', icon: 'mail', cat: 'Customers' },
  { to: '/service', label: 'Service Hub', icon: 'lifebuoy', cat: 'Customers' },
  { to: '/kb', label: 'Knowledge base', icon: 'book', cat: 'Customers' },
  { to: '/academy', label: 'Academy', icon: 'rocket', cat: 'Customers' },
  { to: '/surveys', label: 'Surveys', icon: 'gauge', cat: 'Customers' },
  // Pipeline
  { to: '/deals', label: 'Deals', icon: 'target', cat: 'Pipeline' },
  { to: '/leads', label: 'Leads', icon: 'funnel', cat: 'Pipeline' },
  { to: '/activities', label: 'My day', icon: 'activity', cat: 'Pipeline' },
  { to: '/forecasting', label: 'Forecasting', icon: 'trendUp', cat: 'Pipeline' },
  { to: '/goals', label: 'Goals', icon: 'rocket', cat: 'Pipeline' },
  { to: '/territories', label: 'Territories', icon: 'grid', cat: 'Pipeline' },
  { to: '/scheduler', label: 'Scheduler', icon: 'clock', cat: 'Pipeline' },
  { to: '/playbooks', label: 'Playbooks', icon: 'book', cat: 'Pipeline' },
  { to: '/warroom', label: 'War Room', icon: 'command', cat: 'Pipeline' },
  // Marketing
  { to: '/campaigns', label: 'Campaigns', icon: 'megaphone', cat: 'Marketing' },
  { to: '/sequences', label: 'Sequences', icon: 'layers', cat: 'Marketing' },
  { to: '/automations', label: 'Automations', icon: 'send', cat: 'Marketing' },
  { to: '/forms', label: 'Forms', icon: 'list', cat: 'Marketing' },
  { to: '/landing-pages', label: 'Landing pages', icon: 'grid', cat: 'Marketing' },
  { to: '/lists', label: 'Lists', icon: 'filter', cat: 'Marketing' },
  { to: '/reviews', label: 'Reviews', icon: 'star', cat: 'Marketing' },
  { to: '/social', label: 'Social', icon: 'share2', cat: 'Marketing' },
  { to: '/funnels', label: 'Funnels', icon: 'funnel', cat: 'Marketing' },
  { to: '/ads', label: 'Ads', icon: 'globe', cat: 'Marketing' },
  { to: '/journeys', label: 'Journeys', icon: 'journeys', cat: 'Marketing' },
  { to: '/markethub', label: 'Marketing Hub', icon: 'radar', cat: 'Marketing' },
  // Revenue
  { to: '/products', label: 'Products', icon: 'box', cat: 'Revenue' },
  { to: '/quotes', label: 'Quotes', icon: 'receipt', cat: 'Revenue' },
  { to: '/signatures', label: 'Signatures', icon: 'edit', cat: 'Revenue' },
  { to: '/invoices', label: 'Billing', icon: 'dollar', cat: 'Revenue' },
  { to: '/payments', label: 'Payments', icon: 'creditCard', cat: 'Revenue' },
  { to: '/affiliates', label: 'Affiliates', icon: 'share2', cat: 'Revenue' },
  { to: '/studio', label: 'Studio', icon: 'fileText', cat: 'Revenue' },
  { to: '/film', label: 'Deal Film', icon: 'eye', cat: 'Revenue' },
  // Analytics
  { to: '/dashboards', label: 'Dashboards', icon: 'chart', cat: 'Analytics' },
  { to: '/reports', label: 'Reports', icon: 'pie', cat: 'Analytics' },
  { to: '/intelligence', label: 'Intelligence', icon: 'sparkles', cat: 'Analytics' },
  { to: '/canvas', label: 'Ask Canvas', icon: 'sliders', cat: 'Analytics' },
  { to: '/fork', label: 'Pipeline Fork', icon: 'gitBranch', cat: 'Analytics' },
  { to: '/wind-tunnel', label: 'Wind Tunnel', icon: 'bolt', cat: 'Analytics' },
  { to: '/ghost-deals', label: 'Ghost Deals', icon: 'rotateCcw', cat: 'Analytics' },
  { to: '/attribution', label: 'Attribution', icon: 'key', cat: 'Analytics' },
  { to: '/twin', label: 'Revenue Twin', icon: 'twin', cat: 'Analytics' },
  { to: '/signals', label: 'Signals', icon: 'signal', cat: 'Analytics' },
  { to: '/atlas', label: 'Atlas', icon: 'radar', cat: 'Analytics' },
  { to: '/grid', label: 'Grid', icon: 'grid', cat: 'Analytics' },
  { to: '/sheets', label: 'Sheets', icon: 'sheet', cat: 'Analytics' },
  // Automation
  { to: '/handshake', label: 'Handshake', icon: 'merge', cat: 'Automation' },
  { to: '/boardroom', label: 'The Boardroom', icon: 'messages', cat: 'Automation' },
  { to: '/agent-cloud', label: 'Agent Cloud', icon: 'sparkles', cat: 'Automation' },
  { to: '/cloud-agents', label: 'Cloud Agents', icon: 'command', cat: 'Automation' },
  { to: '/experience', label: 'Experience Layer', icon: 'share2', cat: 'Automation' },
  { to: '/agent-studio', label: 'Agent Studio', icon: 'command', cat: 'Automation' },
  { to: '/agent-api', label: 'Agent API + MCP', icon: 'command', cat: 'Automation' },
  { to: '/agent-exchange', label: 'Agent Exchange', icon: 'store', cat: 'Automation' },
  { to: '/agent-evals', label: 'Testing Center', icon: 'beaker', cat: 'Automation' },
  { to: '/agent-trust', label: 'Model + Trust', icon: 'lock', cat: 'Automation' },
  { to: '/context', label: 'Context', icon: 'radar', cat: 'Analytics' },
  { to: '/liftoff', label: 'Liftoff', icon: 'rocket', cat: 'Automation' },
  { to: '/genesis', label: 'Genesis', icon: 'sparkles', cat: 'Automation' },
  { to: '/queue', label: 'Task queues', icon: 'check', cat: 'Automation' },
  { to: '/flow', label: 'Flow builder', icon: 'flowNode', cat: 'Automation' },
  { to: '/autopilot', label: 'Autopilot', icon: 'zap', cat: 'Automation' },
  { to: '/workflows', label: 'Workflows', icon: 'workflow', cat: 'Automation' },
  { to: '/workflows/library', label: 'Templates', icon: 'copy', cat: 'Automation' },
  { to: '/night-shift', label: 'Night Shift', icon: 'moon', cat: 'Automation' },
  { to: '/sms', label: 'SMS Alerts', icon: 'phone', cat: 'Automation' },
  // Admin
  { to: '/admin', label: 'Admin (signups)', icon: 'shield', cat: 'Admin' },
  { to: '/qualify', label: 'Pre-qualification', icon: 'funnel', cat: 'Admin' },
  { to: '/migrate', label: 'Migration wizard', icon: 'swap', cat: 'Admin' },
  { to: '/email-center', label: 'Email Center', icon: 'mail', cat: 'Admin' },
  { to: '/learn', label: 'Learn (Academy)', icon: 'rocket', cat: 'Customers' },
  { to: '/training', label: 'Training', icon: 'rocket', cat: 'Customers' },
  { to: '/skills', label: 'Skill Map', icon: 'radar', cat: 'Customers' },
  { to: '/momentum', label: 'Momentum', icon: 'zap', cat: 'Customers' },
  { to: '/arena', label: 'Practice Arena', icon: 'target', cat: 'Customers' },
  { to: '/replay', label: 'Replay + Coach', icon: 'history', cat: 'Customers' },
  { to: '/training-admin', label: 'Training analytics', icon: 'gauge', cat: 'Customers' },
  { to: '/group-training', label: 'Group training', icon: 'users', cat: 'Customers' },
  { to: '/workspaces', label: 'Workspaces', icon: 'building2', cat: 'Admin' },
  { to: '/marketplace', label: 'Marketplace', icon: 'store', cat: 'Admin' },
  { to: '/integrations', label: 'Integrations', icon: 'plug', cat: 'Admin' },
  { to: '/datasync', label: 'Data sync', icon: 'swap', cat: 'Admin' },
  { to: '/data-export', label: 'Export data', icon: 'download', cat: 'Admin' },
  { to: '/sandboxes', label: 'Sandboxes', icon: 'beaker', cat: 'Admin' },
  { to: '/app-manager', label: 'App Manager', icon: 'toggles', cat: 'Admin' },
  { to: '/roles', label: 'Roles', icon: 'roleShield', cat: 'Admin' },
  { to: '/security-center', label: 'Security', icon: 'lock', cat: 'Admin' },
  { to: '/import', label: 'Import', icon: 'download', cat: 'Admin' },
  { to: '/team', label: 'Team', icon: 'user', cat: 'Admin' },
  { to: '/permissions', label: 'Permissions', icon: 'lock', cat: 'Admin' },
  { to: '/objects', label: 'Custom objects', icon: 'menu', cat: 'Admin' },
  { to: '/duplicates', label: 'Duplicates', icon: 'merge', cat: 'Admin' },
  { to: '/developers', label: 'Developers', icon: 'command', cat: 'Admin' },
  { to: '/billing-plans', label: 'Plans', icon: 'zap', cat: 'Admin' },
  { to: '/audit', label: 'Audit', icon: 'history', cat: 'Admin' },
  { to: '/drive', label: 'Drive', icon: 'folder', cat: 'Admin' },
  { to: '/settings', label: 'Settings', icon: 'settings', cat: 'Admin' },
];
const ITEM_BY_ROUTE = new Map(ALL_ITEMS.map(it => [it.to, it]));

// Apps overlay category order (matches the 7 cat values above).
const CATALOG_CATS = ['Customers', 'Pipeline', 'Marketing', 'Revenue', 'Analytics', 'Automation', 'Admin'];
const APPS_CATALOG = CATALOG_CATS.map(cat => ({ cat, items: ALL_ITEMS.filter(it => it.cat === cat) }));

// The 72px icon spine. Home / Pipeline / People / Inbox / Forecast are real
// routes; Rook fires the app-wide `rally:rook` event (never navigates); Apps
// opens the full-screen catalog overlay. `peek` lists the routes (by `to`,
// resolved against ALL_ITEMS) shown in that item's 240px flyout drawer.
const SPINE = [
  { key: 'home', label: 'Home', icon: 'home', to: '/app', end: true,
    peek: ['/agent-cloud', '/activities', '/notifications', '/canvas', '/queue', '/liftoff', '/genesis'] },
  { key: 'pipeline', label: 'Pipeline', icon: 'target', to: '/deals',
    peek: ['/leads', '/handshake', '/goals', '/territories', '/scheduler', '/playbooks', '/warroom', '/fork', '/ghost-deals'] },
  { key: 'people', label: 'People', icon: 'users', to: '/contacts',
    peek: ['/companies', '/conversations', '/voice', '/success', '/tickets', '/service', '/kb', '/projects'] },
  { key: 'inbox', label: 'Inbox', icon: 'inbox', to: '/inbox',
    peek: ['/conversations', '/voice', '/notifications', '/tickets', '/sms'] },
  { key: 'forecast', label: 'Forecast', icon: 'trendUp', to: '/forecasting',
    peek: ['/boardroom', '/goals', '/dashboards', '/reports', '/intelligence', '/atlas', '/signals', '/twin', '/attribution'] },
  { key: 'rook', label: 'Rook', icon: 'rook', ai: true },
  { key: 'apps', label: 'Apps', icon: 'grid', apps: true },
];

// Resolve a spine item's peek routes to full items, honoring module toggles
// + the admin gate - same filter every list in this file respects.
function resolvePeek(spineItem, mods, adminAllowed) {
  return (spineItem.peek || [])
    .map(to => ITEM_BY_ROUTE.get(to))
    .filter(Boolean)
    .filter(it => !ADMIN_ONLY_ROUTES.has(it.to) || adminAllowed)
    .filter(it => { const k = moduleForRoute(it.to); return !k || mods[k] !== false; });
}

// Route-aware primary CTA for the topbar. Falls back to New deal.
const CTA_MAP = {
  '/deals': { label: 'New deal', to: '/deals?new=1', icon: 'plus' },
  '/leads': { label: 'New lead', to: '/leads', icon: 'plus' },
  '/contacts': { label: 'Book meeting', to: '/activities', icon: 'calendar' },
  '/companies': { label: 'New company', to: '/companies', icon: 'plus' },
  '/activities': { label: 'Book meeting', to: '/activities', icon: 'calendar' },
  '/campaigns': { label: 'New campaign', to: '/campaigns', icon: 'plus' },
  '/sequences': { label: 'New sequence', to: '/sequences', icon: 'plus' },
  '/projects': { label: 'New project', to: '/projects', icon: 'plus' },
  '/products': { label: 'New product', to: '/products', icon: 'plus' },
  '/quotes': { label: 'New quote', to: '/quotes', icon: 'plus' },
  '/invoices': { label: 'New invoice', to: '/invoices', icon: 'plus' },
  '/signatures': { label: 'New request', to: '/signatures', icon: 'plus' },
  '/studio': { label: 'New document', to: '/studio', icon: 'plus' },
  '/inbox': { label: 'Compose', to: '/inbox', icon: 'edit' },
  '/workflows': { label: 'New workflow', to: '/workflows', icon: 'plus' },
  '/reports': { label: 'New report', to: '/report-builder', icon: 'plus' },
  '/report-builder': { label: 'New report', to: '/report-builder', icon: 'plus' },
  '/dashboards': { label: 'New dashboard', to: '/dashboards', icon: 'plus' },
  '/team': { label: 'Invite teammate', to: '/team', icon: 'plus' },
  '/goals': { label: 'New goal', to: '/goals', icon: 'plus' },
  '/territories': { label: 'New territory', to: '/territories', icon: 'plus' },
  '/success': { label: 'New account', to: '/success', icon: 'plus' },
  '/integrations': { label: 'Connect app', to: '/integrations', icon: 'plug' },
};
function ctaFor(pathname) {
  const seg = '/' + (pathname.split('/')[1] || '');
  return CTA_MAP[seg] || { label: 'New deal', to: '/deals?new=1', icon: 'plus' };
}

// Legacy /compare/:slug now lives at /pages/rally-vs-:slug. Redirect so link
// equity + bookmarks land on the single canonical URL (no duplicate content).
function CompareRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/pages/rally-vs-${slug}`} replace />;
}

function useIsMobile() {
  const q = '(max-width: 860px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    h();
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return m;
}

// Reused by the peek drawer + mobile drawer + Apps overlay - one row style
// for every secondary destination. In demo mode, config/admin surfaces render
// locked (blurred, non-navigating) and route the prospect to /get-started.
function NavItem({ n, onClose, dense }) {
  const demo = useDemo();
  const nav = useNavigate();
  if (demo && isLockedPath(n.to)) {
    return (
      <button type="button" className="row gap-2 nav-demolock" title="Available after you start - book a walkthrough"
        onClick={() => { onClose?.(); nav('/get-started'); }}
        style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', border: 'none', background: 'transparent', cursor: 'pointer',
          padding: dense ? '.5rem .65rem' : '.55rem .7rem', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: '.94rem', color: 'var(--nav-muted)', opacity: .5 }}>
        <Icon name={n.icon} size={17} />
        <span className="clip" style={{ filter: 'blur(3px)' }}>{n.label}</span>
        <Icon name="lock" size={13} style={{ marginLeft: 'auto', filter: 'none', opacity: .9 }} />
      </button>
    );
  }
  return (
    <NavLink to={n.to} end={n.end} onClick={onClose} className="row gap-2"
      style={({ isActive }) => ({
        padding: dense ? '.5rem .65rem' : '.55rem .7rem', borderRadius: 'var(--r-sm)', fontWeight: 600, fontSize: '.94rem',
        color: isActive ? '#fff' : 'var(--nav-muted)',
        background: isActive ? 'var(--nav-active)' : 'transparent',
        boxShadow: isActive ? 'inset 3px 0 0 var(--accent)' : 'none',
        transition: 'background .12s, color .12s',
      })}>
      <Icon name={n.icon} size={17} />
      <span className="clip">{n.label}</span>
    </NavLink>
  );
}

// Persistent ribbon shown across the top of the product while in demo mode.
function DemoBanner() {
  const nav = useNavigate();
  return (
    <div className="demo-banner">
      <span className="demo-banner__dot" />
      <span className="demo-banner__txt"><strong>Live demo</strong> - a real, working Ardovo with sample data. Config and admin are locked.</span>
      <button className="demo-banner__cta" onClick={() => nav('/get-started')}>Get started free</button>
      <button className="demo-banner__exit" onClick={() => { exitDemo(); nav('/'); }} aria-label="Exit demo"><Icon name="x" size={15} /></button>
      <style>{`
      .demo-banner { position: sticky; top: 0; z-index: 55; display: flex; align-items: center; gap: 12px; padding: 9px 16px;
        background: linear-gradient(100deg, var(--ai-600), var(--ai) 60%, #9b87fb); color: #fff; font-size: 13.5px; }
      .demo-banner__dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; flex: none; animation: rook-mic-pulse 1.6s ease-in-out infinite; }
      .demo-banner__txt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .demo-banner__cta { margin-left: auto; flex: none; font-family: inherit; font-weight: 800; font-size: 13px; cursor: pointer; border: none;
        background: #fff; color: var(--ai-600); border-radius: 999px; padding: 6px 14px; }
      .demo-banner__exit { flex: none; border: none; background: rgba(255,255,255,.18); color: #fff; cursor: pointer; border-radius: 8px; padding: 5px; display: grid; place-items: center; }
      .demo-banner__exit:hover { background: rgba(255,255,255,.3); }
      `}</style>
    </div>
  );
}

// Upsell shown when a demo visitor lands on a locked route.
function DemoLocked() {
  const nav = useNavigate();
  return (
    <div className="page" style={{ maxWidth: 560, margin: '4rem auto', textAlign: 'center' }}>
      <span style={{ display: 'inline-grid', placeItems: 'center', width: 66, height: 66, borderRadius: 18, background: 'var(--ai-50)', color: 'var(--ai-600)' }}><Icon name="lock" size={30} /></span>
      <h1 style={{ fontSize: '1.7rem', margin: '1rem 0 .4rem' }}>This part is off in the demo</h1>
      <p className="muted" style={{ fontSize: '1.05rem', maxWidth: 420, margin: '0 auto' }}>
        Settings, admin, billing, imports, and migrations open up on a real account. Book a walkthrough and an account executive will set it up with your data.
      </p>
      <div className="row gap-2" style={{ justifyContent: 'center', marginTop: '1.6rem' }}>
        <button className="btn btn-primary" onClick={() => nav('/get-started')}><Icon name="chevronRight" size={16} /> Get started free</button>
        <button className="btn btn-ghost" onClick={() => nav('/app')}>Back to the demo</button>
      </div>
    </div>
  );
}

// Rook's mark - a small pawn glyph, kept visually consistent with RookDock's
// floating launcher. Purple/AI, never teal - Rook is the one AI-only surface.
function RookGlyph({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M6 3h2v2h2V3h4v2h2V3h2v5l-2 2v6l1 3H5l1-3v-6L4 8V3h2zm1 15h10v2H7v-2z" />
    </svg>
  );
}

const ADMIN_ONLY_ROUTES = new Set(['/admin']);

// A single 44x44 icon button on the spine. Handles its own active/hover/AI
// styling; the caller decides what happens on hover/click/leave.
function SpineButton({ item, active, isPeekOpen, onEnter, onLeave, onActivate }) {
  const commonProps = {
    className: `spine-btn${active ? ' is-active' : ''}${isPeekOpen ? ' is-peeking' : ''}${item.ai ? ' is-ai' : ''}`,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    title: item.label,
    'aria-label': item.label,
  };
  const glyph = item.key === 'rook' ? <RookGlyph size={21} /> : <Icon name={item.icon} size={20} />;
  if (item.ai || item.apps) {
    return (
      <button type="button" {...commonProps} onClick={onActivate} aria-haspopup={item.apps ? 'dialog' : undefined}>
        {glyph}
        <span className="spine-btn__label">{item.label}</span>
      </button>
    );
  }
  return (
    <NavLink to={item.to} end={item.end} {...commonProps} onClick={onActivate}
      className={({ isActive }) => `${commonProps.className}${isActive ? ' is-active' : ''}`}>
      {glyph}
      <span className="spine-btn__label">{item.label}</span>
    </NavLink>
  );
}

// The 240px flyout scoped to one spine domain. Overlays content (does not
// push layout), so page width never shifts when it opens.
function PeekPanel({ item, items, onClose, onMouseEnter, onMouseLeave }) {
  if (!item) return null;
  return (
    <div className="peek-panel" role="menu" aria-label={`${item.label} shortcuts`}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="peek-panel__head">
        {item.ai ? <RookGlyph size={16} /> : <Icon name={item.icon || 'grid'} size={16} />}
        <span>{item.label}</span>
      </div>
      <div className="peek-panel__list">
        {items.length === 0 && <div className="t-xs" style={{ color: 'var(--nav-muted)', padding: '.4rem .7rem' }}>Nothing here yet.</div>}
        {items.map(n => <NavItem key={n.to} n={n} onClose={onClose} dense />)}
      </div>
    </div>
  );
}

// Full-screen, search-filterable catalog of every module in the product -
// the long tail that does not fit on the 7-item spine. Linear/Notion style.
function AppsOverlay({ open, onClose, mods, adminAllowed }) {
  const [q, setQ] = useState('');
  const panelRef = useRef(null);
  useFocusTrap(panelRef, open);
  useEscapeKey(onClose, open);
  useEffect(() => { if (open) setQ(''); }, [open]);
  if (!open) return null;

  const term = q.trim().toLowerCase();
  const visible = APPS_CATALOG.map(({ cat, items }) => ({
    cat,
    items: items.filter(it => {
      if (ADMIN_ONLY_ROUTES.has(it.to) && !adminAllowed) return false;
      const k = moduleForRoute(it.to); if (k && mods[k] === false) return false;
      return !term || it.label.toLowerCase().includes(term) || cat.toLowerCase().includes(term);
    }),
  })).filter(g => g.items.length > 0);

  return (
    <div className="apps-overlay" onClick={onClose}>
      <div ref={panelRef} className="apps-modal" role="dialog" aria-modal="true" aria-label="All apps" onClick={(e) => e.stopPropagation()}>
        <div className="apps-modal__head">
          <Icon name="search" size={18} style={{ color: 'var(--n-400)' }} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search every module..." aria-label="Search apps" />
          <button type="button" className="btn btn-quiet" onClick={onClose} aria-label="Close apps"><Icon name="x" size={18} /></button>
        </div>
        <div className="apps-modal__scroll">
          {visible.length === 0 && <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>No modules match "{q}"</div>}
          <div className="apps-grid">
            {visible.map(({ cat, items }) => (
              <div key={cat} className="apps-cat">
                <div className="apps-cat__head">{cat}</div>
                <div className="col">
                  {items.map(it => (
                    <NavLink key={it.to} to={it.to} onClick={onClose} className="apps-cat__item"
                      style={({ isActive }) => (isActive ? { color: 'var(--accent-600)', background: 'var(--accent-50)' } : undefined)}>
                      <Icon name={it.icon} size={16} />
                      <span className="clip">{it.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile off-canvas drawer. Hover-driven peek does not translate to touch, so
// mobile gets a clean full nav drawer instead: quick spine pills up top, then
// the full Apps catalog below as collapsible sections (every route reachable
// in one scroll, nothing hidden behind hover).
const MOBILE_NAV_LS = 'rally_mobile_nav_v1';
function readMobileNavState() { try { return JSON.parse(localStorage.getItem(MOBILE_NAV_LS) || '{}') || {}; } catch { return {}; } }
function writeMobileNavState(s) { try { localStorage.setItem(MOBILE_NAV_LS, JSON.stringify(s)); } catch {} }

function MobileNav({ open, onClose, onOpenApps, mods, adminAllowed }) {
  const loc = useLocation();
  const [openMap, setOpenMap] = useState(readMobileNavState);
  const toggle = (cat, base) => { const next = { ...openMap, [cat]: !base }; setOpenMap(next); writeMobileNavState(next); };
  const transform = open ? 'translateX(0)' : 'translateX(-101%)';
  const quickLinks = SPINE.filter(s => !s.apps);

  return (
    <aside className={`rl-rail${open ? ' open' : ''} rl-rail--mobile`} style={{ background: 'var(--nav)', color: 'var(--nav-text)', display: 'flex', flexDirection: 'column', position: 'fixed', inset: '0 auto 0 0', height: '100vh', borderRight: '1px solid var(--nav-line)', transform, willChange: 'transform' }}>
      <div className="row between" style={{ padding: '1.1rem 1.1rem .9rem', alignItems: 'center', flex: 'none' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className="row center floaty spine-logo">
            <img src="/brand/ardovo-icon.png" alt="Ardovo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </span>
          <div className="col" style={{ lineHeight: 1.1 }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-.02em' }}>Ardovo</span>
            <span style={{ fontSize: '.68rem', color: 'var(--nav-muted)', letterSpacing: '.04em' }}>REVENUE PLATFORM</span>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-quiet" aria-label="Close menu" style={{ color: 'var(--nav-muted)', padding: '.35rem' }}>
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="mobile-quick">
        {quickLinks.map(s => s.ai ? (
          <button key={s.key} type="button" className="mobile-quick__pill is-ai" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } })); }}>
            <RookGlyph size={17} /><span>{s.label}</span>
          </button>
        ) : (
          <NavLink key={s.key} to={s.to} end={s.end} onClick={onClose} className="mobile-quick__pill"
            style={({ isActive }) => (isActive ? { background: 'var(--accent)', color: '#fff' } : undefined)}>
            <Icon name={s.icon} size={17} /><span>{s.label}</span>
          </NavLink>
        ))}
        <button type="button" className="mobile-quick__pill" onClick={() => { onClose(); onOpenApps(); }}>
          <Icon name="grid" size={17} /><span>Apps</span>
        </button>
      </div>

      <nav className="col" style={{ padding: '.25rem .7rem .8rem', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {APPS_CATALOG.map(({ cat, items: rawItems }) => {
          const items = rawItems.filter(n => {
            if (ADMIN_ONLY_ROUTES.has(n.to) && !adminAllowed) return false;
            const k = moduleForRoute(n.to); return !k || mods[k] !== false;
          });
          if (items.length === 0) return null;
          const containsActive = items.some(n => loc.pathname === n.to || loc.pathname.startsWith(n.to + '/'));
          const explicit = openMap[cat];
          const baseOpen = explicit !== undefined ? explicit : false;
          const shown = baseOpen || containsActive;
          return (
            <div key={cat} className="col gap-1" style={{ marginBottom: '.15rem' }}>
              <button type="button" className="nav-group" aria-expanded={shown} aria-controls={`navgrp-${cat}`} onClick={() => toggle(cat, baseOpen)}>
                <span>{cat}</span>
                <Icon name="chevronDown" size={15} className="chev" style={{ transform: shown ? 'none' : 'rotate(-90deg)' }} />
              </button>
              {shown && (
                <div id={`navgrp-${cat}`} className="col gap-1">
                  {items.map(n => <NavItem key={n.to} n={n} onClose={onClose} />)}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div style={{ padding: '.7rem', borderTop: '1px solid var(--nav-line)', flex: 'none' }}>
        <div className="row gap-2" style={{ padding: '.35rem .5rem' }}>
          <Avatar name={getCurrentUser()?.name} size={34} />
          <div className="col" style={{ minWidth: 0, lineHeight: 1.2 }}>
            <span className="clip" style={{ fontWeight: 600, fontSize: '.9rem' }}>{getCurrentUser()?.name}</span>
            <span className="clip" style={{ fontSize: '.74rem', color: 'var(--nav-muted)' }}>{getCurrentUser()?.title}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Desktop command spine: 72px of always-visible icons + a hover/click peek
// drawer for whichever domain has secondary destinations open.
function Rail({ open, mobile, onClose, appsOpen, onOpenApps, onCloseApps }) {
  const mods = useModules();
  const adminAllowed = useAdminAccess().allowed;
  const loc = useLocation();
  const [peekKey, setPeekKey] = useState(null);
  const closeTimer = useRef(null);

  const clearCloseTimer = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const openPeek = (key) => { clearCloseTimer(); setPeekKey(key); };
  const scheduleClose = () => { clearCloseTimer(); closeTimer.current = setTimeout(() => setPeekKey(null), 200); };
  const closePeekNow = () => { clearCloseTimer(); setPeekKey(null); };
  useEffect(() => () => clearCloseTimer(), []);
  // Close the peek on every navigation so it never lingers over the new page.
  useEffect(() => { setPeekKey(null); }, [loc.pathname]);

  if (mobile) {
    return (
      <>
        <MobileNav open={open} onClose={onClose} onOpenApps={onOpenApps} mods={mods} adminAllowed={adminAllowed} />
        <AppsOverlay open={appsOpen} onClose={onCloseApps} mods={mods} adminAllowed={adminAllowed} />
      </>
    );
  }

  const isActiveRoute = (item) => item.to && (item.end ? loc.pathname === item.to : (loc.pathname === item.to || loc.pathname.startsWith(item.to + '/')));
  const activePeekItem = peekKey ? SPINE.find(s => s.key === peekKey) : null;
  const peekItems = activePeekItem ? resolvePeek(activePeekItem, mods, adminAllowed) : [];

  return (
    <>
      <aside className="rl-rail" style={{ background: 'var(--nav)', color: 'var(--nav-text)' }}>
        <div className="spine-logo-wrap">
          <NavLink to="/app" end className="spine-logo" aria-label="Ardovo home" title="Ardovo">
            <img src="/brand/ardovo-icon.png" alt="Ardovo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </NavLink>
        </div>
        <nav className="spine-nav" role="navigation" aria-label="Primary">
          {SPINE.map(item => (
            <SpineButton key={item.key} item={item} active={isActiveRoute(item)} isPeekOpen={peekKey === item.key}
              onEnter={() => { if (item.peek) openPeek(item.key); }}
              onLeave={() => { if (item.peek) scheduleClose(); }}
              onActivate={() => {
                if (item.ai) { closePeekNow(); window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } })); return; }
                if (item.apps) { closePeekNow(); onOpenApps(); return; }
                if (item.peek) {
                  if (peekKey === item.key) closePeekNow();
                  else openPeek(item.key);
                } else {
                  closePeekNow();
                }
              }} />
          ))}
        </nav>
        <div className="spine-avatar">
          <Avatar name={getCurrentUser()?.name} size={36} />
        </div>
      </aside>

      {activePeekItem && (
        <PeekPanel item={activePeekItem} items={peekItems} onClose={closePeekNow}
          onMouseEnter={() => openPeek(activePeekItem.key)} onMouseLeave={scheduleClose} />
      )}
      <AppsOverlay open={appsOpen} onClose={onCloseApps} mods={mods} adminAllowed={adminAllowed} />
    </>
  );
}

function Topbar({ onOpenSearch, onBurger }) {
  const nav = useNavigate();
  const loc = useLocation();
  const theme = useTheme();
  const toast = useToast();
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  const cta = ctaFor(loc.pathname);
  const askRook = () => window.dispatchEvent(new CustomEvent('rally:rook', { detail: { open: true } }));
  return (
    <header className="row between rl-topbar glass" style={{ position: 'sticky', top: 0, zIndex: 20, padding: '.7rem 1.75rem', gap: '1rem' }}>
      <span className="mission-pulse" aria-hidden />
      <button onClick={onBurger} className="rl-burger btn btn-quiet" aria-label="Open menu" style={{ padding: '.5rem', flex: 'none' }}>
        <Icon name="list" size={20} />
      </button>
      <button onClick={onOpenSearch} className="row gap-2" style={{ flex: 1, maxWidth: 460, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '.55rem .8rem', cursor: 'pointer', color: 'var(--n-600)' }}>
        <Icon name="search" size={17} />
        <span className="t-sm clip">Search or jump to...</span>
        <span className="spacer" />
        <span className="badge t-xs hide-520">{isMac ? '⌘' : 'Ctrl'} K</span>
      </button>
      <div className="row gap-1" style={{ flex: 'none' }}>
        <button onClick={askRook} className="ask-rook-chip hide-520" title="Ask Rook">
          <RookGlyph size={15} /><span>Ask Rook</span>
        </button>
        <button onClick={toggleTheme} className="btn btn-quiet" title="Toggle theme" aria-label="Toggle theme" style={{ padding: '.5rem' }}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
        <NotificationBell />
        <button onClick={() => nav(cta.to)} className="btn btn-primary btn-sm" style={{ marginLeft: '.25rem' }}>
          <Icon name={cta.icon} size={16} /> <span className="hide-520">{cta.label}</span>
        </button>
      </div>
    </header>
  );
}

// Route guard for the back office. Open in demo mode; once auth is on, only
// super admins (see src/lib/access.js) get in - everyone else sees this.
function AdminGate() {
  const acc = useAdminAccess();
  if (acc.loading) return null;
  if (acc.allowed) return <Admin />;
  return (
    <div className="page" style={{ maxWidth: 520, margin: '4rem auto', textAlign: 'center' }}>
      <span style={{ display: 'inline-grid', placeItems: 'center', width: 64, height: 64, borderRadius: 18, background: 'var(--n-100)', color: 'var(--n-500)' }}><Icon name="lock" size={30} /></span>
      <h1 style={{ fontSize: '1.7rem', margin: '1rem 0 .4rem' }}>Admin is restricted</h1>
      <p className="muted" style={{ fontSize: '1.05rem' }}>The back office is limited to super admins. Sign in with a super-admin account to continue.</p>
      <p style={{ marginTop: '1.5rem' }}><Link className="btn btn-primary" to="/app">Back to Ardovo</Link></p>
    </div>
  );
}

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const mobile = useIsMobile();
  const loc = useLocation();

  useEffect(() => { applyTheme(); }, []);
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setSearchOpen(o => !o); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  // Keep the unlock state reactive: demo entry and the access gate both grant
  // access at runtime (same tab), so re-read on those events instead of only
  // reading once at mount.
  useEffect(() => {
    const refresh = () => setUnlocked(isUnlocked());
    window.addEventListener(ACCESS_EVENT, refresh);
    window.addEventListener('rally:demo-change', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ACCESS_EVENT, refresh);
      window.removeEventListener('rally:demo-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  // Close the mobile drawer + apps overlay + scroll to top on every navigation.
  useEffect(() => { window.scrollTo(0, 0); setNavOpen(false); setAppsOpen(false); }, [loc.pathname]);
  // Lock body scroll while the drawer or the apps overlay is open.
  useEffect(() => { document.body.style.overflow = (navOpen || appsOpen) ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [navOpen, appsOpen]);

  // Marketing site owns the root; the product app lives under known segments.
  const seg = loc.pathname.split('/')[1] || '';
  const isApp = PRODUCT_SEGS.has(seg);
  const demoOn = useDemo();
  const demoLocked = demoOn && isLockedPath(loc.pathname);

  // Chrome-free embeddable decks: /deck/:role renders standalone (no product
  // shell, no marketing chrome) so it drops cleanly into an iframe or the
  // marketing site. The component carries its own scoped styles + demo data.
  if (seg === 'deck') {
    return (
      <Routes>
        <Route path="/deck/:role" element={<LiftoffDeck embed />} />
        <Route path="/deck" element={<LiftoffDeck embed />} />
      </Routes>
    );
  }

  // Real sign-in, standalone + noindex, reachable but never linked/crawled.
  if (seg === 'login') return <Login />;
  if (seg === 'recover') return <Recover />;
  if (seg === 'login-help') return <LoginHelp />;

  if (!isApp) {
    return (
      <MarketingShell>
        <div key={loc.pathname}>
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/product/rook" element={<RookPage />} />
            <Route path="/compare/:slug" element={<CompareRedirect />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/security" element={<Security />} />
            <Route path="/manifesto" element={<Manifesto />} />
            <Route path="/pages" element={<PagesHub />} />
            <Route path="/pages/:slug" element={<SeoPage />} />
            {/* Juggernaut track: deep best-in-class guides, isolated from /pages */}
            <Route path="/guides" element={<GuidesHub />} />
            <Route path="/guides/:slug" element={<Juggernaut />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/about" element={<About />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/get-started" element={<GetStarted />} />
            <Route path="/early-access" element={<EarlyAccess />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/legal/:doc" element={<Legal />} />
            <Route path="/ai-trust" element={<AiTrust />} />
            <Route path="/security/faq" element={<Compliance />} />
            <Route path="/enterprise" element={<Enterprise />} />
            <Route path="/vs-agentforce" element={<VsAgentforce />} />
            <Route path="/agent-economy" element={<AgentEconomy />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/sign/:reqId" element={<SignDocument />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/help/:slug" element={<HelpArticle />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/f/:formId" element={<HostedForm />} />
            <Route path="/l/:slug" element={<HostedLanding />} />
            <Route path="/meet/:slug" element={<BookMeeting />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </MarketingShell>
    );
  }

  // The product app is gated behind the coming-soon waitlist. Marketing and
  // the SEO library above stay public (crawlable); the product unlocks only
  // with the access code, verified server-side against ACCESS_CODE.
  if (!unlocked) return <ComingSoon onUnlock={() => setUnlocked(true)} />;

  return (
    <div>
      <LaunchScreen />
      <div className="ambient" aria-hidden><span className="b1" /><span className="b2" /><span className="b3" /></div>
      <Rail open={navOpen} mobile={mobile} onClose={() => setNavOpen(false)}
        appsOpen={appsOpen} onOpenApps={() => setAppsOpen(true)} onCloseApps={() => setAppsOpen(false)} />
      {mobile && navOpen && <div className="rl-scrim" onClick={() => setNavOpen(false)} aria-hidden />}
      <div className="rl-main" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {demoOn && <DemoBanner />}
        <Topbar onOpenSearch={() => setSearchOpen(true)} onBurger={() => setNavOpen(true)} />
        <main className="rl-content">
          <div key={loc.pathname} className="page-in">
            {demoLocked ? <DemoLocked /> : (
            <Routes location={loc}>
              <Route path="/app" element={<CommandCenter />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/deals" element={<Deals />} />
              <Route path="/deals/:id" element={<DealDetail />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactDetail />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/forecasting" element={<Forecasting />} />
              <Route path="/fork" element={<ForkStudio />} />
              <Route path="/film" element={<DealFilm />} />
              <Route path="/wind-tunnel" element={<WindTunnel />} />
              <Route path="/ghost-deals" element={<GhostDeals />} />
              <Route path="/canvas" element={<AskCanvas />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/sequences" element={<Sequences />} />
              <Route path="/automations" element={<MarketingAutomations />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/products" element={<Products />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/quotes/:id" element={<QuoteDetail />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/studio/:id" element={<DocBuilder />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/dashboards" element={<Dashboards />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/team" element={<Team />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/import" element={<ImportData />} />
              <Route path="/data-export" element={<DataExport />} />
              <Route path="/qualify" element={<QualifyConfig />} />
              <Route path="/email-center" element={<EmailCenter />} />
              <Route path="/migrate" element={<MigrationWizard />} />
              <Route path="/training" element={<Training />} />
              <Route path="/training-admin" element={<TrainingAdmin />} />
              <Route path="/group-training" element={<GroupTraining />} />
              <Route path="/atlas" element={<Atlas />} />
              <Route path="/agent-cloud" element={<AgentCloud />} />
              <Route path="/agent-studio" element={<AgentStudio />} />
              <Route path="/agent-api" element={<AgentApi />} />
              <Route path="/context" element={<ContextGraph />} />
              <Route path="/agent-evals" element={<AgentEvals />} />
              <Route path="/agent-trust" element={<AgentTrust />} />
              <Route path="/agent-exchange" element={<AgentExchange />} />
              <Route path="/cloud-agents" element={<CloudAgents />} />
              <Route path="/handshake" element={<Handshake />} />
              <Route path="/boardroom" element={<Boardroom />} />
              <Route path="/learn" element={<LearnHub />} />
              <Route path="/arena" element={<Arena />} />
              <Route path="/momentum" element={<Momentum />} />
              <Route path="/replay" element={<Replay />} />
              <Route path="/skills" element={<SkillMap />} />
              <Route path="/experience" element={<ExperienceLayer />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/security-center" element={<SecurityCenter />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/success" element={<CustomerSuccess />} />
              <Route path="/scheduling" element={<Scheduling />} />
              <Route path="/tickets" element={<SupportTickets />} />
              <Route path="/permissions" element={<Permissions />} />
              <Route path="/objects" element={<CustomObjects />} />
              <Route path="/objects/:type" element={<CustomObjectRecords />} />
              <Route path="/scheduler" element={<Scheduler />} />
              <Route path="/service" element={<ServiceHub />} />
              <Route path="/kb" element={<KnowledgeBase />} />
              <Route path="/queue" element={<TaskQueue />} />
              <Route path="/playbooks" element={<Playbooks />} />
              <Route path="/attribution" element={<Attribution />} />
              <Route path="/duplicates" element={<Duplicates />} />
              {/* Wave 6: leapfrog features */}
              <Route path="/genesis" element={<Genesis />} />
              <Route path="/twin" element={<Twin />} />
              <Route path="/autopilot" element={<Autopilot />} />
              <Route path="/workspaces" element={<Workspaces />} />
              <Route path="/workspaces/:id" element={<WorkspaceDetail />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/voice" element={<Voice />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/social" element={<Social />} />
              <Route path="/academy" element={<Academy />} />
              <Route path="/flow" element={<Flow />} />
              {/* Wave 7: gap-closers + leapfrogs */}
              <Route path="/funnels" element={<Funnels />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/surveys" element={<Surveys />} />
              <Route path="/ads" element={<Ads />} />
              <Route path="/affiliates" element={<Affiliates />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/datasync" element={<DataSync />} />
              <Route path="/sandboxes" element={<Sandboxes />} />
              <Route path="/signals" element={<Signals />} />
              <Route path="/warroom" element={<WarRoom />} />
              {/* Wave 8: platform expansion */}
              <Route path="/grid" element={<Grid />} />
              <Route path="/drive" element={<Drive />} />
              <Route path="/sheets" element={<Sheets />} />
              <Route path="/app-manager" element={<AppManager />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/journeys" element={<Journeys />} />
              <Route path="/markethub" element={<MarketingHub />} />
              <Route path="/liftoff" element={<Liftoff />} />
              <Route path="/liftoff/deck/:role" element={<LiftoffDeck />} />
              <Route path="/admin" element={<AdminGate />} />
              <Route path="/territories" element={<Territories />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/billing-plans" element={<BillingPlans />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/signatures" element={<Signatures />} />
              <Route path="/report-builder" element={<ReportBuilder />} />
              <Route path="/workflows/library" element={<AutomationLibrary />} />
              <Route path="/night-shift" element={<NightShift />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/forms" element={<Forms />} />
              <Route path="/landing-pages" element={<LandingPages />} />
              <Route path="/lists" element={<Lists />} />
              <Route path="/sms" element={<SmsAlerts />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
            )}
          </div>
        </main>
      </div>
      <CommandK open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpWidget />
      <RookDock />
      <RecentPagesDock />
      <TrainingMode />
      <CoachTour />
      <TrainingCompanion />
      <OsmosisCoach />
    </div>
  );
}
