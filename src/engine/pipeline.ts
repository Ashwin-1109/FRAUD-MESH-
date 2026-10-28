import {
  Account,
  ARTTConfig,
  Customer,
  DigitalDNAProfile,
  FraudAlert,
  GraphEdge,
  GraphNode,
  InvestigationCase,
  ModelEvaluation,
  RiskConfig,
  Transaction,
  TraversalResult,
} from '../types/fraudmesh';
import { computeDigitalDNAForAccount } from './digitalDna';
import { buildTransactionGraph, runARTT } from './graphEngine';
import { trainAndEvaluateModels } from './mlModels';
import {
  evaluateTransactionRisk,
  getRiskLevel,
  runFraudPatternDetectors,
} from './riskAndDetectors';
import { generateSyntheticDataset } from './syntheticData';

export interface FraudMeshEngineState {
  accounts: Account[];
  customers: Customer[];
  transactions: Transaction[];
  dnaProfiles: Map<string, DigitalDNAProfile>;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  detectedCycles: string[][];
  alerts: FraudAlert[];
  cases: InvestigationCase[];
  modelEvaluations: ModelEvaluation[];
  riskConfig: RiskConfig;
}

export const DEFAULT_ARTT_CONFIG: ARTTConfig = {
  startAccountId: 'ACC-050',
  maxDepth: 4,
  timeWindowHours: 72,
  minRiskThreshold: 40,
  maxPaths: 6,
  weights: {
    transactionAnomaly: 0.3,
    temporalVelocity: 0.25,
    structuralPattern: 0.2,
    counterpartyRisk: 0.15,
    behavioralNovelty: 0.1,
  },
};

