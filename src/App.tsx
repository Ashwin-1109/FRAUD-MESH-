/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  FraudMeshProvider,
  useFraudMesh,
  DEFAULT_PERSONAS,
} from './context/FraudMeshContext';
import { NavigationPage, UserRole } from './types/fraudmesh';
import { PublicViews } from './components/PublicViews';
import { AdminViews } from './components/AdminViews';
import { CustomerViews } from './components/CustomerViews';
import { InvestigatorViews } from './components/InvestigatorViews';
import { ResearchViews } from './components/ResearchViews';
import { CommandCenter } from './components/CommandCenter';
import { PresentationMode } from './components/PresentationMode';
import { RoleLoginScreen } from './components/RoleLoginScreen';
import { SherlockBot } from './components/SherlockBot';
import { LiveTransactionExplainer } from './components/LiveTransactionExplainer';
import { DatasetUploadStudio } from './components/DatasetUploadStudio';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  CreditCard,
  Database,
  Dna,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  GitBranch,
  Home,
  Layers,
  LayoutDashboard,
  LogOut,
  Moon,
  Network,
  Play,
  Presentation,
  Search,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react';

interface NavGroup {
  groupTitle: string;
  items: {
    id: NavigationPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roleHint?: UserRole;
  }[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupTitle: '1. Command Center',
    items: [
      { id: 'command-center', label: 'Executive Intelligence', icon: LayoutDashboard },
      { id: 'welcome', label: 'System Overview & Hero', icon: Home },
      { id: 'platform-overview', label: 'Solution Capabilities', icon: Layers },
    ],
  },
  {
    groupTitle: '2. Banking & Transactions',
    items: [
      { id: 'banking-transactions', label: 'Dataset Upload & Visualizer', icon: Database, roleHint: 'ADMIN' },
      { id: 'account-management', label: 'Account Explorer', icon: Users, roleHint: 'ADMIN' },
      { id: 'tx-monitoring', label: 'Transaction Ledger', icon: FileSpreadsheet, roleHint: 'ADMIN' },
      { id: 'customer-dashboard', label: 'Transaction Simulator', icon: CreditCard, roleHint: 'CUSTOMER' },
      { id: 'customer-tx-history', label: 'Customer Ledger History', icon: FileSpreadsheet, roleHint: 'CUSTOMER' },
    ],
  },
  {
    groupTitle: '3. Money Trail Explorer',
    items: [
      { id: 'money-trail-explorer', label: 'Interactive Network Graph', icon: Network, roleHint: 'INVESTIGATOR' },
      { id: 'artt-traversal', label: 'ARTT Traversal Engine', icon: GitBranch, roleHint: 'INVESTIGATOR' },
      { id: 'suspicious-networks', label: 'Suspicious Topologies', icon: ShieldAlert, roleHint: 'INVESTIGATOR' },
    ],
  },
  {
    groupTitle: '4. Behavioral Intelligence',
    items: [
      { id: 'digital-dna', label: 'Digital DNA 10-Axis Profiler', icon: Dna, roleHint: 'INVESTIGATOR' },
    ],
  },
  {
    groupTitle: '5. Detection & ML Lab',
    items: [
      { id: 'risk-intelligence', label: '8 Fraud Detectors & Scoring', icon: Sliders, roleHint: 'ADMIN' },
      { id: 'model-evaluation', label: 'ML Model Evaluation (5 Models)', icon: Cpu, roleHint: 'ADMIN' },
      { id: 'model-comparison', label: 'Quantitative Benchmark', icon: BarChart3 },
    ],
  },
  {
    groupTitle: '6. Intelligence Lab',
    items: [
      { id: 'scenario-simulator', label: 'Fraud Scenario Simulator', icon: Play },
      { id: 'algorithm-visualization', label: 'Algorithm Visualization', icon: GitBranch },
      { id: 'concept-explorer', label: 'AML Concept Explorer', icon: BookOpen },
      { id: 'architecture-viewer', label: 'System Architecture Viewer', icon: Layers },
    ],
  },
  {
    groupTitle: '7. Investigation Workspace',
    items: [
      { id: 'case-management', label: 'Case Management Board', icon: FolderKanban, roleHint: 'INVESTIGATOR' },
      { id: 'ai-forensic-copilot', label: 'Forensic Copilot Evidence', icon: Bot, roleHint: 'INVESTIGATOR' },
      { id: 'investigation-reports', label: 'Dossier SAR Reports', icon: FileText, roleHint: 'INVESTIGATOR' },
      { id: 'alert-management', label: 'Alert Triage Inbox', icon: AlertTriangle, roleHint: 'INVESTIGATOR' },
    ],
  },
  {
    groupTitle: '8. Governance & Auditing',
    items: [
      { id: 'admin-audit', label: 'System Activity & Logs', icon: Activity, roleHint: 'ADMIN' },
      { id: 'analytics', label: 'Analytics & Risk Trends', icon: BarChart3, roleHint: 'ADMIN' },
      { id: 'system-activity', label: 'Security Audit Trail', icon: Shield, roleHint: 'ADMIN' },
    ],
  },
];

