import React, { useEffect, useMemo, useState } from 'react';
import { useFraudMesh } from '../context/FraudMeshContext';
import { formatINR } from '../engine/digitalDna';
import { SIMULATION_SCENARIOS } from '../engine/syntheticData';
import { ScenarioId } from '../types/fraudmesh';
import { MoneyTrailGraph } from './MoneyTrailGraph';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  FastForward,
  GitBranch,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ConceptItem {
  id: number;
  title: string;
  formula?: string;
  explanation: string;
  datasetExample: string;
  targetPage:
    | 'money-trail-explorer'
    | 'artt-traversal'
    | 'digital-dna'
    | 'risk-intelligence'
    | 'ai-forensic-copilot'
    | 'model-evaluation'
    | 'scenario-simulator';
  targetAccount?: string;
}

const FOURTEEN_CONCEPTS: ConceptItem[] = [
  {
    id: 1,
    title: '01. What is Money Laundering Detection?',
    explanation:
      'Money laundering detection identifies the placement, layering, and integration of illicit capital through banking rails. Rather than looking only at isolated rule breaches, modern AML forensics reconstructs multi-hop capital flows across coordinated accounts.',
    datasetExample:
      'In Scenario 6, ACC-050 fragments ₹12.40L across four intermediary accounts (ACC-051..054) which converge into ACC-055 within 41 minutes.',
    targetPage: 'scenario-simulator',
    targetAccount: 'ACC-050',
  },
  {
    id: 2,
    title: '02. Why Individual Transaction Analysis is Insufficient',
    explanation:
      'When bad actors split a ₹3,92,500 transfer into eight ₹49,000 transfers just below the ₹50,000 single-transaction reporting threshold, legacy per-transaction rules pass each transfer individually. Only network and temporal aggregation reveals the structuring pattern.',
    datasetExample:
      'Account ACC-014 executes 8 sub-threshold transfers (₹48,700–₹49,800) within 64 minutes.',
    targetPage: 'money-trail-explorer',
    targetAccount: 'ACC-014',
  },
  {
    id: 3,
    title: '03. What is Graph Intelligence?',
    formula: 'G = (V, E, T, W) where V = Accounts, E = Directed Transfers',
    explanation:
      'Graph intelligence models every bank account as a vertex and every financial transfer as a timestamped, weighted directed edge. Network metrics such as in-degree, out-degree, pass-through parity, and Tarjan cycle detection expose hidden topology.',
    datasetExample:
      'Nodes ACC-031, ACC-032, ACC-033, and ACC-034 form a closed directed cycle returning 95.8% of principal.',
    targetPage: 'money-trail-explorer',
    targetAccount: 'ACC-031',
  },
  {
    id: 4,
    title: '04. How BFS and DFS Differ from ARTT',
    formula:
      'Priority(e) = 0.30·Anomaly + 0.25·Velocity + 0.20·Structure + 0.15·Counterparty + 0.10·Novelty',
    explanation:
      'Breadth-First Search (BFS) expands all neighbors uniformly by hop count (exploding combinatorially in dense banking graphs), while Depth-First Search (DFS) plunges arbitrarily down low-risk edges. ARTT uses a risk-weighted priority queue constrained by chronological timestamp validity.',
    datasetExample:
      'From ACC-050, ARTT immediately prioritizes the 4 high-risk split-and-merge branches while rejecting low-risk routine transfers.',
    targetPage: 'artt-traversal',
    targetAccount: 'ACC-050',
  },
  {
    id: 5,
    title: '05. Why Temporal Ordering Matters',
    formula: 't(e_{k+1}) ≥ t(e_k) and t(e_{k+1}) - t(e_1) ≤ ΔW',
    explanation:
      'For Account B to forward funds received from Account A to Account C, the outgoing transfer B → C must occur at or after the arrival timestamp of A → B. Ignoring timestamps creates false paths that could never have carried the same capital flow.',
    datasetExample:
      'In the ACC-021 → ACC-025 mule chain, hops occur at +0m, +14m, +29m, and +46m in strict chronological order.',
    targetPage: 'artt-traversal',
    targetAccount: 'ACC-021',
  },
  {
    id: 6,
    title: '06. What is Transaction Digital DNA?',
    explanation:
      'FraudMesh Digital DNA is a 10-axis behavioral fingerprint computed from an account’s rolling historical ledger (typical amount, variability, daily frequency, IST active hours, counterparty count, interval distribution, in/out parity, new beneficiaries, repeated patterns, and regime shift).',
    datasetExample:
      'ACC-042 has a daytime baseline of ₹4,000 transfers, contrasting sharply with its 02:10 AM IST burst of ₹95,000 transfers.',
    targetPage: 'digital-dna',
    targetAccount: 'ACC-042',
  },
  {
    id: 7,
    title: '07. What is Behavioral Anomaly Detection?',
    formula: 'Z_robust = |x - Baseline_mean| / max(Baseline_std, ε)',
    explanation:
      'Behavioral anomaly detection measures how strongly an account’s recent activity diverges from its own historical norms rather than relying on a single static bank-wide threshold.',
    datasetExample:
      'When ACC-042 transacts at 02:10 AM IST for ₹95,000 (23.7x its typical ₹4,000 baseline), Digital DNA scores 92/100.',
    targetPage: 'digital-dna',
    targetAccount: 'ACC-042',
  },
  {
    id: 8,
    title: '08. What are Mule Account Networks?',
    formula: 'PassThroughRatio(v) = min(Inflow, Outflow) / max(Inflow, Outflow)',
    explanation:
      'Money mule accounts act as rapid transit conduits: they hold near-zero balances, receive high-value transfers, and forward 90–99% of the funds within minutes to downstream layering nodes.',
    datasetExample:
      'Accounts ACC-022, ACC-023, and ACC-024 forward 96% of ₹3,60,000 within 14–17 minutes per hop using shared device DEV-MULE-SHARED-77.',
    targetPage: 'money-trail-explorer',
    targetAccount: 'ACC-021',
  },
  {
    id: 9,
    title: '09. What are Split-and-Merge Patterns?',
    explanation:
      'In a Split-and-Merge structure, a source account disperses capital across multiple parallel intermediary accounts (fan-out split) which subsequently converge into a single downstream collector account (fan-in merge).',
    datasetExample:
      'ACC-050 splits ₹12,40,000 across ACC-051..054 (₹3,10,000 each), which all merge into ACC-055 (₹12,14,500) before wiring to ACC-056.',
    targetPage: 'scenario-simulator',
    targetAccount: 'ACC-050',
  },
  {
    id: 10,
    title: '10. How Risk Scoring Works',
    formula: 'RiskScore = clamp(Σ w_i · Factor_i + MultiDetectorBoost, 0, 100)',
    explanation:
      'FraudMesh aggregates five orthogonal risk dimensions (Amount/Structuring 25%, Digital DNA 20%, Graph Topology 25%, Temporal Velocity 15%, Counterparty/ARTT 15%) into a bounded 0–100 score.',
    datasetExample:
      'Transaction TXN-1091 (ACC-050 → ACC-051) scores 94/100 with full factor decomposition in Risk Intelligence.',
    targetPage: 'risk-intelligence',
    targetAccount: 'ACC-050',
  },
  {
    id: 11,
    title: '11. What is Explainable AI (XAI) in AML?',
    explanation:
      'Investigators and regulators cannot act on opaque black-box probabilities. Explainable fraud detection decomposes every alert into human-auditable factors, exact transaction references, and structural graph evidence.',
    datasetExample:
      'Every flagged transaction includes a "Why Flagged?" breakdown showing exact rupee ratios, IST hours, and graph degree metrics.',
    targetPage: 'risk-intelligence',
    targetAccount: 'ACC-014',
  },
  {
    id: 12,
    title: '12. How AI-Assisted Investigation Works',
    explanation:
      'The AI Forensic Copilot receives structured JSON evidence (selected accounts, transactions, alerts, ARTT paths, and Digital DNA) and drafts grounded investigative summaries without inventing facts or assuming guilt.',
    datasetExample:
      'Ask the AI Forensic Copilot "Why was account ACC-014 flagged?" to see transaction-referenced evidence synthesis.',
    targetPage: 'ai-forensic-copilot',
    targetAccount: 'ACC-014',
  },
  {
    id: 13,
    title: '13. How False Positives Are Calculated',
    formula: 'FPR = FP / (FP + TN)   |   Precision = TP / (TP + FP)',
    explanation:
      'A False Positive (FP) occurs when a legitimate transaction is flagged as suspicious. High false-positive rates overwhelm compliance teams and inconvenience legitimate customers.',
    datasetExample:
      'Use the Classification Threshold slider in Model Evaluation to observe how raising the threshold reduces FP and FPR.',
    targetPage: 'model-evaluation',
  },
  {
    id: 14,
    title: '14. Why Honest Model Evaluation Matters',
    formula: 'F1 = 2 · Precision · Recall / (Precision + Recall)',
    explanation:
      'Because financial fraud is a rare-class event, overall accuracy can be misleading. FraudMesh evaluates models on a held-out 40% test split (excluding ground_truth_label from input features) using Precision, Recall, F1, FPR, and ROC-AUC.',
    datasetExample:
      'Compare Logistic Regression, Random Forest, XGBoost-Style GBDT, and Deep Neural Network (MLP) in Model Evaluation.',
    targetPage: 'model-evaluation',
  },
];