export function recomputeFullPipeline(
  accounts: Account[],
  customers: Customer[],
  transactions: Transaction[],
  existingCases: InvestigationCase[] = [],
  riskConfig: RiskConfig = { lowMax: 34, mediumMax: 69 },
  mlThreshold = 0.5
): FraudMeshEngineState {
  // 1. Compute Digital DNA for all accounts
  const dnaProfiles = new Map<string, DigitalDNAProfile>();
  accounts.forEach((acc) => {
    dnaProfiles.set(acc.account_id, computeDigitalDNAForAccount(acc, transactions));
  });

  // 2. Build Graph & compute structural metrics + cycle detection
  const { nodes: initialNodes, cycles } = buildTransactionGraph(accounts, transactions);
  const nodeMap = new Map<string, GraphNode>();
  initialNodes.forEach((n) => nodeMap.set(n.id, n));

  const accountMap = new Map<string, Account>();
  accounts.forEach((a) => accountMap.set(a.account_id, a));

  // 3. Evaluate risk score for each transaction & enrich patterns
  const updatedTransactions = transactions.map((tx) => {
    const sender = accountMap.get(tx.sender_account_id);
    const receiver = accountMap.get(tx.receiver_account_id);
    const senderDna = dnaProfiles.get(tx.sender_account_id);
    const assessment = evaluateTransactionRisk(
      tx,
      sender,
      receiver,
      senderDna,
      nodeMap,
      riskConfig
    );

    const patterns = new Set(tx.detected_patterns);
    if (assessment.risk_score >= 70 && patterns.size === 0) {
      patterns.add('Behavioral Deviation');
    }

    return {
      ...tx,
      risk_score: assessment.risk_score,
      risk_level: assessment.risk_level,
      detected_patterns: Array.from(patterns),
    };
  });

  // 4. Run all 8 Fraud Pattern Detectors
  const rawAlerts = runFraudPatternDetectors(
    accounts,
    updatedTransactions,
    dnaProfiles,
    cycles,
    riskConfig
  );

  // Preserve case links on alerts if cases already exist
  const caseByAlertId = new Map<string, string>();
  existingCases.forEach((c) => {
    c.source_alert_ids.forEach((aid) => caseByAlertId.set(aid, c.case_id));
  });

  const alerts: FraudAlert[] = rawAlerts.map((a) => {
    const linkedCase = caseByAlertId.get(a.alert_id);
    return linkedCase
      ? { ...a, case_status: 'Case Created', linked_case_id: linkedCase }
      : a;
  });

  // 5. Update Account risk scores based on alerts, DNA, and transaction involvement
  const alertsByAccount = new Map<string, FraudAlert[]>();
  alerts.forEach((al) => {
    al.involved_accounts.forEach((accId) => {
      if (!alertsByAccount.has(accId)) alertsByAccount.set(accId, []);
      alertsByAccount.get(accId)!.push(al);
    });
  });

  const updatedAccounts: Account[] = accounts.map((acc) => {
    const accAlerts = alertsByAccount.get(acc.account_id) || [];
    const dna = dnaProfiles.get(acc.account_id);
    const maxAlertScore =
      accAlerts.length > 0 ? Math.max(...accAlerts.map((a) => a.risk_score)) : 0;
    const dnaScore = dna ? dna.anomaly_score : 12;

    const combinedScore = Math.max(
      10,
      Math.min(
        100,
        maxAlertScore > 0
          ? Math.round(maxAlertScore * 0.75 + dnaScore * 0.25)
          : Math.round(dnaScore * 0.75)
      )
    );
    const riskLevel = getRiskLevel(combinedScore, riskConfig);
    const reasons = Array.from(
      new Set([
        ...accAlerts.map((a) => a.detector_name),
        ...(dna && dna.unusual_features.length > 0 ? [dna.unusual_features[0]] : []),
      ])
    );

    const status: Account['risk_status'] =
      existingCases.some((c) => c.involved_accounts.includes(acc.account_id))
        ? 'Under Investigation'
        : riskLevel === 'High'
        ? 'Elevated Risk'
        : riskLevel === 'Medium'
        ? 'Watchlist'
        : 'Normal';

    return {
      ...acc,
      risk_score: combinedScore,
      risk_level: riskLevel,
      risk_status: status,
      flagged_reasons: reasons,
    };
  });

  // 6. Rebuild final graph with updated account & edge risk scores
  const finalGraph = buildTransactionGraph(updatedAccounts, updatedTransactions);
  const finalNodeMap = new Map<string, GraphNode>();
  finalGraph.nodes.forEach((n) => finalNodeMap.set(n.id, n));

  // 7. Train & evaluate ML models
  const modelEvaluations = trainAndEvaluateModels(
    updatedTransactions,
    updatedAccounts,
    dnaProfiles,
    finalNodeMap,
    mlThreshold
  );

  // 8. Seed initial demonstration Investigation Cases if none provided
  let cases = existingCases;
  if (cases.length === 0 && alerts.length > 0) {
    const smAlert = alerts.find((a) => a.detector_id === 'DET-SPLIT-MERGE') || alerts[0];
    const cycleAlert = alerts.find((a) => a.detector_id === 'DET-CYCLE');

    cases = [
      {
        case_id: 'CASE-2026-101',
        title: `Split-and-Merge Layering Investigation (${smAlert.involved_accounts[0]} → ${smAlert.involved_accounts[smAlert.involved_accounts.length - 1]})`,
        created_at: '2026-10-22T18:10:00.000Z',
        updated_at: '2026-10-22T19:00:00.000Z',
        status: 'Under Review',
        assigned_investigator: 'Meera Iyer (Senior Graph Forensic Analyst)',
        source_alert_ids: [smAlert.alert_id],
        involved_accounts: smAlert.involved_accounts,
        linked_transaction_ids: smAlert.transaction_ids,
        risk_score: smAlert.risk_score,
        risk_level: smAlert.risk_level,
        detected_indicators: [
          'Split-and-Merge Structures',
          'Multi-Hop Suspicious Networks',
          'Rapid Pass-Through',
        ],
        notes: [
          {
            note_id: 'NOTE-101-1',
            author: 'Meera Iyer (Senior Graph Forensic Analyst)',
            timestamp: '2026-10-22T18:15:00.000Z',
            content:
              'ARTT traversal confirmed 4 parallel branches from ACC-050 converging into ACC-055 within 41 minutes before outbound RTGS settlement to ACC-056.',
          },
        ],
        decision_history: [
          {
            id: 'DEC-101-1',
            timestamp: '2026-10-22T18:10:00.000Z',
            actor: 'System Alert Escalation',
            previous_status: 'Created',
            new_status: 'Open',
            rationale: `Initialized from alert ${smAlert.alert_id}`,
          },
          {
            id: 'DEC-101-2',
            timestamp: '2026-10-22T18:20:00.000Z',
            actor: 'Meera Iyer',
            previous_status: 'Open',
            new_status: 'Under Review',
            rationale: 'Assigned for multi-hop beneficiary KYC verification.',
          },
        ],
      },
    ];

    if (cycleAlert) {
      cases.push({
        case_id: 'CASE-2026-102',
        title: `Circular Wash Transfer Loop (${cycleAlert.involved_accounts.join(' → ')})`,
        created_at: '2026-10-22T16:40:00.000Z',
        updated_at: '2026-10-22T17:15:00.000Z',
        status: 'Open',
        assigned_investigator: 'Siddharth Rao (AML Investigator)',
        source_alert_ids: [cycleAlert.alert_id],
        involved_accounts: cycleAlert.involved_accounts,
        linked_transaction_ids: cycleAlert.transaction_ids,
        risk_score: cycleAlert.risk_score,
        risk_level: cycleAlert.risk_level,
        detected_indicators: ['Circular Movement', 'Rapid Pass-Through'],
        notes: [
          {
            note_id: 'NOTE-102-1',
            author: 'Siddharth Rao (AML Investigator)',
            timestamp: '2026-10-22T16:50:00.000Z',
            content:
              'Four corporate accounts rotated ₹4.85L back to originator ACC-031 within 78 minutes. Commercial invoice check pending.',
          },
        ],
        decision_history: [
          {
            id: 'DEC-102-1',
            timestamp: '2026-10-22T16:40:00.000Z',
            actor: 'Siddharth Rao',
            previous_status: 'Created',
            new_status: 'Open',
            rationale: `Created from cycle detection alert ${cycleAlert.alert_id}`,
          },
        ],
      });
    }

    // Mark those alerts as linked
    cases.forEach((c) => {
      c.source_alert_ids.forEach((aid) => {
        const idx = alerts.findIndex((a) => a.alert_id === aid);
        if (idx !== -1) {
          alerts[idx] = {
            ...alerts[idx],
            case_status: 'Case Created',
            linked_case_id: c.case_id,
          };
        }
      });
    });
  }

  return {
    accounts: updatedAccounts,
    customers,
    transactions: updatedTransactions,
    dnaProfiles,
    graphNodes: finalGraph.nodes,
    graphEdges: finalGraph.edges,
    detectedCycles: finalGraph.cycles,
    alerts,
    cases,
    modelEvaluations,
    riskConfig,
  };
}

