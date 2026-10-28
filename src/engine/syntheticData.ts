import {
  Account,
  Customer,
  ScenarioId,
  SimulationScenario,
  Transaction,
} from '../types/fraudmesh';

// Deterministic Mulberry32 PRNG
export function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INDIAN_FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Aditi', 'Kavya', 'Meera', 'Nisha',
  'Priya', 'Riya', 'Saanvi', 'Tanvi', 'Rohan', 'Vikram', 'Neha', 'Siddharth',
  'Pooja', 'Karan', 'Devika', 'Rajesh', 'Sunita', 'Abhishek', 'Nandini', 'Harsh',
  'Shruti', 'Manish', 'Deepa', 'Gaurav', 'Swati', 'Pranav', 'nikhil', 'Sneha'
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Kulkarni', 'Mehta',
  'Joshi', 'Chatterjee', 'Banerjee', 'Gupta', 'Malhotra', 'Kapoor', 'Deshmukh',
  'Rao', 'Menon', 'Agarwal', 'Bhatia', 'Saxena', 'Choudhury', 'pillai'
];

const INDIAN_CITIES = [
  'Mumbai, MH', 'Bengaluru, KA', 'Hyderabad, TS', 'Chennai, TN',
  'New Delhi, DL', 'Pune, MH', 'Ahmedabad, GJ', 'Kolkata, WB',
  'Kochi, KL', 'Jaipur, RJ', 'Gurugram, HR', 'Noida, UP'
];

