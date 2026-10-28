import {
  Account,
  ARTTConfig,
  DigitalDNAProfile,
  GraphEdge,
  GraphNode,
  RejectedEdge,
  RiskLevel,
  Transaction,
  TraversalAnimationStep,
  TraversalPath,
  TraversalResult,
} from '../types/fraudmesh';

export function buildTransactionGraph(
  accounts: Account[],
  transactions: Transaction[]
): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles: string[][];
} {
  const accountMap = new Map<string, Account>();
  accounts.forEach((a) => accountMap.set(a.account_id, a));

  const edges: GraphEdge[] = transactions.map((t) => ({
    id: t.transaction_id,
    source: t.sender_account_id,
    target: t.receiver_account_id,
    amount: t.amount,
    timestamp: t.timestamp,
    transaction_type: t.transaction_type,
    channel: t.channel,
    risk_score: t.risk_score,
    risk_level: t.risk_level,
    detected_patterns: t.detected_patterns,
    scenario_id: t.scenario_id,
  }));

  const inDeg = new Map<string, number>();
  const outDeg = new Map<string, number>();
  const inFlow = new Map<string, number>();
  const outFlow = new Map<string, number>();
  const counterparties = new Map<string, Set<string>>();
  const adj = new Map<string, string[]>();
  const undirectedAdj = new Map<string, Set<string>>();

  accounts.forEach((a) => {
    inDeg.set(a.account_id, 0);
    outDeg.set(a.account_id, 0);
    inFlow.set(a.account_id, 0);
    outFlow.set(a.account_id, 0);
    counterparties.set(a.account_id, new Set());
    adj.set(a.account_id, []);
    undirectedAdj.set(a.account_id, new Set());
  });

  transactions.forEach((t) => {
    if (!accountMap.has(t.sender_account_id) || !accountMap.has(t.receiver_account_id)) return;
    outDeg.set(t.sender_account_id, (outDeg.get(t.sender_account_id) || 0) + 1);
    inDeg.set(t.receiver_account_id, (inDeg.get(t.receiver_account_id) || 0) + 1);
    outFlow.set(t.sender_account_id, (outFlow.get(t.sender_account_id) || 0) + t.amount);
    inFlow.set(t.receiver_account_id, (inFlow.get(t.receiver_account_id) || 0) + t.amount);

    counterparties.get(t.sender_account_id)?.add(t.receiver_account_id);
    counterparties.get(t.receiver_account_id)?.add(t.sender_account_id);

    adj.get(t.sender_account_id)?.push(t.receiver_account_id);
    undirectedAdj.get(t.sender_account_id)?.add(t.receiver_account_id);
    undirectedAdj.get(t.receiver_account_id)?.add(t.sender_account_id);
  });

  // Connected Components (BFS on undirected projection)
  const componentMap = new Map<string, number>();
  let compCounter = 0;
  accounts.forEach((a) => {
    if (!componentMap.has(a.account_id)) {
      compCounter++;
      const queue = [a.account_id];
      componentMap.set(a.account_id, compCounter);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors = undirectedAdj.get(curr) || new Set();
        neighbors.forEach((nb) => {
          if (!componentMap.has(nb)) {
            componentMap.set(nb, compCounter);
            queue.push(nb);
          }
        });
      }
    }
  });

  // Directed Cycle Detection (up to length 5 on high-value/recent edges to avoid combinatorial explosion)
  const cycleNodes = new Set<string>();
  const detectedCycles: string[][] = [];
  const seenCycleSignatures = new Set<string>();

  // Build deduplicated directed adjacency for recent/significant transfers
  const sigAdj = new Map<string, Set<string>>();
  transactions
    .filter((t) => t.amount >= 25000 || t.risk_score >= 35)
    .forEach((t) => {
      if (!sigAdj.has(t.sender_account_id)) sigAdj.set(t.sender_account_id, new Set());
      sigAdj.get(t.sender_account_id)!.add(t.receiver_account_id);
    });

  for (const startNode of sigAdj.keys()) {
    const dfs = (curr: string, path: string[]) => {
      if (path.length > 5) return;
      const nexts = sigAdj.get(curr) || new Set();
      for (const nxt of nexts) {
        if (nxt === startNode && path.length >= 3) {
          const cycle = [...path, startNode];
          const minNode = [...path].sort()[0];
          const minIdx = path.indexOf(minNode);
          const canonical = [...path.slice(minIdx), ...path.slice(0, minIdx)].join('->');
          if (!seenCycleSignatures.has(canonical)) {
            seenCycleSignatures.add(canonical);
            detectedCycles.push(cycle);
            path.forEach((n) => cycleNodes.add(n));
          }
        } else if (!path.includes(nxt) && path.length < 5) {
          dfs(nxt, [...path, nxt]);
        }
      }
    };
    dfs(startNode, [startNode]);
  }

  const maxDeg = Math.max(
    1,
    ...accounts.map((a) => (inDeg.get(a.account_id) || 0) + (outDeg.get(a.account_id) || 0))
  );

  const nodes: GraphNode[] = accounts.map((a) => {
    const id = a.account_id;
    const ind = inDeg.get(id) || 0;
    const outd = outDeg.get(id) || 0;
    const inf = inFlow.get(id) || 0;
    const outf = outFlow.get(id) || 0;
    const wVol = inf + outf;
    const uCp = counterparties.get(id)?.size || 0;
    const inCyc = cycleNodes.has(id);
    const centrality = Number((((ind + outd) / maxDeg) * 0.7 + (inCyc ? 0.3 : 0)).toFixed(3));
    const passThroughRatio =
      inf > 0 && outf > 0 ? Number((Math.min(inf, outf) / Math.max(inf, outf)).toFixed(2)) : 0;

    return {
      id,
      holder_name: a.holder_name,
      account_type: a.account_type,
      risk_score: a.risk_score,
      risk_level: a.risk_level,
      inDegree: ind,
      outDegree: outd,
      totalInflow: inf,
      totalOutflow: outf,
      weightedVolume: wVol,
      uniqueCounterparties: uCp,
      componentId: componentMap.get(id) || 1,
      inCycle: inCyc,
      centrality,
      passThroughRatio,
    };
  });

  return { nodes, edges, cycles: detectedCycles };
}

