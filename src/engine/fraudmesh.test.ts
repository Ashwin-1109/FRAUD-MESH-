import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSyntheticDataset,
  parseTransactionsCSV,
} from './syntheticData';
import {
  createCaseFromAlert,
  DEFAULT_ARTT_CONFIG,
  initializeDefaultEngineState,
  recomputeFullPipeline,
  runARTT,
  validateAndProcessTransfer,
} from './pipeline';
import { computeDigitalDNAForAccount } from './digitalDna';
import { computeMetricsFromPredictions } from './mlModels';

const initialState = initializeDefaultEngineState();

// TEST 1: Normal transactions should not automatically produce high-risk fraud alerts.
test('TEST 1: Normal transactions do not automatically produce high-risk fraud alerts', () => {
  const normalTxs = initialState.transactions.filter(
    (t) => t.scenario_id === 'scenario_1_normal' && t.status === 'Completed'
  );
  assert.ok(normalTxs.length > 800, 'Expected >800 normal transactions');
  const highRiskNormals = normalTxs.filter((t) => t.risk_level === 'High');
  assert.equal(
    highRiskNormals.length,
    0,
    'Normal routine transactions should not be classified as High Risk'
  );
});

// TEST 2: A generated circular pattern should be discoverable by the graph cycle detector.
test('TEST 2: Generated circular pattern (ACC-031 -> ACC-032 -> ACC-033 -> ACC-034 -> ACC-031) is discovered by cycle detector', () => {
  assert.ok(initialState.detectedCycles.length >= 1, 'At least one cycle must be detected');
  const has31Cycle = initialState.detectedCycles.some(
    (cyc) =>
      cyc.includes('ACC-031') &&
      cyc.includes('ACC-032') &&
      cyc.includes('ACC-033') &&
      cyc.includes('ACC-034')
  );
  assert.equal(has31Cycle, true, 'Cycle involving ACC-031..ACC-034 must be discovered');

  const cycleAlert = initialState.alerts.find((a) => a.detector_id === 'DET-CYCLE');
  assert.ok(cycleAlert, 'DET-CYCLE alert must be generated');
});

// TEST 3: ARTT must honor traversal depth and transaction-time constraints.
test('TEST 3: ARTT honors traversal depth and transaction-time constraints', () => {
  const depth2Result = runARTT(
    {
      ...DEFAULT_ARTT_CONFIG,
      startAccountId: 'ACC-021',
      maxDepth: 2,
      timeWindowHours: 24,
      minRiskThreshold: 30,
    },
    initialState.accounts,
    initialState.transactions,
    initialState.dnaProfiles
  );

  assert.ok(depth2Result.candidate_paths.length > 0, 'Should return candidate paths from ACC-021');
  for (const path of depth2Result.candidate_paths) {
    assert.ok(
      path.transactions.length <= 2,
      `Path hop count (${path.transactions.length}) must not exceed maxDepth=2`
    );
    // Verify chronological ordering of timestamps along path
    for (let i = 1; i < path.transactions.length; i++) {
      const prevMs = new Date(path.transactions[i - 1].timestamp).getTime();
      const currMs = new Date(path.transactions[i].timestamp).getTime();
      assert.ok(
        currMs >= prevMs - 60000,
        'Consecutive hops in an ARTT path must be chronologically ordered'
      );
    }
  }
});

// TEST 4: Digital DNA must update after new transactions are processed.
test('TEST 4: Digital DNA updates after anomalous new transactions are processed', () => {
  const acc002 = initialState.accounts.find((a) => a.account_id === 'ACC-002')!;
  const beforeDna = computeDigitalDNAForAccount(acc002, initialState.transactions);

  const highValueNocturnalTx = {
    transaction_id: 'TXN-DNA-TEST-1',
    sender_account_id: 'ACC-002',
    receiver_account_id: 'ACC-075',
    amount: acc002.typical_tx_amount * 15,
    currency: 'INR' as const,
    timestamp: '2026-10-22T20:45:00.000Z', // 02:15 AM IST
    transaction_type: 'IMPS' as const,
    channel: 'Mobile App' as const,
    status: 'Flagged' as const,
    location: 'Mumbai, MH',
    device_id: 'DEV-ANOMALY',
    risk_score: 88,
    risk_level: 'High' as const,
    detected_patterns: ['Behavioral Deviation'],
    risk_reasons: ['Nocturnal high-value transfer'],
    scenario_id: 'scenario_5_burst' as const,
    ground_truth_label: 1 as const,
  };

  const afterDna = computeDigitalDNAForAccount(acc002, [
    ...initialState.transactions,
    highValueNocturnalTx,
  ]);
  assert.ok(
    afterDna.anomaly_score > beforeDna.anomaly_score,
    `Expected Digital DNA anomaly score to increase from ${beforeDna.anomaly_score} to ${afterDna.anomaly_score}`
  );
});