const CORPORATE_NAMES: Record<string, string> = {
  'ACC-014': 'Vanguard Tradex Links (R. Malhotra)',
  'ACC-021': 'Kaveri Micro Enterprises',
  'ACC-022': 'Surya Fast Remit Hub',
  'ACC-023': 'Deccan Transit Accounts',
  'ACC-024': 'Apex Layering Shell Co',
  'ACC-025': 'Zenith Bullion Clearing',
  'ACC-031': 'Orion Commodities Pvt Ltd',
  'ACC-032': 'Metro Synthetic Textiles',
  'ACC-033': 'Crescent Logistics LLP',
  'ACC-034': 'BlueStar Import Export',
  'ACC-042': 'Arjun Deshmukh (Savings)',
  'ACC-050': 'Nexus Sovereign Ventures (Originator)',
  'ACC-051': 'Mule Node Alpha (K. Verma)',
  'ACC-052': 'Mule Node Beta (S. Pillai)',
  'ACC-053': 'Mule Node Gamma (D. Nair)',
  'ACC-054': 'Mule Node Delta (M. Joshi)',
  'ACC-055': 'Horizon Settlement Aggregator LLP',
  'ACC-056': 'Offshore Clearing Conduit Vault',
  'ACC-001': 'Ananya Sharma (Primary Customer)',
};

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'scenario_1_normal',
    number: 1,
    title: 'Normal Transaction Flow',
    subtitle: 'Regular payroll, household UPI transfers, and recurring merchant settlements',
    badge: 'Baseline Control',
    primary_account: 'ACC-001',
    involved_accounts: ['ACC-001', 'ACC-002', 'ACC-003', 'ACC-004', 'ACC-005', 'ACC-006'],
    what_happened:
      'Accounts ACC-001 through ACC-006 execute routine daytime transfers between ₹1,200 and ₹18,500 across established counterparties during standard business hours (09:00–20:00 IST).',
    what_detected: ['No high-risk structural detectors triggered'],
    why_suspicious:
      'Not suspicious. Transfer amounts align with historical account baselines, daytime activity windows, and known counterparty relationships.',
    how_artt_helped:
      'ARTT evaluates candidate outgoing edges and terminates early because edge risk scores remain well below the investigative threshold.',
    how_dna_helped:
      'Digital DNA confirms a low behavioral anomaly score (< 20/100), matching historical transaction size, interval, and counterparty familiarity.',
    next_checks: [
      'No manual intervention required; maintain automated baseline learning.',
      'Use as a control group when calibrating false-positive thresholds.'
    ]
  },
  {
    id: 'scenario_2_split',
    number: 2,
    title: 'Split Transaction Network',
    subtitle: 'Structuring (smurfing) just below reporting thresholds across multiple beneficiaries',
    badge: 'Structuring / Splitting',
    primary_account: 'ACC-014',
    involved_accounts: ['ACC-014', 'ACC-015', 'ACC-016', 'ACC-017', 'ACC-018', 'ACC-019', 'ACC-020'],
    what_happened:
      'Account ACC-014 distributes ₹3,92,500 through 8 rapid outgoing transfers each sized between ₹48,200 and ₹49,800—just under the ₹50,000 regulatory reporting benchmark—within a 95-minute window.',
    what_detected: [
      'Transaction Splitting (DET-SPLIT)',
      'Fan-In / Fan-Out Distribution (DET-FAN)',
      'Behavioral Deviation (DET-DNA)'
    ],
    why_suspicious:
      'Uniform sub-threshold transfer sizing combined with high fan-out degree within a compressed timeframe indicates deliberate structuring to evade single-transaction scrutiny.',
    how_artt_helped:
      'ARTT prioritizes the high-velocity outgoing fan-out branches from ACC-014 and ranks the structured dispersion pathways by temporal density.',
    how_dna_helped:
      'ACC-014 exhibits a dramatic spike in daily transaction frequency, new beneficiary rate, and repeated amount uniformity compared to its historical baseline.',
    next_checks: [
      'Verify KYC documentation and beneficial ownership links between ACC-014 and recipients ACC-015..ACC-020.',
      'Inspect whether downstream accounts forward or withdraw funds within 24 hours.'
    ]
  },
  {
    id: 'scenario_3_mule',
    number: 3,
    title: 'Money Mule Network',
    subtitle: 'Multi-hop rapid pass-through chain across newly activated intermediary accounts',
    badge: 'Mule Chain',
    primary_account: 'ACC-021',
    involved_accounts: ['ACC-021', 'ACC-022', 'ACC-023', 'ACC-024', 'ACC-025'],
    what_happened:
      ' ₹3,60,000 originates at ACC-021 and hops sequentially through ACC-022 → ACC-023 → ACC-024 → ACC-025 in under 75 minutes, retaining 94% of principal value at each hop with minimal fee decay.',
    what_detected: [
      'Rapid Pass-Through (DET-PASSTHROUGH)',
      'Multi-Hop Suspicious Networks (DET-ARTT)',
      'Behavioral Deviation (DET-DNA)'
    ],
    why_suspicious:
      'Intermediary accounts hold near-zero balances before receipt and forward almost the entire amount minutes later, a classic money-mule layering signature.',
    how_artt_helped:
      'ARTT follows chronologically ordered transfers across 4 hops, scoring high amount continuity (0.94+ retention) and tight inter-hop velocity.',
    how_dna_helped:
      'Intermediary accounts show near 1:1 inflow-to-outflow pass-through ratios and compressed holding intervals far outside normal retail savings behavior.',
    next_checks: [
      'Examine device IDs and IP locations across ACC-022, ACC-023, and ACC-024 for shared operator control.',
      'Place temporary hold review on terminal sink account ACC-025.'
    ]
  },
  {
    id: 'scenario_4_circular',
    number: 4,
    title: 'Circular Transfer Network',
    subtitle: 'Directed round-trip fund rotation returning capital to the originating entity',
    badge: 'Directed Cycle',
    primary_account: 'ACC-031',
    involved_accounts: ['ACC-031', 'ACC-032', 'ACC-033', 'ACC-034'],
    what_happened:
      'Funds depart ACC-031 (₹4,85,000) → ACC-032 (₹4,78,000) → ACC-033 (₹4,72,000) → ACC-034 (₹4,68,000) → back to ACC-031 (₹4,65,000) within a 2-hour window.',
    what_detected: [
      'Circular Movement (DET-CYCLE)',
      'Rapid Pass-Through (DET-PASSTHROUGH)',
      'Multi-Hop Suspicious Networks (DET-ARTT)'
    ],
    why_suspicious:
      'Closed directed cycles with high value conservation suggest wash trading, synthetic turnover inflation, or round-trip trade-based money laundering.',
    how_artt_helped:
      'ARTT tracks chronological edge progression from ACC-031 and detects cycle closure when path expansion revisits the origin node within the active temporal window.',
    how_dna_helped:
      'Each participant account shows sudden high-value corporate RTGS/IMPS turnover disproportionate to its historical trade cadence.',
    next_checks: [
      'Request underlying commercial invoices for the four transfers between ACC-031 and ACC-034.',
      'Check corporate registry filings for common directors or shared registered addresses.'
    ]
  },
  {
    id: 'scenario_5_burst',
    number: 5,
    title: 'Rapid Transfer Burst',
    subtitle: 'Sudden nocturnal velocity spike and anomalous counterparty dispersion',
    badge: 'Velocity Burst',
    primary_account: 'ACC-042',
    involved_accounts: ['ACC-042', 'ACC-043', 'ACC-044', 'ACC-045', 'ACC-046', 'ACC-047'],
    what_happened:
      'Account ACC-042 (historically averaging 1.1 daytime transfers of ₹4,000) executes 9 high-value transfers between ₹68,000 and ₹95,000 between 01:55 AM and 02:40 AM IST to unseen counterparties.',
    what_detected: [
      'Transaction Velocity (DET-VELOCITY)',
      'Behavioral Deviation (DET-DNA)',
      'Fan-In / Fan-Out Distribution (DET-FAN)'
    ],
    why_suspicious:
      'Extreme departure from established account Digital DNA: 22x normal transaction amount, nocturnal execution (02:00 AM), and 100% novel beneficiaries indicative of account takeover or rapid cash-out.',
    how_artt_helped:
      'ARTT weights temporal velocity (0.25) and behavioral novelty (0.10) to immediately surface the nocturnal burst edges from ACC-042.',
    how_dna_helped:
      'Digital DNA radar expands sharply across Amount Deviation, Nocturnal Activity Hours, Daily Frequency, and New Beneficiary Rate (Anomaly Score: 92/100).',
    next_checks: [
      'Cross-check device fingerprint DEV-9941-X against historical login devices for ACC-042.',
      'Contact account holder to verify whether nocturnal transfers were authorized.'
    ]
  },
  {
    id: 'scenario_6_split_merge',
    number: 6,
    title: 'Split-and-Merge Network',
    subtitle: 'Coordinated fan-out dispersion through mule nodes converging into an aggregator sink',
    badge: 'Split & Merge Topology',
    primary_account: 'ACC-050',
    involved_accounts: ['ACC-050', 'ACC-051', 'ACC-052', 'ACC-053', 'ACC-054', 'ACC-055', 'ACC-056'],
    what_happened:
      'Source account ACC-050 splits ₹12,40,000 across four intermediary accounts (ACC-051..ACC-054 in tranches of ₹3,10,000 each). Within 40 minutes, all four intermediaries forward ₹3,02,000–₹3,05,000 into aggregator account ACC-055 (₹12,14,000 total), which then wires ₹11,95,000 to ACC-056.',
    what_detected: [
      'Split-and-Merge Structures (DET-SPLIT-MERGE)',
      'Multi-Hop Suspicious Networks (DET-ARTT)',
      'Rapid Pass-Through (DET-PASSTHROUGH)',
      'Fan-In / Fan-Out Distribution (DET-FAN)'
    ],
    why_suspicious:
      'Classic placement-layering-integration topology: funds are intentionally fragmented to obscure origin trail, passed through parallel mule conduits, and re-integrated at a downstream collector.',
    how_artt_helped:
      'ARTT traverses all four parallel branches from ACC-050, detects structural convergence at ACC-055, and links the final high-value hop to ACC-056 with chronological proof.',
    how_dna_helped:
      'Both the splitter (ACC-050), the four parallel pass-through mules (ACC-051..054), and the collector (ACC-055) exhibit coordinated behavioral deviations simultaneously.',
    next_checks: [
      'Escalate ACC-050, ACC-051..054, ACC-055, and ACC-056 into a unified multi-account investigation case.',
      'Generate an AI Forensic Copilot briefing citing all 9 split-and-merge transaction IDs.'
    ]
  }
];

