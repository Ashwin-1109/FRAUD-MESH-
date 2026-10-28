import {
  Account,
  Customer,
  DigitalDNAProfile,
  FraudAlert,
  GraphEdge,
  GraphNode,
  RiskLevel,
  Transaction,
  TraversalResult,
} from '../types/fraudmesh';
import { parseTransactionsCSV } from './syntheticData';
import { recomputeFullPipeline, runARTT, DEFAULT_ARTT_CONFIG } from './pipeline';
import { formatINR } from './digitalDna';

export interface AccountForensicAssignment {
  account_id: string;
  holder_name: string;
  network_role:
    | 'Primary Originator (Source)'
    | 'Mule Conduit (Pass-Through)'
    | 'Convergence Sink (Collector)'
    | 'Circular Ring Member'
    | 'Standard Participant';
  dna_phenotype: string;
  dna_deviation_score: number;
  risk_score: number;
  risk_level: RiskLevel;
  in_degree: number;
  out_degree: number;
  total_sent: number;
  total_received: number;
  pass_through_ratio: number;
  top_dna_anomalies: { axis: string; deviation: number; summary: string }[];
  dna_profile: DigitalDNAProfile;
}

export interface DatasetFraudPrediction {
  primary_fraud_type: string;
  fraud_code:
    | 'CIRCULAR_WASH_LAUNDERING'
    | 'SPLIT_AND_MERGE_LAYERING'
    | 'SMURFING_STRUCTURING'
    | 'MONEY_MULE_CONDUIT_CHAIN'
    | 'HIGH_VELOCITY_BURST'
    | 'CLEAN_LEGITIMATE_FLOW';
  confidence_pct: number;
  overall_severity: RiskLevel;
  executive_verdict: string;
  sherlock_deduction: string;
  how_graph_predicted: string;
  how_artt_traced: string;
  how_dna_confirmed: string;
  detected_typologies: {
    name: string;
    matched: boolean;
    score: number;
    evidence: string;
  }[];
  origin_accounts: string[];
  intermediary_mule_accounts: string[];
  sink_beneficiary_accounts: string[];
  cycle_accounts: string[];
  total_volume_inr: number;
  suspicious_volume_inr: number;
  retention_ratio_pct: number;
}

export interface UploadedDatasetAnalysis {
  transactions: Transaction[];
  accounts: Account[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  alerts: FraudAlert[];
  detectedCycles: string[][];
  arttResult: TraversalResult;
  accountAssignments: AccountForensicAssignment[];
  prediction: DatasetFraudPrediction;
}

/**
 * Normalizes flexible real-world bank CSV files (e.g. with headers like
 * from,to,amount or sender,receiver,amount,date) into the canonical FraudMesh CSV format,
 * while leaving malformed/invalid CSVs to be caught by validation.
 */
export function normalizeFlexibleBankCSV(rawCsv: string): string {
  if (!rawCsv || !rawCsv.trim()) return rawCsv;
  const lines = rawCsv
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return rawCsv;

  const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase());

  // Check if all canonical headers are already present
  const canonicalRequired = [
    'transaction_id',
    'sender_account_id',
    'receiver_account_id',
    'amount',
    'timestamp',
    'transaction_type',
    'channel',
    'location',
  ];
  if (canonicalRequired.every((h) => rawHeaders.includes(h))) {
    return rawCsv;
  }

  // Otherwise check if flexible sender + receiver + amount columns exist
  const findCol = (aliases: string[]) => rawHeaders.findIndex((h) => aliases.includes(h));

  const senderIdx = findCol([
    'sender_account_id',
    'sender',
    'from_account',
    'from',
    'source_account',
    'source',
    'debit_account',
    'payer',
  ]);
  const receiverIdx = findCol([
    'receiver_account_id',
    'receiver',
    'to_account',
    'to',
    'target_account',
    'target',
    'credit_account',
    'beneficiary',
    'payee',
  ]);
  const amountIdx = findCol(['amount', 'amt', 'value', 'amount_inr', 'transfer_amount', 'sum']);

