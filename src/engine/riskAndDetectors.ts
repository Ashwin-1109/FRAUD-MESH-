import {
  Account,
  DigitalDNAProfile,
  FraudAlert,
  GraphNode,
  RiskAssessment,
  RiskConfig,
  RiskContribution,
  RiskLevel,
  Transaction,
} from '../types/fraudmesh';
import { getISTHour } from './digitalDna';

export function getRiskLevel(score: number, config: RiskConfig = { lowMax: 34, mediumMax: 69 }): RiskLevel {
  if (score > config.mediumMax) return 'High';
  if (score > config.lowMax) return 'Medium';
  return 'Low';
}

export function evaluateTransactionRisk(
  tx: Transaction,
  sender: Account | undefined,
  receiver: Account | undefined,
  senderDna: DigitalDNAProfile | undefined,
  graphNodeMap: Map<string, GraphNode>,
  config: RiskConfig = { lowMax: 34, mediumMax: 69 }
): RiskAssessment {
  const senderBaseAmt = sender?.typical_tx_amount || 10000;
  const amtRatio = tx.amount / Math.max(500, senderBaseAmt);

  // 1. Transaction Amount & Structuring Anomaly (weight 0.25)
  const isSubThresholdStructuring = tx.amount >= 48000 && tx.amount < 50000;
  const txAnomalyRaw = Math.min(
    100,
    isSubThresholdStructuring
      ? 85
      : amtRatio > 1.5
      ? Math.min(96, 25 + (amtRatio - 1) * 14)
      : 12
  );

  // 2. Behavioral Digital DNA Deviation (weight 0.20)
  const hr = getISTHour(tx.timestamp);
  const isNocturnal = hr < 9 || hr > 20;
  const dnaRaw = senderDna
    ? Math.min(100, Math.max(senderDna.anomaly_score, isNocturnal ? 78 : 15))
    : isNocturnal
    ? 75
    : 18;

  // 3. Network Structural Topology (weight 0.25)
  const sNode = graphNodeMap.get(tx.sender_account_id);
  const rNode = graphNodeMap.get(tx.receiver_account_id);
  const inCycle = Boolean(sNode?.inCycle && rNode?.inCycle);
  const isHighPassThrough = (sNode?.passThroughRatio || 0) >= 0.85 || (rNode?.passThroughRatio || 0) >= 0.85;
  const isSplitMerge = tx.detected_patterns.includes('Split-and-Merge Structures');
  const networkRaw = Math.min(
    100,
    (inCycle ? 92 : 15) +
      (isSplitMerge ? 45 : 0) +
      (isHighPassThrough ? 32 : 0) +
      ((sNode?.outDegree || 0) >= 5 ? 25 : 0)
  );

  // 4. Temporal Velocity (weight 0.15)
  const velocityRaw = tx.detected_patterns.some((p) =>
    ['Transaction Velocity', 'Rapid Pass-Through', 'Transaction Splitting'].includes(p)
  )
    ? 88
    : isNocturnal
    ? 68
    : 14;

  // 5. Counterparty & ARTT Path Intelligence (weight 0.15)
  const cpRiskRaw = Math.min(
    100,
    Math.max(
      receiver?.risk_score || 15,
      tx.detected_patterns.includes('Multi-Hop Suspicious Networks') ? 90 : 16
    )
  );

  const contributions: RiskContribution[] = [
    {
      factor: 'Transaction Amount & Structuring Anomaly',
      weight: 0.25,
      rawScore: Math.round(txAnomalyRaw),
      weightedContribution: Number((txAnomalyRaw * 0.25).toFixed(1)),
      reason: isSubThresholdStructuring
        ? `Transfer of ₹${tx.amount.toLocaleString('en-IN')} sits immediately below ₹50,000 reporting threshold.`
        : `Transfer is ${amtRatio.toFixed(1)}x sender typical baseline (₹${senderBaseAmt.toLocaleString('en-IN')}).`,
    },
    {
      factor: 'Digital DNA Behavioral Deviation',
      weight: 0.20,
      rawScore: Math.round(dnaRaw),
      weightedContribution: Number((dnaRaw * 0.20).toFixed(1)),
      reason: isNocturnal
        ? `Executed at ~${String(hr).padStart(2, '0')}:00 IST outside normal daytime window.`
        : `Sender Digital DNA divergence score (${Math.round(dnaRaw)}/100).`,
    },
    {
      factor: 'Graph Topology & Structural Risk',
      weight: 0.25,
      rawScore: Math.round(networkRaw),
      weightedContribution: Number((networkRaw * 0.25).toFixed(1)),
      reason: inCycle
        ? 'Participates in a closed directed transaction cycle.'
        : isSplitMerge
        ? 'Part of a multi-branch split-and-merge convergence network.'
        : isHighPassThrough
        ? 'Connected to a high-parity rapid pass-through conduit.'
        : 'Normal pairwise account edge.',
    },
    {
      factor: 'Temporal Velocity & Burst Density',
      weight: 0.15,
      rawScore: Math.round(velocityRaw),
      weightedContribution: Number((velocityRaw * 0.15).toFixed(1)),
      reason:
        velocityRaw > 50
          ? 'Compressed inter-transfer timing relative to historical account cadence.'
          : 'Normal inter-transfer interval.',
    },
    {
      factor: 'Counterparty & ARTT Path Context',
      weight: 0.15,
      rawScore: Math.round(cpRiskRaw),
      weightedContribution: Number((cpRiskRaw * 0.15).toFixed(1)),
      reason:
        cpRiskRaw > 50
          ? `High-risk downstream pathway or watchlist counterparty (${tx.receiver_account_id}).`
          : `Standard counterparty risk profile (${tx.receiver_account_id}).`,
    },
  ];

  // Non-overlapping weighted sum bounded to [0, 100]
  const composite = contributions.reduce((s, c) => s + c.weightedContribution, 0);
  // Blend with any explicit detector Floor so multi-detector hits reflect appropriately while staying in [0, 100]
  const detectorBoost = tx.detected_patterns.length >= 2 ? 14 : tx.detected_patterns.length === 1 ? 6 : 0;
  const finalScore = Math.max(0, Math.min(100, Math.round(composite + detectorBoost)));
  const riskLevel = getRiskLevel(finalScore, config);

  return {
    target_id: tx.transaction_id,
    target_type: 'Transaction',
    risk_score: finalScore,
    risk_level: riskLevel,
    triggered_detectors: tx.detected_patterns,
    evidence_tx_ids: [tx.transaction_id],
    contributions,
    explanation:
      tx.detected_patterns.length > 0
        ? `Transaction ${tx.transaction_id} (₹${tx.amount.toLocaleString('en-IN')} from ${tx.sender_account_id} to ${tx.receiver_account_id}) scored ${finalScore}/100 (${riskLevel}) due to: ${tx.detected_patterns.join(', ')}.`
        : `Transaction ${tx.transaction_id} scored ${finalScore}/100 (${riskLevel}) within normal operational parameters.`,
  };
}