export function generateSyntheticDataset(seed = 20261023): {
  accounts: Account[];
  customers: Customer[];
  transactions: Transaction[];
} {
  const rand = createSeededRandom(seed);
  const accounts: Account[] = [];
  const customers: Customer[] = [];
  const transactions: Transaction[] = [];

  const totalAccounts = 85;
  const accountTypes: Account['account_type'][] = [
    'Savings',
    'Savings',
    'Current',
    'Corporate',
    'Merchant',
    'NRO'
  ];

  for (let i = 1; i <= totalAccounts; i++) {
    const id = `ACC-${String(i).padStart(3, '0')}`;
    const firstName = INDIAN_FIRST_NAMES[Math.floor(rand() * INDIAN_FIRST_NAMES.length)];
    const lastName = INDIAN_LAST_NAMES[Math.floor(rand() * INDIAN_LAST_NAMES.length)];
    const holderName = CORPORATE_NAMES[id] || `${firstName} ${lastName}`;
    const city = INDIAN_CITIES[Math.floor(rand() * INDIAN_CITIES.length)];
    const accType =
      id === 'ACC-050' || id === 'ACC-055' || id === 'ACC-031' || id === 'ACC-014'
        ? 'Corporate'
        : id === 'ACC-001' || id === 'ACC-042'
        ? 'Savings'
        : accountTypes[Math.floor(rand() * accountTypes.length)];

    const isMuleNode = ['ACC-022', 'ACC-023', 'ACC-024', 'ACC-051', 'ACC-052', 'ACC-053', 'ACC-054'].includes(id);
    const ageDays = isMuleNode
      ? Math.floor(18 + rand() * 35)
      : Math.floor(180 + rand() * 1800);

    const typicalAmount =
      accType === 'Corporate'
        ? Math.round((25000 + rand() * 45000) / 100) * 100
        : Math.round((2500 + rand() * 8500) / 100) * 100;

    const dailyFreq = Number((0.8 + rand() * 1.8).toFixed(2));
    const sampleSize = isMuleNode ? 4 : Math.floor(12 + rand() * 25);

    let primaryScenario: ScenarioId = 'scenario_1_normal';
    if (['ACC-014', 'ACC-015', 'ACC-016', 'ACC-017', 'ACC-018', 'ACC-019', 'ACC-020'].includes(id)) {
      primaryScenario = 'scenario_2_split';
    } else if (['ACC-021', 'ACC-022', 'ACC-023', 'ACC-024', 'ACC-025'].includes(id)) {
      primaryScenario = 'scenario_3_mule';
    } else if (['ACC-031', 'ACC-032', 'ACC-033', 'ACC-034'].includes(id)) {
      primaryScenario = 'scenario_4_circular';
    } else if (['ACC-042', 'ACC-043', 'ACC-044', 'ACC-045', 'ACC-046', 'ACC-047'].includes(id)) {
      primaryScenario = 'scenario_5_burst';
    } else if (['ACC-050', 'ACC-051', 'ACC-052', 'ACC-053', 'ACC-054', 'ACC-055', 'ACC-056'].includes(id)) {
      primaryScenario = 'scenario_6_split_merge';
    }

    const account: Account = {
      account_id: id,
      holder_name: holderName,
      account_type: accType,
      account_age_days: ageDays,
      branch_city: city,
      kyc_tier: isMuleNode ? 'Basic / Minimum KYC' : ageDays > 365 ? 'Full KYC' : 'Standard KYC',
      balance_inr: Math.round((85000 + rand() * 1450000) / 100) * 100,
      historical_tx_count: sampleSize,
      typical_tx_amount: id === 'ACC-042' ? 4000 : typicalAmount,
      activity_frequency_per_day: id === 'ACC-042' ? 1.1 : dailyFreq,
      baseline: {
        typicalAmount: id === 'ACC-042' ? 4000 : typicalAmount,
        amountStdDev: id === 'ACC-042' ? 1200 : Math.round(typicalAmount * 0.32),
        dailyFrequency: id === 'ACC-042' ? 1.1 : dailyFreq,
        activeHoursStart: 9,
        activeHoursEnd: 20,
        uniqueCounterparties: isMuleNode ? 2 : Math.floor(4 + rand() * 8),
        avgIntervalHours: Number((14 + rand() * 18).toFixed(1)),
        inOutRatio: Number((0.85 + rand() * 0.35).toFixed(2)),
        newBeneficiaryRate: 0.12,
        repeatedPatternRate: 0.15,
        sampleSize,
      },
      risk_score: 12,
      risk_level: 'Low',
      risk_status: 'Normal',
      flagged_reasons: [],
      primary_scenario: primaryScenario,
    };

    accounts.push(account);

    customers.push({
      customer_id: `CUST-${String(i).padStart(3, '0')}`,
      account_id: id,
      full_name: holderName,
      email: `${holderName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.')}@synthbank.in`,
      phone: `+91 98${String(Math.floor(10000000 + rand() * 89999999))}`,
      city,
      occupation: accType === 'Corporate' ? 'Corporate Treasury' : accType === 'Merchant' ? 'Retail Merchant' : 'Salaried Professional',
      joined_date: new Date(Date.now() - ageDays * 86400000).toISOString().split('T')[0],
      security_notifications: [
        {
          id: `NOTIF-${id}-1`,
          timestamp: '2026-10-22T10:15:00+05:30',
          title: 'Periodic KYC Verification Active',
          description: `Account ${id} baseline behavioral telemetry is operating within standard parameters.`,
          severity: 'Low',
          acknowledged: true,
        },
      ],
    });
  }

  let txCounter = 1000;
  const nextTxId = () => `TXN-${++txCounter}`;

  const txTypes: Transaction['transaction_type'][] = ['UPI', 'IMPS', 'NEFT', 'RTGS', 'Internal Transfer'];
  const channels: Transaction['channel'][] = ['Mobile App', 'NetBanking', 'UPI Intent', 'API Gateway', 'Branch'];

  // 1. Generate 960 normal background transactions across all accounts (Scenario 1)
  // Spanning 2026-10-16 to 2026-10-22 during daytime hours
  const baseStartMs = new Date('2026-10-16T09:00:00+05:30').getTime();
  for (let i = 0; i < 960; i++) {
    const senderIdx = Math.floor(rand() * totalAccounts);
    let receiverIdx = Math.floor(rand() * totalAccounts);
    if (receiverIdx === senderIdx) receiverIdx = (senderIdx + 1) % totalAccounts;

    const sender = accounts[senderIdx];
    const receiver = accounts[receiverIdx];

    // Daytime hour 9..20 IST
    const dayOffset = Math.floor(rand() * 6);
    const hourOffset = 9 + Math.floor(rand() * 11);
    const minOffset = Math.floor(rand() * 60);
    const tsDate = new Date(
      baseStartMs + (dayOffset * 24 + (hourOffset - 9)) * 3600000 + minOffset * 60000
    );

    const amountFactor = 0.65 + rand() * 0.75;
    const amount = Math.max(500, Math.round((sender.typical_tx_amount * amountFactor) / 50) * 50);

    transactions.push({
      transaction_id: nextTxId(),
      sender_account_id: sender.account_id,
      receiver_account_id: receiver.account_id,
      amount,
      currency: 'INR',
      timestamp: tsDate.toISOString(),
      transaction_type: amount > 200000 ? 'RTGS' : amount > 50000 ? 'NEFT' : txTypes[Math.floor(rand() * 3)],
      channel: channels[Math.floor(rand() * 3)],
      status: 'Completed',
      location: sender.branch_city,
      device_id: `DEV-${sender.account_id.slice(-3)}-01`,
      risk_score: Math.floor(6 + rand() * 18),
      risk_level: 'Low',
      detected_patterns: [],
      risk_reasons: ['Routine transaction within established historical baseline'],
      scenario_id: 'scenario_1_normal',
      ground_truth_label: 0,
    });
  }

  // Ensure ACC-001 (Primary Demo Customer) has clear recent normal transactions + 1 medium alert notification
  const customer1Tx: Omit<Transaction, 'transaction_id'>[] = [
    {
      sender_account_id: 'ACC-002',
      receiver_account_id: 'ACC-001',
      amount: 85000,
      currency: 'INR',
      timestamp: '2026-10-21T10:30:00.000Z',
      transaction_type: 'NEFT',
      channel: 'NetBanking',
      status: 'Completed',
      location: 'Mumbai, MH',
      device_id: 'DEV-002-01',
      risk_score: 10,
      risk_level: 'Low',
      detected_patterns: [],
      risk_reasons: ['Monthly salary credit from verified employer'],
      scenario_id: 'scenario_1_normal',
      ground_truth_label: 0,
    },
    {
      sender_account_id: 'ACC-001',
      receiver_account_id: 'ACC-003',
      amount: 6400,
      currency: 'INR',
      timestamp: '2026-10-21T14:20:00.000Z',
      transaction_type: 'UPI',
      channel: 'Mobile App',
      status: 'Completed',
      location: 'Mumbai, MH',
      device_id: 'DEV-001-01',
      risk_score: 12,
      risk_level: 'Low',
      detected_patterns: [],
      risk_reasons: ['Routine household utility settlement'],
      scenario_id: 'scenario_1_normal',
      ground_truth_label: 0,
    },
    {
      sender_account_id: 'ACC-001',
      receiver_account_id: 'ACC-014',
      amount: 44500,
      currency: 'INR',
      timestamp: '2026-10-22T21:45:00.000Z',
      transaction_type: 'IMPS',
      channel: 'Mobile App',
      status: 'Under Review',
      location: 'Bengaluru, KA',
      device_id: 'DEV-001-NEW',
      risk_score: 58,
      risk_level: 'Medium',
      detected_patterns: ['Behavioral Deviation'],
      risk_reasons: [
        'Transfer to watchlist counterparty ACC-014',
        'Initiated from new device fingerprint DEV-001-NEW'
      ],
      scenario_id: 'scenario_1_normal',
      ground_truth_label: 0,
    },
  ];
  for (const t of customer1Tx) {
    const tid = nextTxId();
    transactions.push({ transaction_id: tid, ...t });
    if (t.risk_level === 'Medium') {
      customers[0].security_notifications.unshift({
        id: `NOTIF-ALERT-${tid}`,
        timestamp: t.timestamp,
        title: 'Unusual Transfer to Watchlist Beneficiary',
        description: `IMPS transfer ${tid} of ₹44,500 to ACC-014 was initiated from a new device (DEV-001-NEW). Please verify or report if unauthorized.`,
        severity: 'Medium',
        related_tx_id: tid,
        acknowledged: false,
      });
    }
  }

  // 2. Scenario 2: Split Transactions (ACC-014 splits funds just below ₹50,000 reporting threshold)
  const splitTargets = ['ACC-015', 'ACC-016', 'ACC-017', 'ACC-018', 'ACC-019', 'ACC-020', 'ACC-015', 'ACC-016'];
  const splitAmounts = [49500, 49200, 48900, 49800, 49100, 48700, 49400, 48800];
  splitTargets.forEach((targetId, idx) => {
    const ts = new Date(new Date('2026-10-22T11:05:00.000Z').getTime() + idx * 8 * 60000).toISOString();
    transactions.push({
      transaction_id: nextTxId(),
      sender_account_id: 'ACC-014',
      receiver_account_id: targetId,
      amount: splitAmounts[idx],
      currency: 'INR',
      timestamp: ts,
      transaction_type: 'IMPS',
      channel: 'API Gateway',
      status: 'Flagged',
      location: 'Mumbai, MH',
      device_id: 'DEV-014-API',
      risk_score: 82,
      risk_level: 'High',
      detected_patterns: ['Transaction Splitting', 'Fan-In / Fan-Out', 'Behavioral Deviation'],
      risk_reasons: [
        'Structured sub-threshold transfer (₹48k–₹49.8k just below ₹50,000 threshold)',
        'High-frequency outgoing fan-out from ACC-014 within 64 minutes',
        'Abnormal automated API Gateway dispatch'
      ],
      scenario_id: 'scenario_2_split',
      ground_truth_label: 1,
    });
  });

  // 3. Scenario 3: Money Mule Network (ACC-021 -> ACC-022 -> ACC-023 -> ACC-024 -> ACC-025)
  const muleChain = [
    { from: 'ACC-021', to: 'ACC-022', amount: 360000, minOffset: 0 },
    { from: 'ACC-022', to: 'ACC-023', amount: 354000, minOffset: 14 },
    { from: 'ACC-023', to: 'ACC-024', amount: 348500, minOffset: 29 },
    { from: 'ACC-024', to: 'ACC-025', amount: 343000, minOffset: 46 },
    // Secondary mule feeder into ACC-022
    { from: 'ACC-026', to: 'ACC-022', amount: 145000, minOffset: 5 },
    { from: 'ACC-022', to: 'ACC-025', amount: 142000, minOffset: 22 },
  ];
  muleChain.forEach((hop) => {
    const ts = new Date(new Date('2026-10-22T13:10:00.000Z').getTime() + hop.minOffset * 60000).toISOString();
    transactions.push({
      transaction_id: nextTxId(),
      sender_account_id: hop.from,
      receiver_account_id: hop.to,
      amount: hop.amount,
      currency: 'INR',
      timestamp: ts,
      transaction_type: 'IMPS',
      channel: 'Mobile App',
      status: 'Flagged',
      location: 'Hyderabad, TS',
      device_id: 'DEV-MULE-SHARED-77',
      risk_score: 86,
      risk_level: 'High',
      detected_patterns: ['Rapid Pass-Through', 'Multi-Hop Suspicious Networks', 'Behavioral Deviation'],
      risk_reasons: [
        'Rapid pass-through (>96% funds forwarded within 18 minutes)',
        'Shared device fingerprint DEV-MULE-SHARED-77 across sequential hops',
        'Newly onboarded minimum-KYC intermediary account'
      ],
      scenario_id: 'scenario_3_mule',
      ground_truth_label: 1,
    });
  });

  // 4. Scenario 4: Circular Transfers (ACC-031 -> ACC-032 -> ACC-033 -> ACC-034 -> ACC-031)
  const circularHops = [
    { from: 'ACC-031', to: 'ACC-032', amount: 485000, minOffset: 0 },
    { from: 'ACC-032', to: 'ACC-033', amount: 478000, minOffset: 21 },
    { from: 'ACC-033', to: 'ACC-034', amount: 472000, minOffset: 47 },
    { from: 'ACC-034', to: 'ACC-031', amount: 465000, minOffset: 78 },
  ];
  circularHops.forEach((hop) => {
    const ts = new Date(new Date('2026-10-22T15:00:00.000Z').getTime() + hop.minOffset * 60000).toISOString();
    transactions.push({
      transaction_id: nextTxId(),
      sender_account_id: hop.from,
      receiver_account_id: hop.to,
      amount: hop.amount,
      currency: 'INR',
      timestamp: ts,
      transaction_type: 'RTGS',
      channel: 'NetBanking',
      status: 'Flagged',
      location: 'Ahmedabad, GJ',
      device_id: `DEV-${hop.from.slice(-3)}-CORP`,
      risk_score: 89,
      risk_level: 'High',
      detected_patterns: ['Circular Movement', 'Rapid Pass-Through', 'Multi-Hop Suspicious Networks'],
      risk_reasons: [
        'Closed 4-account directed cycle returning 95.8% of principal to originator ACC-031',
        'Chronologically ordered round-trip completed within 78 minutes'
      ],
      scenario_id: 'scenario_4_circular',
      ground_truth_label: 1,
    });
  });

  // 5. Scenario 5: Rapid Transaction Burst (ACC-042 nocturnal burst at 2:00 AM IST)
  // Note: 2026-10-22T20:40:00.000Z is 02:10 AM IST on 2026-10-23!
  const burstReceivers = ['ACC-043', 'ACC-044', 'ACC-045', 'ACC-046', 'ACC-047', 'ACC-043', 'ACC-044', 'ACC-045', 'ACC-046'];
  const burstAmounts = [95000, 88000, 92000, 79000, 94000, 86000, 91000, 84000, 95000];
  burstReceivers.forEach((targetId, idx) => {
    const ts = new Date(new Date('2026-10-22T20:25:00.000Z').getTime() + idx * 4 * 60000).toISOString();
    transactions.push({
      transaction_id: nextTxId(),
      sender_account_id: 'ACC-042',
      receiver_account_id: targetId,
      amount: burstAmounts[idx],
      currency: 'INR',
      timestamp: ts,
      transaction_type: 'IMPS',
      channel: 'Mobile App',
      status: 'Flagged',
      location: 'Kolkata, WB',
      device_id: 'DEV-9941-X',
      risk_score: 91,
      risk_level: 'High',
      detected_patterns: ['Transaction Velocity', 'Behavioral Deviation', 'Fan-In / Fan-Out'],
      risk_reasons: [
        'Transfer amount ₹84k–₹95k is >21x account typical baseline (₹4,000)',
        'Executed during nocturnal hours (~02:10 AM IST) outside 09:00–20:00 baseline',
        '9 rapid transfers in 32 minutes to previously unseen counterparties'
      ],
      scenario_id: 'scenario_5_burst',
      ground_truth_label: 1,
    });
  });

  // 6. Scenario 6: Split-and-Merge Network (ACC-050 -> ACC-051..054 -> ACC-055 -> ACC-056)
  const splitMergeTxs = [
    // Phase 1: Fan-out split from ACC-050
    { from: 'ACC-050', to: 'ACC-051', amount: 310000, minOffset: 0, phase: 'Split Branch 1' },
    { from: 'ACC-050', to: 'ACC-052', amount: 310000, minOffset: 4, phase: 'Split Branch 2' },
    { from: 'ACC-050', to: 'ACC-053', amount: 310000, minOffset: 9, phase: 'Split Branch 3' },
    { from: 'ACC-050', to: 'ACC-054', amount: 310000, minOffset: 13, phase: 'Split Branch 4' },
    // Phase 2: Convergence merge into ACC-055
    { from: 'ACC-051', to: 'ACC-055', amount: 304000, minOffset: 26, phase: 'Convergence Merge 1' },
    { from: 'ACC-052', to: 'ACC-055', amount: 303500, minOffset: 31, phase: 'Convergence Merge 2' },
    { from: 'ACC-053', to: 'ACC-055', amount: 305000, minOffset: 36, phase: 'Convergence Merge 3' },
    { from: 'ACC-054', to: 'ACC-055', amount: 302000, minOffset: 41, phase: 'Convergence Merge 4' },
    // Phase 3: Aggregation settlement outbound from ACC-055 to ACC-056
    { from: 'ACC-055', to: 'ACC-056', amount: 1195000, minOffset: 55, phase: 'Downstream Settlement' },
  ];

  splitMergeTxs.forEach((item) => {
    const ts = new Date(new Date('2026-10-22T17:00:00.000Z').getTime() + item.minOffset * 60000).toISOString();
    transactions.push({
      transaction_id: nextTxId(),
      sender_account_id: item.from,
      receiver_account_id: item.to,
      amount: item.amount,
      currency: 'INR',
      timestamp: ts,
      transaction_type: item.amount >= 500000 ? 'RTGS' : 'IMPS',
      channel: 'API Gateway',
      status: 'Flagged',
      location: 'Bengaluru, KA',
      device_id: 'DEV-SM-CLUSTER-09',
      risk_score: 94,
      risk_level: 'High',
      detected_patterns: [
        'Split-and-Merge Structures',
        'Multi-Hop Suspicious Networks',
        'Rapid Pass-Through',
        'Fan-In / Fan-Out'
      ],
      risk_reasons: [
        `Split-and-Merge ${item.phase}: Coordinated dispersion from ACC-050 and convergence into ACC-055`,
        '98% capital retention across parallel intermediary mule accounts within 55 minutes',
        'High-priority ARTT temporal pathway score'
      ],
      scenario_id: 'scenario_6_split_merge',
      ground_truth_label: 1,
    });
  });

  // Sort transactions chronologically
  transactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return { accounts, customers, transactions };
}