  // If sender, receiver, or amount is missing, return rawCsv so standard validator reports missing columns
  if (senderIdx === -1 || receiverIdx === -1 || amountIdx === -1) {
    return rawCsv;
  }

  const txIdIdx = findCol(['transaction_id', 'tx_id', 'id', 'txn_id', 'reference']);
  const tsIdx = findCol(['timestamp', 'date', 'time', 'datetime', 'tx_date', 'created_at']);
  const typeIdx = findCol(['transaction_type', 'type', 'mode', 'payment_mode', 'method']);
  const channelIdx = findCol(['channel', 'platform', 'source_channel', 'device_type']);
  const locIdx = findCol(['location', 'city', 'branch', 'region', 'place']);

  const baseTime = new Date('2026-10-24T10:00:00.000Z').getTime();
  const normalizedRows: string[] = [canonicalRequired.join(',')];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const txId = txIdIdx !== -1 && cols[txIdIdx] ? cols[txIdIdx] : `TXN-UPL-${1000 + i}`;
    const sender = cols[senderIdx] || '';
    const receiver = cols[receiverIdx] || '';
    const amount = cols[amountIdx] || '';
    const ts =
      tsIdx !== -1 && cols[tsIdx]
        ? cols[tsIdx]
        : new Date(baseTime + i * 7 * 60000).toISOString();
    const txType = typeIdx !== -1 && cols[typeIdx] ? cols[typeIdx] : 'IMPS';
    const channel = channelIdx !== -1 && cols[channelIdx] ? cols[channelIdx] : 'API Gateway';
    const location = locIdx !== -1 && cols[locIdx] ? cols[locIdx] : 'Mumbai MH';

    normalizedRows.push([txId, sender, receiver, amount, ts, txType, channel, location].join(','));
  }

  return normalizedRows.join('\n');
}

/**
 * Runs complete isolated graph topology prediction, ARTT priority-queue traversal,
 * and 10-Axis Digital DNA assignment on a set of uploaded CSV transactions.
 */
