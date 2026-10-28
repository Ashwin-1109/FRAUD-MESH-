import React from 'react';
import { useFraudMesh } from '../context/FraudMeshContext';
import { formatINR } from '../engine/digitalDna';
import { SIMULATION_SCENARIOS } from '../engine/syntheticData';
import { HeroNetworkArtwork } from './FraudMeshArtwork';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Cpu,
  Dna,
  GitBranch,
  Layers,
  Network,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react';

export const PublicViews: React.FC = () => {
  const {
    activePage,
    accounts,
    transactions,
    alerts,
    cases,
    navigateTo,
    switchDemoRole,
    setActiveSimScenario,
  } = useFraudMesh();

  const highRiskAlerts = alerts.filter((a) => a.risk_level === 'High').length;
  const totalVolume = transactions.reduce((s, t) => s + t.amount, 0);

  // 1. Solution Capabilities & Platform Overview
  if (activePage === 'platform-overview') {
    return (
      <div className="space-y-8">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 md:p-8">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Academic Research Prototype · Graph Forensic Ecosystem
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
            Platform Overview & Forensic Architecture
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
            Traditional rule engines inspect financial transfers in isolation. FraudMesh models the
            entire banking ledger as a directed temporal multigraph, combining behavioral
            fingerprinting (Digital DNA), priority-queue temporal graph traversal (ARTT),
            multi-detector pattern discovery, and evidence-grounded AI Forensic Copilot analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: '01. Money Trail Graph Intelligence',
              icon: Network,
              desc: 'Interactive D3.js directed network modeling accounts as nodes and financial transfers as timestamped edges with live centrality, in/out degree, and cycle participation metrics.',
              actionLabel: 'Open Money Trail Explorer',
              targetPage: 'money-trail-explorer' as const,
            },
            {
              title: '02. ARTT Temporal Traversal Engine',
              icon: GitBranch,
              desc: 'Adaptive Risk-Aware Temporal Transaction Traverser expands multi-hop pathways using a priority queue weighted by anomaly, velocity, structural topology, and chronological validity.',
              actionLabel: 'Run ARTT Traversal',
              targetPage: 'artt-traversal' as const,
            },
            {
              title: '03. Transaction Digital DNA',
              icon: Dna,
              desc: '10-axis behavioral baseline profiling typical amount, variability, active IST hours, interval compression, pass-through parity, and novel beneficiary dispersion.',
              actionLabel: 'Inspect Digital DNA',
              targetPage: 'digital-dna' as const,
            },
            {
              title: '04. 8-Detector Pattern Engine',
              icon: Sliders,
              desc: 'Modular detectors for Transaction Splitting, Circular Loops, Fan-In/Fan-Out, Rapid Pass-Through, Nocturnal Velocity Bursts, and Split-and-Merge topologies.',
              actionLabel: 'Review Alert Queue',
              targetPage: 'alert-management' as const,
            },
            {
              title: '05. AI Forensic Copilot',
              icon: Sparkles,
              desc: 'Server-side Gemini investigation assistant grounded strictly in system transaction IDs, alert evidence, ARTT pathways, and Digital DNA deviations.',
              actionLabel: 'Launch AI Copilot',
              targetPage: 'ai-forensic-copilot' as const,
            },
            {
              title: '06. Honest ML Model Evaluation',
              icon: Cpu,
              desc: 'Side-by-side evaluation of Rule-Based Graph Risk, Logistic Regression, Random Forest, GBDT, and Deep Neural Network (MLP) without train/test leakage.',
              actionLabel: 'Open Model Evaluation',
              targetPage: 'model-evaluation' as const,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4 text-blue-600">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigateTo(item.targetPage)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    {item.actionLabel}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Demo Access / Role Management
  if (activePage === 'demo-access') {
    return (
      <div className="space-y-8">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 md:p-8">
          <div className="text-xs font-mono font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full w-fit">
            DEMO MODE – SYNTHETIC DATA · ASIA/KOLKATA (INR)
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2">
            Interactive Role Access & Sandbox Switcher
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
            Switch seamlessly between the three core operational personas of FraudMesh. Every role
            interacts with the same live in-memory synthetic ledger—submitting a transfer as a
            Customer immediately updates the Bank Administrator metrics and the Fraud Investigator
            graph.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role A: Bank Administrator */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 flex flex-col justify-between hover:border-blue-300 transition-colors">
            <div>
              <div className="text-xs text-blue-600 font-mono font-semibold">ROLE A · ENTERPRISE OVERSIGHT</div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Bank Administrator</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Monitor bank-wide synthetic transaction volume, configure risk band thresholds,
                import/export CSV ledgers, audit high-risk accounts, and evaluate machine learning
                classifiers.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Executive KPI & Alert Distribution Dashboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Ledger Monitoring & Validated CSV Ingestion
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Centralized Risk Band Calibration (0–100)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Multi-Model ML Evaluation & Confusion Matrix
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => switchDemoRole('ADMIN')}
              className="mt-6 w-full py-2.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              Enter Bank Administrator Console
            </button>
          </div>

          {/* Role B: Customer */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 flex flex-col justify-between hover:border-emerald-300 transition-colors">
            <div>
              <div className="text-xs text-emerald-600 font-mono font-semibold">ROLE B · RETAIL DIGITAL BANKING</div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Synthetic Customer</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Access your isolated personal synthetic bank account (default: ACC-001 · Ananya
                Sharma), simulate live INR transfers, inspect security notifications, and report
                unusual activity.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Strict Single-Customer Privacy Scope
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live Simulated Ledger Transfer Submission
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Real-Time Pipeline Risk & Alert Feedback
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Suspicious Activity Reporting Queue
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => switchDemoRole('CUSTOMER')}
              className="mt-6 w-full py-2.5 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              Enter Customer Banking Portal
            </button>
          </div>

          {/* Role C: Fraud Investigator */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 flex flex-col justify-between hover:border-rose-300 transition-colors">
            <div>
              <div className="text-xs text-rose-600 font-mono font-semibold">ROLE C · GRAPH FORENSIC UNIT</div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Fraud Investigator</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Investigate multi-hop laundering topologies, run ARTT temporal graph traversal,
                compare 10-axis Digital DNA profiles, consult the AI Forensic Copilot, and manage
                investigation cases.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Interactive D3.js Money Trail Explorer
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Step-by-Step ARTT Priority-Queue Traversal
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Digital DNA Behavioral Radar & Timeline
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  AI Forensic Copilot & Dossier Export
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => switchDemoRole('INVESTIGATOR')}
              className="mt-6 w-full py-2.5 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              Enter Investigator Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: Welcome / Introduction page with Hero Artwork
  return (
    <div className="space-y-8">
      {/* Hero Card */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 md:p-10 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              FRAUDMESH 2.0 FORENSIC PLATFORM
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Uncover Hidden Connections.{' '}
              <span className="text-blue-600">Decode Financial Crime.</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              An intelligent financial crime detection platform fusing temporal graph algorithms,
              10-axis behavioral Digital DNA fingerprinting, multi-detector topology discovery,
              and evidence-grounded AI forensic assistance.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigateTo('scenario-simulator')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                Explore Scenario Lab
              </button>
              <button
                type="button"
                onClick={() =>
                  navigateTo('money-trail-explorer', {
                    role: 'INVESTIGATOR',
                    accountId: 'ACC-050',
                  })
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                <Network className="w-4 h-4 text-blue-600" />
                Open Money Trail Graph
              </button>
              <button
                type="button"
                onClick={() => navigateTo('demo-access')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0"
              >
                Switch Role Sandbox
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Hero Scalable SVG Artwork */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-2">
            <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <HeroNetworkArtwork className="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width 4-Column KPI Strip Below Hero Split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
          <div className="text-xs font-medium text-slate-500">Synthetic Accounts</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {accounts.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Retail, Corporate & Mule Conduits
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
          <div className="text-xs font-medium text-slate-500">Processed Ledger Transfers</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {transactions.length.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-600 mt-1 font-mono font-medium">
            Volume: {formatINR(totalVolume)}
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
          <div className="text-xs font-medium text-slate-500">High-Risk Detector Alerts</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 mt-1">
            {highRiskAlerts}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across 8 Modular Graph Detectors
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
          <div className="text-xs font-medium text-slate-500">Active Forensic Cases</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 mt-1">
            {cases.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Linked Evidence & Copilot Briefs
          </div>
        </div>
      </div>

      {/* Quick Launch into the 6 Scenarios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Interactive Fraud Scenarios (Intelligence Lab)
            </h2>
            <p className="text-xs text-slate-600">
              Select any synthetic behavioral topology to launch chronological simulation and graph inspection
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('scenario-simulator')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap shrink-0"
          >
            Open Intelligence Lab →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SIMULATION_SCENARIOS.map((sc) => (
            <div
              key={sc.id}
              className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-fit">
                  Scenario 0{sc.number} · {sc.badge}
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{sc.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{sc.subtitle}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">
                  {sc.involved_accounts.length} Accounts Involved
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSimScenario(sc.id);
                    navigateTo('scenario-simulator', {
                      accountId: sc.primary_account,
                      highlightAccounts: sc.involved_accounts,
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Launch Simulation
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