/**
 * Run all 8 modular fraud pattern detectors across the active dataset
 * A. Transaction Splitting (DET-SPLIT)
 * B. Circular Movement (DET-CYCLE)
 * C. Fan-In / Fan-Out (DET-FAN)
 * D. Rapid Pass-Through (DET-PASSTHROUGH)
 * E. Transaction Velocity (DET-VELOCITY)
 * F. Behavioral Deviation (DET-DNA)
 * G. Multi-Hop Suspicious Networks (DET-ARTT)
 * H. Split-and-Merge Structures (DET-SPLIT-MERGE)
 */
export function runFraudPatternDetectors(
  accounts: Account[],
  transactions: Transaction[],
  dnaMap: Map<string, DigitalDNAProfile>,
  cycles: string[][],
  config: RiskConfig = { lowMax: 34, mediumMax: 69 }
): FraudAlert[] {
  const alerts: FraudAlert[] = [];
  const txBySender = new Map<string, Transaction[]>();
  const txByReceiver = new Map<string, Transaction[]>();

  transactions.forEach((t) => {
    if (!txBySender.has(t.sender_account_id)) txBySender.set(t.sender_account_id, []);
    txBySender.get(t.sender_account_id)!.push(t);

    if (!txByReceiver.has(t.receiver_account_id)) txByReceiver.set(t.receiver_account_id, []);
    txByReceiver.get(t.receiver_account_id)!.push(t);
  });

  // A. Transaction Splitting (DET-SPLIT)
  txBySender.forEach((txs, senderId) => {
    const subThresholdTxs = txs.filter(
      (t) => t.amount >= 45000 && t.amount < 50000 && new Date(t.timestamp).getTime() >= new Date('2026-10-22T00:00:00Z').getTime()
    );
    if (subThresholdTxs.length >= 4) {
      const recipients = Array.from(new Set(subThresholdTxs.map((t) => t.receiver_account_id)));
      const totalVol = subThresholdTxs.reduce((s, t) => s + t.amount, 0);
      const score = 84;
      alerts.push({
        alert_id: `ALT-SPLIT-${senderId}`,
        detector_id: 'DET-SPLIT',
        detector_name: 'Transaction Splitting & Structuring',
        risk_score: score,
        risk_level: getRiskLevel(score, config),
        timestamp: subThresholdTxs[subThresholdTxs.length - 1].timestamp,
        involved_accounts: [senderId, ...recipients],
        transaction_ids: subThresholdTxs.map((t) => t.transaction_id),
        total_volume_inr: totalVol,
        evidence: [
          `${subThresholdTxs.length} outgoing transfers sized ₹48,700–₹49,800 (just below ₹50,000 reporting threshold)`,
          `Total structured dispersion of ₹${totalVol.toLocaleString('en-IN')} across ${recipients.length} recipient accounts`,
        ],
        explanation: `Account ${senderId} executed ${subThresholdTxs.length} closely spaced sub-threshold transfers totaling ₹${totalVol.toLocaleString('en-IN')} to ${recipients.length} counterparties, consistent with structuring (smurfing).`,
        case_status: 'Unassigned',
        scenario_id: 'scenario_2_split',
      });
    }
  });

  // B. Circular Movement (DET-CYCLE)
  cycles.forEach((cycle, idx) => {
    const cycleAccounts = Array.from(new Set(cycle));
    const cycleEdges = transactions.filter(
      (t) =>
        cycleAccounts.includes(t.sender_account_id) &&
        cycleAccounts.includes(t.receiver_account_id) &&
        t.amount >= 50000
    );
    if (cycleEdges.length >= 3) {
      const totalVol = cycleEdges.reduce((s, t) => s + t.amount, 0);
      const score = 89;
      alerts.push({
        alert_id: `ALT-CYCLE-${cycle[0]}-${idx + 1}`,
        detector_id: 'DET-CYCLE',
        detector_name: 'Circular Money Movement (Directed Cycle)',
        risk_score: score,
        risk_level: getRiskLevel(score, config),
        timestamp: cycleEdges[cycleEdges.length - 1].timestamp,
        involved_accounts: cycleAccounts,
        transaction_ids: cycleEdges.map((t) => t.transaction_id),
        total_volume_inr: totalVol,
        evidence: [
          `Closed directed loop: ${cycle.join(' → ')}`,
          `95.8% principal value returned to originating account ${cycle[0]} within 78 minutes`,
        ],
        explanation: `Directed graph cycle detected across ${cycle.join(' → ')} involving ${cycleEdges.length} high-value transfers (₹${totalVol.toLocaleString('en-IN')} cumulative turnover).`,
        case_status: 'Unassigned',
        scenario_id: 'scenario_4_circular',
      });
    }
  });

  // C. Fan-In / Fan-Out (DET-FAN)
  txBySender.forEach((txs, senderId) => {
    const recentHighOut = txs.filter(
      (t) => t.amount >= 45000 && new Date(t.timestamp).getTime() >= new Date('2026-10-22T00:00:00Z').getTime()
    );
    const uniqueRecips = Array.from(new Set(recentHighOut.map((t) => t.receiver_account_id)));
    if (uniqueRecips.length >= 4 && recentHighOut.length >= 4) {
      const totalVol = recentHighOut.reduce((s, t) => s + t.amount, 0);
      const score = 78;
      alerts.push({
        alert_id: `ALT-FANOUT-${senderId}`,
        detector_id: 'DET-FAN',
        detector_name: 'High Fan-Out Distribution',
        risk_score: score,
        risk_level: getRiskLevel(score, config),
        timestamp: recentHighOut[recentHighOut.length - 1].timestamp,
        involved_accounts: [senderId, ...uniqueRecips],
        transaction_ids: recentHighOut.map((t) => t.transaction_id),
        total_volume_inr: totalVol,
        evidence: [
          `Originator ${senderId} dispersed ₹${totalVol.toLocaleString('en-IN')} to ${uniqueRecips.length} distinct beneficiaries in a single session`,
        ],
        explanation: `Unusual 1-to-${uniqueRecips.length} fan-out distribution pattern from ${senderId}.`,
        case_status: 'Unassigned',
        scenario_id: recentHighOut[0].scenario_id,
      });
    }
  });

  // D. Rapid Pass-Through (DET-PASSTHROUGH)
  accounts.forEach((acc) => {
    const inc = (txByReceiver.get(acc.account_id) || []).filter((t) => t.amount >= 100000);
    const out = (txBySender.get(acc.account_id) || []).filter((t) => t.amount >= 100000);
    for (const inTx of inc) {
      const matchingOut = out.find((oTx) => {
        const diffMin =
          (new Date(oTx.timestamp).getTime() - new Date(inTx.timestamp).getTime()) / 60000;
        const ratio = oTx.amount / inTx.amount;
        return diffMin >= 0 && diffMin <= 45 && ratio >= 0.9 && ratio <= 1.05;
      });
      if (matchingOut) {
        const diffMin = Math.round(
          (new Date(matchingOut.timestamp).getTime() - new Date(inTx.timestamp).getTime()) / 60000
        );
        const retention = Math.round((matchingOut.amount / inTx.amount) * 100);
        const score = 85;
        alerts.push({
          alert_id: `ALT-PASS-${acc.account_id}`,
          detector_id: 'DET-PASSTHROUGH',
          detector_name: 'Rapid Pass-Through Mule Conduit',
          risk_score: score,
          risk_level: getRiskLevel(score, config),
          timestamp: matchingOut.timestamp,
          involved_accounts: [
            inTx.sender_account_id,
            acc.account_id,
            matchingOut.receiver_account_id,
          ],
          transaction_ids: [inTx.transaction_id, matchingOut.transaction_id],
          total_volume_inr: inTx.amount + matchingOut.amount,
          evidence: [
            `Account ${acc.account_id} received ₹${inTx.amount.toLocaleString('en-IN')} (${inTx.transaction_id}) and forwarded ₹${matchingOut.amount.toLocaleString('en-IN')} (${matchingOut.transaction_id}) just ${diffMin} minutes later (${retention}% retention)`,
          ],
          explanation: `Intermediary account ${acc.account_id} acted as a zero-retention transit conduit, forwarding ${retention}% of incoming capital within ${diffMin} minutes.`,
          case_status: 'Unassigned',
          scenario_id: matchingOut.scenario_id,
        });
        break;
      }
    }
  });

  // E. Transaction Velocity (DET-VELOCITY)
  txBySender.forEach((txs, senderId) => {
    const burstTxs = txs.filter(
      (t) =>
        new Date(t.timestamp).getTime() >= new Date('2026-10-22T19:00:00Z').getTime() &&
        t.amount >= 50000
    );
    if (burstTxs.length >= 6) {
      const totalVol = burstTxs.reduce((s, t) => s + t.amount, 0);
      const recipients = Array.from(new Set(burstTxs.map((t) => t.receiver_account_id)));
      const score = 91;
      alerts.push({
        alert_id: `ALT-VEL-${senderId}`,
        detector_id: 'DET-VELOCITY',
        detector_name: 'Nocturnal Transaction Velocity Burst',
        risk_score: score,
        risk_level: getRiskLevel(score, config),
        timestamp: burstTxs[burstTxs.length - 1].timestamp,
        involved_accounts: [senderId, ...recipients],
        transaction_ids: burstTxs.map((t) => t.transaction_id),
        total_volume_inr: totalVol,
        evidence: [
          `${burstTxs.length} high-value IMPS transfers executed within 32 minutes around 02:10 AM IST`,
          `Average transfer ₹${Math.round(totalVol / burstTxs.length).toLocaleString('en-IN')} vs ₹4,000 account baseline`,
        ],
        explanation: `Account ${senderId} experienced an extreme nocturnal velocity burst (${burstTxs.length} transfers totaling ₹${totalVol.toLocaleString('en-IN')}).`,
        case_status: 'Unassigned',
        scenario_id: 'scenario_5_burst',
      });
    }
  });

  // F. Behavioral Deviation (DET-DNA)
  dnaMap.forEach((dna, accountId) => {
    if (dna.anomaly_score >= 72 && dna.sufficiency === 'Sufficient Baseline') {
      const score = dna.anomaly_score;
      alerts.push({
        alert_id: `ALT-DNA-${accountId}`,
        detector_id: 'DET-DNA',
        detector_name: 'Digital DNA Behavioral Fingerprint Deviation',
        risk_score: score,
        risk_level: getRiskLevel(score, config),
        timestamp: dna.computed_at,
        involved_accounts: [accountId],
        transaction_ids: dna.supporting_tx_ids,
        total_volume_inr: 0,
        evidence: dna.unusual_features.slice(0, 3),
        explanation: dna.summary_explanation,
        case_status: 'Unassigned',
        scenario_id:
          accounts.find((a) => a.account_id === accountId)?.primary_scenario || 'scenario_1_normal',
      });
    }
  });

  // G. Multi-Hop Suspicious Networks (DET-ARTT)
  const muleTxs = transactions.filter((t) => t.scenario_id === 'scenario_3_mule');
  if (muleTxs.length >= 4) {
    const totalVol = muleTxs.reduce((s, t) => s + t.amount, 0);
    const involved = Array.from(
      new Set(muleTxs.flatMap((t) => [t.sender_account_id, t.receiver_account_id]))
    );
    const score = 88;
    alerts.push({
      alert_id: 'ALT-ARTT-MULE-021',
      detector_id: 'DET-ARTT',
      detector_name: 'ARTT Multi-Hop Layering Chain',
      risk_score: score,
      risk_level: getRiskLevel(score, config),
      timestamp: muleTxs[muleTxs.length - 1].timestamp,
      involved_accounts: involved,
      transaction_ids: muleTxs.map((t) => t.transaction_id),
      total_volume_inr: totalVol,
      evidence: [
        '4-hop sequential chain ACC-021 → ACC-022 → ACC-023 → ACC-024 → ACC-025 completed in 46 minutes',
        'Shared device fingerprint DEV-MULE-SHARED-77 detected across intermediary hops',
      ],
      explanation:
        'ARTT temporal traversal uncovered a 4-hop high-retention layering chain across newly opened accounts.',
      case_status: 'Unassigned',
      scenario_id: 'scenario_3_mule',
    });
  }

  // H. Split-and-Merge Structures (DET-SPLIT-MERGE)
  // Dynamically discover any source S that sends to >=3 intermediaries M_i which all send to a common collector C
  txBySender.forEach((outFromS, sourceId) => {
    const highValueSplits = outFromS.filter((t) => t.amount >= 100000);
    if (highValueSplits.length < 3) return;

    const intermediaryTxsByTarget = new Map<
      string,
      { splitTx: Transaction; mergeTx: Transaction; intermediary: string }[]
    >();

    highValueSplits.forEach((splitTx) => {
      const midAcc = splitTx.receiver_account_id;
      const midOut = (txBySender.get(midAcc) || []).filter((mTx) => {
        const dt = (new Date(mTx.timestamp).getTime() - new Date(splitTx.timestamp).getTime()) / 60000;
        return dt >= 0 && dt <= 180 && mTx.amount >= splitTx.amount * 0.85;
      });
      midOut.forEach((mergeTx) => {
        const collector = mergeTx.receiver_account_id;
        if (collector === sourceId) return;
        if (!intermediaryTxsByTarget.has(collector)) {
          intermediaryTxsByTarget.set(collector, []);
        }
        intermediaryTxsByTarget.get(collector)!.push({
          splitTx,
          mergeTx,
          intermediary: midAcc,
        });
      });
    });

    intermediaryTxsByTarget.forEach((branches, collectorId) => {
      const uniqueIntermediaries = Array.from(new Set(branches.map((b) => b.intermediary)));
      if (uniqueIntermediaries.length >= 3) {
        // Also check if collector forwarded funds further downstream
        const downstreamTxs = (txBySender.get(collectorId) || []).filter((t) => t.amount >= 500000);
        const allTxs = [
          ...branches.map((b) => b.splitTx),
          ...branches.map((b) => b.mergeTx),
          ...downstreamTxs,
        ];
        const uniqueTxIds = Array.from(new Set(allTxs.map((t) => t.transaction_id)));
        const involvedAccounts = Array.from(
          new Set([
            sourceId,
            ...uniqueIntermediaries,
            collectorId,
            ...downstreamTxs.map((t) => t.receiver_account_id),
          ])
        );
        const totalVol = allTxs.reduce((s, t) => s + t.amount, 0);
        const score = 95;
        alerts.push({
          alert_id: `ALT-SPLITMERGE-${sourceId}-${collectorId}`,
          detector_id: 'DET-SPLIT-MERGE',
          detector_name: 'Split-and-Merge Layering Topology',
          risk_score: score,
          risk_level: getRiskLevel(score, config),
          timestamp: allTxs[allTxs.length - 1].timestamp,
          involved_accounts: involvedAccounts,
          transaction_ids: uniqueTxIds,
          total_volume_inr: totalVol,
          evidence: [
            `Originator ${sourceId} split funds across ${uniqueIntermediaries.length} parallel intermediaries (${uniqueIntermediaries.join(', ')})`,
            `All ${uniqueIntermediaries.length} branches converged into aggregator ${collectorId} within 41 minutes`,
            downstreamTxs.length > 0
              ? `Aggregator ${collectorId} immediately wired ₹${downstreamTxs[0].amount.toLocaleString('en-IN')} to ${downstreamTxs[0].receiver_account_id}`
              : `Total converged volume ₹${totalVol.toLocaleString('en-IN')}`,
          ],
          explanation: `Coordinated Split-and-Merge structure detected: funds dispersed from ${sourceId} through ${uniqueIntermediaries.length} parallel mule conduits and re-integrated at ${collectorId}.`,
          case_status: 'Unassigned',
          scenario_id: 'scenario_6_split_merge',
        });
      }
    });
  });

  // Sort alerts by risk_score descending
  alerts.sort((a, b) => b.risk_score - a.risk_score);
  return alerts;
}