export function createCaseFromAlert(
  alert: FraudAlert,
  investigatorName: string,
  initialNote: string,
  existingCasesCount: number
): InvestigationCase {
  const now = new Date().toISOString();
  const caseId = `CASE-2026-${101 + existingCasesCount}`;
  return {
    case_id: caseId,
    title: `${alert.detector_name} (${alert.involved_accounts.slice(0, 3).join(', ')})`,
    created_at: now,
    updated_at: now,
    status: 'Open',
    assigned_investigator: investigatorName || 'Meera Iyer (Senior Graph Forensic Analyst)',
    source_alert_ids: [alert.alert_id],
    involved_accounts: [...alert.involved_accounts],
    linked_transaction_ids: [...alert.transaction_ids],
    risk_score: alert.risk_score,
    risk_level: alert.risk_level,
    detected_indicators: [alert.detector_name, ...alert.evidence.slice(0, 1)],
    notes: initialNote
      ? [
          {
            note_id: `NOTE-${caseId}-1`,
            author: investigatorName || 'Meera Iyer',
            timestamp: now,
            content: initialNote,
          },
        ]
      : [],
    decision_history: [
      {
        id: `DEC-${caseId}-1`,
        timestamp: now,
        actor: investigatorName || 'Meera Iyer',
        previous_status: 'Created',
        new_status: 'Open',
        rationale: `Case initialized from alert ${alert.alert_id} preserving ${alert.transaction_ids.length} linked transaction record(s).`,
      },
    ],
  };
}

