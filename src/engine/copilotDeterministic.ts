import {
  Account,
  CopilotStructuredResponse,
  DigitalDNAProfile,
  FraudAlert,
  Transaction,
  TraversalResult,
} from '../types/fraudmesh';

export interface CopilotInvestigationContext {
  question: string;
  selectedAccount?: Account;
  relatedTransactions: Transaction[];
  relatedAlerts: FraudAlert[];
  dnaProfile?: DigitalDNAProfile;
  arttResult?: TraversalResult;
  investigatorNotes?: string[];
}

export function buildDeterministicCopilotResponse(
  ctx: CopilotInvestigationContext,
  sourceMode: CopilotStructuredResponse['source_mode'] = 'Deterministic Evidence Engine (Fallback)'
): CopilotStructuredResponse {
  const acc = ctx.selectedAccount;
  const txs = ctx.relatedTransactions || [];
  const alerts = ctx.relatedAlerts || [];
  const dna = ctx.dnaProfile;
  const artt = ctx.arttResult;

  const txRefs = txs.slice(0, 8).map((t) => `${t.transaction_id} (₹${t.amount.toLocaleString('en-IN')}, ${t.sender_account_id} → ${t.receiver_account_id})`);
  const alertRefs = alerts.slice(0, 4).map((a) => `${a.alert_id}: ${a.detector_name} (Risk ${a.risk_score}/100)`);

  const observedIndicators: string[] = [];
  if (alerts.length > 0) {
    alerts.forEach((a) => {
      observedIndicators.push(`${a.detector_name} (${a.alert_id}) flagged with score ${a.risk_score}/100: ${a.explanation}`);
    });
  }
  if (dna && dna.unusual_features.length > 0) {
    observedIndicators.push(
      `Digital DNA Anomaly (${dna.anomaly_score}/100, ${dna.sufficiency}): ${dna.unusual_features.slice(0, 2).join(' | ')}`
    );
  }
  if (artt && artt.candidate_paths.length > 0) {
    const topPath = artt.candidate_paths[0];
    observedIndicators.push(
      `ARTT Top Pathway (${topPath.path_id}, Score ${topPath.path_risk_score}/100): ${topPath.accounts.join(' → ')} retaining ${Math.round(topPath.amount_retention_ratio * 100)}% across ${topPath.duration_minutes} minutes.`
    );
  }
  if (observedIndicators.length === 0) {
    observedIndicators.push(
      'No high-risk structural alerts or severe behavioral anomalies are currently active for the selected scope.'
    );
  }

  const summaryParts: string[] = [];
  if (acc) {
    summaryParts.push(
      `Forensic analysis of synthetic account ${acc.account_id} (${acc.holder_name}, ${acc.account_type}, KYC: ${acc.kyc_tier}) indicates a current risk score of ${acc.risk_score}/100 (${acc.risk_level}).`
    );
  }
  if (txs.length > 0) {
    const totalVol = txs.reduce((s, t) => s + t.amount, 0);
    summaryParts.push(
      `Across ${txs.length} inspected transaction record(s) totaling ₹${totalVol.toLocaleString('en-IN')}, ${alerts.length} structured detector alert(s) were triggered.`
    );
  }
  if (artt && artt.candidate_paths.length > 0) {
    summaryParts.push(artt.summary_note);
  }

  const evidenceReferences = [
    ...txRefs,
    ...alertRefs,
    ...(dna ? [`DNA Profile ${dna.account_id} (Sample count: ${dna.sample_count})`] : []),
  ];

  return {
    investigation_summary:
      summaryParts.join(' ') ||
      'Evidence-grounded forensic summary generated from the active synthetic transaction dataset.',
    observed_indicators: observedIndicators,
    evidence_references:
      evidenceReferences.length > 0
        ? evidenceReferences
        : ['No matching transaction or alert records in current selection.'],
    uncertainty_limitations:
      'Algorithmic risk scores, Digital DNA deviations, and ARTT temporal pathways represent mathematical patterns in synthetic banking telemetry. They do not prove that identical currency units moved across hops, nor do they constitute legal proof of criminal intent without external KYC, invoice, and device-ownership verification.',
    suggested_next_checks: [
      acc
        ? `Verify beneficial ownership and device telemetry for ${acc.account_id} (${acc.holder_name}).`
        : 'Select a specific high-risk account to inspect device and KYC linkages.',
      artt && artt.candidate_paths.length > 0
        ? `Inspect intermediary pass-through accounts along ${artt.candidate_paths[0].accounts.join(' → ')} for shared IP or device IDs.`
        : 'Execute ARTT traversal from the highest-risk node to evaluate multi-hop temporal continuity.',
      'Link verified alert evidence into an Investigation Case and request underlying commercial documentation before escalation.',
    ],
    source_mode: sourceMode,
    generated_at: new Date().toISOString(),
  };
}