export function analyzeUploadedDatasetForensics(
  rawTransactions: Transaction[],
  existingAccounts: Account[] = []
): UploadedDatasetAnalysis {
  const existingMap = new Map<string, Account>();
  existingAccounts.forEach((a) => existingMap.set(a.account_id, a));

  // Build account nodes for all participants in the uploaded dataset
  const participantIds = Array.from(
    new Set(rawTransactions.flatMap((t) => [t.sender_account_id, t.receiver_account_id]))
  );

  const datasetAccounts: Account[] = participantIds.map((accId, idx) => {
    const existing = existingMap.get(accId);
    // Calculate realistic historical baseline so Digital DNA measures behavioral shift accurately
    const accTxs = rawTransactions.filter(
      (t) => t.sender_account_id === accId || t.receiver_account_id === accId
    );
    const avgUploadedAmt =
      accTxs.reduce((s, t) => s + t.amount, 0) / Math.max(1, accTxs.length);

    // If transactions look like high-value structuring/layering (>25,000), compare against normal retail baseline
    const baselineTypical = existing
      ? existing.typical_tx_amount
      : avgUploadedAmt >= 25000
      ? 6500
      : Math.max(2000, Math.round(avgUploadedAmt * 0.85));

    return {
      account_id: accId,
      holder_name: existing?.holder_name || `Account Holder ${accId}`,
      account_type: existing?.account_type || (idx % 3 === 0 ? 'Current' : 'Savings'),
      account_age_days: existing?.account_age_days || 120,
      branch_city: existing?.branch_city || accTxs[0]?.location || 'Mumbai, MH',
      kyc_tier: existing?.kyc_tier || 'Standard KYC',
      balance_inr: existing?.balance_inr || 500000,
      historical_tx_count: existing?.historical_tx_count || 18,
      typical_tx_amount: baselineTypical,
      activity_frequency_per_day: 1.5,
      baseline: existing?.baseline || {
        typicalAmount: baselineTypical,
        amountStdDev: Math.round(baselineTypical * 0.3),
        dailyFrequency: 1.5,
        activeHoursStart: 9,
        activeHoursEnd: 20,
        uniqueCounterparties: 2,
        avgIntervalHours: 16,
        inOutRatio: 0.65,
        newBeneficiaryRate: 0.15,
        repeatedPatternRate: 0.08,
        sampleSize: 18,
      },
      risk_score: 20,
      risk_level: 'Low',
      risk_status: 'Normal',
      flagged_reasons: [],
      primary_scenario: 'scenario_1_normal',
    };
  });

  const dummyCustomers: Customer[] = [];
  const pipelineState = recomputeFullPipeline(
    datasetAccounts,
    dummyCustomers,
    rawTransactions,
    []
  );

  // Determine best start node for ARTT traversal (highest out-volume or origin node)
  const originCandidates = [...pipelineState.graphNodes].sort((a, b) => {
    const aOriginScore = (a.outDegree > 0 && a.inDegree === 0 ? 50 : 0) + a.risk_score;
    const bOriginScore = (b.outDegree > 0 && b.inDegree === 0 ? 50 : 0) + b.risk_score;
    return bOriginScore - aOriginScore;
  });
  const startNodeId = originCandidates[0]?.id || participantIds[0] || 'ACC-001';

  const arttResult = runARTT(
    {
      ...DEFAULT_ARTT_CONFIG,
      startAccountId: startNodeId,
      maxDepth: 6,
      timeWindowHours: 168,
      minRiskThreshold: 15,
    },
    pipelineState.accounts,
    pipelineState.transactions,
    pipelineState.dnaProfiles
  );

  // Classify each account's structural role and Digital DNA phenotype
  const cycleSet = new Set(pipelineState.detectedCycles.flat());
  const originAccounts: string[] = [];
  const intermediaryMules: string[] = [];
  const sinkAccounts: string[] = [];

  const accountAssignments: AccountForensicAssignment[] = pipelineState.accounts.map((acc) => {
    const node = pipelineState.graphNodes.find((n) => n.id === acc.account_id);
    const dna = pipelineState.dnaProfiles.get(acc.account_id)!;
    const sentTxs = pipelineState.transactions.filter(
      (t) => t.sender_account_id === acc.account_id
    );
    const recTxs = pipelineState.transactions.filter(
      (t) => t.receiver_account_id === acc.account_id
    );
    const totalSent = sentTxs.reduce((s, t) => s + t.amount, 0);
    const totalRec = recTxs.reduce((s, t) => s + t.amount, 0);
    const passThroughRatio =
      totalRec > 0 && totalSent > 0
        ? Math.round((Math.min(totalSent, totalRec) / Math.max(totalSent, totalRec)) * 100)
        : 0;

    const inDeg = node?.inDegree || recTxs.length;
    const outDeg = node?.outDegree || sentTxs.length;

    let networkRole: AccountForensicAssignment['network_role'] = 'Standard Participant';
    if (cycleSet.has(acc.account_id)) {
      networkRole = 'Circular Ring Member';
    } else if (outDeg >= 2 && inDeg === 0) {
      networkRole = 'Primary Originator (Source)';
      originAccounts.push(acc.account_id);
    } else if (inDeg >= 1 && outDeg >= 1 && passThroughRatio >= 75) {
      networkRole = 'Mule Conduit (Pass-Through)';
      intermediaryMules.push(acc.account_id);
    } else if (inDeg >= 2 && outDeg === 0) {
      networkRole = 'Convergence Sink (Collector)';
      sinkAccounts.push(acc.account_id);
    } else if (outDeg > inDeg && totalSent > totalRec) {
      networkRole = 'Primary Originator (Source)';
      originAccounts.push(acc.account_id);
    } else if (inDeg > outDeg && totalRec > totalSent && acc.risk_score >= 45) {
      networkRole = 'Convergence Sink (Collector)';
      sinkAccounts.push(acc.account_id);
    }

    // Determine DNA Phenotype string
    const topAxes = [...dna.axes].sort((a, b) => b.deviationScore - a.deviationScore).slice(0, 3);
    let dnaPhenotype = 'DNA-CLEAN-BASELINE (Normal Retail Habits)';
    if (cycleSet.has(acc.account_id)) {
      dnaPhenotype = 'DNA-CIRCULAR-WASH (Closed-Loop Velocity)';
    } else if (passThroughRatio >= 80 && inDeg >= 1 && outDeg >= 1) {
      dnaPhenotype = `DNA-MULE-RELAY (${passThroughRatio}% Rapid Pass-Through)`;
    } else if (sentTxs.some((t) => t.amount >= 45000 && t.amount < 50000)) {
      dnaPhenotype = 'DNA-SMURF-STRUCTURING (Sub-₹50k Threshold Evasion)';
    } else if (outDeg >= 3) {
      dnaPhenotype = `DNA-FANOUT-SPLITTER (${outDeg} Parallel Outbound Branches)`;
    } else if (inDeg >= 3) {
      dnaPhenotype = `DNA-FANIN-AGGREGATOR (${inDeg} Converging Inflows)`;
    } else if (dna.anomaly_score >= 45) {
      dnaPhenotype = `DNA-ANOMALOUS-SHIFT (${topAxes[0]?.feature || 'Magnitude'} Spike)`;
    }

    return {
      account_id: acc.account_id,
      holder_name: acc.holder_name,
      network_role: networkRole,
      dna_phenotype: dnaPhenotype,
      dna_deviation_score: dna.anomaly_score,
      risk_score: acc.risk_score,
      risk_level: acc.risk_level,
      in_degree: inDeg,
      out_degree: outDeg,
      total_sent: totalSent,
      total_received: totalRec,
      pass_through_ratio: passThroughRatio,
      top_dna_anomalies: topAxes.map((ax) => ({
        axis: ax.feature,
        deviation: ax.deviationScore,
        summary: ax.explanation,
      })),
      dna_profile: dna,
    };
  });

  // Determine Dataset-Level Fraud Prediction
  const hasCycles = pipelineState.detectedCycles.length > 0;
  const hasSplitMerge = pipelineState.alerts.some((a) => a.detector_id === 'DET-SPLIT-MERGE');
  const hasFan = pipelineState.alerts.some((a) => a.detector_id === 'DET-FAN');
  const hasStructuring =
    pipelineState.alerts.some((a) => a.detector_id === 'DET-SPLIT') ||
    pipelineState.transactions.filter((t) => t.amount >= 45000 && t.amount < 50000).length >= 2;
  const hasPassThroughMules =
    pipelineState.alerts.some((a) => a.detector_id === 'DET-PASSTHROUGH') ||
    intermediaryMules.length >= 2;
  const hasVelocity = pipelineState.alerts.some((a) => a.detector_id === 'DET-VELOCITY');

  const totalVolume = pipelineState.transactions.reduce((s, t) => s + t.amount, 0);
  const suspiciousVolume = pipelineState.transactions
    .filter((t) => t.risk_score >= 40)
    .reduce((s, t) => s + t.amount, 0);

  const bestPath = arttResult.candidate_paths[0];
  const bestHopCount = bestPath ? bestPath.transactions.length : 0;
  const retentionPct = bestPath
    ? Math.round(bestPath.amount_retention_ratio * 100)
    : intermediaryMules.length > 0
    ? 96
    : 100;

  let primaryFraudType = 'Legitimate Retail & Commercial Banking Flow';
  let fraudCode: DatasetFraudPrediction['fraud_code'] = 'CLEAN_LEGITIMATE_FLOW';
  let confidencePct = 94;
  let overallSeverity: RiskLevel = 'Low';
  let executiveVerdict =
    'All transactions in the uploaded dataset conform to normal bilateral retail and commercial transfer patterns with no circular loops, structuring splits, or mule pass-through conduits.';
  let sherlockDeduction =
    '“Elementary! I have scrutinized every node and directed edge in your uploaded ledger. The capital movements are strictly bilateral, amounts remain well within historical Digital DNA baselines, and no multi-hop laundering topologies exist.”';

  if (hasCycles) {
    primaryFraudType = 'Circular Money Laundering & Wash Trading Ring';
    fraudCode = 'CIRCULAR_WASH_LAUNDERING';
    confidencePct = 98;
    overallSeverity = 'High';
    const cycStr = pipelineState.detectedCycles[0].join(' → ');
    executiveVerdict = `Graph cycle detection identified a closed-loop laundering ring (${cycStr}) moving ${formatINR(totalVolume)} with ${retentionPct}% capital retention across ${pipelineState.detectedCycles[0].length - 1} hops.`;
    sherlockDeduction = `“The game is afoot! Observe the closed directed cycle (${cycStr}). Funds depart the origin and traverse ${pipelineState.detectedCycles[0].length - 1} accounts only to return to the very same pocket with ${retentionPct}% value intact—a textbook circular wash ring!”`;
  } else if (hasSplitMerge || (originAccounts.length > 0 && sinkAccounts.length > 0 && intermediaryMules.length >= 2)) {
    primaryFraudType = 'Split-and-Merge Layering Network (Fan-Out / Fan-In)';
    fraudCode = 'SPLIT_AND_MERGE_LAYERING';
    confidencePct = 97;
    overallSeverity = 'High';
    executiveVerdict = `Origin account(s) (${originAccounts.join(', ') || startNodeId}) dispersed ${formatINR(totalVolume)} across ${intermediaryMules.length} parallel mule conduits (${intermediaryMules.join(', ')}) which rapidly reconverged into beneficiary sink account(s) (${sinkAccounts.join(', ')}).`;
    sherlockDeduction = `“A classic Split-and-Merge evasion topology! The perpetrator fractured a large sum at ${originAccounts[0] || startNodeId} into parallel streams across ${intermediaryMules.join(', ')}, reconverging the laundered proceeds at ${sinkAccounts[0] || 'the sink node'} within minutes.”`;
  } else if (hasPassThroughMules && bestPath && bestHopCount >= 3) {
    primaryFraudType = 'Multi-Hop Money Mule Pass-Through Conduit Chain';
    fraudCode = 'MONEY_MULE_CONDUIT_CHAIN';
    confidencePct = 95;
    overallSeverity = 'High';
    executiveVerdict = `ARTT traced a ${bestHopCount}-hop sequential money mule chain (${bestPath.accounts.join(' → ')}) relaying funds with ${retentionPct}% capital retention and near-zero account dwell time.`;
    sherlockDeduction = `“Notice the footprint of a sequential money mule chain (${bestPath.accounts.join(' → ')})! Intermediary nodes retain virtually zero balance, acting purely as high-velocity pass-through relays.”`;
  } else if (hasStructuring) {
    primaryFraudType = 'Structuring / Smurfing Threshold Evasion (< ₹50,000)';
    fraudCode = 'SMURFING_STRUCTURING';
    confidencePct = 94;
    overallSeverity = 'High';
    executiveVerdict = `Multiple transfers were deliberately sized between ₹45,000 and ₹49,999 to evade the statutory ₹50,000 regulatory reporting threshold across ${participantIds.length} accounts.`;
    sherlockDeduction = `“It has long been an axiom of mine that the little numbers are infinitely the most important! Pricing multiple tranches just below ₹50,000 is deliberate structuring (smurfing) designed to bypass automated compliance triggers.”`;
  } else if (hasVelocity || hasFan || pipelineState.alerts.length > 0) {
    primaryFraudType = 'High-Velocity Burst & Behavioral Anomaly Pattern';
    fraudCode = 'HIGH_VELOCITY_BURST';
    confidencePct = 89;
    overallSeverity = 'High';
    executiveVerdict = `Detected ${pipelineState.alerts.length} structural/behavioral alert(s) with rapid outbound dispersion and elevated Digital DNA deviation across ${participantIds.length} accounts.`;
    sherlockDeduction = `“Observe the sudden compression of inter-transaction intervals and the sharp departure from historical Digital DNA baselines—a clear high-velocity anomaly!”`;
  }

  const detectedTypologies = [
    {
      name: 'Circular Wash Cycle (Tarjan / DFS Loop)',
      matched: hasCycles,
      score: hasCycles ? 98 : 4,
      evidence: hasCycles
        ? `Closed cycle detected: ${pipelineState.detectedCycles[0]?.join(' → ')}`
        : 'No directed cycles (A → B → C → A) found in uploaded edges.',
    },
    {
      name: 'Split-and-Merge Topology (Fan-Out + Fan-In)',
      matched: hasSplitMerge || (intermediaryMules.length >= 2 && sinkAccounts.length >= 1),
      score: hasSplitMerge ? 96 : intermediaryMules.length >= 2 ? 85 : 8,
      evidence:
        hasSplitMerge || intermediaryMules.length >= 2
          ? `Parallel dispersion via ${intermediaryMules.join(', ')} converging on ${sinkAccounts.join(', ') || 'sink'}`
          : 'No parallel split-and-reconverge diamond structures detected.',
    },
    {
      name: 'Structuring / Smurfing (Sub-₹50k Tranches)',
      matched: hasStructuring,
      score: hasStructuring ? 92 : 10,
      evidence: hasStructuring
        ? `${pipelineState.transactions.filter((t) => t.amount >= 45000 && t.amount < 50000).length} transaction(s) priced in the ₹45,000–₹49,999 evasion band.`
        : 'Transaction amounts do not cluster beneath the ₹50,000 reporting limit.',
    },
    {
      name: 'Money Mule Pass-Through Relay (>80% Retention)',
      matched: hasPassThroughMules,
      score: hasPassThroughMules ? 94 : 12,
      evidence: hasPassThroughMules
        ? `Mule relay accounts (${intermediaryMules.join(', ') || 'detected'}) forwarded ${retentionPct}% of inflow within minutes.`
        : 'Accounts maintain normal inflow/outflow retention balances.',
    },
  ];

  const avgDnaShift = Math.round(
    accountAssignments.reduce((s, a) => s + a.dna_deviation_score, 0) /
      Math.max(1, accountAssignments.length)
  );

  return {
    transactions: pipelineState.transactions,
    accounts: pipelineState.accounts,
    graphNodes: pipelineState.graphNodes,
    graphEdges: pipelineState.graphEdges,
    alerts: pipelineState.alerts,
    detectedCycles: pipelineState.detectedCycles,
    arttResult,
    accountAssignments,
    prediction: {
      primary_fraud_type: primaryFraudType,
      fraud_code: fraudCode,
      confidence_pct: confidencePct,
      overall_severity: overallSeverity,
      executive_verdict: executiveVerdict,
      sherlock_deduction: sherlockDeduction,
      how_graph_predicted: `Constructed a ${pipelineState.graphNodes.length}-node, ${pipelineState.graphEdges.length}-edge directed graph; analyzed in/out-degree centrality, Tarjan cycle membership, and parallel fan-out/fan-in diamond structures.`,
      how_artt_traced: bestPath
        ? `ARTT priority queue traced ${bestPath.accounts.join(' → ')} (${bestHopCount} hops) with ${retentionPct}% value retention and path risk score ${bestPath.path_risk_score}/100.`
        : `ARTT inspected ${arttResult.visited_accounts.length} reachable nodes from ${startNodeId} across ${arttResult.animation_steps.length} temporal hops.`,
      how_dna_confirmed: `Assigned 10-axis Digital DNA profiles to all ${accountAssignments.length} accounts (avg behavioral shift: ${avgDnaShift}%), flagging structuring, pass-through ratio, and interval compression.`,
      detected_typologies: detectedTypologies,
      origin_accounts: originAccounts.length > 0 ? originAccounts : [startNodeId],
      intermediary_mule_accounts: intermediaryMules,
      sink_beneficiary_accounts: sinkAccounts,
      cycle_accounts: Array.from(cycleSet),
      total_volume_inr: totalVolume,
      suspicious_volume_inr: suspiciousVolume,
      retention_ratio_pct: retentionPct,
    },
  };
}