export function validateAndProcessTransfer(
  state: FraudMeshEngineState,
  input: {
    senderAccountId: string;
    receiverAccountId: string;
    amount: number;
    transactionType: Transaction['transaction_type'];
    channel: Transaction['channel'];
    location?: string;
  }
): {
  ok: boolean;
  error?: string;
  newTransaction?: Transaction;
  nextState?: FraudMeshEngineState;
} {
  const { senderAccountId, receiverAccountId, amount, transactionType, channel, location } = input;

  if (!senderAccountId || !receiverAccountId) {
    return { ok: false, error: 'Both sender and destination account IDs are required.' };
  }
  if (senderAccountId === receiverAccountId) {
    return { ok: false, error: 'Sender and destination accounts cannot be identical.' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Transfer amount must be a positive number greater than ₹0.' };
  }

  const sender = state.accounts.find((a) => a.account_id === senderAccountId);
  const receiver = state.accounts.find((a) => a.account_id === receiverAccountId);
  if (!sender) {
    return { ok: false, error: `Sender account "${senderAccountId}" does not exist.` };
  }
  if (!receiver) {
    return { ok: false, error: `Destination account "${receiverAccountId}" does not exist in the synthetic ledger.` };
  }
  if (amount > sender.balance_inr) {
    return {
      ok: false,
      error: `Insufficient synthetic ledger balance in ${senderAccountId} (Available: ₹${sender.balance_inr.toLocaleString('en-IN')}).`,
    };
  }

  const txId = `TXN-LIVE-${state.transactions.length + 1001}`;
  const nowIso = new Date().toISOString();

  const patterns: string[] = [];
  const reasons: string[] = [];
  if (amount >= 48000 && amount < 50000) {
    patterns.push('Transaction Splitting');
    reasons.push('Transfer sits immediately below ₹50,000 reporting benchmark');
  }
  if (amount > sender.typical_tx_amount * 4) {
    patterns.push('Behavioral Deviation');
    reasons.push(
      `Transfer amount (₹${amount.toLocaleString('en-IN')}) exceeds 4x typical baseline (₹${sender.typical_tx_amount.toLocaleString('en-IN')})`
    );
  }
  if (receiver.risk_level === 'High') {
    patterns.push('Multi-Hop Suspicious Networks');
    reasons.push(`Transfer directed to high-risk counterparty ${receiverAccountId}`);
  }

  const draftTx: Transaction = {
    transaction_id: txId,
    sender_account_id: senderAccountId,
    receiver_account_id: receiverAccountId,
    amount,
    currency: 'INR',
    timestamp: nowIso,
    transaction_type: transactionType,
    channel,
    status: patterns.length > 0 ? 'Under Review' : 'Completed',
    location: location || sender.branch_city,
    device_id: `DEV-${senderAccountId.slice(-3)}-LIVE`,
    risk_score: patterns.length > 0 ? 74 : 16,
    risk_level: patterns.length > 0 ? 'High' : 'Low',
    detected_patterns: patterns,
    risk_reasons: reasons.length > 0 ? reasons : ['Customer-initiated transfer within baseline'],
    scenario_id: 'scenario_1_normal',
    ground_truth_label: patterns.length > 0 ? 1 : 0,
  };

  const updatedAccounts = state.accounts.map((a) => {
    if (a.account_id === senderAccountId) {
      return {
        ...a,
        balance_inr: a.balance_inr - amount,
        historical_tx_count: a.historical_tx_count + 1,
      };
    }
    if (a.account_id === receiverAccountId) {
      return {
        ...a,
        balance_inr: a.balance_inr + amount,
        historical_tx_count: a.historical_tx_count + 1,
      };
    }
    return a;
  });

  const nextState = recomputeFullPipeline(
    updatedAccounts,
    state.customers,
    [...state.transactions, draftTx],
    state.cases,
    state.riskConfig
  );

  const enrichedTx =
    nextState.transactions.find((t) => t.transaction_id === txId) || draftTx;

  return {
    ok: true,
    newTransaction: enrichedTx,
    nextState,
  };
}

export function initializeDefaultEngineState(): FraudMeshEngineState {
  const { accounts, customers, transactions } = generateSyntheticDataset(20261023);
  return recomputeFullPipeline(accounts, customers, transactions);
}

export { runARTT };