const ARCHITECTURE_STAGES = [
  {
    id: 'stage-1',
    title: '1. Frontend Interfaces (React 19 + D3.js + Tailwind)',
    purpose: 'Multi-role interactive command center for Administrators, Customers, and Investigators.',
    inputs: 'User interactions, simulated customer transfers, CSV uploads, ARTT parameter sliders.',
    logic: 'Renders synchronized role views, D3 force-directed money trail graphs, and 10-axis Digital DNA radars.',
    outputs: 'REST API requests (/api/copilot/analyze) and state dispatches to the unified pipeline.',
    connected: 'Backend API & Unified Pipeline Context',
    example: 'Customer submits a ₹49,500 transfer from ACC-001 to ACC-055.',
  },
  {
    id: 'stage-2',
    title: '2. Backend API (Node.js + Express + Server-Side Gemini)',
    purpose: 'Secure server-side execution of Gemini AI Forensic Copilot queries and health telemetry.',
    inputs: 'Structured JSON investigation context (accounts, transactions, alerts, ARTT paths, Digital DNA).',
    logic: 'Sanitizes inputs, enforces JSON schema via @google/genai, and falls back deterministically if offline.',
    outputs: 'Evidence-grounded CopilotStructuredResponse with exact transaction citations.',
    connected: 'Frontend Interfaces & Gemini Forensic Copilot',
    example: 'POST /api/copilot/analyze for account ACC-050 returns 9 cited split-and-merge transaction IDs.',
  },
  {
    id: 'stage-3',
    title: '3. Data Processing & Feature Engineering',
    purpose: 'Validates incoming transfers/CSVs and extracts 9 normalized [0..1] features per transaction.',
    inputs: 'Raw synthetic ledger records (INR amounts, Asia/Kolkata timestamps, channels, devices).',
    logic: 'Computes amount deviation, temporal IST anomaly, counterparty novelty, and velocity without label leakage.',
    outputs: 'Typed TransactionFeature vectors for ML inference and risk scoring.',
    connected: 'Risk & Detection Engines + ML Evaluation',
    example: 'TXN-1082 at 02:10 AM IST yields temporalAnomaly = 0.92 and amountDeviation = 0.88.',
  },
  {
    id: 'stage-4',
    title: '4. Risk & 8-Pattern Detection Engines',
    purpose: 'Evaluates 0–100 composite risk scores and executes 8 modular graph/behavioral detectors.',
    inputs: 'Enriched transactions, account baselines, and graph adjacency structures.',
    logic: 'Detects Splitting (DET-SPLIT), Cycles (DET-CYCLE), Fan-Out (DET-FAN), Pass-Through (DET-PASSTHROUGH), Velocity (DET-VELOCITY), DNA (DET-DNA), ARTT (DET-ARTT), and Split-Merge (DET-SPLIT-MERGE).',
    outputs: 'Deduplicated FraudAlert records with transaction evidence.',
    connected: 'Digital DNA + ARTT + Alert Management',
    example: 'DET-SPLIT-MERGE triggers alert ALT-SPLITMERGE-ACC-050-ACC-055 with Risk Score 95/100.',
  },
  {
    id: 'stage-5',
    title: '5. Digital DNA + ARTT + Graph Intelligence',
    purpose: 'Computes 10-axis behavioral fingerprints and runs priority-queue temporal graph traversal.',
    inputs: 'Account historical baselines, directed multigraph edges, and configurable ARTT weights.',
    logic: 'Verifies chronological ordering t(e_{k+1}) >= t(e_k), scores amount retention, and identifies cycles/convergence.',
    outputs: 'DigitalDNAProfile maps, GraphNode centrality metrics, and ranked TraversalPath candidates.',
    connected: 'Money Trail Explorer & Investigator Workspace',
    example: 'ARTT ranks ACC-050 → ACC-053 → ACC-055 → ACC-056 as Rank #1 pathway (Score 91/100).',
  },
  {
    id: 'stage-6',
    title: '6. Alert & Investigator Case Management',
    purpose: 'Preserves alert evidence, transaction links, investigator notes, and status decision history.',
    inputs: 'Triggered FraudAlerts and customer-reported suspicious activity inquiries.',
    logic: 'Links source_alert_ids and transaction_ids into immutable case files across 5 lifecycle states.',
    outputs: 'InvestigationCase records synchronized with Bank Executive KPIs.',
    connected: 'Gemini Forensic Copilot & Investigation Reports',
    example: 'Case CASE-2026-101 preserves all 9 transactions from the ACC-050 split-and-merge alert.',
  },
  {
    id: 'stage-7',
    title: '7. Gemini Forensic Copilot',
    purpose: 'Synthesizes observed indicators, evidence references, and limitations into natural language.',
    inputs: 'Active account context, ARTT pathways, Digital DNA axes, and investigator question.',
    logic: 'Applies strict non-accusatory forensic system instructions grounded only in supplied records.',
    outputs: 'Structured 5-part briefing attachable directly to an Investigation Case.',
    connected: 'Case Management & Investigation Reports',
    example: 'Summarizes ACC-014 structuring across 8 sub-₹50k IMPS transfers.',
  },
  {
    id: 'stage-8',
    title: '8. Investigation Reports & Exports',
    purpose: 'Generates 12-section forensic dossiers, CSV ledgers, and SVG network exports.',
    inputs: 'Selected InvestigationCase, linked transactions, ARTT results, and Digital DNA.',
    logic: 'Formats comprehensive Markdown/JSON reports with mandatory synthetic-data disclaimers.',
    outputs: 'Downloadable .md, .json, .csv, and .svg forensic artifacts.',
    connected: 'Investigator & Bank Administrator Consoles',
    example: 'Exports fraudmesh-investigation-report-CASE-2026-101.md.',
  },
];

