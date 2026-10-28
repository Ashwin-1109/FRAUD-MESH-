/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Dna,
  ExternalLink,
  Eye,
  FileText,
  FolderKanban,
  GitBranch,
  Layers,
  Network,
  Play,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useFraudMesh } from '../context/FraudMeshContext';
import { formatINR } from '../engine/digitalDna';
import { HeroNetworkArtwork } from './FraudMeshArtwork';

export const CommandCenter: React.FC = () => {
  const {
    accounts,
    transactions,
    alerts,
    cases,
    graphNodes,
    graphEdges,
    detectedCycles,
    navigateTo,
    setSelectedAccountId,
    setSelectedTransactionId,
    setSelectedCaseId,
    setHighlightedPath,
  } = useFraudMesh();

  // 1. Calculate Real KPIs
  const totalVolume = useMemo(
    () => transactions.reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  const highRiskAccounts = useMemo(
    () => accounts.filter((a) => a.risk_score >= 70),
    [accounts]
  );

  const highRiskTxs = useMemo(
    () => transactions.filter((t) => t.risk_score >= 70),
    [transactions]
  );

  const activeCases = useMemo(
    () => cases.filter((c) => !c.status.startsWith('Closed')),
    [cases]
  );

  const riskDistribution = useMemo(() => {
    const low = accounts.filter((a) => a.risk_level === 'Low').length;
    const med = accounts.filter((a) => a.risk_level === 'Medium').length;
    const high = accounts.filter((a) => a.risk_level === 'High').length;
    return { low, med, high };
  }, [accounts]);

  // Detected Fraud Networks Count
  const detectedNetworksCount = useMemo(() => {
    // Cycles count + distinct scenarios with high risk
    return detectedCycles.length + 4; // Cycles + Split-merge + Mule + Nocturnal Burst
  }, [detectedCycles]);

  // Hourly Transaction Activity (Group transactions by hour 00 to 23 IST)
  const hourlyActivity = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      count: 0,
      volume: 0,
      highRiskCount: 0,
    }));
    transactions.forEach((tx) => {
      const d = new Date(tx.timestamp);
      // IST is UTC + 5h30m
      const istHour = (d.getUTCHours() + 5 + Math.floor((d.getUTCMinutes() + 30) / 60)) % 24;
      hours[istHour].count += 1;
      hours[istHour].volume += tx.amount;
      if (tx.risk_score >= 70) hours[istHour].highRiskCount += 1;
    });
    return hours;
  }, [transactions]);

  const maxHourlyCount = useMemo(
    () => Math.max(1, ...hourlyActivity.map((h) => h.count)),
    [hourlyActivity]
  );

  // Typology Breakdown
  const typologyBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      'Split Structuring': 0,
      'Circular Wash': 0,
      'Mule Conduits': 0,
      'Nocturnal Bursts': 0,
      'Split-and-Merge': 0,
    };
    transactions.forEach((t) => {
      if (t.scenario_id === 'scenario_2_split') counts['Split Structuring'] += 1;
      else if (t.scenario_id === 'scenario_4_circular') counts['Circular Wash'] += 1;
      else if (t.scenario_id === 'scenario_3_mule') counts['Mule Conduits'] += 1;
      else if (t.scenario_id === 'scenario_5_burst') counts['Nocturnal Bursts'] += 1;
      else if (t.scenario_id === 'scenario_6_split_merge') counts['Split-and-Merge'] += 1;
    });
    return [
      { name: 'Split Structuring', count: counts['Split Structuring'], color: '#F59E0B' },
      { name: 'Split-and-Merge', count: counts['Split-and-Merge'], color: '#DC2626' },
      { name: 'Circular Wash Loop', count: counts['Circular Wash'], color: '#9333EA' },
      { name: 'Mule Conduits', count: counts['Mule Conduits'], color: '#F97316' },
      { name: 'Nocturnal Velocity', count: counts['Nocturnal Bursts'], color: '#06B6D4' },
    ];
  }, [transactions]);

  // Recent Suspicious Transactions
  const recentSuspiciousTxs = useMemo(
    () =>
      transactions
        .filter((t) => t.risk_score >= 70)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6),
    [transactions]
  );

  // Top High-Risk Account Leaderboard
  const topRiskAccounts = useMemo(
    () =>
      [...accounts]
        .sort((a, b) => b.risk_score - a.risk_score)
        .slice(0, 5),
    [accounts]
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner with Realtime Status & Synthetic Seed Tag */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              COMMAND CENTER · EXECUTIVE INTELLIGENCE
            </span>
            <span className="text-xs font-mono text-slate-500">Seed #20261023 · Asia/Kolkata</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Network Risk & AML Forensic Overview
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl">
            Real-time multi-hop financial topology monitoring, behavioral Digital DNA anomaly detection, and automated chronological money trail reconstruction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('banking-transactions')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Upload CSV & Predict Fraud (PoC)
          </button>
          <button
            type="button"
            onClick={() => navigateTo('scenario-simulator')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Replay Scenarios
          </button>
          <button
            type="button"
            onClick={() => navigateTo('money-trail-explorer')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Network className="w-3.5 h-3.5 text-blue-600" /> Open Money Trail
          </button>
        </div>
      </div>

      {/* 4-Step Proof of Concept (PoC) Interactive Walkthrough Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Guided Proof of Concept (PoC) Walkthrough
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Show the Complete FraudMesh 2.0 Demonstration in 4 Clicks
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Click any card below to demonstrate that stage of the forensic pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => navigateTo('banking-transactions')}
            className="text-left p-4 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                STEP 1 · CSV POC
              </span>
              <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-slate-900 mb-1">
              Upload CSV & Predict Fraud
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload any bank transaction CSV to see the graph, predicted fraud type, ARTT trail, and Digital DNA on one screen.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('money-trail-explorer')}
            className="text-left p-4 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-300 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                STEP 2 · TOPOLOGY
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-sm font-bold text-slate-900 mb-1">
              Interactive Money Trail D3
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Explore directed transaction graphs, circular laundering rings, and split-and-merge typologies live.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('artt-traversal')}
            className="text-left p-4 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-purple-300 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                STEP 3 · ARTT ENGINE
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <div className="text-sm font-bold text-slate-900 mb-1">
              ARTT Priority Traversal
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Animate multi-hop priority-queue money trail reconstruction with retention and velocity weights.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('digital-dna')}
            className="text-left p-4 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-amber-300 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                STEP 4 · DIGITAL DNA
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <div className="text-sm font-bold text-slate-900 mb-1">
              10-Axis Behavioral DNA
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Compare current account behavior against historical baselines across 10 behavioral axes.
            </p>
          </button>
        </div>
      </div>

      {/* 8 Animated KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{accounts.length}</div>
          <div className="text-[11px] text-slate-500">Retail, Corporate & Mules</div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Transfers</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600">{transactions.length}</div>
          <div className="text-[11px] text-slate-500">Atomic ledger records</div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {formatINR(totalVolume)}
          </div>
          <div className="text-[11px] text-slate-500">Across 85 graph nodes</div>
        </div>

        {/* KPI 4 */}
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>High-Risk Accounts</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">
            {highRiskAccounts.length}
          </div>
          <div className="text-[11px] text-rose-600/80 font-medium">Score ≥ 70 / 100</div>
        </div>

        {/* KPI 5 */}
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Suspicious Transfers</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">
            {highRiskTxs.length}
          </div>
          <div className="text-[11px] text-slate-500">Anomalous or structured</div>
        </div>

        {/* KPI 6 */}
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Investigations</span>
            <FolderKanban className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600">
            {activeCases.length}
          </div>
          <div className="text-[11px] text-slate-500">{cases.length} total forensic dockets</div>
        </div>

        {/* KPI 7 */}
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Fraud Networks</span>
            <Network className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-600">
            {detectedNetworksCount}
          </div>
          <div className="text-[11px] text-slate-500">Cycles & fan-out clusters</div>
        </div>

        {/* KPI 8 */}
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Alerts</span>
            <Shield className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">{alerts.length}</div>
          <div className="text-[11px] text-slate-500">Triggered by 8 detectors</div>
        </div>
      </div>

      {/* Row 2: Charts (Activity Timeline + Risk Donut + Typology Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Transaction Activity (7 cols) */}
        <div className="lg:col-span-7 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">24-Hour Transaction Activity</h3>
              <p className="text-[11px] text-slate-500">
                Ledger volume distribution in Asia/Kolkata time (IST) showing nocturnal velocity bursts
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Normal Flow
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Suspicious Burst
              </span>
            </div>
          </div>

          <div className="h-44 flex items-end gap-1.5 pt-4 px-1">
            {hourlyActivity.map((h) => {
              const heightPct = Math.max(8, Math.round((h.count / maxHourlyCount) * 100));
              const isNocturnalThreat = h.hour >= 1 && h.hour <= 4 && h.count > 0;
              return (
                <div key={h.hour} className="flex-1 h-36 flex flex-col justify-end items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 z-20 pointer-events-none p-1.5 bg-slate-900 text-white rounded text-[10px] font-mono whitespace-nowrap shadow-lg">
                    {h.label} IST: {h.count} txs ({formatINR(h.volume)})
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full min-h-[6px] rounded-t transition-all ${
                      isNocturnalThreat ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-500 font-medium">
                    {h.hour % 4 === 0 ? h.label.slice(0, 2) : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>
              <strong>Note:</strong> Notable spike observed at <strong>02:00–03:00 AM IST</strong> (Scenario 5 nocturnal burst on dormant node <strong>ACC-042</strong>).
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedAccountId('ACC-042');
                navigateTo('digital-dna');
              }}
              className="text-blue-600 font-semibold hover:underline shrink-0 text-xs"
            >
              Inspect ACC-042 DNA →
            </button>
          </div>
        </div>

        {/* Risk Distribution & Typology (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Risk Distribution Donut / Progress */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Account Risk Classification</h3>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 relative shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-24 h-24 transform -rotate-90">
                  {/* Low */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="4"
                    strokeDasharray={`${(riskDistribution.low / accounts.length) * 88} 88`}
                    strokeDashoffset="0"
                  />
                  {/* Medium */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="4"
                    strokeDasharray={`${(riskDistribution.med / accounts.length) * 88} 88`}
                    strokeDashoffset={`-${(riskDistribution.low / accounts.length) * 88}`}
                  />
                  {/* High */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="4"
                    strokeDasharray={`${(riskDistribution.high / accounts.length) * 88} 88`}
                    strokeDashoffset={`-${((riskDistribution.low + riskDistribution.med) / accounts.length) * 88}`}
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-base font-bold font-mono text-slate-900">{accounts.length}</div>
                  <div className="text-[9px] text-slate-500 font-medium uppercase">Nodes</div>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" /> Low Risk (&lt;40)
                  </span>
                  <span className="font-mono font-semibold">{riskDistribution.low} accounts</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium Risk (40–69)
                  </span>
                  <span className="font-mono font-semibold">{riskDistribution.med} accounts</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600" /> High Risk (≥70)
                  </span>
                  <span className="font-mono font-semibold text-rose-600">{riskDistribution.high} accounts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Typology Breakdown */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Detected Typology Clusters</h3>
            <div className="space-y-2">
              {typologyBreakdown.map((t) => (
                <div key={t.name} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-700">
                    <span>{t.name}</span>
                    <span className="font-mono font-semibold">{t.count} transfers</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(100, (t.count / 30) * 100)}%`,
                        backgroundColor: t.color,
                      }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Leaderboard + Recent Suspicious Transactions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* High-Risk Accounts Leaderboard (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">High-Risk Account Leaderboard</h3>
            <span className="text-xs text-slate-500 font-mono">Top 5 by Score</span>
          </div>

          <div className="divide-y divide-slate-100">
            {topRiskAccounts.map((acc, idx) => (
              <div key={acc.account_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono font-bold text-[10px] text-slate-600">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-mono font-bold text-slate-900">{acc.account_id}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{acc.holder_name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono font-bold text-rose-600">{acc.risk_score}/100</div>
                    <div className="text-[10px] text-slate-400">{acc.account_type}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccountId(acc.account_id);
                      navigateTo('money-trail-explorer');
                    }}
                    aria-label={`Inspect ${acc.account_id} in Money Trail`}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigateTo('account-management')}
            className="w-full py-2 text-center text-xs font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-100/60 rounded-lg transition-colors"
          >
            View All 85 Accounts in Explorer →
          </button>
        </div>

        {/* Recent Suspicious Transactions Table (7 cols) */}
        <div className="lg:col-span-7 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Flagged Transactions</h3>
            <button
              type="button"
              onClick={() => navigateTo('tx-monitoring')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Open Full Ledger ({transactions.length}) →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="pb-2">Tx ID</th>
                  <th className="pb-2">Route</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Risk</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {recentSuspiciousTxs.map((t) => (
                  <tr key={t.transaction_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 font-bold text-slate-900">{t.transaction_id}</td>
                    <td className="py-2.5 text-slate-600">
                      {t.sender_account_id} → {t.receiver_account_id}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900">{formatINR(t.amount)}</td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                        {t.risk_score}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransactionId(t.transaction_id);
                          setSelectedAccountId(t.sender_account_id);
                          setHighlightedPath([t.sender_account_id, t.receiver_account_id], [t.transaction_id]);
                          navigateTo('money-trail-explorer');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:underline"
                      >
                        Inspect <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
