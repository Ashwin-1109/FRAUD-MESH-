import React, { useEffect, useMemo, useState } from 'react';
import { useFraudMesh } from '../context/FraudMeshContext';
import { formatINR } from '../engine/digitalDna';
import {
  CaseStatus,
  CopilotStructuredResponse,
} from '../types/fraudmesh';
import { MoneyTrailGraph } from './MoneyTrailGraph';
import { DigitalDNARadar } from './DigitalDNARadar';
import {
  Bot,
  Download,
  FastForward,
  FileText,
  FolderKanban,
  GitBranch,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

const SUGGESTED_COPILOT_QUESTIONS = [
  'Why was account ACC-014 flagged?',
  'Summarize the Split-and-Merge network originating from ACC-050.',
  'Show the suspicious path between ACC-021 and ACC-025.',
  'Which transactions contributed to the risk score of ACC-031?',
  'Explain the Digital DNA anomaly for account ACC-042.',
  'What evidence supports the highest-risk investigation alert?',
  'Generate an investigation case summary for the selected account.',
];

export const InvestigatorViews: React.FC = () => {
  const {
    activePage,
    accounts,
    transactions,
    alerts,
    cases,
    dnaProfiles,
    graphNodes,
    graphEdges,
    detectedCycles,
    selectedAccountId,
    setSelectedAccountId,
    selectedTransactionId,
    setSelectedTransactionId,
    selectedCaseId,
    setSelectedCaseId,
    highlightedPathAccounts,
    highlightedPathTxIds,
    setHighlightedPath,
    arttConfig,
    latestArttResult,
    executeARTT,
    navigateTo,
    createCaseFromAlertAction,
    createCustomCase,
    updateCaseStatus,
    addCaseNote,
    attachCopilotSummaryToCase,
  } = useFraudMesh();

  // ARTT Animation Playback state
  const [arttStepIndex, setArttStepIndex] = useState<number>(
    latestArttResult.animation_steps.length
  );
  const [arttPlaying, setArttPlaying] = useState<boolean>(false);
  const [arttSpeed, setArttSpeed] = useState<1 | 2 | 4>(1);
  const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0);

  // Digital DNA comparison account
  const [compareAccountId, setCompareAccountId] = useState<string>('ACC-001');

  // AI Forensic Copilot state
  const [copilotQuestion, setCopilotQuestion] = useState<string>(
    'Summarize the Split-and-Merge network originating from ACC-050.'
  );
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotResponse, setCopilotResponse] = useState<CopilotStructuredResponse | null>(
    null
  );
  const [copilotWarning, setCopilotWarning] = useState<string | null>(null);

  // Case Management form state
  const [newCaseNoteText, setNewCaseNoteText] = useState<string>('');
  const [statusRationale, setStatusRationale] = useState<string>(
    'Corroborated multi-hop transaction timestamps and device telemetry.'
  );

  // Keep ARTT animation loop running cleanly without updating provider state during render
  useEffect(() => {
    if (!arttPlaying) return;
    const totalSteps = latestArttResult.animation_steps.length;
    if (arttStepIndex >= totalSteps) {
      setArttPlaying(false);
      return;
    }

    const intervalMs = Math.round(700 / arttSpeed);
    const timer = setTimeout(() => {
      const nextIdx = arttStepIndex + 1;
      setArttStepIndex(nextIdx);

      const step = latestArttResult.animation_steps[nextIdx - 1];
      if (step && step.accepted) {
        setHighlightedPath(
          [step.currentAccount, step.targetAccount],
          [step.inspectedEdgeId]
        );
      }

      if (nextIdx >= totalSteps) {
        setArttPlaying(false);
      }
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [arttPlaying, arttSpeed, arttStepIndex, latestArttResult, setHighlightedPath]);

  const selectedAccount = useMemo(
    () =>
      accounts.find((a) => a.account_id === selectedAccountId) ||
      accounts.find((a) => a.account_id === 'ACC-050') ||
      accounts[0],
    [accounts, selectedAccountId]
  );

  const selectedNode = useMemo(
    () =>
      graphNodes.find((n) => n.id === selectedAccount.account_id) || graphNodes[0],
    [graphNodes, selectedAccount]
  );

  const selectedDna = useMemo(
    () => dnaProfiles.get(selectedAccount.account_id) || Array.from(dnaProfiles.values())[0],
    [dnaProfiles, selectedAccount]
  );

  const compareDna = useMemo(
    () => (compareAccountId ? dnaProfiles.get(compareAccountId) || null : null),
    [dnaProfiles, compareAccountId]
  );

  const selectedTx = useMemo(() => {
    const explicitTx = transactions.find(
      (t) => t.transaction_id === selectedTransactionId
    );
    if (
      explicitTx &&
      (explicitTx.sender_account_id === selectedAccount.account_id ||
        explicitTx.receiver_account_id === selectedAccount.account_id)
    ) {
      return explicitTx;
    }
    const accountTxs = transactions
      .filter(
        (t) =>
          t.sender_account_id === selectedAccount.account_id ||
          t.receiver_account_id === selectedAccount.account_id
      )
      .sort((a, b) => b.risk_score - a.risk_score);
    return accountTxs[0] || explicitTx || transactions[0];
  }, [transactions, selectedTransactionId, selectedAccount]);

  const activeCase = useMemo(
    () =>
      cases.find((c) => c.case_id === selectedCaseId) || cases[0] || null,
    [cases, selectedCaseId]
  );

  const triggerCopilotAnalysis = async (customPrompt?: string) => {
    const q = customPrompt || copilotQuestion;
    if (!q.trim()) return;
    setCopilotLoading(true);
    setCopilotWarning(null);

    // Determine target account mentioned in question (e.g. ACC-014, ACC-050) or fallback to selectedAccount
    const accMatch = q.toUpperCase().match(/ACC-\d{3}/);
    const targetAccId = accMatch ? accMatch[0] : selectedAccount.account_id;
    const targetAcc =
      accounts.find((a) => a.account_id === targetAccId) || selectedAccount;

    const relTxs = transactions.filter(
      (t) =>
        t.sender_account_id === targetAcc.account_id ||
        t.receiver_account_id === targetAcc.account_id ||
        highlightedPathTxIds.includes(t.transaction_id)
    );
    const relAlerts = alerts.filter(
      (a) =>
        a.involved_accounts.includes(targetAcc.account_id) ||
        a.scenario_id === targetAcc.primary_scenario
    );

    try {
      const res = await fetch('/api/copilot/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          selectedAccount: targetAcc,
          relatedTransactions: relTxs.slice(0, 14),
          relatedAlerts: relAlerts.slice(0, 6),
          dnaProfile: dnaProfiles.get(targetAcc.account_id),
          arttResult: latestArttResult,
        }),
      });
      const data = await res.json();
      if (data.warning) setCopilotWarning(data.warning);
      setCopilotResponse(data);
    } catch (err: any) {
      setCopilotWarning('Network fallback: Using deterministic forensic evidence engine.');
    } finally {
      setCopilotLoading(false);
    }
  };

  // Auto-generate initial Copilot response when opening ai-forensic-copilot if none exists
  useEffect(() => {
    if (activePage === 'ai-forensic-copilot' && !copilotResponse && !copilotLoading) {
      triggerCopilotAnalysis(copilotQuestion);
    }
  }, [activePage]);

  const downloadFile = (content: string, filename: string, mime = 'text/markdown;charset=utf-8;') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // 1. INVESTIGATION DASHBOARD
  // ============================================================================
  if (activePage === 'investigator-dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div>
            <div className="text-xs font-mono text-rose-400">
              FRAUD INVESTIGATOR COMMAND · GRAPH FORENSIC UNIT
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Forensic Investigation Workspace & Priority Queues
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo('scenario-simulator')}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
            >
              Open Intelligence Lab Simulator
            </button>
            <button
              type="button"
              onClick={() => navigateTo('money-trail-explorer')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
            >
              Money Trail Graph
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Priority Alert Triage */}
          <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                High-Priority Suspicious Network Alerts ({alerts.length})
              </h2>
              <span className="text-xs font-mono text-slate-500">
                Click any alert to trace graph & evidence
              </span>
            </div>

            <div className="space-y-3">
              {alerts.slice(0, 6).map((al) => (
                <div
                  key={al.alert_id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <span className="font-bold text-rose-400">
                      {al.alert_id} · {al.detector_name}
                    </span>
                    <span className="text-blue-600">
                      Score: {al.risk_score}/100 ({al.risk_level})
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{al.explanation}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                    <span className="text-xs font-mono text-slate-500">
                      Nodes: {al.involved_accounts.slice(0, 4).join(' → ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigateTo('money-trail-explorer', {
                            accountId: al.involved_accounts[0],
                            highlightAccounts: al.involved_accounts,
                            highlightTxIds: al.transaction_ids,
                          })
                        }
                        className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
                      >
                        Money Trail
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          executeARTT({ startAccountId: al.involved_accounts[0] });
                          navigateTo('artt-traversal', {
                            accountId: al.involved_accounts[0],
                          });
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
                      >
                        Run ARTT
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const c = createCaseFromAlertAction(
                            al.alert_id,
                            'Meera Iyer (Senior Graph Forensic Analyst)',
                            `Opened from Investigator Dashboard triage.`
                          );
                          if (c) navigateTo('case-management', { caseId: c.case_id });
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
                      >
                        {al.linked_case_id ? `Open ${al.linked_case_id}` : 'Create Case'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 5 Cols: Active Investigation Cases */}
          <div className="lg:col-span-5 border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Active Forensic Cases ({cases.length})
              </h2>
              <button
                type="button"
                onClick={() => navigateTo('case-management')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap shrink-0"
              >
                Open Case Workspace →
              </button>
            </div>

            <div className="space-y-3">
              {cases.map((c) => (
                <div
                  key={c.case_id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-blue-600">{c.case_id}</span>
                    <span className="text-slate-700">Status: {c.status}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{c.title}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    Assigned: {c.assigned_investigator} · {c.linked_transaction_ids.length} Tx
                    Evidence Records
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => navigateTo('case-management', { caseId: c.case_id })}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
                    >
                      Review Case Evidence
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('investigation-reports', { caseId: c.case_id })}
                      className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
                    >
                      Export Dossier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. MONEY TRAIL EXPLORER (Interactive D3 Graph + Node/Edge Inspector + Metrics)
  // ============================================================================
  if (activePage === 'money-trail-explorer') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div>
            <div className="text-xs font-mono text-blue-600">
              DIRECTED TRANSACTION GRAPH INTELLIGENCE · D3.JS ENGINE
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Money Trail Explorer — Account {selectedAccount.account_id} ({selectedAccount.holder_name})
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                navigateTo('risk-intelligence', {
                  accountId: selectedAccount.account_id,
                  txId: selectedTx.transaction_id,
                })
              }
              className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded whitespace-nowrap shrink-0"
            >
              Explain Risk ({selectedAccount.risk_score}/100)
            </button>
            <button
              type="button"
              onClick={() => navigateTo('digital-dna', { accountId: selectedAccount.account_id })}
              className="px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
            >
              Open Digital DNA Profile
            </button>
            <button
              type="button"
              onClick={() => {
                executeARTT({ startAccountId: selectedAccount.account_id });
                navigateTo('artt-traversal', { accountId: selectedAccount.account_id });
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
            >
              Run ARTT from {selectedAccount.account_id}
            </button>
          </div>
        </div>

        {/* Network Topology Preset Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Highlight Suspicious Pathway:</span>
          {[
            {
              label: 'Split-and-Merge (ACC-050 → ACC-055)',
              acc: 'ACC-050',
              path: ['ACC-050', 'ACC-051', 'ACC-052', 'ACC-053', 'ACC-054', 'ACC-055', 'ACC-056'],
            },
            {
              label: 'Circular Loop (ACC-031..ACC-034)',
              acc: 'ACC-031',
              path: ['ACC-031', 'ACC-032', 'ACC-033', 'ACC-034'],
            },
            {
              label: 'Mule Chain (ACC-021 → ACC-025)',
              acc: 'ACC-021',
              path: ['ACC-021', 'ACC-022', 'ACC-023', 'ACC-024', 'ACC-025'],
            },
            {
              label: 'Structuring Splits (ACC-014)',
              acc: 'ACC-014',
              path: ['ACC-014', 'ACC-015', 'ACC-016', 'ACC-017', 'ACC-018', 'ACC-019', 'ACC-020'],
            },
            {
              label: 'Nocturnal Burst (ACC-042)',
              acc: 'ACC-042',
              path: ['ACC-042', 'ACC-043', 'ACC-044', 'ACC-045', 'ACC-046', 'ACC-047'],
            },
          ].map((preset) => (
            <button
              key={preset.acc}
              type="button"
              onClick={() => {
                setSelectedAccountId(preset.acc);
                setHighlightedPath(preset.path, []);
              }}
              className={`px-2.5 py-1 rounded border transition-colors whitespace-nowrap shrink-0 ${
                selectedAccountId === preset.acc
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-2xs'
                  : 'border-slate-200 bg-slate-900 text-slate-700 hover:border-slate-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive D3 Graph (8 columns) */}
          <div className="lg:col-span-8">
            <MoneyTrailGraph
              nodes={graphNodes}
              edges={graphEdges}
              selectedAccountId={selectedAccount.account_id}
              selectedTransactionId={selectedTx?.transaction_id}
              highlightedAccounts={highlightedPathAccounts}
              highlightedTxIds={highlightedPathTxIds}
              onSelectAccount={(accId) => setSelectedAccountId(accId)}
              onSelectTransaction={(txId) => setSelectedTransactionId(txId)}
              height={540}
            />
          </div>

          {/* Right 4 Columns: Active Node & Edge Inspector + Graph Metrics */}
          <div className="lg:col-span-4 space-y-4">
            {/* Node Metrics Card */}
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <div className="text-xs font-mono text-blue-600">
                    SELECTED NODE · {selectedNode.id}
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {selectedAccount.holder_name}
                  </h2>
                </div>
                <span
                  className={`font-mono text-sm font-bold ${
                    selectedAccount.risk_level === 'High'
                      ? 'text-rose-400'
                      : selectedAccount.risk_level === 'Medium'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {selectedAccount.risk_score}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200/80">
                  <span className="text-slate-500 block">In-Degree / Out-Degree</span>
                  <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                    In: {selectedNode.inDegree} · Out: {selectedNode.outDegree}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200/80">
                  <span className="text-slate-500 block">Unique Counterparties</span>
                  <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                    {selectedNode.uniqueCounterparties} accounts
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200/80">
                  <span className="text-slate-500 block">Weighted Tx Volume</span>
                  <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                    {formatINR(selectedNode.weightedVolume)}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200/80">
                  <span className="text-slate-500 block">Network Centrality</span>
                  <span className="font-mono font-semibold text-blue-600 mt-0.5 block">
                    {selectedNode.centrality} (Comp #{selectedNode.componentId})
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200/80">
                  <span className="text-slate-500 block">Cycle Participation</span>
                  <span
                    className={`font-mono font-semibold mt-0.5 block ${
                      selectedNode.inCycle ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {selectedNode.inCycle ? 'Yes (In Directed Cycle)' : 'No Active Cycle'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200/80">
                  <span className="text-slate-500 block">Pass-Through Parity</span>
                  <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                    {Math.round(selectedNode.passThroughRatio * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Edge / Transaction Inspector */}
            {selectedTx && (
              <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 space-y-2.5 text-xs">
                <div className="text-xs font-mono text-amber-400">
                  INSPECTED TRANSACTION EDGE · {selectedTx.transaction_id}
                </div>
                <div className="font-mono font-semibold text-slate-900">
                  {selectedTx.sender_account_id} → {selectedTx.receiver_account_id} ·{' '}
                  {formatINR(selectedTx.amount)}
                </div>
                <div className="text-slate-500 font-mono">
                  {new Date(selectedTx.timestamp).toLocaleString('en-IN')} ·{' '}
                  {selectedTx.transaction_type} · {selectedTx.channel}
                </div>
                <div className="text-slate-700">
                  Patterns:{' '}
                  {selectedTx.detected_patterns.length > 0
                    ? selectedTx.detected_patterns.join(' · ')
                    : 'Routine Baseline Transfer'}
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigateTo('digital-dna', { accountId: selectedTx.sender_account_id })
                    }
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
                  >
                    Open Sender Digital DNA
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigateTo('ai-forensic-copilot', {
                        accountId: selectedTx.sender_account_id,
                        txId: selectedTx.transaction_id,
                      })
                    }
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
                  >
                    Ask AI Copilot
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. ARTT TRAVERSAL ENGINE (Adaptive Risk-Aware Temporal Transaction Traverser)
  // ============================================================================
  if (activePage === 'artt-traversal') {
    const activePath =
      latestArttResult.candidate_paths[selectedPathIndex] ||
      latestArttResult.candidate_paths[0];

    const visibleSteps = latestArttResult.animation_steps.slice(0, arttStepIndex);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div>
            <div className="text-xs font-mono text-blue-600">
              ADAPTIVE RISK-AWARE TEMPORAL TRANSACTION TRAVERSER (ARTT)
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Priority-Queue Multi-Hop Graph Traversal & Chronological Flow Verification
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Experimental risk weighting (0.30 Anomaly + 0.25 Velocity + 0.20 Topology + 0.15
              Counterparty + 0.10 Novelty). Pathways highlight temporal flow plausibility and do not
              claim identical physical currency units moved across accounts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const res = executeARTT();
              setArttStepIndex(1);
              setArttPlaying(true);
              if (res.candidate_paths.length > 0) {
                setSelectedPathIndex(0);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            Run ARTT Traversal
          </button>
        </div>

        {/* ARTT Configuration & Playback Controls Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4 items-center">
          <div className="lg:col-span-3">
            <label
              htmlFor="artt-start-node"
              className="block text-xs text-slate-500 mb-1"
            >
              Starting Account Node
            </label>
            <select
              id="artt-start-node"
              value={arttConfig.startAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                executeARTT({ startAccountId: e.target.value });
                setArttStepIndex(999);
              }}
              className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
            >
              {['ACC-050', 'ACC-021', 'ACC-031', 'ACC-014', 'ACC-042', ...accounts.slice(0, 15).map((a) => a.account_id)]
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((accId) => {
                  const acc = accounts.find((a) => a.account_id === accId);
                  return (
                    <option key={accId} value={accId}>
                      {accId} — {acc?.holder_name} (Risk {acc?.risk_score})
                    </option>
                  );
                })}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="artt-depth-slider" className="block text-xs text-slate-500 mb-1">
              Max Traversal Depth: <span className="font-mono text-blue-600">{arttConfig.maxDepth} hops</span>
            </label>
            <input
              id="artt-depth-slider"
              type="range"
              min={1}
              max={6}
              value={arttConfig.maxDepth}
              onChange={(e) => executeARTT({ maxDepth: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="artt-window-slider" className="block text-xs text-slate-500 mb-1">
              Time Window: <span className="font-mono text-blue-600">{arttConfig.timeWindowHours}h</span>
            </label>
            <input
              id="artt-window-slider"
              type="range"
              min={6}
              max={168}
              step={6}
              value={arttConfig.timeWindowHours}
              onChange={(e) => executeARTT({ timeWindowHours: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Playback Controls */}
          <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setArttPlaying((p) => !p)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
            >
              {arttPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {arttPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => {
                setArttPlaying(false);
                setArttStepIndex((s) =>
                  Math.min(latestArttResult.animation_steps.length, s + 1)
                );
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
            >
              <FastForward className="w-3.5 h-3.5" />
              Step Forward
            </button>
            <button
              type="button"
              onClick={() => {
                setArttPlaying(false);
                setArttStepIndex(latestArttResult.animation_steps.length);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart / Show All
            </button>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {([1, 2, 4] as const).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setArttSpeed(sp)}
                  className={`px-2 py-1 rounded font-mono ${
                    arttSpeed === sp
                      ? 'bg-cyan-500/20 text-blue-600 font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Candidate Pathways & Step Trace */}
          <div className="lg:col-span-7 space-y-5">
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-3">
              <h2 className="text-base font-semibold text-slate-900">
                Ranked Candidate Pathways ({latestArttResult.candidate_paths.length})
              </h2>
              <p className="text-xs text-slate-500">{latestArttResult.summary_note}</p>

              <div className="space-y-3">
                {latestArttResult.candidate_paths.map((path, idx) => (
                  <div
                    key={path.path_id}
                    onClick={() => {
                      setSelectedPathIndex(idx);
                      setHighlightedPath(
                        path.accounts,
                        path.transactions.map((t) => t.transaction_id)
                      );
                    }}
                    className={`p-4 rounded border cursor-pointer transition-colors ${
                      selectedPathIndex === idx
                        ? 'border-blue-600 bg-blue-50/70'
                        : 'border-slate-200 bg-slate-50 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-blue-600 font-semibold">
                        Rank #{path.rank} · {path.path_id} · {path.accounts.join(' → ')}
                      </span>
                      <span className="font-bold text-rose-400">
                        Path Score: {path.path_risk_score}/100
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 mt-1.5">{path.explanation}</div>
                    <div className="text-xs font-mono text-slate-500 mt-2">
                      Structures: {path.detected_structures.join(' · ')} · Retention:{' '}
                      {Math.round(path.amount_retention_ratio * 100)}% · Duration:{' '}
                      {path.duration_minutes}m
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rejected Edges Table */}
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Chronological & Risk Filtering — Rejected Candidate Edges (
                {latestArttResult.rejected_edges.length})
              </h2>
              <div className="max-h-56 overflow-y-auto space-y-2 text-xs">
                {latestArttResult.rejected_edges.slice(0, 10).map((rej, i) => (
                  <div
                    key={`${rej.transaction_id}-${i}`}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono text-slate-800">
                        {rej.transaction_id}: {rej.from_account} → {rej.to_account} (
                        {formatINR(rej.amount)})
                      </span>
                      <div className="text-rose-400 mt-0.5">{rej.rejection_reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: "Why did ARTT select this path?" Side Panel */}
          <div className="lg:col-span-5 space-y-5">
            {activePath && (
              <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-4">
                <div>
                  <div className="text-xs font-mono text-blue-600">
                    EXPLAINABLE GRAPH TRAVERSAL
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                    Why did ARTT select this path?
                  </h2>
                  <p className="text-xs font-mono text-slate-700 mt-1">
                    {activePath.accounts.join(' → ')}
                  </p>
                </div>

                {/* Normalized Score Breakdown */}
                <div className="space-y-2.5 text-xs">
                  {[
                    {
                      label: 'Transaction Anomaly (Weight 0.30)',
                      val: activePath.score_breakdown.transactionAnomaly,
                    },
                    {
                      label: 'Temporal Velocity (Weight 0.25)',
                      val: activePath.score_breakdown.temporalVelocity,
                    },
                    {
                      label: 'Structural Pattern (Weight 0.20)',
                      val: activePath.score_breakdown.structuralPattern,
                    },
                    {
                      label: 'Counterparty Risk (Weight 0.15)',
                      val: activePath.score_breakdown.counterpartyRisk,
                    },
                    {
                      label: 'Behavioral Novelty (Weight 0.10)',
                      val: activePath.score_breakdown.behavioralNovelty,
                    },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">{item.label}</span>
                        <span className="font-mono text-blue-600">{item.val}/100</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded"
                          style={{ width: `${item.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chronological Hop Table */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-800">
                    Chronological Hop Verification
                  </h3>
                  {activePath.transactions.map((tx, idx) => (
                    <div
                      key={tx.transaction_id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between text-blue-600 font-semibold">
                        <span>
                          Hop {idx + 1}: {tx.sender_account_id} → {tx.receiver_account_id}
                        </span>
                        <span>{formatINR(tx.amount)}</span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {tx.transaction_id} · {new Date(tx.timestamp).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Step-by-Step Expansion Log */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-800">
                    Priority Queue Step Log ({visibleSteps.length}/
                    {latestArttResult.animation_steps.length})
                  </h3>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 text-xs font-mono">
                    {visibleSteps.map((st) => (
                      <div
                        key={st.stepIndex}
                        className={`p-2 rounded border ${
                          st.accepted
                            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                            : 'border-rose-500/30 bg-rose-500/5 text-rose-300'
                        }`}
                      >
                        Step {st.stepIndex}: {st.reason}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. DIGITAL DNA ANALYSIS
  // ============================================================================
  if (activePage === 'digital-dna') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div>
            <div className="text-xs font-mono text-blue-600">
              FRAUDMESH DIGITAL DNA · 10-AXIS BEHAVIORAL FINGERPRINTING
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Transaction Digital DNA — {selectedDna.account_id} ({selectedDna.holder_name})
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Transaction-pattern behavioral signature (not biological DNA). Unusual behavior is a
              diagnostic signal, not automatic proof of confirmed fraud.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <label htmlFor="dna-primary-select" className="text-slate-500 mr-1.5">
                Inspect Account:
              </label>
              <select
                id="dna-primary-select"
                value={selectedAccount.account_id}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
              >
                {accounts.slice(0, 60).map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.account_id} — {a.holder_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dna-compare-select" className="text-slate-500 mr-1.5">
                Compare With:
              </label>
              <select
                id="dna-compare-select"
                value={compareAccountId}
                onChange={(e) => setCompareAccountId(e.target.value)}
                className="px-2.5 py-1.5 font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
              >
                <option value="">None</option>
                {accounts.slice(0, 30).map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.account_id} — {a.holder_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Radar Chart & Summary Card */}
          <div className="lg:col-span-5 border border-slate-200 rounded-2xl bg-white shadow-xs p-5 flex flex-col items-center justify-between space-y-4">
            <div className="w-full flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  Data Sufficiency: {selectedDna.sufficiency} ({selectedDna.sample_count} samples)
                </div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  Behavioral Anomaly Score: {selectedDna.anomaly_score}/100
                </div>
              </div>
              <span
                className={`font-mono text-sm font-bold ${
                  selectedDna.risk_level === 'High'
                    ? 'text-rose-400'
                    : selectedDna.risk_level === 'Medium'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {selectedDna.risk_level} Drift
              </span>
            </div>

            <DigitalDNARadar
              profile={selectedDna}
              comparisonProfile={compareDna}
              size={350}
            />

            <p className="text-xs text-slate-700 leading-relaxed border-t border-slate-200 pt-3">
              {selectedDna.summary_explanation}
            </p>
          </div>

          {/* 10 Behavioral Axes Contribution Bars */}
          <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              10-Axis Baseline vs. Current Behavior Comparison
            </h2>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {selectedDna.axes.map((axis) => (
                <div
                  key={axis.key}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{axis.feature}</span>
                    <span className="font-mono text-slate-700">
                      Baseline: {axis.baselineRaw} → Current:{' '}
                      <span className="text-blue-600 font-semibold">{axis.currentRaw}</span> (Dev:{' '}
                      {axis.deviationScore}/100)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${
                        axis.deviationScore >= 60
                          ? 'bg-rose-500'
                          : axis.deviationScore >= 35
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(6, axis.deviationScore)}%` }}
                    />
                  </div>
                  <div className="text-slate-500">{axis.explanation}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 5. SUSPICIOUS NETWORK DETECTION
  // ============================================================================
  if (activePage === 'suspicious-networks') {
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div className="text-xs font-mono text-blue-600">
            SUBGRAPH TOPOLOGY & PATTERN DISCOVERY
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Suspicious Network Detection — Discovered Rings, Mules & Split-Merge Conduits
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((al) => (
            <div
              key={al.alert_id}
              className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-blue-600">{al.detector_id}</span>
                  <span className="font-bold text-rose-400">
                    Risk Score: {al.risk_score}/100 ({al.risk_level})
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">{al.detector_name}</h2>
                <p className="text-xs text-slate-700 leading-relaxed">{al.explanation}</p>
                <div className="space-y-1 pt-2 text-xs text-slate-500">
                  {al.evidence.map((ev, i) => (
                    <div key={i}>· {ev}</div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">
                  {al.involved_accounts.length} Nodes · {al.transaction_ids.length} Edges
                </span>
                <button
                  type="button"
                  onClick={() =>
                    navigateTo('money-trail-explorer', {
                      accountId: al.involved_accounts[0],
                      highlightAccounts: al.involved_accounts,
                      highlightTxIds: al.transaction_ids,
                    })
                  }
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
                >
                  Open Subgraph in Explorer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 6. AI FORENSIC COPILOT (Gemini Server-Side + Deterministic Fallback)
  // ============================================================================
  if (activePage === 'ai-forensic-copilot') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div>
            <div className="text-xs font-mono text-blue-600">
              EVIDENCE-GROUNDED AI FORENSIC COPILOT · SERVER-SIDE GEMINI SDK
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              AI Forensic Copilot — Grounded Financial Crime Investigation Assistant
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Grounded strictly in system transaction records, Digital DNA profiles, and ARTT
              pathways. Differentiates observed patterns from confirmed criminal conclusions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 4 Columns: Context Selector & Suggested Prompts */}
          <div className="lg:col-span-4 space-y-4">
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 space-y-3">
              <label
                htmlFor="copilot-account-select"
                className="block text-xs font-semibold text-slate-800"
              >
                Active Investigation Context Account
              </label>
              <select
                id="copilot-account-select"
                value={selectedAccount.account_id}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
              >
                {accounts.slice(0, 60).map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.account_id} — {a.holder_name} (Risk {a.risk_score})
                  </option>
                ))}
              </select>

              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-200">
                <div>Holder: {selectedAccount.holder_name}</div>
                <div>
                  Risk Score: {selectedAccount.risk_score}/100 ({selectedAccount.risk_level})
                </div>
                <div>
                  Digital DNA Score: {selectedDna.anomaly_score}/100 ({selectedDna.sufficiency})
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 space-y-2.5">
              <h2 className="text-xs font-semibold text-slate-800">
                Suggested Forensic Questions
              </h2>
              <div className="space-y-1.5">
                {SUGGESTED_COPILOT_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setCopilotQuestion(q);
                      triggerCopilotAnalysis(q);
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded bg-slate-50 border border-slate-200/80 hover:bg-slate-800 border border-slate-200 text-slate-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 8 Columns: Prompt Bar & Structured Evidence-Grounded Output */}
          <div className="lg:col-span-8 space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                triggerCopilotAnalysis();
              }}
              className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 flex items-center gap-3"
            >
              <input
                type="text"
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                placeholder="Ask a forensic question about accounts, transactions, ARTT paths, or Digital DNA..."
                aria-label="Forensic copilot question"
                className="flex-1 px-3.5 py-2 text-xs bg-slate-950 border border-slate-200 rounded text-slate-900"
              />
              <button
                type="submit"
                disabled={copilotLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {copilotLoading ? 'Analyzing Evidence...' : 'Generate Evidence Summary'}
              </button>
            </form>

            {copilotWarning && (
              <div className="p-3 rounded border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200">
                {copilotWarning}
              </div>
            )}

            {copilotResponse && (
              <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-xs font-mono text-blue-600">
                      {copilotResponse.source_mode}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      Structured Forensic Investigation Briefing
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeCase && (
                      <button
                        type="button"
                        onClick={() =>
                          attachCopilotSummaryToCase(activeCase.case_id, copilotResponse)
                        }
                        className="px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
                      >
                        Attach to {activeCase.case_id}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const created = createCustomCase({
                          title: `AI Copilot Escalation — ${selectedAccount.account_id} (${selectedAccount.holder_name})`,
                          involvedAccounts: [
                            selectedAccount.account_id,
                            ...highlightedPathAccounts.slice(0, 4),
                          ].filter((v, i, a) => a.indexOf(v) === i),
                          linkedTxIds: copilotResponse.evidence_references
                            .map((r) => r.match(/TXN-[A-Z0-9-]+/)?.[0])
                            .filter(Boolean) as string[],
                          investigator: 'Meera Iyer (Senior Graph Forensic Analyst)',
                          note: copilotResponse.investigation_summary,
                        });
                        attachCopilotSummaryToCase(created.case_id, copilotResponse);
                        navigateTo('case-management', { caseId: created.case_id });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
                    >
                      Create Investigation Case
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">
                      1. Investigation Summary
                    </h3>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/80 p-3.5 rounded border border-slate-200">
                      {copilotResponse.investigation_summary}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">
                      2. Observed Algorithmic Indicators
                    </h3>
                    <ul className="space-y-1.5 bg-slate-50 border border-slate-200/80 p-3.5 rounded border border-slate-200 text-slate-700">
                      {copilotResponse.observed_indicators.map((ind, i) => (
                        <li key={i}>· {ind}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">
                      3. Supporting System Evidence References
                    </h3>
                    <div className="font-mono text-blue-600 font-semibold bg-slate-50 border border-slate-200/80 p-3.5 rounded border border-slate-200 space-y-1">
                      {copilotResponse.evidence_references.map((ref, i) => (
                        <div key={i}>· {ref}</div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">
                      4. Uncertainty & Algorithmic Limitations
                    </h3>
                    <p className="text-amber-300/90 bg-slate-50 border border-slate-200/80 p-3.5 rounded border border-slate-200 leading-relaxed">
                      {copilotResponse.uncertainty_limitations}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">
                      5. Suggested Next Investigative Checks
                    </h3>
                    <ul className="space-y-1.5 bg-slate-50 border border-slate-200/80 p-3.5 rounded border border-slate-200 text-emerald-300">
                      {copilotResponse.suggested_next_checks.map((chk, i) => (
                        <li key={i}>· {chk}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 7. CASE MANAGEMENT
  // ============================================================================
  if (activePage === 'case-management') {
    const ALL_CASE_STATUSES: CaseStatus[] = [
      'Open',
      'Under Review',
      'Escalated',
      'Closed – No Issue Found',
      'Closed – Further Action Recommended',
    ];

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
          <div>
            <div className="text-xs font-mono text-blue-600">
              FORENSIC CASE MANAGEMENT WORKSPACE
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Investigator Case Files, Evidence Links & Decision Audit ({cases.length} Cases)
            </h1>
          </div>

          {activeCase && (
            <button
              type="button"
              onClick={() => navigateTo('investigation-reports', { caseId: activeCase.case_id })}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
            >
              Open & Export Report for {activeCase.case_id}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 4 Columns: Case List */}
          <div className="lg:col-span-4 space-y-3">
            {cases.map((c) => (
              <button
                key={c.case_id}
                type="button"
                onClick={() => setSelectedCaseId(c.case_id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  activeCase?.case_id === c.case_id
                    ? 'border-blue-600 bg-blue-50/70'
                    : 'border-slate-200 bg-slate-50 border border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-blue-600">{c.case_id}</span>
                  <span className="text-rose-400">Risk {c.risk_score}/100</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1">{c.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Status: {c.status} · {c.involved_accounts.length} Accounts ·{' '}
                  {c.linked_transaction_ids.length} Tx
                </div>
              </button>
            ))}
          </div>

          {/* Right 8 Columns: Active Case Details */}
          {activeCase && (
            <div className="lg:col-span-8 border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-xs font-mono text-blue-600">
                    {activeCase.case_id} · Created{' '}
                    {new Date(activeCase.created_at).toLocaleString('en-IN')}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                    {activeCase.title}
                  </h2>
                  <div className="text-xs text-slate-500 mt-1">
                    Assigned Investigator: {activeCase.assigned_investigator} · Current Status:{' '}
                    <span className="text-slate-900 font-semibold">{activeCase.status}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigateTo('money-trail-explorer', {
                      accountId: activeCase.involved_accounts[0],
                      highlightAccounts: activeCase.involved_accounts,
                      highlightTxIds: activeCase.linked_transaction_ids,
                    })
                  }
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
                >
                  Visualize Case Network
                </button>
              </div>

              {/* Status Transition Bar */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Update Investigation Status & Record Decision
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {ALL_CASE_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateCaseStatus(activeCase.case_id, st, statusRationale)}
                      className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                        activeCase.status === st
                          ? 'border-blue-600 bg-blue-600 text-white font-semibold shadow-xs'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Involved Accounts & Linked Transactions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <div className="font-semibold text-slate-800">
                    Involved Synthetic Accounts ({activeCase.involved_accounts.length})
                  </div>
                  <div className="font-mono text-blue-600 font-semibold">
                    {activeCase.involved_accounts.join(', ')}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <div className="font-semibold text-slate-800">
                    Preserved Transaction Evidence ({activeCase.linked_transaction_ids.length})
                  </div>
                  <div className="font-mono text-slate-700">
                    {activeCase.linked_transaction_ids.join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {/* Investigator Notes */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-800">
                  Investigator Forensic Notes ({activeCase.notes.length})
                </h3>
                <div className="space-y-2">
                  {activeCase.notes.map((n) => (
                    <div
                      key={n.note_id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
                    >
                      <div className="font-mono text-slate-500">
                        {n.author} · {new Date(n.timestamp).toLocaleString('en-IN')}
                      </div>
                      <div className="text-slate-800 mt-1">{n.content}</div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addCaseNote(
                      activeCase.case_id,
                      activeCase.assigned_investigator,
                      newCaseNoteText
                    );
                    setNewCaseNoteText('');
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newCaseNoteText}
                    onChange={(e) => setNewCaseNoteText(e.target.value)}
                    placeholder="Add forensic observation or KYC verification note..."
                    aria-label="Add investigator note"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
                  >
                    + Append Note
                  </button>
                </form>
              </div>

              {/* Decision Audit History */}
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <h3 className="text-xs font-semibold text-slate-800">Decision Audit History</h3>
                <div className="space-y-1.5 text-xs font-mono text-slate-500">
                  {activeCase.decision_history.map((d) => (
                    <div key={d.id}>
                      [{new Date(d.timestamp).toLocaleTimeString('en-IN')}] {d.actor}:{' '}
                      {d.previous_status} → <span className="text-slate-800">{d.new_status}</span> (
                      {d.rationale})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 8. INVESTIGATION REPORTS (12-Section Forensic Dossier & Export)
  // ============================================================================
  const reportCase = activeCase || cases[0];
  const caseTxs = transactions.filter((t) =>
    reportCase?.linked_transaction_ids.includes(t.transaction_id)
  );
  const caseAccounts = accounts.filter((a) =>
    reportCase?.involved_accounts.includes(a.account_id)
  );

  const buildMarkdownReport = () => {
    if (!reportCase) return '';
    return [
      `# FRAUDMESH FORENSIC INVESTIGATION REPORT — ${reportCase.case_id}`,
      `**SYNTHETIC DATA DISCLAIMER:** This dossier is generated from synthetic demonstration telemetry and does not represent real banking customers or confirmed criminal activity.`,
      ``,
      `## 1. Case Identification`,
      `- **Case ID:** ${reportCase.case_id}`,
      `- **Title:** ${reportCase.title}`,
      `- **Status:** ${reportCase.status}`,
      `- **Assigned Investigator:** ${reportCase.assigned_investigator}`,
      `- **Created At:** ${reportCase.created_at}`,
      ``,
      `## 2. Executive Summary`,
      `Graph forensic analysis identified coordinated anomalous activity across ${reportCase.involved_accounts.length} synthetic account(s) involving ${reportCase.linked_transaction_ids.length} linked transfer(s) with an overall composite risk score of ${reportCase.risk_score}/100 (${reportCase.risk_level}).`,
      ``,
      `## 3. Involved Synthetic Accounts`,
      ...caseAccounts.map(
        (a) =>
          `- **${a.account_id}** (${a.holder_name}) — ${a.account_type}, ${a.kyc_tier}, Risk: ${a.risk_score}/100`
      ),
      ``,
      `## 4. Relevant Transactions`,
      ...caseTxs.map(
        (t) =>
          `- **${t.transaction_id}**: ${t.sender_account_id} -> ${t.receiver_account_id} | ₹${t.amount.toLocaleString('en-IN')} | ${t.timestamp} | Score: ${t.risk_score}/100`
      ),
      ``,
      `## 5. Detected Indicators`,
      ...reportCase.detected_indicators.map((ind) => `- ${ind}`),
      ``,
      `## 6. Graph Relationship Summary`,
      `Active subgraph connects ${reportCase.involved_accounts.join(' -> ')} with high pass-through parity and directional flow convergence.`,
      ``,
      `## 7. ARTT Temporal Traversal Analysis`,
      `${latestArttResult.summary_note}`,
      ``,
      `## 8. Digital DNA Behavioral Findings`,
      `${selectedDna.summary_explanation}`,
      ``,
      `## 9. Risk Score Explanation`,
      `Composite Risk Score ${reportCase.risk_score}/100 (${reportCase.risk_level} Band) aggregated across Transaction Anomaly, Digital DNA Deviation, Network Structure, and Temporal Velocity.`,
      ``,
      `## 10. Investigator Notes`,
      ...reportCase.notes.map((n) => `- [${n.timestamp}] ${n.author}: ${n.content}`),
      ``,
      `## 11. Algorithmic Limitations`,
      `Graph pathways and behavioral anomalies highlight mathematical suspicion and temporal plausibility; they do not prove identical currency units moved across hops without external legal and documentary verification.`,
      ``,
      `## 12. Recommended Investigative Next Steps`,
      `- Verify KYC beneficial ownership and device IP correlation across ${reportCase.involved_accounts.join(', ')}.`,
      `- Request commercial invoices or source-of-wealth documentation for linked transfers.`,
    ].join('\n');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-4">
        <div>
          <div className="text-xs font-mono text-amber-400">
            SYNTHETIC DEMONSTRATION DOSSIER · 12-SECTION FORENSIC REPORT
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Investigation Report — {reportCase?.case_id}: {reportCase?.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select case for investigation report"
            value={reportCase?.case_id || ''}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
          >
            {cases.map((c) => (
              <option key={c.case_id} value={c.case_id}>
                {c.case_id} — {c.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              downloadFile(
                buildMarkdownReport(),
                `fraudmesh-investigation-report-${reportCase?.case_id}.md`
              )
            }
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Report (.MD / Text)
          </button>

          <button
            type="button"
            onClick={() =>
              downloadFile(
                JSON.stringify(reportCase, null, 2),
                `fraudmesh-case-${reportCase?.case_id}.json`,
                'application/json'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </div>

      {reportCase && (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-5 text-xs">
          <div className="p-3 rounded border border-amber-500/30 bg-amber-500/10 text-amber-200 font-mono">
            SYNTHETIC DATA DISCLAIMER: All accounts, holder names, INR amounts, and forensic findings
            in this report belong to FraudMesh synthetic evaluation scenarios.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded bg-slate-50 border border-slate-200/80 border border-slate-200 space-y-1">
              <div className="font-semibold text-blue-600">1. Case Identification</div>
              <div>Case ID: {reportCase.case_id}</div>
              <div>Status: {reportCase.status}</div>
              <div>Investigator: {reportCase.assigned_investigator}</div>
            </div>
            <div className="p-4 rounded bg-slate-50 border border-slate-200/80 border border-slate-200 space-y-1">
              <div className="font-semibold text-blue-600">2. Executive Summary & Risk Score</div>
              <div>
                Composite Risk Score: {reportCase.risk_score}/100 ({reportCase.risk_level})
              </div>
              <div>
                Involved Accounts: {reportCase.involved_accounts.length} · Linked Transactions:{' '}
                {reportCase.linked_transaction_ids.length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded bg-slate-50 border border-slate-200/80 border border-slate-200 space-y-1.5">
              <div className="font-semibold text-blue-600">
                3. Involved Synthetic Accounts & 5. Detected Indicators
              </div>
              <div className="font-mono text-slate-800">
                {reportCase.involved_accounts.join(', ')}
              </div>
              <div className="text-slate-500">
                Indicators: {reportCase.detected_indicators.join(' · ')}
              </div>
            </div>
            <div className="p-4 rounded bg-slate-50 border border-slate-200/80 border border-slate-200 space-y-1.5">
              <div className="font-semibold text-blue-600">
                4. Linked Transactions & 6. Graph Relationship Summary
              </div>
              <div className="font-mono text-slate-700">
                {reportCase.linked_transaction_ids.join(', ')}
              </div>
              <div className="text-slate-500">{latestArttResult.summary_note}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded bg-slate-50 border border-slate-200/80 border border-slate-200 space-y-1.5">
              <div className="font-semibold text-blue-600">
                7. ARTT Analysis & 8. Digital DNA Findings
              </div>
              <p className="text-slate-700">{selectedDna.summary_explanation}</p>
            </div>
            <div className="p-4 rounded bg-slate-50 border border-slate-200/80 border border-slate-200 space-y-1.5">
              <div className="font-semibold text-blue-600">
                9. Risk Explanation, 11. Limitations & 12. Recommended Next Steps
              </div>
              <p className="text-slate-700">
                Algorithmic paths indicate chronological value continuity; verify commercial
                invoices, device IDs, and KYC ownership before regulatory filing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
