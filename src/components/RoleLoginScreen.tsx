import React, { useState } from 'react';
import { UserRole, UserProfile } from '../types/fraudmesh';
import {
  Shield,
  Search,
  CreditCard,
  GraduationCap,
  ArrowRight,
  Fingerprint,
  Lock,
  Sparkles,
  Bot,
  Layers,
  Database,
  Sliders,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export const SYSTEM_PERSONAS: Record<UserRole, UserProfile> = {
  ADMIN: {
    id: 'USR-ADMIN-01',
    name: 'Vikram Malhotra',
    role: 'ADMIN',
    roleTitle: 'Chief Risk Officer & Compliance Director',
    avatarBadge: 'VM',
    department: 'Financial Crime & Regulatory Compliance',
    bio: 'Oversees banking ledger integrity, ML benchmark thresholds, regulatory audits, and enterprise fraud detector rules.',
    permissions: [
      'Global Ledger Monitoring',
      '8 Pattern Detectors Configuration',
      '5 ML Models Evaluation & Thresholds',
      'CSV Dataset Ingestion & Batch Processing',
      'Synthetic Account Creation & Audit Logs',
    ],
  },
  INVESTIGATOR: {
    id: 'USR-INV-01',
    name: 'Inspector Lestrade & Task Force',
    role: 'INVESTIGATOR',
    roleTitle: 'Lead Forensic Graph Investigator',
    avatarBadge: 'IL',
    department: 'Special Financial Intelligence Unit (FIU)',
    bio: 'Conducts deep forensic investigations using directed D3 Money Trails, ARTT priority traversals, and Gemini Sherlock Holmes AI.',
    permissions: [
      'Interactive D3 Money Trail Graph',
      'ARTT Algorithmic Money Flow Traversal',
      '10-Axis Digital DNA Behavioral Fingerprints',
      'Case Dossier & Evidence Timelines',
      'Sherlock Holmes Gemini Copilot Consultations',
    ],
  },
  CUSTOMER: {
    id: 'USR-CUST-01',
    name: 'Priya Sharma',
    role: 'CUSTOMER',
    roleTitle: 'Verified Retail Account Holder',
    avatarBadge: 'PS',
    department: 'Mumbai Central Branch · Tier 1 KYC',
    accountId: 'ACC-001',
    bio: 'Synthetic customer persona testing retail transactions, mobile transfers, and real-time security alerts.',
    permissions: [
      'Personal Account Balance & Ledger',
      'Transfer Simulator (IMPS / UPI / RTGS)',
      'Real-Time Behavioral DNA Status',
      'Instant Suspicious Activity Reporting & Disputes',
    ],
  },
  PUBLIC: {
    id: 'USR-RES-01',
    name: 'Dr. John Watson',
    role: 'PUBLIC',
    roleTitle: 'Quantitative AML Researcher & Evaluator',
    avatarBadge: 'JW',
    department: 'FinTech Forensic Intelligence Lab',
    bio: 'Analyzes topology attack vectors, algorithmic benchmarks, and prepares academic evaluations and project showcases.',
    permissions: [
      '6 Synthetic Fraud Typology Scenarios',
      'Algorithmic Pipeline Architecture',
      'Model Performance Benchmarking',
      'Full 10-Screen Presentation Showcase Mode',
    ],
  },
};

interface RoleLoginScreenProps {
  onLogin: (role: UserRole, persona: UserProfile) => void;
  onPresentationMode: () => void;
}

export const RoleLoginScreen: React.FC<RoleLoginScreenProps> = ({
  onLogin,
  onPresentationMode,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('INVESTIGATOR');
  const [loginMethod, setLoginMethod] = useState<'persona' | 'credentials'>('persona');
  const [passcode, setPasscode] = useState('••••••••');
  const [rememberSession, setRememberSession] = useState(true);

  const activePersona = SYSTEM_PERSONAS[selectedRole];

  const handleConfirmLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(selectedRole, activePersona);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col justify-between text-slate-900 selection:bg-blue-600/15 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight font-display text-slate-950">
                FraudMesh <span className="text-blue-600 font-extrabold">2.0</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Enterprise Forensic Platform
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Intelligent Financial Crime Detection & Graph Forensic Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPresentationMode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors border border-slate-300/70"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Presentation Showcase
          </button>
          <button
            type="button"
            onClick={() => onLogin('PUBLIC', SYSTEM_PERSONAS.PUBLIC)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium hidden md:block"
          >
            Quick Guest Tour →
          </button>
        </div>
      </header>

      {/* Main Authentication Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col justify-center">
        {/* Intro Tagline + 1-Click PoC Demo Banner */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-3">
            <Bot className="w-3.5 h-3.5 text-blue-600" />
            Powered by Graph Intelligence, ARTT Traversal & Digital DNA
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-950 tracking-tight font-display">
            1-Click Role Selection & Proof-of-Concept Demo
          </h1>
          <p className="text-slate-600 text-sm mt-2">
            Click any role below to enter immediately, or launch the Guided PoC Demo to upload a CSV and
            see Graph Prediction, ARTT Money Trail, and Digital DNA on one screen.
          </p>
        </div>

        {/* 4 Role Selection Cards (Click card to select, or click Enter button for 1-click instant launch) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 1. Admin */}
          <div
            onClick={() => setSelectedRole('ADMIN')}
            className={`cursor-pointer rounded-2xl p-5 transition-all text-left relative border flex flex-col justify-between ${
              selectedRole === 'ADMIN'
                ? 'bg-white border-blue-600 ring-2 ring-blue-600/20 shadow-md -translate-y-1'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <Shield className="w-5 h-5" />
                </div>
                {selectedRole === 'ADMIN' && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                    Selected
                  </span>
                )}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                1. Bank Administration
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Chief Risk Officer</h2>
              <div className="text-xs text-slate-500 font-medium mb-3">
                Vikram Malhotra · Compliance
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload CSV datasets, configure 8 pattern detectors, evaluate 5 ML models, and audit system rules.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogin('ADMIN', SYSTEM_PERSONAS.ADMIN);
              }}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>1-Click Enter Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Investigator */}
          <div
            onClick={() => setSelectedRole('INVESTIGATOR')}
            className={`cursor-pointer rounded-2xl p-5 transition-all text-left relative border flex flex-col justify-between ${
              selectedRole === 'INVESTIGATOR'
                ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/20 shadow-md -translate-y-1'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  <Search className="w-5 h-5" />
                </div>
                {selectedRole === 'INVESTIGATOR' && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                    Recommended PoC
                  </span>
                )}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
                2. Forensic Intelligence
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Fraud Investigator</h2>
              <div className="text-xs text-slate-500 font-medium mb-3">
                Inspector Lestrade & Task Force
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Explore D3 Money Trails, run ARTT traversals, inspect 10-Axis Digital DNA, and consult Sherlock AI.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogin('INVESTIGATOR', SYSTEM_PERSONAS.INVESTIGATOR);
              }}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>1-Click Enter Forensic Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Customer */}
          <div
            onClick={() => setSelectedRole('CUSTOMER')}
            className={`cursor-pointer rounded-2xl p-5 transition-all text-left relative border flex flex-col justify-between ${
              selectedRole === 'CUSTOMER'
                ? 'bg-white border-emerald-600 ring-2 ring-emerald-600/20 shadow-md -translate-y-1'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  <CreditCard className="w-5 h-5" />
                </div>
                {selectedRole === 'CUSTOMER' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    Selected
                  </span>
                )}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                3. Retail Banking
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Bank Customer</h2>
              <div className="text-xs text-slate-500 font-medium mb-3">
                Priya Sharma · ACC-001
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Simulate live transfers, view personal transaction ledger, check DNA status, and report suspicious activity.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogin('CUSTOMER', SYSTEM_PERSONAS.CUSTOMER);
              }}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>1-Click Customer Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4. Researcher */}
          <div
            onClick={() => setSelectedRole('PUBLIC')}
            className={`cursor-pointer rounded-2xl p-5 transition-all text-left relative border flex flex-col justify-between ${
              selectedRole === 'PUBLIC'
                ? 'bg-white border-cyan-600 ring-2 ring-cyan-600/20 shadow-md -translate-y-1'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100/70 text-cyan-800 flex items-center justify-center font-bold text-sm">
                  <GraduationCap className="w-5 h-5" />
                </div>
                {selectedRole === 'PUBLIC' && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-bold">
                    Selected
                  </span>
                )}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-700 mb-1">
                4. Academic & PoC Lab
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">AI & AML Researcher</h2>
              <div className="text-xs text-slate-500 font-medium mb-3">
                Dr. John Watson · AI Lab
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Examine 6 fraud topology scenarios, 5 ML benchmark architectures, and interactive algorithm flowcharts.
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogin('PUBLIC', SYSTEM_PERSONAS.PUBLIC);
              }}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-800 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>1-Click Research Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Persona Detail & Sign-In Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-3xl mx-auto w-full">
          {/* Header */}
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {activePersona.avatarBadge}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{activePersona.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    {activePersona.roleTitle}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {activePersona.department} {activePersona.accountId ? `· Account: ${activePersona.accountId}` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLoginMethod('persona')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  loginMethod === 'persona'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1-Click Persona
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('credentials')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  loginMethod === 'credentials'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Passcode / Bio
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleConfirmLogin} className="p-6 space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Authorized Workspace Capabilities
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {activePersona.permissions.map((perm, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-slate-700 bg-slate-50/70 p-2 rounded-lg border border-slate-200/60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{perm}</span>
                  </div>
                ))}
              </div>
            </div>

            {loginMethod === 'credentials' && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      User Identifier
                    </label>
                    <input
                      type="text"
                      disabled
                      value={activePersona.id}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Security Passcode / Token
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember role preference for this session
              </label>

              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30"
              >
                <span>Authenticate as {activePersona.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Live System Specs Footer Preview */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center max-w-3xl mx-auto w-full">
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xl font-bold font-mono text-slate-900">50</div>
            <div className="text-[11px] text-slate-500">Synthetic Accounts</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xl font-bold font-mono text-slate-900">1,200+</div>
            <div className="text-[11px] text-slate-500">Directed Transactions</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xl font-bold font-mono text-blue-600">8 Engines</div>
            <div className="text-[11px] text-slate-500">Pattern Detectors</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="text-xl font-bold font-mono text-indigo-600">5 ML Models</div>
            <div className="text-[11px] text-slate-500">Quantitative Benchmarks</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center text-xs text-slate-500">
        FraudMesh 2.0 · Intelligent Financial Crime Detection & Graph Forensic Platform · All state synchronized in real-time
      </footer>
    </div>
  );
};
