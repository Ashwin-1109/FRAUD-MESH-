import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Account,
  ARTTConfig,
  AuditEvent,
  CaseStatus,
  CopilotStructuredResponse,
  Customer,
  DigitalDNAProfile,
  FraudAlert,
  GraphEdge,
  GraphNode,
  InvestigationCase,
  ModelEvaluation,
  NavigationPage,
  RiskConfig,
  ScenarioId,
  Transaction,
  TraversalResult,
  UserRole,
  UserProfile,
  TransactionExplanation,
} from '../types/fraudmesh';
import {
  createCaseFromAlert,
  DEFAULT_ARTT_CONFIG,
  FraudMeshEngineState,
  initializeDefaultEngineState,
  recomputeFullPipeline,
  runARTT,
  validateAndProcessTransfer,
} from '../engine/pipeline';
import { parseTransactionsCSV } from '../engine/syntheticData';
import { formatINR } from '../engine/digitalDna';
import { normalizeFlexibleBankCSV } from '../engine/datasetForensics';

export const DEFAULT_PERSONAS: Record<UserRole, UserProfile> = {
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

export interface ToastNotice {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface NavigateOptions {
  accountId?: string;
  txId?: string;
  alertId?: string;
  caseId?: string;
  role?: UserRole;
  highlightAccounts?: string[];
  highlightTxIds?: string[];
}

interface FraudMeshContextValue extends FraudMeshEngineState {
  // Authentication & Persona
  isAuthenticated: boolean;
  currentUser: UserProfile;
  login: (role: UserRole, persona?: UserProfile) => void;
  logout: () => void;

  // Active Navigation & Role
  activePage: NavigationPage;
  activeRole: UserRole;
  activeCustomerAccountId: string;
  selectedAccountId: string;
  selectedTransactionId: string | null;
  selectedAlertId: string | null;
  selectedCaseId: string | null;
  highlightedPathAccounts: string[];
  highlightedPathTxIds: string[];
  arttConfig: ARTTConfig;
  latestArttResult: TraversalResult;
  mlThreshold: number;
  auditLog: AuditEvent[];
  theme: 'dark' | 'light';
  globalSearchQuery: string;
  toast: ToastNotice | null;
  activeSimScenario: ScenarioId;

  // Sherlock Holmes AI & Live Explainer
  isSherlockOpen: boolean;
  setIsSherlockOpen: (open: boolean) => void;
  sherlockPreloadQuery: string;
  openSherlockWithQuery: (q: string) => void;
  latestExplainedTx: TransactionExplanation | null;
  explainTransactionLive: (tx: Transaction) => Promise<TransactionExplanation>;
  clearExplainedTx: () => void;

  // Actions
  setActivePage: (page: NavigationPage) => void;
  navigateTo: (page: NavigationPage, opts?: NavigateOptions) => void;
  switchDemoRole: (role: UserRole) => void;
  setActiveCustomerAccountId: (accId: string) => void;
  setSelectedAccountId: (accId: string) => void;
  setSelectedTransactionId: (txId: string | null) => void;
  setSelectedAlertId: (alertId: string | null) => void;
  setSelectedCaseId: (caseId: string | null) => void;
  setHighlightedPath: (accounts: string[], txIds: string[]) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setGlobalSearchQuery: (q: string) => void;
  showToast: (title: string, description: string, type?: ToastNotice['type']) => void;
  clearToast: () => void;
  setActiveSimScenario: (scenario: ScenarioId) => void;

  // Pipeline mutations
  submitCustomerTransfer: (input: {
    senderAccountId: string;
    receiverAccountId: string;
    amount: number;
    transactionType: Transaction['transaction_type'];
    channel: Transaction['channel'];
    location?: string;
  }) => { ok: boolean; error?: string; transaction?: Transaction };
  reportSuspiciousActivity: (txId: string, customerComment: string) => void;
  addSyntheticAccount: (input: {
    holderName: string;
    accountType: Account['account_type'];
    branchCity: string;
    initialBalance: number;
    typicalAmount: number;
  }) => Account;
  generateOnDemandTransactions: (count: number, scenarioId?: ScenarioId) => void;
  importCSVTransactions: (
    csvText: string,
    isolateMode?: boolean
  ) => { valid: boolean; errors: string[]; count: number; transactions?: Transaction[] };
  resetDataset: () => void;
  executeARTT: (override?: Partial<ARTTConfig>) => TraversalResult;
  createCaseFromAlertAction: (
    alertId: string,
    investigator: string,
    note: string
  ) => InvestigationCase | null;
  createCustomCase: (input: {
    title: string;
    involvedAccounts: string[];
    linkedTxIds: string[];
    investigator: string;
    note: string;
  }) => InvestigationCase;
  updateCaseStatus: (caseId: string, newStatus: CaseStatus, rationale: string) => void;
  addCaseNote: (caseId: string, author: string, content: string) => void;
  attachCopilotSummaryToCase: (caseId: string, summary: CopilotStructuredResponse) => void;
  updateRiskThresholds: (config: RiskConfig) => void;
  updateMLThreshold: (threshold: number) => void;
  loadScenarioSimulationState: (scenarioId: ScenarioId, stepTransactions: Transaction[]) => void;
}

const FraudMeshContext = createContext<FraudMeshContextValue | null>(null);

export const FraudMeshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [engineState, setEngineState] = useState<FraudMeshEngineState>(() =>
    initializeDefaultEngineState()
  );

  // Check URL query parameter ?autostart=1 to open Executive Dashboard or Welcome
  const [activePage, setActivePage] = useState<NavigationPage>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'exec-dashboard';
    }
    return 'command-center';
  });

  // Authentication & Persona state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<UserRole>('INVESTIGATOR');
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_PERSONAS.INVESTIGATOR);

  // Sherlock Holmes AI state
  const [isSherlockOpen, setIsSherlockOpen] = useState<boolean>(false);
  const [sherlockPreloadQuery, setSherlockPreloadQuery] = useState<string>('');
  const [latestExplainedTx, setLatestExplainedTx] = useState<TransactionExplanation | null>(null);

  const [activeCustomerAccountId, setActiveCustomerAccountId] = useState<string>('ACC-001');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ACC-050');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>('TXN-1091');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(
    () => engineState.alerts[0]?.alert_id || null
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    () => engineState.cases[0]?.case_id || null
  );
  const [highlightedPathAccounts, setHighlightedPathAccounts] = useState<string[]>([
    'ACC-050',
    'ACC-051',
    'ACC-052',
    'ACC-053',
    'ACC-054',
    'ACC-055',
    'ACC-056',
  ]);
  const [highlightedPathTxIds, setHighlightedPathTxIds] = useState<string[]>([]);
  const [arttConfig, setArttConfig] = useState<ARTTConfig>(DEFAULT_ARTT_CONFIG);
  const [mlThreshold, setMlThreshold] = useState<number>(0.5);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [activeSimScenario, setActiveSimScenario] = useState<ScenarioId>('scenario_6_split_merge');

  const [auditLog, setAuditLog] = useState<AuditEvent[]>(() => [
    {
      event_id: 'AUD-1001',
      timestamp: '2026-10-22T18:00:00.000Z',
      actor_role: 'ADMIN',
      category: 'System',
      action: 'Synthetic Dataset Initialized',
      details: `Loaded ${engineState.accounts.length} synthetic accounts and ${engineState.transactions.length} transactions (Seed: 20261023).`,
    },
    {
      event_id: 'AUD-1002',
      timestamp: '2026-10-22T18:02:00.000Z',
      actor_role: 'INVESTIGATOR',
      category: 'Detection',
      action: '8 Pattern Detectors Executed',
      details: `Generated ${engineState.alerts.length} structured fraud alerts across Split, Mule, Circular, Velocity, and Split-and-Merge topologies.`,
    },
    {
      event_id: 'AUD-1003',
      timestamp: '2026-10-22T18:05:00.000Z',
      actor_role: 'INVESTIGATOR',
      category: 'ARTT',
      action: 'ARTT Traversal Completed',
      details: 'Executed priority-queue temporal traversal from ACC-050 across 4 parallel mule conduits.',
      related_id: 'ACC-050',
    },
  ]);

  const latestArttResult = useMemo(() => {
    return runARTT(
      arttConfig,
      engineState.accounts,
      engineState.transactions,
      engineState.dnaProfiles
    );
  }, [arttConfig, engineState.accounts, engineState.transactions, engineState.dnaProfiles]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  const logAudit = (
    category: AuditEvent['category'],
    action: string,
    details: string,
    relatedId?: string
  ) => {
    setAuditLog((prev) => [
      {
        event_id: `AUD-${1001 + prev.length}`,
        timestamp: new Date().toISOString(),
        actor_role: activeRole,
        category,
        action,
        details,
        related_id: relatedId,
      },
      ...prev,
    ]);
  };

  const showToast = (
    title: string,
    description: string,
    type: ToastNotice['type'] = 'info'
  ) => {
    const id = String(Date.now());
    setToast({ id, title, description, type });
  };

  const clearToast = () => setToast(null);

  const login = (role: UserRole, persona?: UserProfile) => {
    const p = persona || DEFAULT_PERSONAS[role];
    setCurrentUser(p);
    setActiveRole(role);
    setIsAuthenticated(true);
    if (role === 'ADMIN') {
      setActivePage('command-center');
    } else if (role === 'CUSTOMER') {
      setActivePage('customer-dashboard');
      if (p.accountId) setActiveCustomerAccountId(p.accountId);
    } else if (role === 'INVESTIGATOR') {
      setActivePage('money-trail-explorer');
    } else {
      setActivePage('command-center');
    }
    showToast(`Authenticated as ${p.name}`, `Welcome to ${p.roleTitle} workspace.`, 'success');
  };

  const logout = () => {
    setIsAuthenticated(false);
    showToast('Signed Out', 'Returned to role authentication screen.', 'info');
  };

  const clearExplainedTx = () => setLatestExplainedTx(null);

  const openSherlockWithQuery = (q: string) => {
    setSherlockPreloadQuery(q);
    setIsSherlockOpen(true);
  };

  const explainTransactionLive = async (tx: Transaction): Promise<TransactionExplanation> => {
    const sender = engineState.accounts.find((a) => a.account_id === tx.sender_account_id);
    const receiver = engineState.accounts.find((a) => a.account_id === tx.receiver_account_id);
    const relatedAlerts = engineState.alerts.filter((a) =>
      a.transaction_ids.includes(tx.transaction_id)
    );

    const isAnomalous = tx.risk_score >= 60 || tx.detected_patterns.length > 0;
    const instantExp: TransactionExplanation = {
      transaction_id: tx.transaction_id,
      deduction_title: isAnomalous
        ? `⚡ Fast Brief: Suspicious Transfer (${formatINR(tx.amount)})`
        : `⚡ Fast Brief: Routine Transfer (${formatINR(tx.amount)})`,
      verdict: isAnomalous ? 'HIGH_RISK_ANOMALY' : 'LEGITIMATE_NORMAL',
      sherlock_observation: isAnomalous
        ? `“Instant Deduction: ${tx.sender_account_id} → ${tx.receiver_account_id} (${formatINR(
            tx.amount
          )}) scored ${tx.risk_score}/100 due to ${
            tx.detected_patterns.join(', ') || 'structural velocity & amount anomaly'
          }.”`
        : `“Elementary! ${tx.sender_account_id} → ${tx.receiver_account_id} (${formatINR(
            tx.amount
          )}) conforms to normal historical Digital DNA baselines.”`,
      why_flagged_or_cleared:
        isAnomalous && tx.risk_reasons.length > 0
          ? tx.risk_reasons
          : isAnomalous
          ? [
              `Amount ${formatINR(tx.amount)} triggers structuring / velocity thresholds.`,
              `Channel ${tx.channel} (${tx.transaction_type}) shows rapid pass-through behavior.`,
            ]
          : ['Standard transaction volume', 'Established counterparty', 'Regular circadian window'],
      network_linkage_analysis: isAnomalous
        ? `Connected to active risk cluster involving ${tx.sender_account_id} and ${tx.receiver_account_id}.`
        : 'Normal bilateral path with zero cycle or mule involvement.',
      recommended_action: isAnomalous
        ? `Hold settlement, inspect ${tx.receiver_account_id} KYC, and trace via ARTT.`
        : 'Permit settlement under standard surveillance.',
      cited_entities: [tx.transaction_id, tx.sender_account_id, tx.receiver_account_id],
      analyzed_at: new Date().toISOString(),
    };

    // Show instant brief immediately (0ms perceived latency)
    setLatestExplainedTx(instantExp);

    try {
      const res = await fetch('/api/sherlock/explain-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: tx,
          senderAccount: sender,
          receiverAccount: receiver,
          alerts: relatedAlerts,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const explanation: TransactionExplanation = {
          transaction_id: tx.transaction_id,
          deduction_title: data.deduction_title || instantExp.deduction_title,
          verdict: data.verdict || instantExp.verdict,
          sherlock_observation: data.sherlock_observation || instantExp.sherlock_observation,
          why_flagged_or_cleared:
            Array.isArray(data.why_flagged_or_cleared) && data.why_flagged_or_cleared.length > 0
              ? data.why_flagged_or_cleared
              : instantExp.why_flagged_or_cleared,
          network_linkage_analysis:
            data.network_linkage_analysis || instantExp.network_linkage_analysis,
          recommended_action: data.recommended_action || instantExp.recommended_action,
          cited_entities: data.cited_entities || instantExp.cited_entities,
          analyzed_at: new Date().toISOString(),
        };
        setLatestExplainedTx(explanation);
        return explanation;
      }
    } catch {
      // keep instantExp displayed
    }

    return instantExp;
  };

  const navigateTo = (page: NavigationPage, opts?: NavigateOptions) => {
    if (opts?.role) {
      setActiveRole(opts.role);
      setCurrentUser(DEFAULT_PERSONAS[opts.role]);
    }
    if (opts?.accountId) {
      setSelectedAccountId(opts.accountId);
      setArttConfig((prev) => ({ ...prev, startAccountId: opts.accountId! }));
    }
    if (opts?.txId !== undefined) setSelectedTransactionId(opts.txId);
    if (opts?.alertId !== undefined) setSelectedAlertId(opts.alertId);
    if (opts?.caseId !== undefined) setSelectedCaseId(opts.caseId);
    if (opts?.highlightAccounts) setHighlightedPathAccounts(opts.highlightAccounts);
    if (opts?.highlightTxIds) setHighlightedPathTxIds(opts.highlightTxIds);
    setActivePage(page);
  };

  const switchDemoRole = (role: UserRole) => {
    setActiveRole(role);
    setCurrentUser(DEFAULT_PERSONAS[role]);
    if (role === 'ADMIN') {
      setActivePage('command-center');
    } else if (role === 'CUSTOMER') {
      setActivePage('customer-dashboard');
      setActiveCustomerAccountId('ACC-001');
    } else if (role === 'INVESTIGATOR') {
      setActivePage('money-trail-explorer');
    } else {
      setActivePage('command-center');
    }
    showToast(
      `Switched to ${DEFAULT_PERSONAS[role].roleTitle}`,
      'Active workspace tailored to selected role privileges.',
      'info'
    );
  };

  const setHighlightedPath = (accounts: string[], txIds: string[]) => {
    setHighlightedPathAccounts(accounts);
    setHighlightedPathTxIds(txIds);
  };

  const submitCustomerTransfer: FraudMeshContextValue['submitCustomerTransfer'] = (input) => {
    const res = validateAndProcessTransfer(engineState, input);
    if (!res.ok || !res.nextState || !res.newTransaction) {
      showToast('Transfer Validation Failed', res.error || 'Invalid transfer parameters.', 'error');
      return { ok: false, error: res.error };
    }

    setEngineState(res.nextState);
    setSelectedAccountId(input.senderAccountId);
    setSelectedTransactionId(res.newTransaction.transaction_id);
    logAudit(
      'Transaction',
      'New Transfer Processed',
      `${res.newTransaction.transaction_id}: ₹${input.amount.toLocaleString('en-IN')} from ${input.senderAccountId} to ${input.receiverAccountId} (Risk Score: ${res.newTransaction.risk_score}/100)`,
      res.newTransaction.transaction_id
    );
    showToast(
      'Transfer Processed Across Pipeline',
      `Transaction ${res.newTransaction.transaction_id} (₹${input.amount.toLocaleString('en-IN')}) scored ${res.newTransaction.risk_score}/100 (${res.newTransaction.risk_level} Risk). Graph and Digital DNA updated.`,
      res.newTransaction.risk_level === 'High' ? 'warning' : 'success'
    );
    // Auto-trigger Sherlock Holmes deductive explanation for the new transfer
    explainTransactionLive(res.newTransaction);
    return { ok: true, transaction: res.newTransaction };
  };

  const reportSuspiciousActivity = (txId: string, customerComment: string) => {
    const tx = engineState.transactions.find((t) => t.transaction_id === txId);
    if (!tx) return;

    const updatedTxs = engineState.transactions.map((t) =>
      t.transaction_id === txId
        ? {
            ...t,
            status: 'Reported by Customer' as const,
            risk_reasons: [
              ...t.risk_reasons,
              `Customer reported suspicious activity: "${customerComment}"`,
            ],
          }
        : t
    );

    const updatedCustomers = engineState.customers.map((c) => {
      if (c.account_id === tx.sender_account_id || c.account_id === activeCustomerAccountId) {
        return {
          ...c,
          security_notifications: [
            {
              id: `NOTIF-REP-${Date.now()}`,
              timestamp: new Date().toISOString(),
              title: `Review Item Opened for ${txId}`,
              description: `Your report ("${customerComment}") has been queued for Fraud Investigator review without automatically labeling the transaction as confirmed fraud.`,
              severity: 'Medium' as const,
              related_tx_id: txId,
              acknowledged: false,
              reported_by_customer: true,
            },
            ...c.security_notifications,
          ],
        };
      }
      return c;
    });

    // Create a review case item for the investigator without automatically labeling as confirmed fraud
    const reviewCase: InvestigationCase = {
      case_id: `CASE-CUST-${101 + engineState.cases.length}`,
      title: `Customer Inquiry: ${txId} (${tx.sender_account_id} → ${tx.receiver_account_id})`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'Open',
      assigned_investigator: 'Unassigned Review Queue',
      source_alert_ids: [],
      involved_accounts: [tx.sender_account_id, tx.receiver_account_id],
      linked_transaction_ids: [txId],
      risk_score: Math.max(tx.risk_score, 48),
      risk_level: tx.risk_score >= 70 ? 'High' : 'Medium',
      detected_indicators: ['Customer-Reported Activity Review (Unconfirmed)'],
      customer_reported: true,
      notes: [
        {
          note_id: `NOTE-CUST-${Date.now()}`,
          author: `Customer (${tx.sender_account_id})`,
          timestamp: new Date().toISOString(),
          content: `Customer report statement: "${customerComment}". Pending investigator verification.`,
        },
      ],
      decision_history: [
        {
          id: `DEC-CUST-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'Customer Portal',
          previous_status: 'Created',
          new_status: 'Open',
          rationale: 'Customer submitted suspicious activity review request.',
        },
      ],
    };

    const nextState = recomputeFullPipeline(
      engineState.accounts,
      updatedCustomers,
      updatedTxs,
      [reviewCase, ...engineState.cases],
      engineState.riskConfig,
      mlThreshold
    );
    setEngineState(nextState);
    logAudit(
      'Case',
      'Customer Activity Report Logged',
      `Review item ${reviewCase.case_id} created for transaction ${txId}.`,
      reviewCase.case_id
    );
    showToast(
      'Suspicious Activity Report Logged',
      `Review case ${reviewCase.case_id} queued for investigator triage.`,
      'info'
    );
  };

  const addSyntheticAccount: FraudMeshContextValue['addSyntheticAccount'] = (input) => {
    const newId = `ACC-${String(engineState.accounts.length + 1).padStart(3, '0')}`;
    const newAcc: Account = {
      account_id: newId,
      holder_name: input.holderName.trim() || `Synthetic Holder ${newId}`,
      account_type: input.accountType,
      account_age_days: 45,
      branch_city: input.branchCity || 'Mumbai, MH',
      kyc_tier: 'Standard KYC',
      balance_inr: Math.max(10000, input.initialBalance),
      historical_tx_count: 5,
      typical_tx_amount: Math.max(1000, input.typicalAmount),
      activity_frequency_per_day: 1.2,
      baseline: {
        typicalAmount: Math.max(1000, input.typicalAmount),
        amountStdDev: Math.round(Math.max(1000, input.typicalAmount) * 0.3),
        dailyFrequency: 1.2,
        activeHoursStart: 9,
        activeHoursEnd: 20,
        uniqueCounterparties: 3,
        avgIntervalHours: 16,
        inOutRatio: 1.0,
        newBeneficiaryRate: 0.15,
        repeatedPatternRate: 0.1,
        sampleSize: 5,
      },
      risk_score: 15,
      risk_level: 'Low',
      risk_status: 'Normal',
      flagged_reasons: [],
      primary_scenario: 'scenario_1_normal',
    };

    const nextState = recomputeFullPipeline(
      [...engineState.accounts, newAcc],
      engineState.customers,
      engineState.transactions,
      engineState.cases,
      engineState.riskConfig,
      mlThreshold
    );
    setEngineState(nextState);
    logAudit('System', 'Synthetic Account Created', `Added account ${newId} (${newAcc.holder_name}).`, newId);
    showToast('Account Added', `Created synthetic account ${newId} (${newAcc.holder_name}).`, 'success');
    return newAcc;
  };

  const generateOnDemandTransactions = (count: number, scenarioId: ScenarioId = 'scenario_1_normal') => {
    const safeCount = Math.max(1, Math.min(25, count));
    const newTxs: Transaction[] = [];
    const baseNum = engineState.transactions.length + 2000;

    for (let i = 0; i < safeCount; i++) {
      const txId = `TXN-GEN-${baseNum + i}`;
      const isAnomalous = scenarioId !== 'scenario_1_normal';
      const sender = isAnomalous
        ? engineState.accounts.find((a) => a.account_id === 'ACC-050') || engineState.accounts[0]
        : engineState.accounts[i % engineState.accounts.length];
      const receiver = isAnomalous
        ? engineState.accounts.find((a) => a.account_id === `ACC-05${(i % 4) + 1}`) || engineState.accounts[1]
        : engineState.accounts[(i + 7) % engineState.accounts.length];

      const amount = isAnomalous ? 49200 + (i % 5) * 150 : sender.typical_tx_amount;

      newTxs.push({
        transaction_id: txId,
        sender_account_id: sender.account_id,
        receiver_account_id: receiver.account_id,
        amount,
        currency: 'INR',
        timestamp: new Date(Date.now() + i * 60000).toISOString(),
        transaction_type: isAnomalous ? 'IMPS' : 'UPI',
        channel: isAnomalous ? 'API Gateway' : 'Mobile App',
        status: isAnomalous ? 'Flagged' : 'Completed',
        location: sender.branch_city,
        device_id: `DEV-GEN-${i + 1}`,
        risk_score: isAnomalous ? 82 : 14,
        risk_level: isAnomalous ? 'High' : 'Low',
        detected_patterns: isAnomalous ? ['Transaction Splitting', 'Behavioral Deviation'] : [],
        risk_reasons: isAnomalous
          ? ['On-demand synthetic pattern injection']
          : ['On-demand routine synthetic transfer'],
        scenario_id: scenarioId,
        ground_truth_label: isAnomalous ? 1 : 0,
      });
    }

    const nextState = recomputeFullPipeline(
      engineState.accounts,
      engineState.customers,
      [...engineState.transactions, ...newTxs],
      engineState.cases,
      engineState.riskConfig,
      mlThreshold
    );
    setEngineState(nextState);
    logAudit(
      'Transaction',
      'Generated Synthetic Batch',
      `Appended ${safeCount} transactions (${scenarioId}) and recomputed graph & Digital DNA.`
    );
    showToast(
      'Synthetic Transactions Generated',
      `Added ${safeCount} transaction(s) and updated graph metrics, Digital DNA, and alerts.`,
      'success'
    );
  };

  const importCSVTransactions = (csvText: string, isolateMode = false) => {
    const normalized = normalizeFlexibleBankCSV(csvText);
    const parsed = parseTransactionsCSV(normalized);
    if (!parsed.valid) {
      showToast('CSV Validation Failed', parsed.errors[0] || 'Malformed CSV.', 'error');
      return { valid: false, errors: parsed.errors, count: 0 };
    }

    const baseAccounts = isolateMode ? [] : engineState.accounts;
    const existingIds = new Set(baseAccounts.map((a) => a.account_id));
    const newAccountsToCreate: Account[] = [];

    parsed.transactions.forEach((tx) => {
      [tx.sender_account_id, tx.receiver_account_id].forEach((accId) => {
        if (!existingIds.has(accId)) {
          existingIds.add(accId);
          const matchedExisting = engineState.accounts.find((a) => a.account_id === accId);
          if (matchedExisting) {
            newAccountsToCreate.push(matchedExisting);
          } else {
            newAccountsToCreate.push({
              account_id: accId,
              holder_name: 'Account ' + accId,
              account_type: 'Current',
              account_age_days: 90,
              branch_city: tx.location || 'Mumbai, MH',
              kyc_tier: 'Standard KYC',
              balance_inr: 250000,
              historical_tx_count: 6,
              typical_tx_amount: Math.max(5000, Math.round(tx.amount * 0.45)),
              activity_frequency_per_day: 1.5,
              baseline: {
                typicalAmount: Math.max(5000, Math.round(tx.amount * 0.45)),
                amountStdDev: Math.max(1500, Math.round(tx.amount * 0.15)),
                dailyFrequency: 1.5,
                activeHoursStart: 9,
                activeHoursEnd: 21,
                uniqueCounterparties: 3,
                avgIntervalHours: 12,
                inOutRatio: 1.0,
                newBeneficiaryRate: 0.15,
                repeatedPatternRate: 0.1,
                sampleSize: 6,
              },
              risk_score: 20,
              risk_level: 'Low',
              risk_status: 'Normal',
              flagged_reasons: [],
              primary_scenario: 'scenario_1_normal',
            });
          }
        }
      });
    });

    const allAccounts = [...baseAccounts, ...newAccountsToCreate];
    const targetTransactions = isolateMode
      ? parsed.transactions
      : [...engineState.transactions, ...parsed.transactions];

    const nextState = recomputeFullPipeline(
      allAccounts,
      engineState.customers,
      targetTransactions,
      engineState.cases,
      engineState.riskConfig,
      mlThreshold
    );
    setEngineState(nextState);

    // Highlight newly imported accounts and transactions in the D3 Money Trail Graph
    const importedAccIds = Array.from(
      new Set(parsed.transactions.flatMap((t) => [t.sender_account_id, t.receiver_account_id]))
    );
    const importedTxIds = parsed.transactions.map((t) => t.transaction_id);

    setHighlightedPathAccounts(importedAccIds);
    setHighlightedPathTxIds(importedTxIds);
    if (importedAccIds.length > 0) {
      setSelectedAccountId(importedAccIds[0]);
    }
    if (importedTxIds.length > 0) {
      setSelectedTransactionId(importedTxIds[0]);
    }

    logAudit(
      'CSV',
      'Imported CSV Transactions',
      'Validated and imported ' + parsed.transactions.length + ' transactions into active graph.'
    );
    showToast(
      'Dataset Ingested & Graph Computed',
      'Imported ' + parsed.transactions.length + ' transactions into graph.',
      'success'
    );
    // Auto-explain the most prominent/flagged transaction in the newly ingested dataset
    const flaggedOrFirst =
      parsed.transactions.find((t) => t.risk_score >= 60) || parsed.transactions[0];
    if (flaggedOrFirst) {
      explainTransactionLive(flaggedOrFirst);
    }

    return { valid: true, errors: [], count: parsed.transactions.length };
  };

  const resetDataset = () => {
    const fresh = initializeDefaultEngineState();
    setEngineState(fresh);
    setSelectedAccountId('ACC-050');
    setSelectedAlertId(fresh.alerts[0]?.alert_id || null);
    setSelectedCaseId(fresh.cases[0]?.case_id || null);
    logAudit('System', 'Dataset Reset', 'Restored reproducible seed dataset (Seed: 20261023).');
    showToast('Dataset Reset', 'Restored initial reproducible synthetic banking dataset.', 'info');
  };

  const executeARTT = (override?: Partial<ARTTConfig>) => {
    const nextConfig: ARTTConfig = {
      ...arttConfig,
      ...override,
      weights: {
        ...arttConfig.weights,
        ...(override?.weights || {}),
      },
    };
    setArttConfig(nextConfig);
    const result = runARTT(
      nextConfig,
      engineState.accounts,
      engineState.transactions,
      engineState.dnaProfiles
    );
    if (result.candidate_paths.length > 0) {
      setHighlightedPathAccounts(result.candidate_paths[0].accounts);
      setHighlightedPathTxIds(result.candidate_paths[0].transactions.map((t) => t.transaction_id));
    }
    logAudit(
      'ARTT',
      'ARTT Traversal Executed',
      `Ran ARTT from ${nextConfig.startAccountId} (depth ${nextConfig.maxDepth}, window ${nextConfig.timeWindowHours}h) -> ${result.candidate_paths.length} candidate path(s).`,
      nextConfig.startAccountId
    );
    return result;
  };

  const createCaseFromAlertAction = (
    alertId: string,
    investigator: string,
    note: string
  ): InvestigationCase | null => {
    const targetAlert = engineState.alerts.find((a) => a.alert_id === alertId);
    if (!targetAlert) return null;

    // Check if case already exists for this alert
    if (targetAlert.linked_case_id) {
      const existing = engineState.cases.find((c) => c.case_id === targetAlert.linked_case_id);
      if (existing) {
        setSelectedCaseId(existing.case_id);
        showToast(
          'Case Already Linked',
          `Opening linked investigation case ${existing.case_id}.`,
          'info'
        );
        return existing;
      }
    }

    const newCase = createCaseFromAlert(
      targetAlert,
      investigator,
      note,
      engineState.cases.length
    );

    const nextCases = [newCase, ...engineState.cases];
    const nextAlerts = engineState.alerts.map((a) =>
      a.alert_id === alertId
        ? { ...a, case_status: 'Case Created' as const, linked_case_id: newCase.case_id }
        : a
    );

    setEngineState((prev) => ({
      ...prev,
      alerts: nextAlerts,
      cases: nextCases,
    }));
    setSelectedCaseId(newCase.case_id);
    logAudit(
      'Case',
      'Investigation Case Created',
      `Created ${newCase.case_id} from alert ${alertId} (${targetAlert.detector_name}).`,
      newCase.case_id
    );
    showToast(
      'Investigation Case Created',
      `Case ${newCase.case_id} created with ${newCase.linked_transaction_ids.length} linked transaction evidence records.`,
      'success'
    );
    return newCase;
  };

  const createCustomCase: FraudMeshContextValue['createCustomCase'] = (input) => {
    const now = new Date().toISOString();
    const caseId = `CASE-2026-${101 + engineState.cases.length}`;
    const newCase: InvestigationCase = {
      case_id: caseId,
      title: input.title || `Forensic Investigation (${input.involvedAccounts.join(', ')})`,
      created_at: now,
      updated_at: now,
      status: 'Open',
      assigned_investigator: input.investigator || 'Meera Iyer (Senior Graph Forensic Analyst)',
      source_alert_ids: [],
      involved_accounts: input.involvedAccounts,
      linked_transaction_ids: input.linkedTxIds,
      risk_score: 86,
      risk_level: 'High',
      detected_indicators: ['Investigator Direct Escalation', 'ARTT Pathway Evidence'],
      notes: input.note
        ? [
            {
              note_id: `NOTE-${caseId}-1`,
              author: input.investigator || 'Meera Iyer',
              timestamp: now,
              content: input.note,
            },
          ]
        : [],
      decision_history: [
        {
          id: `DEC-${caseId}-1`,
          timestamp: now,
          actor: input.investigator || 'Meera Iyer',
          previous_status: 'Created',
          new_status: 'Open',
          rationale: 'Direct forensic escalation from investigation workspace.',
        },
      ],
    };

    setEngineState((prev) => ({
      ...prev,
      cases: [newCase, ...prev.cases],
    }));
    setSelectedCaseId(caseId);
    logAudit('Case', 'Custom Case Created', `Created ${caseId} for ${input.involvedAccounts.join(', ')}.`, caseId);
    showToast('Investigation Case Created', `Case ${caseId} initialized and opened.`, 'success');
    return newCase;
  };

  const updateCaseStatus = (caseId: string, newStatus: CaseStatus, rationale: string) => {
    const now = new Date().toISOString();
    setEngineState((prev) => ({
      ...prev,
      cases: prev.cases.map((c) =>
        c.case_id === caseId
          ? {
              ...c,
              status: newStatus,
              updated_at: now,
              decision_history: [
                ...c.decision_history,
                {
                  id: `DEC-${caseId}-${c.decision_history.length + 1}`,
                  timestamp: now,
                  actor: c.assigned_investigator,
                  previous_status: c.status,
                  new_status: newStatus,
                  rationale: rationale || `Status updated to ${newStatus}`,
                },
              ],
            }
          : c
      ),
    }));
    logAudit('Case', 'Case Status Updated', `${caseId} transitioned to "${newStatus}".`, caseId);
    showToast('Case Status Updated', `${caseId} is now "${newStatus}".`, 'success');
  };

  const addCaseNote = (caseId: string, author: string, content: string) => {
    if (!content.trim()) return;
    const now = new Date().toISOString();
    setEngineState((prev) => ({
      ...prev,
      cases: prev.cases.map((c) =>
        c.case_id === caseId
          ? {
              ...c,
              updated_at: now,
              notes: [
                ...c.notes,
                {
                  note_id: `NOTE-${caseId}-${c.notes.length + 1}`,
                  author: author || c.assigned_investigator,
                  timestamp: now,
                  content: content.trim(),
                },
              ],
            }
          : c
      ),
    }));
    showToast('Note Added', `Forensic note appended to ${caseId}.`, 'info');
  };

  const attachCopilotSummaryToCase = (caseId: string, summary: CopilotStructuredResponse) => {
    setEngineState((prev) => ({
      ...prev,
      cases: prev.cases.map((c) =>
        c.case_id === caseId
          ? {
              ...c,
              ai_summary: summary,
              updated_at: new Date().toISOString(),
            }
          : c
      ),
    }));
    showToast(
      'AI Forensic Summary Attached',
      `Attached evidence-grounded summary to case ${caseId}.`,
      'success'
    );
  };

  const updateRiskThresholds = (config: RiskConfig) => {
    const nextState = recomputeFullPipeline(
      engineState.accounts,
      engineState.customers,
      engineState.transactions,
      engineState.cases,
      config,
      mlThreshold
    );
    setEngineState(nextState);
    showToast(
      'Risk Bands Updated',
      `Recomputed scores using Low (0–${config.lowMax}), Medium (${config.lowMax + 1}–${config.mediumMax}), High (${config.mediumMax + 1}–100).`,
      'info'
    );
  };

  const updateMLThreshold = (threshold: number) => {
    setMlThreshold(threshold);
    const nextState = recomputeFullPipeline(
      engineState.accounts,
      engineState.customers,
      engineState.transactions,
      engineState.cases,
      engineState.riskConfig,
      threshold
    );
    setEngineState(nextState);
  };

  const loadScenarioSimulationState = (
    scenarioId: ScenarioId,
    stepTransactions: Transaction[]
  ) => {
    // Keep all non-scenario transactions + only the revealed stepTransactions for the active scenario
    const baseTxs = engineState.transactions.filter((t) => t.scenario_id !== scenarioId);
    const combinedTxs = [...baseTxs, ...stepTransactions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const nextState = recomputeFullPipeline(
      engineState.accounts,
      engineState.customers,
      combinedTxs,
      engineState.cases,
      engineState.riskConfig,
      mlThreshold
    );
    setEngineState(nextState);
  };

  return (
    <FraudMeshContext.Provider
      value={{
        ...engineState,
        isAuthenticated,
        currentUser,
        login,
        logout,
        isSherlockOpen,
        setIsSherlockOpen,
        sherlockPreloadQuery,
        openSherlockWithQuery,
        latestExplainedTx,
        explainTransactionLive,
        clearExplainedTx,
        activePage,
        activeRole,
        activeCustomerAccountId,
        selectedAccountId,
        selectedTransactionId,
        selectedAlertId,
        selectedCaseId,
        highlightedPathAccounts,
        highlightedPathTxIds,
        arttConfig,
        latestArttResult,
        mlThreshold,
        auditLog,
        theme,
        globalSearchQuery,
        toast,
        activeSimScenario,
        setActivePage,
        navigateTo,
        switchDemoRole,
        setActiveCustomerAccountId,
        setSelectedAccountId,
        setSelectedTransactionId,
        setSelectedAlertId,
        setSelectedCaseId,
        setHighlightedPath,
        setTheme,
        setGlobalSearchQuery,
        showToast,
        clearToast,
        setActiveSimScenario,
        submitCustomerTransfer,
        reportSuspiciousActivity,
        addSyntheticAccount,
        generateOnDemandTransactions,
        importCSVTransactions,
        resetDataset,
        executeARTT,
        createCaseFromAlertAction,
        createCustomCase,
        updateCaseStatus,
        addCaseNote,
        attachCopilotSummaryToCase,
        updateRiskThresholds,
        updateMLThreshold,
        loadScenarioSimulationState,
      }}
    >
      {children}
    </FraudMeshContext.Provider>
  );
};

export function useFraudMesh(): FraudMeshContextValue {
  const ctx = useContext(FraudMeshContext);
  if (!ctx) {
    throw new Error('useFraudMesh must be used inside FraudMeshProvider');
  }
  return ctx;
}
