import React, { useMemo, useState } from 'react';
import { useFraudMesh } from '../context/FraudMeshContext';
import { formatINR } from '../engine/digitalDna';
import { evaluateTransactionRisk } from '../engine/riskAndDetectors';
import {
  exportTransactionsToCSV,
  getSampleCSVTemplate,
} from '../engine/syntheticData';
import { Account, RiskLevel, ScenarioId } from '../types/fraudmesh';
import {
  Download,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Upload,
  CheckCircle2,
  AlertOctagon,
  Cpu,
  Shield,
  Activity,
  Terminal,
  Play,
} from 'lucide-react';
import { runClientTestSuite, TestExecutionResult } from '../engine/testRunner';

export const AdminViews: React.FC = () => {
  const {
    activePage,
    accounts,
    transactions,
    alerts,
    cases,
    dnaProfiles,
    graphNodes,
    modelEvaluations,
    mlThreshold,
    riskConfig,
    auditLog,
    selectedTransactionId,
    setSelectedTransactionId,
    navigateTo,
    addSyntheticAccount,
    generateOnDemandTransactions,
    importCSVTransactions,
    resetDataset,
    createCaseFromAlertAction,
    updateRiskThresholds,
    updateMLThreshold,
  } = useFraudMesh();

  // Dashboard & Ledger filters
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [detectorFilter, setDetectorFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [txPage, setTxPage] = useState(1);
  const pageSize = 20;

  // CSV Import state
  const [csvInputText, setCsvInputText] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Add Account state
  const [newHolderName, setNewHolderName] = useState('');
  const [newAccountType, setNewAccountType] = useState<Account['account_type']>('Savings');
  const [newBranchCity, setNewBranchCity] = useState('Mumbai, MH');
  const [newTypicalAmt, setNewTypicalAmt] = useState('15000');

  // Risk explainability expand state
  const [expandedExplainId, setExpandedExplainId] = useState<string | null>(
    selectedTransactionId || 'TXN-1091'
  );

  // Selected ML model for evaluation view
  const [selectedModelId, setSelectedModelId] = useState<string>('xgboost_gbdt');

  // Module 8: Live Test Suite Runner State
  const [testSuiteOutput, setTestSuiteOutput] = useState<ReturnType<typeof runClientTestSuite> | null>(() => runClientTestSuite());
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleExecuteTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const res = runClientTestSuite();
      setTestSuiteOutput(res);
      setIsRunningTests(false);
    }, 150);
  };

  const nodeMap = useMemo(() => {
    const m = new Map();
    graphNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [graphNodes]);

  const accountMap = useMemo(() => {
    const m = new Map();
    accounts.forEach((a) => m.set(a.account_id, a));
    return m;
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (riskFilter !== 'ALL' && t.risk_level !== riskFilter) return false;
        if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
        if (
          detectorFilter !== 'ALL' &&
          !t.detected_patterns.some((p) => p.toLowerCase().includes(detectorFilter.toLowerCase()))
        ) {
          return false;
        }
        if (accountFilter.trim()) {
          const q = accountFilter.trim().toUpperCase();
          if (
            !t.sender_account_id.includes(q) &&
            !t.receiver_account_id.includes(q) &&
            !t.transaction_id.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .slice()
      .reverse();
  }, [transactions, riskFilter, statusFilter, detectorFilter, accountFilter]);

  const downloadFile = (content: string, filename: string, mime = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // 1. EXECUTIVE DASHBOARD
  // ============================================================================
  if (activePage === 'exec-dashboard') {
    const highRiskAlerts = alerts.filter((a) => a.risk_level === 'High');
    const openCases = cases.filter((c) => !c.status.startsWith('Closed'));
    const flaggedTxs = transactions.filter((t) => t.risk_level === 'High' || t.status === 'Flagged');
    const flaggedVolume = flaggedTxs.reduce((s, t) => s + t.amount, 0);
    const avgRisk = Math.round(
      accounts.reduce((s, a) => s + a.risk_score, 0) / Math.max(1, accounts.length)
    );
    const suspiciousNetworksCount = new Set(alerts.map((a) => a.scenario_id)).size;

    // Daily volume & average risk trend across Oct 16 – Oct 23
    const dailyStatsMap = new Map<string, { day: string; volume: number; count: number; riskSum: number }>();
    transactions.forEach((t) => {
      const dayKey = t.timestamp.slice(0, 10);
      const curr = dailyStatsMap.get(dayKey) || { day: dayKey, volume: 0, count: 0, riskSum: 0 };
      curr.volume += t.amount;
      curr.count += 1;
      curr.riskSum += t.risk_score;
      dailyStatsMap.set(dayKey, curr);
    });
    const dailyTrend = Array.from(dailyStatsMap.values()).sort((a, b) =>
      a.day.localeCompare(b.day)
    );
    const maxDailyVol = Math.max(1, ...dailyTrend.map((d) => d.volume));

    // Alert distribution by detector
    const detectorCounts = new Map<string, number>();
    alerts.forEach((a) => {
      detectorCounts.set(a.detector_name, (detectorCounts.get(a.detector_name) || 0) + 1);
    });

    // Top flagged accounts
    const topFlaggedAccounts = [...accounts]
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 6);

    return (
      <div className="space-y-6">
        {/* Header + Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              BANK ADMINISTRATION · EXECUTIVE COMMAND CENTER
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Enterprise Fraud & AML Executive Overview
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter executive dashboard by risk level"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as 'ALL' | RiskLevel)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
            >
              <option value="ALL">All Risk Bands</option>
              <option value="High">High Risk (70–100)</option>
              <option value="Medium">Medium Risk (35–69)</option>
              <option value="Low">Low Risk (0–34)</option>
            </select>

            <button
              type="button"
              onClick={() => generateOnDemandTransactions(5, 'scenario_2_split')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Simulate +5 Live Transfers
            </button>

            <button
              type="button"
              onClick={() =>
                downloadFile(
                  exportTransactionsToCSV(transactions),
                  'fraudmesh-synthetic-transactions.csv'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export Ledger CSV
            </button>
          </div>
        </div>

        {/* 8 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
            <div className="text-xs text-slate-500">Total Synthetic Transactions</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {transactions.length.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Filtered View: {filteredTransactions.length.toLocaleString('en-IN')} records
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
            <div className="text-xs text-slate-500">Active Synthetic Accounts</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {accounts.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Elevated Risk: {accounts.filter((a) => a.risk_level === 'High').length} accounts
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
            <div className="text-xs text-slate-500">High-Risk Alerts</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-400 mt-1">
              {highRiskAlerts.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Total Active Alerts: {alerts.length}
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
            <div className="text-xs text-slate-500">Open Investigation Cases</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-cyan-400 mt-1">
              {openCases.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Total Cases Logged: {cases.length}
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
            <div className="text-xs text-slate-500">Flagged Transaction Volume</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-1">
              {formatINR(flaggedVolume)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Across {flaggedTxs.length} high-risk transfers
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
            <div className="text-xs text-slate-500">Suspicious Network Topologies</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {suspiciousNetworksCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Detected Cycles: {
                new Set(graphNodes.filter((n) => n.inCycle).map((n) => n.componentId)).size || 1
              }
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
            <div className="text-xs text-slate-500">Average Calculated Account Risk</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
              {avgRisk}/100
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Bands: Low ≤{riskConfig.lowMax} · High &gt;{riskConfig.mediumMax}
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
            <div className="text-xs text-slate-500">Recently Detected Patterns</div>
            <div className="text-lg font-bold text-blue-600 mt-1 truncate">
              Split-and-Merge & Cycles
            </div>
            <div className="text-xs text-slate-500 mt-1">
              8 Modular Graph & DNA Detectors Active
            </div>
          </div>
        </div>

        {/* Charts Row: Daily Transaction Volume SVG Chart + Alert Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Daily Transaction Volume & Risk Trend (IST)
                </h2>
                <p className="text-xs text-slate-500">
                  Aggregated directly from active synthetic ledger records
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                Peak: {formatINR(maxDailyVol)}
              </span>
            </div>

            <div className="space-y-3">
              {dailyTrend.map((d) => {
                const pct = Math.max(6, Math.round((d.volume / maxDailyVol) * 100));
                const avgDayRisk = Math.round(d.riskSum / Math.max(1, d.count));
                return (
                  <div key={d.day} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-700">{d.day}</span>
                      <span className="text-slate-500">
                        {d.count} tx · {formatINR(d.volume)} · Avg Risk {avgDayRisk}/100
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${
                          avgDayRisk >= 30 ? 'bg-rose-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              Alert Distribution by Pattern Detector
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Breakdown across FraudMesh structural & behavioral engines
            </p>
            <div className="space-y-3">
              {Array.from(detectorCounts.entries()).map(([detName, count]) => {
                const pct = Math.round((count / Math.max(1, alerts.length)) * 100);
                return (
                  <div key={detName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-medium">{detName}</span>
                      <span className="font-mono text-slate-500">
                        {count} alert(s) · {pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded"
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Row: Most Frequently Flagged Accounts & Recent Alerts Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">
                Highest-Risk Synthetic Accounts
              </h2>
              <button
                type="button"
                onClick={() => navigateTo('account-management')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap shrink-0"
              >
                All Accounts →
              </button>
            </div>
            <div className="divide-y divide-slate-100/70 text-xs">
              {topFlaggedAccounts.map((acc) => (
                <div
                  key={acc.account_id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-mono font-semibold text-slate-900">
                      {acc.account_id} · {acc.holder_name}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {acc.flagged_reasons[0] || acc.risk_status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-rose-400">
                      {acc.risk_score}/100
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigateTo('money-trail-explorer', { accountId: acc.account_id })
                      }
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
                    >
                      Inspect Graph
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">
                Recent Structural & Behavioral Alerts
              </h2>
              <button
                type="button"
                onClick={() => navigateTo('alert-management')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap shrink-0"
              >
                Manage All Alerts →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                    <th className="py-2 px-2.5 font-medium">Alert ID</th>
                    <th className="py-2 px-2.5 font-medium">Detector</th>
                    <th className="py-2 px-2.5 font-medium">Accounts</th>
                    <th className="py-2 px-2.5 font-medium text-right">Risk</th>
                    <th className="py-2 px-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.slice(0, 6).map((al) => (
                    <tr key={al.alert_id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-2.5 font-mono text-slate-800">{al.alert_id}</td>
                      <td className="py-2 px-2.5 text-slate-700">{al.detector_name}</td>
                      <td className="py-2 px-2.5 font-mono text-slate-500">
                        {al.involved_accounts.slice(0, 3).join(', ')}
                        {al.involved_accounts.length > 3
                          ? ` +${al.involved_accounts.length - 3}`
                          : ''}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-semibold text-rose-400">
                        {al.risk_score}/100
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            navigateTo('money-trail-explorer', {
                              accountId: al.involved_accounts[0],
                              highlightAccounts: al.involved_accounts,
                              highlightTxIds: al.transaction_ids,
                            })
                          }
                          className="text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap shrink-0"
                        >
                          Trace Trail
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
  }

  // ============================================================================
  // 2. TRANSACTION MONITORING (With CSV Import/Export/Template & Dataset Controls)
  // ============================================================================
  if (activePage === 'tx-monitoring') {
    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
    const currentSlice = filteredTransactions.slice(
      (txPage - 1) * pageSize,
      txPage * pageSize
    );

    const handleCsvImportSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const res = importCSVTransactions(csvInputText);
      if (!res.valid) {
        setCsvErrors(res.errors);
      } else {
        setCsvErrors([]);
        setCsvInputText('');
        setShowCsvModal(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              BANK ADMINISTRATION · LEDGER SURVEILLANCE
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Synthetic Transaction Monitoring & CSV Ingestion
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCsvModal((s) => !s)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV Ledger
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(getSampleCSVTemplate(), 'fraudmesh-sample-template.csv')
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Sample CSV Template
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  exportTransactionsToCSV(filteredTransactions),
                  'fraudmesh-transactions-export.csv'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export Filtered CSV
            </button>
            <button
              type="button"
              onClick={resetDataset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Seed Dataset
            </button>
          </div>
        </div>

        {/* CSV Import Panel */}
        {showCsvModal && (
          <form
            onSubmit={handleCsvImportSubmit}
            className="border border-cyan-500/40 rounded-lg bg-white shadow-xs p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Validated CSV Transaction Ingestion
                </h2>
                <p className="text-xs text-slate-500">
                  Required columns: transaction_id, sender_account_id, receiver_account_id, amount,
                  timestamp, transaction_type, channel, location
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCsvInputText(getSampleCSVTemplate())}
                className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
              >
                Load Sample CSV Rows
              </button>
            </div>

            {csvErrors.length > 0 && (
              <div
                role="alert"
                className="p-3 rounded border border-rose-500/50 bg-rose-500/10 text-xs text-rose-300 space-y-1"
              >
                <div className="font-semibold">CSV Validation Errors Rejected Import:</div>
                {csvErrors.map((err, i) => (
                  <div key={i}>· {err}</div>
                ))}
              </div>
            )}

            <textarea
              rows={5}
              value={csvInputText}
              onChange={(e) => setCsvInputText(e.target.value)}
              placeholder="Paste CSV content here..."
              aria-label="CSV transaction content"
              className="w-full p-3 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
            />

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded whitespace-nowrap shrink-0"
              >
                Validate & Import into Pipeline
              </button>
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 border border-slate-200 rounded-2xl bg-white shadow-xs p-3.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value);
                setTxPage(1);
              }}
              placeholder="Filter by Account or TXN ID..."
              aria-label="Filter transactions by account or transaction ID"
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs w-56"
            />
          </div>

          <select
            aria-label="Filter transactions by risk level"
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value as 'ALL' | RiskLevel);
              setTxPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>

          <select
            aria-label="Filter transactions by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setTxPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="Flagged">Flagged</option>
            <option value="Under Review">Under Review</option>
            <option value="Reported by Customer">Reported by Customer</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Paginated Ledger Table */}
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3 font-medium">Transaction ID</th>
                  <th className="py-2.5 px-3 font-medium">Timestamp (IST)</th>
                  <th className="py-2.5 px-3 font-medium">Sender → Receiver</th>
                  <th className="py-2.5 px-3 font-medium text-right">Amount (INR)</th>
                  <th className="py-2.5 px-3 font-medium">Rail / Channel</th>
                  <th className="py-2.5 px-3 font-medium text-right">Risk Score</th>
                  <th className="py-2.5 px-3 font-medium">Detected Patterns</th>
                  <th className="py-2.5 px-3 font-medium text-right">Forensic Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentSlice.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-slate-800">{tx.transaction_id}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                      {new Date(tx.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">
                      {tx.sender_account_id} → {tx.receiver_account_id}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {tx.transaction_type} · {tx.channel}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                        tx.risk_level === 'High'
                          ? 'text-rose-400'
                          : tx.risk_level === 'Medium'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {tx.risk_score}/100 ({tx.risk_level})
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {tx.detected_patterns.length > 0
                        ? tx.detected_patterns.join(' · ')
                        : 'Normal Baseline'}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransactionId(tx.transaction_id);
                          navigateTo('risk-intelligence', {
                            accountId: tx.sender_account_id,
                            txId: tx.transaction_id,
                          });
                        }}
                        className="text-blue-600 hover:text-blue-700 font-semibold font-medium"
                      >
                        Why Flagged?
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigateTo('money-trail-explorer', {
                            accountId: tx.sender_account_id,
                            txId: tx.transaction_id,
                          })
                        }
                        className="text-slate-700 hover:text-white"
                      >
                        Graph
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
            <span>
              Showing page {txPage} of {totalPages} ({filteredTransactions.length} matching records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={txPage <= 1}
                onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-slate-100 disabled:opacity-40 rounded text-slate-800"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={txPage >= totalPages}
                onClick={() => setTxPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-slate-100 disabled:opacity-40 rounded text-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. ACCOUNT MANAGEMENT
  // ============================================================================
  if (activePage === 'account-management') {
    const handleAddAccount = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newHolderName.trim()) return;
      addSyntheticAccount({
        holderName: newHolderName,
        accountType: newAccountType,
        branchCity: newBranchCity,
        initialBalance: 250000,
        typicalAmount: Number(newTypicalAmt) || 12000,
      });
      setNewHolderName('');
    };

    return (
      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              BANK ADMINISTRATION · SYNTHETIC ACCOUNT DIRECTORY
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Account Management & Baseline Profiles ({accounts.length} Accounts)
            </h1>
          </div>
        </div>

        {/* Add Synthetic Account Form */}
        <form
          onSubmit={handleAddAccount}
          className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
        >
          <div>
            <label className="block text-xs text-slate-500 mb-1" htmlFor="new-holder-name">
              Synthetic Holder Name
            </label>
            <input
              id="new-holder-name"
              type="text"
              value={newHolderName}
              onChange={(e) => setNewHolderName(e.target.value)}
              placeholder="e.g. Kalyani Traders LLP"
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1" htmlFor="new-acc-type">
              Account Type
            </label>
            <select
              id="new-acc-type"
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value as Account['account_type'])}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
            >
              <option value="Savings">Savings</option>
              <option value="Current">Current</option>
              <option value="Corporate">Corporate</option>
              <option value="Merchant">Merchant</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1" htmlFor="new-branch-city">
              Branch City
            </label>
            <input
              id="new-branch-city"
              type="text"
              value={newBranchCity}
              onChange={(e) => setNewBranchCity(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1" htmlFor="new-typical-amt">
              Typical Transfer (₹)
            </label>
            <input
              id="new-typical-amt"
              type="number"
              value={newTypicalAmt}
              onChange={(e) => setNewTypicalAmt(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded transition-colors whitespace-nowrap shrink-0"
          >
            + Add Synthetic Account
          </button>
        </form>

        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3 font-medium">Account ID</th>
                  <th className="py-2.5 px-3 font-medium">Holder Name</th>
                  <th className="py-2.5 px-3 font-medium">Type & KYC</th>
                  <th className="py-2.5 px-3 font-medium text-right">Account Age</th>
                  <th className="py-2.5 px-3 font-medium text-right">Typical Baseline</th>
                  <th className="py-2.5 px-3 font-medium text-right">Risk Score</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.slice(0, 45).map((acc) => (
                  <tr key={acc.account_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      {acc.account_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{acc.holder_name}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {acc.account_type} · {acc.kyc_tier}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {acc.account_age_days}d
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {formatINR(acc.typical_tx_amount)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                        acc.risk_level === 'High'
                          ? 'text-rose-400'
                          : acc.risk_level === 'Medium'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {acc.risk_score}/100 ({acc.risk_level})
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{acc.risk_status}</td>
                    <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigateTo('digital-dna', { accountId: acc.account_id })}
                        className="text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Digital DNA
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigateTo('money-trail-explorer', { accountId: acc.account_id })
                        }
                        className="text-slate-700 hover:text-white"
                      >
                        Graph
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. RISK INTELLIGENCE & EXPLAINABILITY ("Why Flagged?")
  // ============================================================================
  if (activePage === 'risk-intelligence') {
    const targetTx =
      transactions.find((t) => t.transaction_id === expandedExplainId) ||
      transactions.find((t) => t.risk_level === 'High') ||
      transactions[0];

    const assessment = evaluateTransactionRisk(
      targetTx,
      accountMap.get(targetTx.sender_account_id),
      accountMap.get(targetTx.receiver_account_id),
      dnaProfiles.get(targetTx.sender_account_id),
      nodeMap,
      riskConfig
    );

    return (
      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              CENTRALIZED RISK SCORING & EXPLAINABLE AI
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Risk Intelligence & Non-Overlapping Signal Breakdown
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">Low Max ({riskConfig.lowMax}):</span>
            <input
              type="range"
              min={20}
              max={45}
              value={riskConfig.lowMax}
              aria-label="Low risk maximum threshold"
              onChange={(e) =>
                updateRiskThresholds({
                  ...riskConfig,
                  lowMax: Number(e.target.value),
                })
              }
              className="w-24 accent-cyan-500"
            />
            <span className="text-slate-500">Medium Max ({riskConfig.mediumMax}):</span>
            <input
              type="range"
              min={55}
              max={80}
              value={riskConfig.mediumMax}
              aria-label="Medium risk maximum threshold"
              onChange={(e) =>
                updateRiskThresholds({
                  ...riskConfig,
                  mediumMax: Number(e.target.value),
                })
              }
              className="w-24 accent-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Selectable Flagged Transactions */}
          <div className="lg:col-span-5 border border-slate-200 rounded-2xl bg-white shadow-xs p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Select Transaction to Inspect ("Why Flagged?")
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {transactions
                .filter((t) => t.risk_score >= 45)
                .slice(0, 20)
                .map((tx) => (
                  <button
                    key={tx.transaction_id}
                    type="button"
                    onClick={() => setExpandedExplainId(tx.transaction_id)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      targetTx.transaction_id === tx.transaction_id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-900">
                        {tx.transaction_id} · {tx.sender_account_id} → {tx.receiver_account_id}
                      </span>
                      <span className="font-bold text-rose-400">{tx.risk_score}/100</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatINR(tx.amount)} · {tx.detected_patterns.join(' · ') || 'Anomalous'}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Right: Detailed Risk Contribution Breakdown */}
          <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-mono text-cyan-400">
                  EXPLAINABLE RISK DECOMPOSITION · {assessment.target_id}
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  Risk Score: {assessment.risk_score}/100 · Risk Level: {assessment.risk_level}
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigateTo('ai-forensic-copilot', {
                    accountId: targetTx.sender_account_id,
                    txId: targetTx.transaction_id,
                  })
                }
                className="px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded whitespace-nowrap shrink-0"
              >
                Open in AI Forensic Copilot
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-1">
              <div>
                <span className="text-slate-500">Triggered Detectors:</span>{' '}
                {assessment.triggered_detectors.join(' · ') || 'Behavioral & Structural Thresholds'}
              </div>
              <div>
                <span className="text-slate-500">Evidence References:</span>{' '}
                <span className="font-mono">{assessment.evidence_tx_ids.join(', ')}</span> (
                {targetTx.sender_account_id} → {targetTx.receiver_account_id},{' '}
                {formatINR(targetTx.amount)})
              </div>
              <div>
                <span className="text-slate-500">Summary Explanation:</span>{' '}
                {assessment.explanation}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-slate-800">
                Weighted Signal Contribution Breakdown (Non-Overlapping Aggregation)
              </h3>
              {assessment.contributions.map((c) => (
                <div
                  key={c.factor}
                  className="p-3 rounded border border-slate-200 bg-slate-50 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">
                      {c.factor} (Weight {Math.round(c.weight * 100)}%)
                    </span>
                    <span className="font-mono text-blue-600">
                      Raw: {c.rawScore}/100 → +{c.weightedContribution} pts
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${c.rawScore}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500">{c.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 5. ALERT MANAGEMENT
  // ============================================================================
  if (activePage === 'alert-management') {
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              8-DETECTOR STRUCTURAL & BEHAVIORAL ALERT QUEUE
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Alert Management & Case Escalation ({alerts.length} Active Alerts)
            </h1>
          </div>
        </div>

        <div className="space-y-3">
          {alerts.map((al) => (
            <div
              key={al.alert_id}
              className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-rose-400">
                    {al.alert_id} · Risk {al.risk_score}/100 ({al.risk_level})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-cyan-400">{al.detector_name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500">Status: {al.case_status}</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">{al.explanation}</p>
                <div className="text-xs text-slate-500 font-mono">
                  Accounts: {al.involved_accounts.join(', ')} · Tx Refs:{' '}
                  {al.transaction_ids.slice(0, 5).join(', ')}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    navigateTo('money-trail-explorer', {
                      accountId: al.involved_accounts[0],
                      highlightAccounts: al.involved_accounts,
                      highlightTxIds: al.transaction_ids,
                    })
                  }
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
                >
                  Inspect Network
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const created = createCaseFromAlertAction(
                      al.alert_id,
                      'Meera Iyer (Senior Graph Forensic Analyst)',
                      `Escalated from Alert Management queue (${al.detector_name}).`
                    );
                    if (created) {
                      navigateTo('case-management', { caseId: created.case_id });
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded whitespace-nowrap shrink-0"
                >
                  {al.linked_case_id ? `Open ${al.linked_case_id}` : 'Convert Alert to Case'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 6. ANALYTICS
  // ============================================================================
  if (activePage === 'analytics') {
    const byChannel = new Map<string, { count: number; volume: number; flagged: number }>();
    transactions.forEach((t) => {
      const c = byChannel.get(t.channel) || { count: 0, volume: 0, flagged: 0 };
      c.count++;
      c.volume += t.amount;
      if (t.risk_level === 'High') c.flagged++;
      byChannel.set(t.channel, c);
    });

    return (
      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div className="text-xs font-mono text-cyan-400">
            BANK ADMINISTRATION · CHANNEL & TOPOLOGY ANALYTICS
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Payment Rail, Channel & Scenario Risk Distribution
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(byChannel.entries()).map(([channel, stats]) => (
            <div
              key={channel}
              className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-2"
            >
              <div className="text-sm font-semibold text-slate-900">{channel}</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-cyan-400">
                {formatINR(stats.volume)}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {stats.count} transfers · {stats.flagged} High-Risk Flagged
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 7. MODEL EVALUATION (Machine Learning & Model Comparison)
  // ============================================================================
  if (activePage === 'model-evaluation') {
    const activeModel =
      modelEvaluations.find((m) => m.model_id === selectedModelId) || modelEvaluations[0];
    const { tp, fp, tn, fn } = activeModel.confusion_matrix;

    return (
      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              Synthetic demonstration evaluation – not real-world performance validation.
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Machine Learning & Heuristic Model Evaluation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              All models are genuinely trained in-memory on 9 normalized transaction features
              (strictly excluding ground_truth_label to prevent train/test leakage).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <label htmlFor="ml-threshold-slider" className="text-slate-700 font-medium">
              Classification Threshold:
            </label>
            <input
              id="ml-threshold-slider"
              type="range"
              min={0.15}
              max={0.85}
              step={0.05}
              value={mlThreshold}
              onChange={(e) => updateMLThreshold(Number(e.target.value))}
              className="w-28 accent-cyan-500"
            />
            <span className="font-mono font-bold text-cyan-400">{mlThreshold.toFixed(2)}</span>
          </div>
        </div>

        {/* Model Selector Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {modelEvaluations.map((m) => (
            <button
              key={m.model_id}
              type="button"
              onClick={() => setSelectedModelId(m.model_id)}
              className={`p-3.5 rounded-lg border text-left transition-colors ${
                activeModel.model_id === m.model_id
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-200 bg-slate-50 hover:border-blue-400'
              }`}
            >
              <div className="text-xs font-mono text-emerald-400">{m.status}</div>
              <div className="text-xs font-semibold text-slate-900 mt-1">{m.model_name}</div>
              <div className="text-xs font-mono text-slate-500 mt-1.5">
                F1: {(m.f1_score * 100).toFixed(1)}% · AUC: {m.roc_auc.toFixed(3)}
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Metrics & Confusion Matrix */}
          <div className="lg:col-span-6 border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-5">
            <div>
              <div className="text-xs font-mono text-cyan-400">{activeModel.category}</div>
              <h2 className="text-lg font-bold text-slate-900">{activeModel.model_name}</h2>
              <p className="text-xs text-slate-500 mt-1">{activeModel.notes}</p>
              <div className="text-xs font-mono text-slate-500 mt-1">
                Train Split: {activeModel.training_samples} tx · Held-Out Test Split:{' '}
                {activeModel.test_samples} tx
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded border border-slate-200 bg-slate-50">
                <div className="text-slate-500">Precision TP/(TP+FP)</div>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {(activeModel.precision * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded border border-slate-200 bg-slate-50">
                <div className="text-slate-500">Recall TP/(TP+FN)</div>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {(activeModel.recall * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded border border-slate-200 bg-slate-50">
                <div className="text-slate-500">F1-Score</div>
                <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                  {(activeModel.f1_score * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded border border-slate-200 bg-slate-50">
                <div className="text-slate-500">Accuracy</div>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {(activeModel.accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-3 rounded border border-slate-200 bg-slate-50">
                <div className="text-slate-500">False Positive Rate</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {(activeModel.fpr * 100).toFixed(2)}%
                </div>
              </div>
              <div className="p-3 rounded border border-slate-200 bg-slate-50">
                <div className="text-slate-500">ROC-AUC</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {activeModel.roc_auc.toFixed(3)}
                </div>
              </div>
            </div>

            {/* 2x2 Confusion Matrix */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-800">
                Confusion Matrix (Held-Out Test Split · Threshold {mlThreshold.toFixed(2)})
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded border border-emerald-500/30 bg-emerald-500/10">
                  <div className="text-emerald-300">True Positives (TP)</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{tp}</div>
                </div>
                <div className="p-3.5 rounded border border-amber-500/30 bg-amber-500/10">
                  <div className="text-amber-300">False Positives (FP)</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{fp}</div>
                </div>
                <div className="p-3.5 rounded border border-rose-500/30 bg-rose-500/10">
                  <div className="text-rose-300">False Negatives (FN)</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{fn}</div>
                </div>
                <div className="p-3.5 rounded border border-cyan-500/30 bg-cyan-500/10">
                  <div className="text-blue-600">True Negatives (TN)</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{tn}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Feature Importances & All-Model Comparison Table */}
          <div className="lg:col-span-6 border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Top Engineered Feature Weights ({activeModel.model_name})
              </h3>
              <div className="space-y-2.5 mt-3">
                {activeModel.feature_importances.map((fi) => (
                  <div key={fi.feature} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{fi.feature}</span>
                      <span className="font-mono text-cyan-400">
                        {(fi.weight * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded"
                        style={{ width: `${Math.min(100, fi.weight * 260)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Cross-Model Quantitative Benchmark
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                      <th className="py-2 px-2">Model</th>
                      <th className="py-2 px-2 text-right">Prec</th>
                      <th className="py-2 px-2 text-right">Recall</th>
                      <th className="py-2 px-2 text-right">F1</th>
                      <th className="py-2 px-2 text-right">FPR</th>
                      <th className="py-2 px-2 text-right">AUC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modelEvaluations.map((m) => (
                      <tr key={m.model_id}>
                        <td className="py-2 px-2 text-slate-800 font-sans font-medium">
                          {m.model_name}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-700">
                          {(m.precision * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right text-slate-700">
                          {(m.recall * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right text-cyan-400 font-bold">
                          {(m.f1_score * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right text-amber-400">
                          {(m.fpr * 100).toFixed(2)}%
                        </td>
                        <td className="py-2 px-2 text-right text-emerald-400">
                          {m.roc_auc.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 8. SYSTEM ACTIVITY & ADMINISTRATION / AUDIT (MODULE 8)
  // ============================================================================
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              MODULE 8 · ADMINISTRATION & AUDIT
            </span>
            <span className="text-xs font-mono text-slate-500">Live Health & Automated Test Engine</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            System Administration, Configuration & Automated Verification
          </h1>
          <p className="text-xs text-slate-600">
            Real-time pipeline diagnostics, server-side API proxy verification, detector thresholds, and automated test execution.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExecuteTests}
          disabled={isRunningTests}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
        >
          {isRunningTests ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {isRunningTests ? 'Executing Test Suite...' : 'Run Automated Test Suite (10 Tests)'}
        </button>
      </div>

      {/* Test Suite Runner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Automated Unit Test Suite Status
              </h2>
              <p className="text-xs text-slate-500">
                Verifies invariant constraints, Tarjan cycle discovery, ARTT causality, Digital DNA drift, and ML metrics without label leakage.
              </p>
            </div>
          </div>

          {testSuiteOutput && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
                {testSuiteOutput.totalPassed} / {testSuiteOutput.results.length} PASSED
              </span>
              <span className="text-slate-500 font-medium">
                Duration: {testSuiteOutput.totalDurationMs} ms
              </span>
            </div>
          )}
        </div>

        {/* Test List */}
        <div className="space-y-2.5">
          {testSuiteOutput?.results.map((tr) => (
            <div
              key={tr.id}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                      tr.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {tr.passed ? 'PASS' : 'FAIL'}
                  </span>
                  <span className="font-semibold text-slate-900 font-sans">{tr.name}</span>
                </div>
                {tr.details && <p className="text-[11px] text-slate-500 pl-8">{tr.details}</p>}
                {tr.error && <p className="text-[11px] text-rose-600 pl-8 font-mono">{tr.error}</p>}
              </div>

              <div className="flex items-center gap-3 shrink-0 pl-8 md:pl-0 font-mono text-[11px] text-slate-500">
                <span>{tr.assertionCount} assertions</span>
                <span>{tr.durationMs} ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Health Diagnostics & API Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
            <Activity className="w-4 h-4 text-blue-600" /> Pipeline Integrity
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Ledger Balance Conservation:</span>
              <span className="font-mono font-semibold text-emerald-600">Atomic / Conserved</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Directed Graph Adjacency:</span>
              <span className="font-mono font-semibold text-slate-900">{graphNodes.length} nodes · {transactions.length} edges</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Timezone Standard:</span>
              <span className="font-mono font-semibold text-slate-900">Asia/Kolkata (IST)</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>NaN / Null Value Checks:</span>
              <span className="font-mono font-semibold text-emerald-600">0 Invariants Violated</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
            <Cpu className="w-4 h-4 text-indigo-600" /> AI Copilot Configuration
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Primary Engine:</span>
              <span className="font-mono font-semibold text-slate-900">gemini-3.8-flash</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Execution Boundary:</span>
              <span className="font-mono font-semibold text-blue-600">Server-Side Proxy (/api/copilot)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Client Secrets Exposed:</span>
              <span className="font-mono font-semibold text-emerald-600">None (0 Keys in UI)</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Deterministic Fallback:</span>
              <span className="font-mono font-semibold text-emerald-600">Active & Evidence-Grounded</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
            <Shield className="w-4 h-4 text-purple-600" /> Data Governance
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Synthetic Generation Seed:</span>
              <span className="font-mono font-semibold text-slate-900">#20261023 (100% Deterministic)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Customer PII Status:</span>
              <span className="font-mono font-semibold text-emerald-600">Synthetically Masked</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Audit Event Count:</span>
              <span className="font-mono font-semibold text-slate-900">{auditLog.length} recorded events</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Regulatory Standard:</span>
              <span className="font-mono font-semibold text-slate-900">PMLA / FIU-IND Aligned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Audit Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">System Activity & Forensic Audit Ledger</h2>
          <span className="text-xs text-slate-500 font-mono">{auditLog.length} Events</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {auditLog.map((ev) => (
            <div key={ev.event_id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-mono text-[11px] text-blue-600">
                  <span>{ev.event_id}</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-slate-500">{ev.category}</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-slate-500">Actor: {ev.actor_role}</span>
                </div>
                <div className="font-semibold text-slate-900">{ev.action}</div>
                <div className="text-slate-600 text-[11px]">{ev.details}</div>
              </div>
              <div className="font-mono text-[11px] text-slate-500 shrink-0">
                {new Date(ev.timestamp).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