export const ResearchViews: React.FC = () => {
  const {
    activePage,
    accounts,
    transactions,
    alerts,
    dnaProfiles,
    graphNodes,
    graphEdges,
    modelEvaluations,
    activeSimScenario,
    setActiveSimScenario,
    selectedAccountId,
    setSelectedAccountId,
    setHighlightedPath,
    executeARTT,
    createCaseFromAlertAction,
    navigateTo,
  } = useFraudMesh();

  // ============================================================================
  // SCENARIO SIMULATOR STATE (FraudMesh Intelligence Lab)
  // ============================================================================
  const [simStep, setSimStep] = useState<number>(9);
  const [simPlaying, setSimPlaying] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 4>(1);
  const [selectedConceptIndex, setSelectedConceptIndex] = useState<number>(0);
  const [selectedArchStage, setSelectedArchStage] = useState<number>(0);
  const [walkthroughStep, setWalkthroughStep] = useState<number>(0);

  const currentScenarioMeta = useMemo(
    () =>
      SIMULATION_SCENARIOS.find((s) => s.id === activeSimScenario) ||
      SIMULATION_SCENARIOS[5],
    [activeSimScenario]
  );

  const scenarioTransactions = useMemo(() => {
    const txs = transactions.filter((t) => t.scenario_id === currentScenarioMeta.id);
    return txs.length > 0 ? txs.slice(0, 12) : transactions.slice(0, 8);
  }, [transactions, currentScenarioMeta]);

  const totalSimSteps = scenarioTransactions.length;

  useEffect(() => {
    setSimStep(totalSimSteps);
    setSimPlaying(false);
  }, [activeSimScenario, totalSimSteps]);

  useEffect(() => {
    if (!simPlaying) return;
    if (simStep >= totalSimSteps) {
      setSimPlaying(false);
      return;
    }

    const intervalMs = Math.round(900 / simSpeed);
    const timer = setTimeout(() => {
      const nextStep = simStep + 1;
      setSimStep(nextStep);
      if (nextStep >= totalSimSteps) {
        setSimPlaying(false);
      }
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [simPlaying, simSpeed, simStep, totalSimSteps]);

  const revealedScenarioTxs = useMemo(
    () => scenarioTransactions.slice(0, Math.max(1, simStep)),
    [scenarioTransactions, simStep]
  );

  // Build live event feed messages corresponding to revealed transactions in the simulation
  const liveFeedEvents = useMemo(() => {
    const events: { id: string; tag: string; text: string; tone: 'cyan' | 'amber' | 'rose' | 'emerald' }[] = [];
    revealedScenarioTxs.forEach((tx, idx) => {
      events.push({
        id: `${tx.transaction_id}-rx`,
        tag: 'Transaction received',
        text: `${tx.transaction_id}: ${formatINR(tx.amount)} transferred from ${tx.sender_account_id} to ${tx.receiver_account_id} (${tx.transaction_type})`,
        tone: 'cyan',
      });
      events.push({
        id: `${tx.transaction_id}-graph`,
        tag: 'Graph relationship updated',
        text: `Directed edge ${tx.sender_account_id} → ${tx.receiver_account_id} added to active subgraph (Step ${idx + 1}/${totalSimSteps})`,
        tone: 'emerald',
      });
      if (tx.risk_score >= 60) {
        events.push({
          id: `${tx.transaction_id}-dna`,
          tag: 'Behavioral deviation detected',
          text: `Digital DNA fingerprint shifted on ${tx.sender_account_id} (Tx Risk Score: ${tx.risk_score}/100)`,
          tone: 'amber',
        });
      }
      if (idx === revealedScenarioTxs.length - 1 && tx.detected_patterns.length > 0) {
        events.push({
          id: `${tx.transaction_id}-artt`,
          tag: 'Temporal traversal completed',
          text: `ARTT evaluated multi-hop chronological flow from ${currentScenarioMeta.primary_account}`,
          tone: 'cyan',
        });
        events.push({
          id: `${tx.transaction_id}-alert`,
          tag: 'Risk alert generated',
          text: `Triggered detectors: ${tx.detected_patterns.join(', ')}`,
          tone: 'rose',
        });
        events.push({
          id: `${tx.transaction_id}-ev`,
          tag: 'Investigation evidence available',
          text: `${revealedScenarioTxs.length} transaction records ready for AI Forensic Copilot & Case Escalation`,
          tone: 'emerald',
        });
      }
    });
    return events.slice(-10).reverse();
  }, [revealedScenarioTxs, totalSimSteps, currentScenarioMeta]);

  const scenarioAlert = useMemo(
    () =>
      alerts.find((a) => a.scenario_id === currentScenarioMeta.id) || alerts[0],
    [alerts, currentScenarioMeta]
  );

  const primaryDna = useMemo(
    () =>
      dnaProfiles.get(currentScenarioMeta.primary_account) ||
      Array.from(dnaProfiles.values())[0],
    [dnaProfiles, currentScenarioMeta]
  );

  // ============================================================================
  // 1. FRAUD SCENARIO SIMULATOR (FraudMesh Intelligence Lab)
  // ============================================================================
  if (activePage === 'scenario-simulator') {
    return (
      <div className="space-y-6">
        {/* Title Banner */}
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-blue-600 font-semibold">
              INTERACTIVE SCENARIO SIMULATOR · REAL-TIME PIPELINE DEMONSTRATION
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
              FraudMesh Intelligence Lab
            </h1>
            <p className="text-xs text-slate-700 mt-0.5">
              Watch Financial Crime Detection in Action — Select any scenario to replay chronological
              money movement, graph updates, Digital DNA shifts, and ARTT path discovery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                executeARTT({ startAccountId: currentScenarioMeta.primary_account });
                navigateTo('artt-traversal', {
                  accountId: currentScenarioMeta.primary_account,
                });
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded whitespace-nowrap shrink-0"
            >
              Run ARTT on {currentScenarioMeta.primary_account}
            </button>
            <button
              type="button"
              onClick={() =>
                navigateTo('risk-intelligence', {
                  accountId: currentScenarioMeta.primary_account,
                  txId: revealedScenarioTxs[revealedScenarioTxs.length - 1]?.transaction_id,
                })
              }
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 text-amber-300 rounded whitespace-nowrap shrink-0"
            >
              Explain Risk
            </button>
            <button
              type="button"
              onClick={() =>
                navigateTo('ai-forensic-copilot', {
                  accountId: currentScenarioMeta.primary_account,
                })
              }
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 text-slate-900 rounded whitespace-nowrap shrink-0"
            >
              Open AI Forensic Copilot
            </button>
            {scenarioAlert && (
              <button
                type="button"
                onClick={() => {
                  const created = createCaseFromAlertAction(
                    scenarioAlert.alert_id,
                    'Meera Iyer (Senior Graph Forensic Analyst)',
                    `Escalated from FraudMesh Intelligence Lab (${currentScenarioMeta.title}).`
                  );
                  if (created) {
                    navigateTo('case-management', { caseId: created.case_id });
                  }
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
              >
                Create Investigation Case
              </button>
            )}
          </div>
        </div>

        {/* 6 Selectable Scenario Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {SIMULATION_SCENARIOS.map((sc) => {
            const isSelected = sc.id === currentScenarioMeta.id;
            return (
              <div
                key={sc.id}
                className={`border rounded-lg p-3.5 flex flex-col justify-between transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-cyan-500/10'
                    : 'border-slate-200 bg-slate-50 border border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-mono text-slate-500">
                    0{sc.number} · {sc.primary_account}
                  </div>
                  <h2 className="text-xs font-bold text-slate-900 mt-1">{sc.title}</h2>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sc.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSimScenario(sc.id);
                    setSelectedAccountId(sc.primary_account);
                    setHighlightedPath(sc.involved_accounts, []);
                    setSimStep(1);
                    setSimPlaying(true);
                  }}
                  className={`mt-3 w-full py-1.5 px-2.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-100 text-slate-800 hover:bg-blue-100 text-blue-700 border border-blue-200/80'
                  }`}
                >
                  Launch Simulation
                </button>
              </div>
            );
          })}
        </div>

        {/* Playback Controls Bar */}
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (simStep >= totalSimSteps) setSimStep(1);
                setSimPlaying(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {simStep > 0 && simStep < totalSimSteps ? 'Resume' : 'Start Simulation'}
            </button>

            <button
              type="button"
              onClick={() => setSimPlaying(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>

            <button
              type="button"
              onClick={() => {
                setSimPlaying(false);
                setSimStep((s) => Math.min(totalSimSteps, s + 1));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
            >
              <FastForward className="w-3.5 h-3.5" />
              Step (+1 Tx)
            </button>

            <button
              type="button"
              onClick={() => {
                setSimPlaying(false);
                setSimStep(totalSimSteps);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset / Show Complete
            </button>
          </div>

          {/* Timeline Scrubber & Speed Selector */}
          <div className="flex flex-wrap items-center gap-4 flex-1 max-w-md">
            <label
              htmlFor="sim-timeline-scrubber"
              className="text-xs font-mono text-slate-700 whitespace-nowrap"
            >
              Step {simStep}/{totalSimSteps}
            </label>
            <input
              id="sim-timeline-scrubber"
              type="range"
              min={1}
              max={Math.max(1, totalSimSteps)}
              value={simStep}
              onChange={(e) => {
                setSimPlaying(false);
                setSimStep(Number(e.target.value));
              }}
              className="flex-1 accent-blue-600"
            />
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono">
              {([1, 2, 4] as const).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setSimSpeed(sp)}
                  className={`px-2 py-0.5 rounded ${
                    simSpeed === sp ? 'bg-cyan-500/20 text-blue-600 font-semibold' : 'text-slate-500'
                  }`}
                >
                  {sp}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Workspace: Updating Graph (7 cols) + Live Event Feed & Telemetry (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <MoneyTrailGraph
              nodes={graphNodes.filter((n) =>
                currentScenarioMeta.involved_accounts.includes(n.id)
              )}
              edges={graphEdges.filter(
                (e) =>
                  (e.scenario_id === currentScenarioMeta.id &&
                    revealedScenarioTxs.some((t) => t.transaction_id === e.id)) ||
                  (currentScenarioMeta.involved_accounts.includes(e.source) &&
                    currentScenarioMeta.involved_accounts.includes(e.target) &&
                    revealedScenarioTxs.some((t) => t.transaction_id === e.id))
              )}
              selectedAccountId={currentScenarioMeta.primary_account}
              highlightedAccounts={currentScenarioMeta.involved_accounts}
              highlightedTxIds={revealedScenarioTxs.map((t) => t.transaction_id)}
              onSelectAccount={(accId) => setSelectedAccountId(accId)}
              height={460}
              compact
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Live Event Feed */}
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Live Pipeline Event Stream
                </h3>
                <span className="text-xs font-mono text-blue-600 font-semibold">
                  {revealedScenarioTxs.length} Active Transfers
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs font-mono">
                {liveFeedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-0.5"
                  >
                    <div
                      className={`font-semibold ${
                        ev.tone === 'rose'
                          ? 'text-rose-400'
                          : ev.tone === 'amber'
                          ? 'text-amber-400'
                          : ev.tone === 'emerald'
                          ? 'text-emerald-400'
                          : 'text-blue-600 font-semibold'
                      }`}
                    >
                      [{ev.tag}]
                    </div>
                    <div className="text-slate-700 font-sans">{ev.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Digital DNA & Triggered Detectors Quick Status */}
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Primary Account Digital DNA ({primaryDna.account_id})
                </span>
                <span className="font-mono font-bold text-rose-400">
                  Anomaly Score: {primaryDna.anomaly_score}/100
                </span>
              </div>
              <div className="text-slate-500">{primaryDna.summary_explanation}</div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">
                  Triggered: {currentScenarioMeta.what_detected.join(' · ')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    navigateTo('digital-dna', {
                      accountId: currentScenarioMeta.primary_account,
                    })
                  }
                  className="text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap shrink-0"
                >
                  Inspect Radar →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 6-Part Concept Explanation Panel */}
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-4">
          <div className="text-xs font-mono text-blue-600 font-semibold">
            SCENARIO FORENSIC BREAKDOWN · {currentScenarioMeta.title.toUpperCase()}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
              <h3 className="font-semibold text-slate-900">1. What happened?</h3>
              <p className="text-slate-700 leading-relaxed">{currentScenarioMeta.what_happened}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
              <h3 className="font-semibold text-slate-900">2. What did FraudMesh detect?</h3>
              <ul className="text-blue-600 font-semibold space-y-1">
                {currentScenarioMeta.what_detected.map((d) => (
                  <li key={d}>· {d}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
              <h3 className="font-semibold text-slate-900">3. Why is it suspicious?</h3>
              <p className="text-slate-700 leading-relaxed">{currentScenarioMeta.why_suspicious}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
              <h3 className="font-semibold text-slate-900">4. How did ARTT help?</h3>
              <p className="text-slate-700 leading-relaxed">{currentScenarioMeta.how_artt_helped}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
              <h3 className="font-semibold text-slate-900">5. How did Digital DNA help?</h3>
              <p className="text-slate-700 leading-relaxed">{currentScenarioMeta.how_dna_helped}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
              <h3 className="font-semibold text-slate-900">
                6. What should an investigator check next?
              </h3>
              <ul className="text-emerald-300 space-y-1">
                {currentScenarioMeta.next_checks.map((c) => (
                  <li key={c}>· {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. ALGORITHM VISUALIZATION (BFS vs DFS vs ARTT Comparison)
  // ============================================================================
  if (activePage === 'algorithm-visualization') {
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
          <div className="text-xs font-mono text-blue-600 font-semibold">
            GRAPH TRAVERSAL BENCHMARK · BFS VS. DFS VS. ARTT
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Algorithm Visualization — Why Priority-Queue Temporal Traversal Outperforms Uninformed Search
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-3">
            <div className="font-mono text-slate-500">UNINFORMED LEVEL ORDER</div>
            <h2 className="text-base font-bold text-slate-900">Breadth-First Search (BFS)</h2>
            <p className="text-slate-700 leading-relaxed">
              Expands every 1-hop neighbor equally regardless of transfer amount, risk score, or
              whether the outgoing transfer happened before the incoming transfer.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-1">
              <div>Temporal Chronology Check: None</div>
              <div>Risk Weighting: None (FIFO Queue)</div>
              <div className="text-amber-400">
                Result on ACC-050: Floods queue with routine low-risk vendor payments.
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-3">
            <div className="font-mono text-slate-500">UNINFORMED DEEP PLUNGE</div>
            <h2 className="text-base font-bold text-slate-900">Depth-First Search (DFS)</h2>
            <p className="text-slate-700 leading-relaxed">
              Follows a single arbitrary branch to maximum depth before backtracking, missing
              parallel split-and-merge conduits and violating chronological order.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-1">
              <div>Temporal Chronology Check: None</div>
              <div>Risk Weighting: None (LIFO Stack)</div>
              <div className="text-amber-400">
                Result on ACC-050: Misses parallel convergence at ACC-055.
              </div>
            </div>
          </div>

          <div className="border border-blue-600/50 rounded-lg bg-cyan-500/5 p-5 space-y-3">
            <div className="font-mono text-blue-600 font-semibold">FRAUDMESH CORE ALGORITHM</div>
            <h2 className="text-base font-bold text-slate-900">
              ARTT (Adaptive Risk-Aware Temporal Traverser)
            </h2>
            <p className="text-slate-700 leading-relaxed">
              Expands highest-risk candidate edges via a priority queue, enforcing chronological
              timestamps t(e_next) ≥ t(e_prev), amount continuity, and structural convergence.
            </p>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-1">
              <div className="text-emerald-400">Temporal Chronology Check: Enforced</div>
              <div className="text-blue-600 font-semibold">Priority Queue: 5-Factor Normalized Score</div>
              <div className="text-emerald-400">
                Result on ACC-050: Ranks all 4 Split-and-Merge conduits to ACC-055 first.
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('artt-traversal', { accountId: 'ACC-050' })}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold font-semibold rounded transition-colors whitespace-nowrap shrink-0"
            >
              Open Interactive ARTT Engine
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. MODEL COMPARISON
  // ============================================================================
  if (activePage === 'model-comparison') {
    return (
      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-amber-400">
              Synthetic demonstration evaluation – not real-world performance validation.
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Model Comparison — Rule-Based, Statistical ML, Tree Ensembles & Neural Networks
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('model-evaluation')}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
          >
            Adjust Thresholds in Evaluation Console →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modelEvaluations.map((m) => (
            <div
              key={m.model_id}
              className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 space-y-3 text-xs"
            >
              <div className="font-mono text-blue-600 font-semibold">{m.category}</div>
              <h2 className="text-base font-bold text-slate-900">{m.model_name}</h2>
              <p className="text-slate-500">{m.notes}</p>
              <div className="grid grid-cols-2 gap-2 font-mono pt-2 border-t border-slate-200">
                <div>Precision: {(m.precision * 100).toFixed(1)}%</div>
                <div>Recall: {(m.recall * 100).toFixed(1)}%</div>
                <div className="text-blue-600 font-semibold font-bold">
                  F1-Score: {(m.f1_score * 100).toFixed(1)}%
                </div>
                <div className="text-emerald-400">ROC-AUC: {m.roc_auc.toFixed(3)}</div>
                <div>FPR: {(m.fpr * 100).toFixed(2)}%</div>
                <div>
                  TP:{m.confusion_matrix.tp} / FP:{m.confusion_matrix.fp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. CONCEPT EXPLORER (All 14 Required Concepts)
  // ============================================================================
  if (activePage === 'concept-explorer') {
    const activeConcept = FOURTEEN_CONCEPTS[selectedConceptIndex] || FOURTEEN_CONCEPTS[0];

    return (
      <div className="space-y-6">
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
          <div className="text-xs font-mono text-blue-600 font-semibold">
            RESEARCH & EDUCATIONAL ENCYCLOPEDIA · 14 CORE ALGORITHMIC CONCEPTS
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            FraudMesh Concept Explorer — Theory, Formulas & Live Dataset Examples
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Columns: 14 Concepts List */}
          <div className="lg:col-span-5 border border-slate-200 rounded-2xl bg-white shadow-xs p-3 space-y-1.5 max-h-[580px] overflow-y-auto">
            {FOURTEEN_CONCEPTS.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedConceptIndex(idx)}
                className={`w-full text-left px-3.5 py-2.5 rounded text-xs font-medium transition-colors ${
                  selectedConceptIndex === idx
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 text-slate-800/70'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>

          {/* Right 7 Columns: Selected Concept Interactive Card */}
          <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-xs font-mono text-blue-600 font-semibold">
                CONCEPT {activeConcept.id} OF 14 · FRAUDMESH RESEARCH LAB
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{activeConcept.title}</h2>

              {activeConcept.formula && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-blue-600 font-semibold">
                  Formula / Invariant: {activeConcept.formula}
                </div>
              )}

              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-800">
                  Algorithmic Explanation
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {activeConcept.explanation}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                <h3 className="text-xs font-semibold text-emerald-400">
                  Live Example from Active Synthetic Dataset
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {activeConcept.datasetExample}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Interactive Concept Verification
              </span>
              <button
                type="button"
                onClick={() =>
                  navigateTo(activeConcept.targetPage, {
                    accountId: activeConcept.targetAccount || 'ACC-050',
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Try This Concept in Live Module
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 5. SYSTEM ARCHITECTURE VIEWER
  // ============================================================================
  const activeStage = ARCHITECTURE_STAGES[selectedArchStage] || ARCHITECTURE_STAGES[0];

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-blue-600 font-semibold">
            END-TO-END SYSTEM ARCHITECTURE & PIPELINE WALKTHROUGH
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            FraudMesh System Architecture Viewer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any architectural layer below to inspect its inputs, processing logic, outputs,
            and live synthetic dataset trace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setSelectedArchStage((prev) => (prev + 1) % ARCHITECTURE_STAGES.length)
            }
            className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold rounded whitespace-nowrap shrink-0"
          >
            Step Guided Pipeline Walkthrough ({selectedArchStage + 1}/8) →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Columns: Interactive 8-Stage Pipeline Stack */}
        <div className="lg:col-span-5 space-y-2">
          {ARCHITECTURE_STAGES.map((stage, idx) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => setSelectedArchStage(idx)}
              className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                selectedArchStage === idx
                  ? 'border-blue-600 bg-cyan-500/15'
                  : 'border-slate-200 bg-slate-50 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-slate-900">{stage.title}</div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">{stage.purpose}</div>
            </button>
          ))}
        </div>

        {/* Right 7 Columns: Component Specification Inspector */}
        <div className="lg:col-span-7 border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <div className="text-xs font-mono text-blue-600 font-semibold">
              ARCHITECTURAL LAYER SPECIFICATION · STAGE {selectedArchStage + 1} OF 8
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{activeStage.title}</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200">
              <div className="font-semibold text-slate-800">Purpose</div>
              <div className="text-slate-700 mt-1">{activeStage.purpose}</div>
            </div>
            <div className="p-3.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200">
              <div className="font-semibold text-slate-800">Inputs</div>
              <div className="text-slate-700 mt-1">{activeStage.inputs}</div>
            </div>
            <div className="p-3.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200">
              <div className="font-semibold text-slate-800">Processing Logic</div>
              <div className="text-slate-700 mt-1">{activeStage.logic}</div>
            </div>
            <div className="p-3.5 rounded bg-slate-50 border border-slate-200/80 border border-slate-200">
              <div className="font-semibold text-slate-800">Outputs & Connected Components</div>
              <div className="text-slate-700 mt-1">
                {activeStage.outputs} → <span className="text-blue-600 font-semibold">{activeStage.connected}</span>
              </div>
            </div>
            <div className="p-3.5 rounded bg-emerald-500/10 border border-emerald-500/30">
              <div className="font-semibold text-emerald-300">
                Live Example from Active Synthetic Dataset
              </div>
              <div className="text-slate-800 font-mono mt-1">{activeStage.example}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
