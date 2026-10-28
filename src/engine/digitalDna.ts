import {
  Account,
  DigitalDNAFeatureAxis,
  DigitalDNAProfile,
  RiskLevel,
  Transaction,
} from '../types/fraudmesh';

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

export function getISTHour(isoTimestamp: string): number {
  const date = new Date(isoTimestamp);
  // Convert UTC to IST (+5:30 = +330 minutes)
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const istMinutes = (utcMinutes + 330) % 1440;
  return Math.floor(istMinutes / 60);
}

export function formatINR(amount: number): string {
  return `INR ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function computeDigitalDNAForAccount(
  account: Account,
  allTransactions: Transaction[]
): DigitalDNAProfile {
  const accountTxs = allTransactions
    .filter(
      (t) =>
        t.sender_account_id === account.account_id ||
        t.receiver_account_id === account.account_id
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const outgoingTxs = accountTxs.filter((t) => t.sender_account_id === account.account_id);
  const incomingTxs = accountTxs.filter((t) => t.receiver_account_id === account.account_id);

  // Recent window: latest 35% of account transactions or transactions on/after Oct 22
  const recentCutoffMs = new Date('2026-10-22T00:00:00.000Z').getTime();
  let recentTxs = accountTxs.filter((t) => new Date(t.timestamp).getTime() >= recentCutoffMs);
  if (recentTxs.length === 0 && accountTxs.length > 0) {
    recentTxs = accountTxs.slice(-Math.max(1, Math.ceil(accountTxs.length * 0.35)));
  }

  const base = account.baseline;
  const sampleCount = accountTxs.length + base.sampleSize;
  const sufficiency: DigitalDNAProfile['sufficiency'] =
    accountTxs.length >= 3 && base.sampleSize >= 5
      ? 'Sufficient Baseline'
      : 'Insufficient baseline';

  // 1. Typical transaction amount
  const recentAvgAmount =
    recentTxs.length > 0
      ? recentTxs.reduce((s, t) => s + t.amount, 0) / recentTxs.length
      : base.typicalAmount;
  const recentMaxAmount =
    recentTxs.length > 0 ? Math.max(...recentTxs.map((t) => t.amount)) : base.typicalAmount;
  const amountRatio = recentMaxAmount / Math.max(1, base.typicalAmount);
  const baseAmountNorm = clamp(Math.log10(Math.max(100, base.typicalAmount)) * 18, 15, 55);
  const currAmountNorm = clamp(
    baseAmountNorm + (amountRatio > 1.3 ? Math.min(55, (amountRatio - 1) * 16) : 0),
    15,
    98
  );
  const amountDevScore = clamp((amountRatio - 1) * 22);

  // 2. Transaction amount variability
  const meanAmt = recentAvgAmount || 1;
  const variance =
    recentTxs.length > 1
      ? recentTxs.reduce((s, t) => s + Math.pow(t.amount - meanAmt, 2), 0) / recentTxs.length
      : Math.pow(base.amountStdDev, 2);
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / Math.max(1, meanAmt);
  // Note: Extremely uniform amounts (splitting/structuring cv < 0.04 on multiple txs) OR high stdDev is anomalous
  const isUniformStructuring = recentTxs.length >= 4 && cv < 0.05 && recentMaxAmount > 25000;
  const varDevScore = isUniformStructuring
    ? 86
    : clamp(Math.abs(stdDev - base.amountStdDev) / Math.max(500, base.amountStdDev) * 35);

  // 3. Daily transaction frequency
  const recentCountPerDay = Math.max(base.dailyFrequency, recentTxs.length);
  const freqRatio = recentCountPerDay / Math.max(0.5, base.dailyFrequency);
  const freqDevScore = clamp((freqRatio - 1) * 18);

  // 4. Normal activity hours
  const nocturnalTxs = recentTxs.filter((t) => {
    const hr = getISTHour(t.timestamp);
    return hr < base.activeHoursStart || hr > base.activeHoursEnd;
  });
  const nocturnalRate = recentTxs.length > 0 ? nocturnalTxs.length / recentTxs.length : 0;
  const hoursDevScore = clamp(nocturnalRate * 115);

  // 5. Unique counterparty count
  const recentCounterparties = new Set<string>();
  recentTxs.forEach((t) => {
    recentCounterparties.add(
      t.sender_account_id === account.account_id ? t.receiver_account_id : t.sender_account_id
    );
  });
  const cpRatio = recentCounterparties.size / Math.max(1, base.uniqueCounterparties * 0.5);
  const cpDevScore = clamp((cpRatio - 1) * 28);

  // 6. Transaction interval distribution (compression / burst speed)
  let minIntervalMinutes = base.avgIntervalHours * 60;
  if (recentTxs.length >= 2) {
    let totalDiffMin = 0;
    for (let i = 1; i < recentTxs.length; i++) {
      const diff =
        (new Date(recentTxs[i].timestamp).getTime() -
          new Date(recentTxs[i - 1].timestamp).getTime()) /
        60000;
      totalDiffMin += diff;
    }
    minIntervalMinutes = Math.max(1, totalDiffMin / (recentTxs.length - 1));
  }
  const intervalCompression =
    minIntervalMinutes < 45 ? clamp(((60 - minIntervalMinutes) / 60) * 95) : 12;

  // 7. Incoming vs outgoing transaction ratio (Pass-through balance)
  const totalIn = incomingTxs.reduce((s, t) => s + t.amount, 0);
  const totalOut = outgoingTxs.reduce((s, t) => s + t.amount, 0);
  const passThroughParity =
    totalIn > 50000 && totalOut > 50000
      ? 1 - Math.abs(totalIn - totalOut) / Math.max(totalIn, totalOut)
      : 0.3;
  const ratioDevScore =
    passThroughParity > 0.88 && minIntervalMinutes < 90 ? clamp(passThroughParity * 94) : 18;

  // 8. Frequency of new beneficiaries
  const historicalCounterparties = new Set<string>();
  accountTxs
    .filter((t) => new Date(t.timestamp).getTime() < recentCutoffMs)
    .forEach((t) => {
      historicalCounterparties.add(
        t.sender_account_id === account.account_id ? t.receiver_account_id : t.sender_account_id
      );
    });
  let novelCount = 0;
  recentCounterparties.forEach((cp) => {
    if (!historicalCounterparties.has(cp)) novelCount++;
  });
  const novelRate =
    recentCounterparties.size > 0 ? novelCount / recentCounterparties.size : base.newBeneficiaryRate;
  const newBeneficiaryDevScore =
    recentTxs.length >= 3 ? clamp((novelRate - base.newBeneficiaryRate) * 95) : 15;

  // 9. Repeated transaction patterns (Structuring / identical tranches)
  const amountBuckets: Record<number, number> = {};
  recentTxs.forEach((t) => {
    const bucket = Math.round(t.amount / 2000) * 2000;
    amountBuckets[bucket] = (amountBuckets[bucket] || 0) + 1;
  });
  const maxRepeated = Math.max(0, ...Object.values(amountBuckets));
  const repeatedPatternDevScore =
    maxRepeated >= 3 ? clamp(maxRepeated * 16 + (isUniformStructuring ? 25 : 0)) : 14;

  // 10. Sudden behavioral changes (Composite shift velocity)
  const suddenShiftScore = clamp(
    amountDevScore * 0.28 +
      hoursDevScore * 0.22 +
      intervalCompression * 0.22 +
      newBeneficiaryDevScore * 0.15 +
      repeatedPatternDevScore * 0.13
  );

  const axes: DigitalDNAFeatureAxis[] = [
    {
      feature: 'Typical Amount',
      key: 'typical_amount',
      baselineNormalized: baseAmountNorm,
      currentNormalized: currAmountNorm,
      baselineRaw: formatINR(base.typicalAmount),
      currentRaw: formatINR(recentMaxAmount),
      deviationScore: amountDevScore,
      explanation:
        amountDevScore > 45
          ? `Peak transfer (${formatINR(recentMaxAmount)}) is ${amountRatio.toFixed(1)}x historical baseline (${formatINR(base.typicalAmount)}).`
          : 'Transfer sizes align with established account norms.',
    },
    {
      feature: 'Amount Variability',
      key: 'amount_variability',
      baselineNormalized: 32,
      currentNormalized: clamp(32 + varDevScore * 0.65),
      baselineRaw: `±${formatINR(base.amountStdDev)}`,
      currentRaw: isUniformStructuring
        ? `Uniform Structuring (±${formatINR(stdDev)})`
        : `±${formatINR(stdDev)}`,
      deviationScore: varDevScore,
      explanation: isUniformStructuring
        ? 'Suspiciously low variance across high-value transfers indicates deliberate sub-threshold structuring.'
        : 'Standard dispersion across transaction sizes.',
    },
    {
      feature: 'Daily Frequency',
      key: 'daily_frequency',
      baselineNormalized: 28,
      currentNormalized: clamp(28 + freqDevScore * 0.7),
      baselineRaw: `${base.dailyFrequency}/day`,
      currentRaw: `${recentTxs.length} recent tx`,
      deviationScore: freqDevScore,
      explanation:
        freqDevScore > 45
          ? `Activity surge to ${recentTxs.length} transfers in active window vs ${base.dailyFrequency}/day baseline.`
          : 'Daily transfer count within normal rhythm.',
    },
    {
      feature: 'Activity Hours',
      key: 'activity_hours',
      baselineNormalized: 22,
      currentNormalized: clamp(22 + hoursDevScore * 0.75),
      baselineRaw: `${String(base.activeHoursStart).padStart(2, '0')}:00–${String(base.activeHoursEnd).padStart(2, '0')}:00 IST`,
      currentRaw:
        nocturnalTxs.length > 0
          ? `${nocturnalTxs.length} Nocturnal Tx (~02:10 AM IST)`
          : 'Daytime Hours (IST)',
      deviationScore: hoursDevScore,
      explanation:
        hoursDevScore > 40
          ? `${nocturnalTxs.length} transfers executed during late-night hours outside established daytime window.`
          : 'All transactions occurred during normal daytime banking hours.',
    },
    {
      feature: 'Counterparty Breadth',
      key: 'counterparty_count',
      baselineNormalized: 30,
      currentNormalized: clamp(30 + cpDevScore * 0.68),
      baselineRaw: `${base.uniqueCounterparties} regular`,
      currentRaw: `${recentCounterparties.size} active endpoints`,
      deviationScore: cpDevScore,
      explanation:
        cpDevScore > 45
          ? `Rapid expansion across ${recentCounterparties.size} unique accounts.`
          : 'Counterparty count consistent with prior history.',
    },
    {
      feature: 'Interval Compression',
      key: 'interval_distribution',
      baselineNormalized: 25,
      currentNormalized: clamp(25 + intervalCompression * 0.72),
      baselineRaw: `Avg ${base.avgIntervalHours}h gap`,
      currentRaw:
        minIntervalMinutes < 60
          ? `Avg ${Math.round(minIntervalMinutes)} min gap`
          : `Avg ${(minIntervalMinutes / 60).toFixed(1)}h gap`,
      deviationScore: intervalCompression,
      explanation:
        intervalCompression > 50
          ? `Compressed inter-transaction intervals averaging ${Math.round(minIntervalMinutes)} minutes.`
          : 'Normal temporal spacing between consecutive transactions.',
    },
    {
      feature: 'In/Out Pass-Through',
      key: 'in_out_ratio',
      baselineNormalized: 34,
      currentNormalized: clamp(34 + ratioDevScore * 0.64),
      baselineRaw: `Ratio ${base.inOutRatio}`,
      currentRaw: `${Math.round(passThroughParity * 100)}% parity`,
      deviationScore: ratioDevScore,
      explanation:
        ratioDevScore > 50
          ? `High inflow-to-outflow parity (${Math.round(passThroughParity * 100)}%) indicates rapid conduit pass-through.`
          : 'Balanced accumulation and spending ratio.',
    },
    {
      feature: 'New Beneficiaries',
      key: 'new_beneficiaries',
      baselineNormalized: 20,
      currentNormalized: clamp(20 + newBeneficiaryDevScore * 0.78),
      baselineRaw: `${Math.round(base.newBeneficiaryRate * 100)}% novel`,
      currentRaw: `${Math.round(novelRate * 100)}% unseen (${novelCount})`,
      deviationScore: newBeneficiaryDevScore,
      explanation:
        newBeneficiaryDevScore > 45
          ? `${Math.round(novelRate * 100)}% of recent counterparties were previously unseen in account history.`
          : 'Transfers predominantly target known beneficiaries.',
    },
    {
      feature: 'Repeated Patterns',
      key: 'repeated_patterns',
      baselineNormalized: 24,
      currentNormalized: clamp(24 + repeatedPatternDevScore * 0.74),
      baselineRaw: `${Math.round(base.repeatedPatternRate * 100)}% recurrence`,
      currentRaw: `${maxRepeated}x similar tranches`,
      deviationScore: repeatedPatternDevScore,
      explanation:
        repeatedPatternDevScore > 45
          ? `${maxRepeated} transfers clustered in identical value bands suggesting structured batching.`
          : 'Natural diversity in transfer values.',
    },
    {
      feature: 'Behavioral Shift',
      key: 'sudden_change',
      baselineNormalized: 18,
      currentNormalized: clamp(18 + suddenShiftScore * 0.8),
      baselineRaw: 'Stable',
      currentRaw: suddenShiftScore > 60 ? 'Abrupt Regime Shift' : suddenShiftScore > 35 ? 'Moderate Drift' : 'Stable',
      deviationScore: suddenShiftScore,
      explanation:
        suddenShiftScore > 50
          ? 'Simultaneous multi-axis divergence from rolling historical fingerprint.'
          : 'Account operates within expected historical envelope.',
    },
  ];

  // Overall anomaly score weighted from top deviating axes
  const sortedDevs = [...axes].map((a) => a.deviationScore).sort((a, b) => b - a);
  const top3Avg = (sortedDevs[0] + sortedDevs[1] + sortedDevs[2]) / 3;
  const meanAll = sortedDevs.reduce((s, v) => s + v, 0) / sortedDevs.length;
  const anomalyScore = clamp(top3Avg * 0.65 + meanAll * 0.35);

  const riskLevel: RiskLevel =
    anomalyScore >= 70 ? 'High' : anomalyScore >= 35 ? 'Medium' : 'Low';

  const unusualFeatures = axes
    .filter((a) => a.deviationScore >= 42)
    .map((a) => `${a.feature}: ${a.explanation}`);

  const supportingTxIds = recentTxs
    .filter((t) => t.risk_score >= 35 || t.amount > base.typicalAmount * 2)
    .slice(-8)
    .map((t) => t.transaction_id);

  const anomalyTimeline = accountTxs.slice(-10).map((t) => {
    const hr = getISTHour(t.timestamp);
    const isNight = hr < base.activeHoursStart || hr > base.activeHoursEnd;
    const amtMult = t.amount / Math.max(1, base.typicalAmount);
    const txAnomaly = clamp(
      Math.max(
        t.risk_score,
        (amtMult > 1.5 ? Math.min(55, (amtMult - 1) * 14) : 10) + (isNight ? 32 : 0)
      )
    );
    return {
      timestamp: t.timestamp,
      tx_id: t.transaction_id,
      amount: t.amount,
      anomaly_score: txAnomaly,
      note:
        txAnomaly >= 70
          ? `High deviation (${amtMult.toFixed(1)}x typical${isNight ? ', nocturnal IST' : ''})`
          : txAnomaly >= 35
          ? 'Moderate behavioral drift'
          : 'Baseline aligned',
    };
  });

  const summaryExplanation =
    sufficiency === 'Insufficient baseline'
      ? `Account ${account.account_id} has limited historical baseline (${sampleCount} records). Observed anomaly score is ${anomalyScore}/100, treated with low confidence until further baseline history accumulates.`
      : unusualFeatures.length > 0
      ? `Account ${account.account_id} exhibits a Digital DNA anomaly score of ${anomalyScore}/100 (${riskLevel} deviation) across ${unusualFeatures.length} behavioral axes. Note: Behavioral divergence highlights unusual activity relative to historical baseline and is not automatic proof of confirmed fraud.`
      : `Account ${account.account_id} closely matches its historical Digital DNA signature (Anomaly Score: ${anomalyScore}/100).`;

  return {
    account_id: account.account_id,
    holder_name: account.holder_name,
    computed_at: new Date().toISOString(),
    anomaly_score: anomalyScore,
    risk_level: riskLevel,
    sufficiency,
    sample_count: sampleCount,
    axes,
    unusual_features: unusualFeatures,
    supporting_tx_ids: supportingTxIds.length > 0 ? supportingTxIds : recentTxs.slice(-3).map((t) => t.transaction_id),
    summary_explanation: summaryExplanation,
    anomaly_timeline: anomalyTimeline,
  };
}