function FraudMeshAppInner() {
  const {
    isAuthenticated,
    currentUser,
    login,
    logout,
    activePage,
    activeRole,
    navigateTo,
    switchDemoRole,
    theme,
    toast,
    clearToast,
    latestExplainedTx,
    clearExplainedTx,
    openSherlockWithQuery,
    isSherlockOpen,
    setIsSherlockOpen,
  } = useFraudMesh();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  // If user is not authenticated, show dedicated role selection & authentication screen!
  if (!isAuthenticated) {
    return (
      <>
        <RoleLoginScreen
          onLogin={(role, persona) => login(role, persona)}
          onPresentationMode={() => setPresentationOpen(true)}
        />
        {presentationOpen && (
          <PresentationMode onClose={() => setPresentationOpen(false)} />
        )}
      </>
    );
  }

  // Determine which component to render for activePage
  const renderActiveView = () => {
    if (activePage === 'banking-transactions') {
      return <DatasetUploadStudio />;
    }
    if (['command-center'].includes(activePage)) {
      return <CommandCenter />;
    }
    if (['welcome', 'platform-overview', 'demo-access'].includes(activePage)) {
      return <PublicViews />;
    }
    if (
      [
        'exec-dashboard',
        'account-management',
        'tx-monitoring',
        'risk-intelligence',
        'model-evaluation',
        'analytics',
        'system-activity',
        'admin-audit',
      ].includes(activePage)
    ) {
      return <AdminViews />;
    }
    if (
      [
        'customer-dashboard',
        'customer-tx-history',
        'customer-tx-status',
        'customer-security-alerts',
        'customer-report-activity',
      ].includes(activePage)
    ) {
      return <CustomerViews />;
    }
    if (
      [
        'investigator-dashboard',
        'money-trail-explorer',
        'artt-traversal',
        'digital-dna',
        'suspicious-networks',
        'ai-forensic-copilot',
        'case-management',
        'investigation-reports',
        'alert-management',
      ].includes(activePage)
    ) {
      return <InvestigatorViews />;
    }
    return <ResearchViews />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFD] text-slate-900 transition-colors duration-150">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-2.5 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <a
            href="#command-center"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('command-center');
            }}
            className="flex items-center gap-2.5 tracking-tight whitespace-nowrap shrink-0 group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              FM
            </div>
            <div>
              <div className="text-base font-bold text-slate-950 leading-none font-display">
                FraudMesh <span className="text-blue-600 font-mono text-xs font-semibold">2.0</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium tracking-tight">
                Graph Forensics & Financial Crime
              </div>
            </div>
          </a>
        </div>

        {/* Quick Tabs */}
        <nav
          aria-label="Primary navigation"
          className="hidden xl:flex items-center gap-1 p-1 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold"
        >
          {[
            { id: 'command-center', label: 'Command Center' },
            { id: 'banking-transactions', label: 'Dataset Studio' },
            { id: 'money-trail-explorer', label: 'Money Trail D3' },
            { id: 'artt-traversal', label: 'ARTT Engine' },
            { id: 'digital-dna', label: 'Digital DNA' },
            { id: 'risk-intelligence', label: '8 Detectors' },
            { id: 'model-evaluation', label: 'ML Benchmark' },
            { id: 'case-management', label: 'Case Board' },
          ].map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white text-blue-700 font-bold shadow-xs border border-blue-200/90'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Persona & Role Selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Sherlock Holmes Bot Trigger Button */}
          <button
            type="button"
            onClick={() => setIsSherlockOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors shadow-2xs"
            title="Open Sherlock Holmes AI Forensic Copilot"
          >
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Sherlock AI</span>
          </button>

          {/* Presentation Mode */}
          <button
            type="button"
            onClick={() => setPresentationOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            <Presentation className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Showcase</span>
          </button>

          {/* Active Persona Pill with Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="inline-flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">
                {currentUser?.avatarBadge || 'FM'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser?.name || 'Active User'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium leading-tight">
                  {activeRole}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Role Switcher Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900">{currentUser?.name}</div>
                  <div className="text-[11px] text-slate-500">{currentUser?.roleTitle}</div>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Active Persona:
                  </div>
                  {(['ADMIN', 'INVESTIGATOR', 'CUSTOMER', 'PUBLIC'] as UserRole[]).map((r) => {
                    const p = DEFAULT_PERSONAS[r];
                    const isCur = activeRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          switchDemoRole(r);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                          isCur
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-100 font-mono text-[10px] flex items-center justify-center font-bold">
                            {p.avatarBadge}
                          </span>
                          <span>{p.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{r}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out to Role Screen</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Guided PoC Demo Workflow & 1-Click Role Switcher Sub-Header */}
      <div className="bg-slate-50/90 border-b border-slate-200 px-5 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: 5-Step Guided Proof of Concept (PoC) Flow */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            PoC Demo Flow:
          </span>
          {[
            { id: 'banking-transactions', step: '1', label: 'Upload CSV & Predict Fraud' },
            { id: 'money-trail-explorer', step: '2', label: 'Network Graph' },
            { id: 'artt-traversal', step: '3', label: 'ARTT Traversal' },
            { id: 'digital-dna', step: '4', label: 'Digital DNA' },
            { id: 'scenario-simulator', step: '5', label: 'Live Simulator' },
          ].map((poc) => {
            const isActive = activePage === poc.id;
            return (
              <button
                key={poc.id}
                type="button"
                onClick={() => navigateTo(poc.id as NavigationPage)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isActive ? 'bg-white text-blue-700' : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {poc.step}
                </span>
                <span>{poc.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: 1-Click Instant Role Switcher Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 hidden md:inline">
            1-Click Role:
          </span>
          {(
            [
              { role: 'INVESTIGATOR', label: 'Investigator' },
              { role: 'ADMIN', label: 'Admin' },
              { role: 'CUSTOMER', label: 'Customer' },
              { role: 'PUBLIC', label: 'Research' },
            ] as { role: UserRole; label: string }[]
          ).map((r) => {
            const isCur = activeRole === r.role;
            return (
              <button
                key={r.role}
                type="button"
                onClick={() => switchDemoRole(r.role)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isCur
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace: Collapsible Sidebar + Content View */}
      <div className="flex-1 flex min-h-0">
        {/* Navigation Sidebar */}
        <aside
          aria-label="Full platform module navigation"
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-64'
          } shrink-0 border-r border-slate-200/90 bg-white flex flex-col justify-between transition-all duration-150 shadow-2xs`}
        >
          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between px-2">
              {!sidebarCollapsed && (
                <span className="text-[11px] font-mono font-semibold text-slate-500">
                  ROLE: {activeRole}
                </span>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {NAVIGATION_GROUPS.map((group) => (
              <div key={group.groupTitle} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {group.groupTitle}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  const isRoleMatch = item.roleHint === activeRole;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      title={item.label}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : isRoleMatch
                          ? 'text-slate-800 hover:bg-blue-50/70 hover:text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && (
                        <div className="flex-1 flex items-center justify-between truncate">
                          <span className="truncate">{item.label}</span>
                          {isRoleMatch && !isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 ml-1.5" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {!sidebarCollapsed && (
            <div className="p-3 border-t border-slate-100 text-[11px] text-slate-500 bg-slate-50/70">
              <div className="font-semibold text-slate-800">FraudMesh Core v2.4</div>
              <div>Graph Engine & ARTT Active</div>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#F8FAFD]">
          {renderActiveView()}
        </main>
      </div>

      {/* Floating Sherlock Holmes Forensic Investigator Chatbot */}
      <SherlockBot />

      {/* Live Transaction AI Explainer Toast */}
      <LiveTransactionExplainer
        explanation={latestExplainedTx}
        onClose={clearExplainedTx}
        onOpenSherlockWithQuery={openSherlockWithQuery}
      />

      {/* Presentation Showcase Modal */}
      {presentationOpen && (
        <PresentationMode onClose={() => setPresentationOpen(false)} />
      )}

      {/* Toast Notice */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm bg-white rounded-2xl border border-slate-200 p-4 shadow-xl flex items-start gap-3 animate-in slide-in-from-bottom-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === 'error'
                ? 'bg-rose-100 text-rose-600'
                : toast.type === 'warning'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {toast.type === 'error' ? (
              <ShieldAlert className="w-4 h-4" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-slate-900">{toast.title}</div>
            <div className="text-slate-600 mt-0.5">{toast.description}</div>
          </div>
          <button
            type="button"
            onClick={clearToast}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <FraudMeshProvider>
      <FraudMeshAppInner />
    </FraudMeshProvider>
  );
}