// TEST 5: New transactions must appear consistently in all relevant dashboards / state.
test('TEST 5: New customer transfer updates transactions, account balances, and graph edges consistently', () => {
  const prevCount = initialState.transactions.length;
  const senderBefore = initialState.accounts.find((a) => a.account_id === 'ACC-001')!;

  const res = validateAndProcessTransfer(initialState, {
    senderAccountId: 'ACC-001',
    receiverAccountId: 'ACC-004',
    amount: 4500,
    transactionType: 'UPI',
    channel: 'Mobile App',
  });

  assert.equal(res.ok, true);
  assert.ok(res.nextState);
  assert.equal(res.nextState.transactions.length, prevCount + 1);
  assert.equal(res.nextState.graphEdges.length, prevCount + 1);

  const senderAfter = res.nextState.accounts.find((a) => a.account_id === 'ACC-001')!;
  assert.equal(senderAfter.balance_inr, senderBefore.balance_inr - 4500);
});

// TEST 6: Creating an investigation case must preserve its alert and transaction references.
test('TEST 6: Creating an investigation case preserves alert and transaction references', () => {
  const sampleAlert = initialState.alerts[0];
  assert.ok(sampleAlert, 'At least one alert exists');

  const newCase = createCaseFromAlert(
    sampleAlert,
    'Investigator Vikram',
    'Verified split-and-merge evidence.',
    initialState.cases.length
  );

  assert.deepEqual(newCase.source_alert_ids, [sampleAlert.alert_id]);
  assert.deepEqual(newCase.linked_transaction_ids, sampleAlert.transaction_ids);
  assert.deepEqual(newCase.involved_accounts, sampleAlert.involved_accounts);
});

// TEST 7: Incorrect CSV files must be rejected with useful validation messages.
test('TEST 7: Malformed CSV files are rejected with descriptive validation messages', () => {
  const emptyRes = parseTransactionsCSV('');
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors[0].includes('empty'));

  const missingColsRes = parseTransactionsCSV('transaction_id,amount\nTX1,500');
  assert.equal(missingColsRes.valid, false);
  assert.ok(missingColsRes.errors[0].includes('Missing required CSV columns'));

  const negativeAmtRes = parseTransactionsCSV(
    'transaction_id,sender_account_id,receiver_account_id,amount,timestamp,transaction_type,channel,location\n' +
      'TX-BAD,ACC-001,ACC-002,-5000,2026-10-22T10:00:00Z,UPI,Mobile App,Mumbai'
  );
  assert.equal(negativeAmtRes.valid, false);
  assert.ok(negativeAmtRes.errors[0].includes('positive number'));
});

// TEST 8: Risk calculations must remain within the supported score range [0, 100].
test('TEST 8: All account and transaction risk scores remain strictly within [0, 100]', () => {
  for (const tx of initialState.transactions) {
    assert.ok(
      tx.risk_score >= 0 && tx.risk_score <= 100,
      `Transaction ${tx.transaction_id} score ${tx.risk_score} out of range [0, 100]`
    );
  }
  for (const acc of initialState.accounts) {
    assert.ok(
      acc.risk_score >= 0 && acc.risk_score <= 100,
      `Account ${acc.account_id} score ${acc.risk_score} out of range [0, 100]`
    );
  }
});