/**
 * ARTT – Adaptive Risk-Aware Temporal Transaction Traverser
 * Searches transaction networks using priority-queue expansion weighted by:
 * 1. Transaction Anomaly
 * 2. Temporal Velocity
 * 3. Suspicious Structural Pattern (Cycles, Fan-out, Convergence, Pass-through)
 * 4. Counterparty Risk
 * 5. Behavioral Novelty (Digital DNA)
 */
export function runARTT(
  config: ARTTConfig,
  accounts: Account[],
  transactions: Transaction[],
  dnaMap?: Map<string, DigitalDNAProfile>
): TraversalResult {
  const { startAccountId, maxDepth, timeWindowHours, minRiskThreshold, maxPaths, weights } = config;
  const accountMap = new Map<string, Account>();
  accounts.forEach((a) => accountMap.set(a.account_id, a));

  const outgoingByAccount = new Map<string, Transaction[]>();
  const incomingByAccount = new Map<string, Transaction[]>();
  transactions.forEach((t) => {
    if (!outgoingByAccount.has(t.sender_account_id)) outgoingByAccount.set(t.sender_account_id, []);
    outgoingByAccount.get(t.sender_account_id)!.push(t);

    if (!incomingByAccount.has(t.receiver_account_id)) incomingByAccount.set(t.receiver_account_id, []);
    incomingByAccount.get(t.receiver_account_id)!.push(t);
  });

  const rejectedEdges: RejectedEdge[] = [];
  const animationSteps: TraversalAnimationStep[] = [];
  const visitedAccounts = new Set<string>([startAccountId]);

  interface QueueItem {
    accounts: string[];
    txs: Transaction[];
    priorityScore: number;
    lastTimestampMs: number;
    firstTimestampMs: number;
  }

  const queue: QueueItem[] = [];
  const completedItems: QueueItem[] = [];

  const startOutgoing = (outgoingByAccount.get(startAccountId) || []).sort(
    (a, b) => b.risk_score - a.risk_score
  );

  let stepCounter = 0;
  const maxTotalExpansions = 120; // Computational safety limit

  const scoreEdge = (
    tx: Transaction,
    prevTx: Transaction | null,
    currentPathAccounts: string[]
  ) => {
    const targetAcc = accountMap.get(tx.receiver_account_id);
    const senderAcc = accountMap.get(tx.sender_account_id);

    // 1. Transaction Anomaly (0..100)
    const amtRatio = senderAcc ? tx.amount / Math.max(1000, senderAcc.typical_tx_amount) : 2;
    const txAnomaly = Math.min(100, Math.max(tx.risk_score, Math.min(95, amtRatio * 18)));

    // 2. Temporal Velocity (0..100)
    let temporalVelocity = 62;
    if (prevTx) {
      const deltaMinutes =
        (new Date(tx.timestamp).getTime() - new Date(prevTx.timestamp).getTime()) / 60000;
      temporalVelocity = deltaMinutes <= 60 ? Math.max(70, 100 - deltaMinutes * 0.45) : Math.max(25, 80 - deltaMinutes / 30);
    } else {
      const siblingOut = outgoingByAccount.get(tx.sender_account_id) || [];
      temporalVelocity = siblingOut.length >= 4 ? 85 : 60;
    }

    // 3. Structural Pattern (0..100)
    const outCount = (outgoingByAccount.get(tx.sender_account_id) || []).length;
    const targetInCount = (incomingByAccount.get(tx.receiver_account_id) || []).length;
    const formsCycle = currentPathAccounts.includes(tx.receiver_account_id);
    let retention = 0.7;
    if (prevTx) {
      retention = Math.min(tx.amount, prevTx.amount) / Math.max(tx.amount, prevTx.amount);
    }
    const structuralPattern = Math.min(
      100,
      (formsCycle ? 95 : 40) +
        (outCount >= 4 ? 22 : 0) +
        (targetInCount >= 3 ? 22 : 0) +
        (retention >= 0.85 ? 18 : 0)
    );

    // 4. Counterparty Risk (0..100)
    const counterpartyRisk = targetAcc
      ? Math.max(targetAcc.risk_score, tx.risk_score * 0.85)
      : 50;

    // 5. Behavioral Novelty (0..100)
    const dna = dnaMap?.get(tx.sender_account_id);
    const behavioralNovelty = dna ? dna.anomaly_score : Math.min(100, txAnomaly * 0.9);

    const totalWeight =
      weights.transactionAnomaly +
      weights.temporalVelocity +
      weights.structuralPattern +
      weights.counterpartyRisk +
      weights.behavioralNovelty || 1;

    const weightedScore =
      (txAnomaly * weights.transactionAnomaly +
        temporalVelocity * weights.temporalVelocity +
        structuralPattern * weights.structuralPattern +
        counterpartyRisk * weights.counterpartyRisk +
        behavioralNovelty * weights.behavioralNovelty) /
      totalWeight;

    return {
      transactionAnomaly: Math.round(txAnomaly),
      temporalVelocity: Math.round(temporalVelocity),
      structuralPattern: Math.round(structuralPattern),
      counterpartyRisk: Math.round(counterpartyRisk),
      behavioralNovelty: Math.round(behavioralNovelty),
      weightedScore: Math.round(Math.max(0, Math.min(100, weightedScore))),
    };
  };

  // Seed initial outgoing edges from startAccountId
  for (const tx of startOutgoing) {
    const breakdown = scoreEdge(tx, null, [startAccountId]);
    const txTimeMs = new Date(tx.timestamp).getTime();

    if (breakdown.weightedScore < minRiskThreshold && tx.risk_score < minRiskThreshold) {
      if (rejectedEdges.length < 25) {
        rejectedEdges.push({
          transaction_id: tx.transaction_id,
          from_account: tx.sender_account_id,
          to_account: tx.receiver_account_id,
          amount: tx.amount,
          timestamp: tx.timestamp,
          rejection_reason: `Edge score (${breakdown.weightedScore}/100) below minimum risk threshold (${minRiskThreshold})`,
        });
      }
      if (animationSteps.length < 40) {
        animationSteps.push({
          stepIndex: ++stepCounter,
          currentAccount: startAccountId,
          inspectedEdgeId: tx.transaction_id,
          targetAccount: tx.receiver_account_id,
          accepted: false,
          reason: `Rejected: Risk score ${breakdown.weightedScore} < threshold ${minRiskThreshold}`,
          cumulativeScore: breakdown.weightedScore,
          timestamp: tx.timestamp,
        });
      }
      continue;
    }

    visitedAccounts.add(tx.receiver_account_id);
    animationSteps.push({
      stepIndex: ++stepCounter,
      currentAccount: startAccountId,
      inspectedEdgeId: tx.transaction_id,
      targetAccount: tx.receiver_account_id,
      accepted: true,
      reason: `Accepted hop 1 (${tx.transaction_id}, ₹${tx.amount.toLocaleString('en-IN')}) — Priority Score ${breakdown.weightedScore}/100`,
      cumulativeScore: breakdown.weightedScore,
      timestamp: tx.timestamp,
    });

    queue.push({
      accounts: [startAccountId, tx.receiver_account_id],
      txs: [tx],
      priorityScore: breakdown.weightedScore,
      lastTimestampMs: txTimeMs,
      firstTimestampMs: txTimeMs,
    });
  }

  // Sort priority queue descending by priorityScore
  queue.sort((a, b) => b.priorityScore - a.priorityScore);

  let expansions = 0;
  while (queue.length > 0 && expansions < maxTotalExpansions) {
    expansions++;
    const current = queue.shift()!;
    const currentTip = current.accounts[current.accounts.length - 1];
    const currentDepth = current.txs.length;
    const prevTx = current.txs[current.txs.length - 1];

    // If cycle closed back to startAccountId or maxDepth reached, record completed path
    if (
      (currentTip === startAccountId && currentDepth > 1) ||
      currentDepth >= maxDepth
    ) {
      completedItems.push(current);
      continue;
    }

    const candidates = outgoingByAccount.get(currentTip) || [];
    let expandedAny = false;

    for (const nextTx of candidates) {
      // Avoid immediate edge reuse
      if (current.txs.some((t) => t.transaction_id === nextTx.transaction_id)) continue;

      // Prevent non-origin loops
      if (
        current.accounts.includes(nextTx.receiver_account_id) &&
        nextTx.receiver_account_id !== startAccountId
      ) {
        continue;
      }

      const nextTimeMs = new Date(nextTx.timestamp).getTime();
      const deltaFromPrevMin = (nextTimeMs - current.lastTimestampMs) / 60000;
      const totalWindowHours = (nextTimeMs - current.firstTimestampMs) / 3600000;

      // Step 4: Check chronological ordering
      if (deltaFromPrevMin < -1) {
        if (rejectedEdges.length < 25) {
          rejectedEdges.push({
            transaction_id: nextTx.transaction_id,
            from_account: nextTx.sender_account_id,
            to_account: nextTx.receiver_account_id,
            amount: nextTx.amount,
            timestamp: nextTx.timestamp,
            rejection_reason: `Chronological violation: outgoing transfer (${nextTx.timestamp}) precedes incoming transfer (${prevTx.timestamp})`,
          });
        }
        if (animationSteps.length < 40) {
          animationSteps.push({
            stepIndex: ++stepCounter,
            currentAccount: currentTip,
            inspectedEdgeId: nextTx.transaction_id,
            targetAccount: nextTx.receiver_account_id,
            accepted: false,
            reason: 'Rejected: Chronological timestamp violation (transfer precedes funds arrival)',
            cumulativeScore: current.priorityScore,
            timestamp: nextTx.timestamp,
          });
        }
        continue;
      }

      // Check time window constraint
      if (totalWindowHours > timeWindowHours) {
        if (rejectedEdges.length < 25) {
          rejectedEdges.push({
            transaction_id: nextTx.transaction_id,
            from_account: nextTx.sender_account_id,
            to_account: nextTx.receiver_account_id,
            amount: nextTx.amount,
            timestamp: nextTx.timestamp,
            rejection_reason: `Temporal window exceeded: ${totalWindowHours.toFixed(1)}h > ${timeWindowHours}h limit`,
          });
        }
        continue;
      }

      const breakdown = scoreEdge(nextTx, prevTx, current.accounts);
      if (breakdown.weightedScore < minRiskThreshold && nextTx.risk_score < minRiskThreshold) {
        if (rejectedEdges.length < 25) {
          rejectedEdges.push({
            transaction_id: nextTx.transaction_id,
            from_account: nextTx.sender_account_id,
            to_account: nextTx.receiver_account_id,
            amount: nextTx.amount,
            timestamp: nextTx.timestamp,
            rejection_reason: `Edge score (${breakdown.weightedScore}/100) below minimum risk threshold (${minRiskThreshold})`,
          });
        }
        continue;
      }

      expandedAny = true;
      visitedAccounts.add(nextTx.receiver_account_id);
      const newScore = Math.round(current.priorityScore * 0.45 + breakdown.weightedScore * 0.55);

      if (animationSteps.length < 40) {
        animationSteps.push({
          stepIndex: ++stepCounter,
          currentAccount: currentTip,
          inspectedEdgeId: nextTx.transaction_id,
          targetAccount: nextTx.receiver_account_id,
          accepted: true,
          reason: `Expanded hop ${currentDepth + 1} (${currentTip} → ${nextTx.receiver_account_id}) within ${Math.max(0, Math.round(deltaFromPrevMin))} min — Path Score ${newScore}/100`,
          cumulativeScore: newScore,
          timestamp: nextTx.timestamp,
        });
      }

      queue.push({
        accounts: [...current.accounts, nextTx.receiver_account_id],
        txs: [...current.txs, nextTx],
        priorityScore: newScore,
        lastTimestampMs: nextTimeMs,
        firstTimestampMs: current.firstTimestampMs,
      });
    }

    if (!expandedAny) {
      completedItems.push(current);
    }

    queue.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  // Include remaining queue items if needed
  completedItems.push(...queue);

  // Deduplicate and rank candidate pathways
  const uniquePathsMap = new Map<string, QueueItem>();
  completedItems.forEach((item) => {
    const key = item.accounts.join('->') + '|' + item.txs.map((t) => t.transaction_id).join(',');
    if (!uniquePathsMap.has(key)) {
      uniquePathsMap.set(key, item);
    }
  });

  // Check if any candidate pathways converge on the same sink node (Split-and-Merge convergence)
  const sinkCounts = new Map<string, number>();
  Array.from(uniquePathsMap.values()).forEach((item) => {
    for (let i = 1; i < item.accounts.length; i++) {
      const acc = item.accounts[i];
      sinkCounts.set(acc, (sinkCounts.get(acc) || 0) + 1);
    }
  });

  const rankedItems = Array.from(uniquePathsMap.values())
    .sort((a, b) => {
      if (b.txs.length !== a.txs.length && Math.abs(b.priorityScore - a.priorityScore) <= 12) {
        return b.txs.length - a.txs.length;
      }
      return b.priorityScore - a.priorityScore;
    })
    .slice(0, maxPaths);

  const candidatePaths: TraversalPath[] = rankedItems.map((item, idx) => {
    const firstTx = item.txs[0];
    const lastTx = item.txs[item.txs.length - 1];
    const totalAmt = item.txs.reduce((s, t) => s + t.amount, 0);
    const retentionRatio = Number(
      (Math.min(firstTx.amount, lastTx.amount) / Math.max(1, firstTx.amount)).toFixed(2)
    );
    const durationMinutes = Math.max(
      1,
      Math.round((item.lastTimestampMs - item.firstTimestampMs) / 60000)
    );

    const structures: string[] = [];
    if (item.accounts[0] === item.accounts[item.accounts.length - 1] && item.txs.length >= 2) {
      structures.push('Directed Circular Loop');
    }
    if (item.txs.length >= 2 && durationMinutes <= 90 && retentionRatio >= 0.85) {
      structures.push('Rapid Multi-Hop Pass-Through');
    }
    if ((outgoingByAccount.get(startAccountId) || []).length >= 4) {
      structures.push('High Fan-Out Dispersion');
    }
    if (item.accounts.slice(1).some((acc) => (sinkCounts.get(acc) || 0) >= 2)) {
      structures.push('Split-and-Merge Convergence');
    }
    if (structures.length === 0) {
      structures.push('Chronological Value Flow');
    }

    // Aggregate score breakdown across path edges
    const stepScores = item.txs.map((tx, i) =>
      scoreEdge(tx, i > 0 ? item.txs[i - 1] : null, item.accounts.slice(0, i + 1))
    );
    const avgProp = (key: keyof typeof stepScores[0]) =>
      Math.round(stepScores.reduce((s, x) => s + x[key], 0) / stepScores.length);

    const breakdown = {
      transactionAnomaly: avgProp('transactionAnomaly'),
      temporalVelocity: avgProp('temporalVelocity'),
      structuralPattern: avgProp('structuralPattern'),
      counterpartyRisk: avgProp('counterpartyRisk'),
      behavioralNovelty: avgProp('behavioralNovelty'),
      weightedScore: item.priorityScore,
    };

    const riskLevel: RiskLevel =
      item.priorityScore >= 70 ? 'High' : item.priorityScore >= 35 ? 'Medium' : 'Low';

    return {
      path_id: `ARTT-PATH-${idx + 1}`,
      rank: idx + 1,
      accounts: item.accounts,
      transactions: item.txs,
      path_risk_score: item.priorityScore,
      risk_level: riskLevel,
      total_amount: totalAmt,
      amount_retention_ratio: retentionRatio,
      duration_minutes: durationMinutes,
      detected_structures: structures,
      score_breakdown: breakdown,
      explanation: `Path ${item.accounts.join(' → ')} spans ${item.txs.length} hop(s) in ${durationMinutes} min via [${item.txs.map((t) => t.transaction_id).join(', ')}]. Principal retention ratio is ${Math.round(retentionRatio * 100)}%. Note: Temporal pathway prioritization highlights suspicious flow consistency and does not by itself prove identical underlying currency units.`,
    };
  });

  return {
    config,
    executed_at: new Date().toISOString(),
    candidate_paths: candidatePaths,
    rejected_edges: rejectedEdges,
    animation_steps: animationSteps,
    visited_accounts: Array.from(visitedAccounts),
    summary_note:
      candidatePaths.length > 0
        ? `ARTT identified ${candidatePaths.length} prioritized temporal pathway(s) from ${startAccountId} (top risk score: ${candidatePaths[0].path_risk_score}/100) and filtered out ${rejectedEdges.length} non-qualifying or chronologically inconsistent edge(s).`
        : `No outgoing pathways from ${startAccountId} exceeded the minimum risk threshold (${minRiskThreshold}/100) within the ${timeWindowHours}h window.`,
  };
}