export interface CSVParseResult {
  valid: boolean;
  transactions: Transaction[];
  errors: string[];
}

const REQUIRED_CSV_HEADERS = [
  'transaction_id',
  'sender_account_id',
  'receiver_account_id',
  'amount',
  'timestamp',
  'transaction_type',
  'channel',
  'location'
];

export function parseTransactionsCSV(csvText: string): CSVParseResult {
  const errors: string[] = [];
  const parsedTransactions: Transaction[] = [];

  if (!csvText || !csvText.trim()) {
    return { valid: false, transactions: [], errors: ['CSV file is empty. Please provide header and data rows.'] };
  }

  const lines = csvText
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      valid: false,
      transactions: [],
      errors: ['CSV must contain a header row and at least one transaction row.'],
    };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const missingHeaders = REQUIRED_CSV_HEADERS.filter((req) => !headers.includes(req));
  if (missingHeaders.length > 0) {
    return {
      valid: false,
      transactions: [],
      errors: [`Missing required CSV columns: ${missingHeaders.join(', ')}`],
    };
  }

  const idxMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    idxMap[h] = i;
  });

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const cols = lines[rowIdx].split(',').map((c) => c.trim());
    if (cols.length < headers.length) {
      errors.push(`Row ${rowIdx + 1}: Expected ${headers.length} columns, found ${cols.length}.`);
      continue;
    }

    const txId = cols[idxMap['transaction_id']];
    const sender = cols[idxMap['sender_account_id']];
    const receiver = cols[idxMap['receiver_account_id']];
    const amountRaw = Number(cols[idxMap['amount']]);
    const timestampRaw = cols[idxMap['timestamp']];
    const txTypeRaw = cols[idxMap['transaction_type']] as Transaction['transaction_type'];
    const channelRaw = cols[idxMap['channel']] as Transaction['channel'];
    const location = cols[idxMap['location']] || 'Mumbai, MH';

    if (!txId || !sender || !receiver) {
      errors.push(`Row ${rowIdx + 1}: transaction_id, sender_account_id, and receiver_account_id cannot be empty.`);
      continue;
    }
    if (sender === receiver) {
      errors.push(`Row ${rowIdx + 1} (${txId}): Sender and receiver account cannot be identical (${sender}).`);
      continue;
    }
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      errors.push(`Row ${rowIdx + 1} (${txId}): Invalid amount "${cols[idxMap['amount']]}". Amount must be a positive number.`);
      continue;
    }
    const parsedDate = new Date(timestampRaw);
    if (isNaN(parsedDate.getTime())) {
      errors.push(`Row ${rowIdx + 1} (${txId}): Invalid ISO timestamp "${timestampRaw}".`);
      continue;
    }

    parsedTransactions.push({
      transaction_id: txId,
      sender_account_id: sender,
      receiver_account_id: receiver,
      amount: amountRaw,
      currency: 'INR',
      timestamp: parsedDate.toISOString(),
      transaction_type: ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Internal Transfer'].includes(txTypeRaw)
        ? txTypeRaw
        : 'IMPS',
      channel: ['Mobile App', 'NetBanking', 'API Gateway', 'Branch', 'UPI Intent'].includes(channelRaw)
        ? channelRaw
        : 'NetBanking',
      status: 'Completed',
      location,
      device_id: cols[idxMap['device_id']] || `DEV-CSV-${rowIdx}`,
      risk_score: 20,
      risk_level: 'Low',
      detected_patterns: [],
      risk_reasons: ['Imported via CSV batch'],
      scenario_id: 'scenario_1_normal',
      ground_truth_label: 0,
    });
  }

  return {
    valid: errors.length === 0 && parsedTransactions.length > 0,
    transactions: parsedTransactions,
    errors,
  };
}