// TEST 9: Evaluation metrics must match the underlying confusion matrix.
test('TEST 9: Model evaluation Precision, Recall, F1, and FPR match confusion matrix formulas', () => {
  for (const model of initialState.modelEvaluations) {
    const { tp, fp, tn, fn } = model.confusion_matrix;
    const expectedPrecision = tp + fp > 0 ? Number((tp / (tp + fp)).toFixed(4)) : 0;
    const expectedRecall = tp + fn > 0 ? Number((tp / (tp + fn)).toFixed(4)) : 0;
    const rawP = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rawR = tp + fn > 0 ? tp / (tp + fn) : 0;
    const expectedF1 =
      rawP + rawR > 0 ? Number(((2 * rawP * rawR) / (rawP + rawR)).toFixed(4)) : 0;
    const expectedFpr = fp + tn > 0 ? Number((fp / (fp + tn)).toFixed(4)) : 0;

    assert.equal(model.precision, expectedPrecision, `${model.model_name} precision mismatch`);
    assert.equal(model.recall, expectedRecall, `${model.model_name} recall mismatch`);
    assert.equal(model.f1_score, expectedF1, `${model.model_name} F1 mismatch`);
    assert.equal(model.fpr, expectedFpr, `${model.model_name} FPR mismatch`);
  }
});

// TEST 10: If Gemini is unavailable, deterministic detection and investigation functionality must still work.
test('TEST 10: Deterministic Copilot fallback produces complete evidence-grounded structured analysis', async () => {
  const { buildDeterministicCopilotResponse } = await import('./copilotDeterministic');
  const acc014 = initialState.accounts.find((a) => a.account_id === 'ACC-014')!;
  const relTxs = initialState.transactions.filter(
    (t) => t.sender_account_id === 'ACC-014' || t.receiver_account_id === 'ACC-014'
  );
  const relAlerts = initialState.alerts.filter((a) => a.involved_accounts.includes('ACC-014'));

  const response = buildDeterministicCopilotResponse({
    question: 'Why was account ACC-014 flagged?',
    selectedAccount: acc014,
    relatedTransactions: relTxs,
    relatedAlerts: relAlerts,
    dnaProfile: initialState.dnaProfiles.get('ACC-014'),
  });

  assert.ok(response.investigation_summary.includes('ACC-014'));
  assert.ok(response.observed_indicators.length > 0);
  assert.ok(response.evidence_references.length > 0);
  assert.ok(response.suggested_next_checks.length > 0);
});

// TEST 11: Uploaded CSV Dataset Forensics — Flexible CSV Normalization, Fraud Type Prediction, ARTT & Digital DNA Assignment
test('TEST 11: Uploaded CSV dataset analysis predicts fraud typology, traces ARTT path, and assigns 10-Axis Digital DNA', async () => {
  const { normalizeFlexibleBankCSV, analyzeUploadedDatasetForensics } = await import(
    './datasetForensics'
  );

  const simpleBankCsv = `sender,receiver,amount
RING-A,RING-B,50000
RING-B,RING-C,49500
RING-C,RING-A,49000`;

  const normalized = normalizeFlexibleBankCSV(simpleBankCsv);
  const parsed = parseTransactionsCSV(normalized);
  assert.equal(parsed.valid, true, '3-column sender,receiver,amount CSV should normalize and parse cleanly');
  assert.equal(parsed.transactions.length, 3);

  const report = analyzeUploadedDatasetForensics(parsed.transactions, initialState.accounts);
  assert.notEqual(report.prediction.fraud_code, 'CLEAN_LEGITIMATE_FLOW');
  assert.ok(
    report.prediction.primary_fraud_type.includes('Circular'),
    `Expected Circular fraud prediction, got ${report.prediction.primary_fraud_type}`
  );
  assert.ok(
    report.arttResult.animation_steps.length >= 2,
    'ARTT should trace hops across uploaded dataset'
  );
  assert.equal(
    report.accountAssignments.length,
    3,
    'Every uploaded account must receive a 10-Axis Digital DNA profile and structural role'
  );
  assert.ok(
    report.accountAssignments.every((a) => a.dna_profile.axes.length === 10),
    'Every uploaded account DNA profile must have 10 behavioral axes'
  );
});