export function getSampleCSVTemplate(): string {
  return [
    'transaction_id,sender_account_id,receiver_account_id,amount,timestamp,transaction_type,channel,location,device_id',
    'TXN-CSV-9001,ACC-050,ACC-051,295000,2026-10-23T06:15:00+05:30,IMPS,API Gateway,Bengaluru KA,DEV-CSV-01',
    'TXN-CSV-9002,ACC-051,ACC-055,291000,2026-10-23T06:28:00+05:30,IMPS,API Gateway,Bengaluru KA,DEV-CSV-01',
    'TXN-CSV-9003,ACC-001,ACC-004,3500,2026-10-23T11:10:00+05:30,UPI,Mobile App,Mumbai MH,DEV-001-01',
  ].join('\n');
}

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const header =
    'transaction_id,sender_account_id,receiver_account_id,amount,currency,timestamp,transaction_type,channel,status,location,device_id,risk_score,risk_level,detected_patterns,scenario_id';
  const rows = transactions.map((t) =>
    [
      t.transaction_id,
      t.sender_account_id,
      t.receiver_account_id,
      t.amount,
      t.currency,
      t.timestamp,
      t.transaction_type,
      t.channel,
      t.status,
      `"${t.location.replace(/"/g, '""')}"`,
      t.device_id,
      t.risk_score,
      t.risk_level,
      `"${t.detected_patterns.join('; ')}"`,
      t.scenario_id,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}
