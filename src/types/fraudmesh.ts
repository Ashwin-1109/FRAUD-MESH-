export type RiskLevel = 'Low' | 'Medium' | 'High';

export type UserRole = 'PUBLIC' | 'ADMIN' | 'CUSTOMER' | 'INVESTIGATOR';

export type NavigationSection =
  | 'PUBLIC'
  | 'BANK_ADMIN'
  | 'CUSTOMER'
  | 'INVESTIGATOR'
  | 'RESEARCH';

export type NavigationPage =
  // Public
  | 'welcome'
  | 'platform-overview'
  | 'demo-access'
  // Bank Administration
  | 'exec-dashboard'
  | 'tx-monitoring'
  | 'account-management'
  | 'risk-intelligence'
  | 'alert-management'
  | 'analytics'
  | 'model-evaluation'
  | 'system-activity'
  // Customer
  | 'customer-dashboard'
  | 'customer-tx-history'
  | 'customer-tx-status'
  | 'customer-security-alerts'
  | 'customer-report-activity'
  // Investigator
  | 'investigator-dashboard'
  | 'money-trail-explorer'
  | 'artt-traversal'
  | 'digital-dna'
  | 'suspicious-networks'
  | 'ai-forensic-copilot'
  | 'case-management'
  | 'investigation-reports'
  // FraudMesh 2.0 8 Primary Modules
  | 'command-center'
  | 'banking-transactions'
  | 'detection-ml-lab'
  | 'investigation-workspace'
  | 'admin-audit'
  // Research and Demonstration
  | 'scenario-simulator'
  | 'algorithm-visualization'
  | 'model-comparison'
  | 'concept-explorer'
  | 'architecture-viewer';

export type ScenarioId =
  | 'scenario_1_normal'
  | 'scenario_2_split'
  | 'scenario_3_mule'
  | 'scenario_4_circular'
  | 'scenario_5_burst'
  | 'scenario_6_split_merge';

export type DetectorId =
  | 'DET-SPLIT'
  | 'DET-CYCLE'
  | 'DET-FAN'
  | 'DET-PASSTHROUGH'
  | 'DET-VELOCITY'
  | 'DET-DNA'
  | 'DET-ARTT'
  | 'DET-SPLIT-MERGE';

export interface BehavioralBaseline {
  typicalAmount: number;
  amountStdDev: number;
  dailyFrequency: number;
  activeHoursStart: number;
  activeHoursEnd: number;
  uniqueCounterparties: number;
  avgIntervalHours: number;
  inOutRatio: number;
  newBeneficiaryRate: number;
  repeatedPatternRate: number;
  sampleSize: number;
}

export interface Account {
  account_id: string;
  holder_name: string;
  account_type: 'Savings' | 'Current' | 'Corporate' | 'NRO' | 'Merchant';
  account_age_days: number;
  branch_city: string;
  kyc_tier: 'Full KYC' | 'Standard KYC' | 'Basic / Minimum KYC';
  balance_inr: number;
  historical_tx_count: number;
  typical_tx_amount: number;
  activity_frequency_per_day: number;
  baseline: BehavioralBaseline;
  risk_score: number;
  risk_level: RiskLevel;
  risk_status: 'Normal' | 'Watchlist' | 'Under Investigation' | 'Elevated Risk';
  flagged_reasons: string[];
  primary_scenario?: ScenarioId;
}

export interface Customer {
  customer_id: string;
  account_id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  occupation: string;
  joined_date: string;
  security_notifications: CustomerSecurityNotification[];
}

export interface CustomerSecurityNotification {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: RiskLevel;
  related_tx_id?: string;
  acknowledged: boolean;
  reported_by_customer?: boolean;
}

export interface Transaction {
  transaction_id: string;
  sender_account_id: string;
  receiver_account_id: string;
  amount: number;
  currency: 'INR';
  timestamp: string; // ISO string in Asia/Kolkata context
  transaction_type: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Internal Transfer';
  channel: 'Mobile App' | 'NetBanking' | 'API Gateway' | 'Branch' | 'UPI Intent';
  status: 'Completed' | 'Under Review' | 'Flagged' | 'Reported by Customer';
  location: string;
  device_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  detected_patterns: string[];
  risk_reasons: string[];
  scenario_id: ScenarioId;
  ground_truth_label: 0 | 1; // Synthetic evaluation label only (never used in detection or ML input)
}

export interface TransactionFeature {
  transaction_id: string;
  amountDeviation: number; // Normalized 0..1
  txFrequency: number; // Normalized 0..1
  accountAgeNorm: number; // Normalized 0..1 (higher for newer accounts)
  temporalAnomaly: number; // Normalized 0..1 (odd hours)
  counterpartyNovelty: number; // Normalized 0..1
  inOutDegreeRatio: number; // Normalized 0..1
  dnaAnomalyScore: number; // Normalized 0..1
  graphCentrality: number; // Normalized 0..1
  velocityScore: number; // Normalized 0..1
}

export interface DigitalDNAFeatureAxis {
  feature: string;
  key: string;
  baselineNormalized: number; // 0..100
  currentNormalized: number; // 0..100
  baselineRaw: string;
  currentRaw: string;
  deviationScore: number; // 0..100
  explanation: string;
}

export interface DigitalDNAProfile {
  account_id: string;
  holder_name: string;
  computed_at: string;
  anomaly_score: number; // 0..100
  risk_level: RiskLevel;
  sufficiency: 'Sufficient Baseline' | 'Insufficient baseline';
  sample_count: number;
  axes: DigitalDNAFeatureAxis[];
  unusual_features: string[];
  supporting_tx_ids: string[];
  summary_explanation: string;
  anomaly_timeline: {
    timestamp: string;
    tx_id: string;
    amount: number;
    anomaly_score: number;
    note: string;
  }[];
}

export interface GraphNode {
  id: string;
  holder_name: string;
  account_type: Account['account_type'];
  risk_score: number;
  risk_level: RiskLevel;
  inDegree: number;
  outDegree: number;
  totalInflow: number;
  totalOutflow: number;
  weightedVolume: number;
  uniqueCounterparties: number;
  componentId: number;
  inCycle: boolean;
  centrality: number;
  passThroughRatio: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  timestamp: string;
  transaction_type: Transaction['transaction_type'];
  channel: Transaction['channel'];
  risk_score: number;
  risk_level: RiskLevel;
  detected_patterns: string[];
  scenario_id: ScenarioId;
}

export interface ARTTWeights {
  transactionAnomaly: number; // default 0.30
  temporalVelocity: number; // default 0.25
  structuralPattern: number; // default 0.20
  counterpartyRisk: number; // default 0.15
  behavioralNovelty: number; // default 0.10
}

export interface ARTTConfig {
  startAccountId: string;
  maxDepth: number;
  timeWindowHours: number;
  minRiskThreshold: number;
  maxPaths: number;
  weights: ARTTWeights;
}

export interface TraversalStepScoreBreakdown {
  transactionAnomaly: number;
  temporalVelocity: number;
  structuralPattern: number;
  counterpartyRisk: number;
  behavioralNovelty: number;
  weightedScore: number;
}

export interface TraversalPath {
  path_id: string;
  rank: number;
  accounts: string[];
  transactions: Transaction[];
  path_risk_score: number;
  risk_level: RiskLevel;
  total_amount: number;
  amount_retention_ratio: number;
  duration_minutes: number;
  detected_structures: string[];
  score_breakdown: TraversalStepScoreBreakdown;
  explanation: string;
}

export interface RejectedEdge {
  transaction_id: string;
  from_account: string;
  to_account: string;
  amount: number;
  timestamp: string;
  rejection_reason: string;
}

export interface TraversalAnimationStep {
  stepIndex: number;
  currentAccount: string;
  inspectedEdgeId: string;
  targetAccount: string;
  accepted: boolean;
  reason: string;
  cumulativeScore: number;
  timestamp: string;
}

export interface TraversalResult {
  config: ARTTConfig;
  executed_at: string;
  candidate_paths: TraversalPath[];
  rejected_edges: RejectedEdge[];
  animation_steps: TraversalAnimationStep[];
  visited_accounts: string[];
  summary_note: string;
}

export interface RiskContribution {
  factor: string;
  weight: number;
  rawScore: number;
  weightedContribution: number;
  reason: string;
}

export interface RiskAssessment {
  target_id: string; // transaction_id or account_id
  target_type: 'Transaction' | 'Account';
  risk_score: number; // 0..100
  risk_level: RiskLevel;
  triggered_detectors: string[];
  evidence_tx_ids: string[];
  contributions: RiskContribution[];
  explanation: string;
}

export interface RiskConfig {
  lowMax: number; // default 34
  mediumMax: number; // default 69
}

export interface FraudAlert {
  alert_id: string;
  detector_id: DetectorId;
  detector_name: string;
  risk_score: number;
  risk_level: RiskLevel;
  timestamp: string;
  involved_accounts: string[];
  transaction_ids: string[];
  total_volume_inr: number;
  evidence: string[];
  explanation: string;
  case_status: 'Unassigned' | 'Case Created' | 'Under Review' | 'Dismissed';
  linked_case_id?: string;
  scenario_id: ScenarioId;
}

export type CaseStatus =
  | 'Open'
  | 'Under Review'
  | 'Escalated'
  | 'Closed – No Issue Found'
  | 'Closed – Further Action Recommended';

export interface InvestigationNote {
  note_id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface CaseDecisionRecord {
  id: string;
  timestamp: string;
  actor: string;
  previous_status: CaseStatus | 'Created';
  new_status: CaseStatus;
  rationale: string;
}

export interface InvestigationCase {
  case_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: CaseStatus;
  assigned_investigator: string;
  source_alert_ids: string[];
  involved_accounts: string[];
  linked_transaction_ids: string[];
  risk_score: number;
  risk_level: RiskLevel;
  detected_indicators: string[];
  notes: InvestigationNote[];
  decision_history: CaseDecisionRecord[];
  customer_reported?: boolean;
  ai_summary?: CopilotStructuredResponse;
}

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  actor_role: UserRole;
  category: 'Transaction' | 'Detection' | 'ARTT' | 'Case' | 'Simulation' | 'System' | 'CSV';
  action: string;
  details: string;
  related_id?: string;
}

export interface SimulationScenario {
  id: ScenarioId;
  number: number;
  title: string;
  subtitle: string;
  badge: string;
  primary_account: string;
  involved_accounts: string[];
  what_happened: string;
  what_detected: string[];
  why_suspicious: string;
  how_artt_helped: string;
  how_dna_helped: string;
  next_checks: string[];
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface ModelPredictionRecord {
  transaction_id: string;
  probability: number;
  predicted_label: 0 | 1;
  actual_label: 0 | 1;
}

export interface ModelEvaluation {
  model_id: 'heuristic_graph' | 'logistic_regression' | 'random_forest' | 'xgboost_gbdt' | 'deep_neural_net';
  model_name: string;
  category: 'Rule-Based & Graph Detection' | 'Trained Statistical ML' | 'Trained Tree Ensemble' | 'Trained Neural Network';
  status: 'Trained & Active' | 'Not trained / Not configured';
  training_samples: number;
  test_samples: number;
  split_method: string;
  threshold: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  fpr: number;
  tpr: number;
  roc_auc: number;
  confusion_matrix: ConfusionMatrix;
  roc_curve: { fpr: number; tpr: number; threshold: number }[];
  feature_importances: { feature: string; weight: number }[];
  predictions: ModelPredictionRecord[];
  notes: string;
}

export interface CopilotStructuredResponse {
  investigation_summary: string;
  observed_indicators: string[];
  evidence_references: string[];
  uncertainty_limitations: string;
  suggested_next_checks: string[];
  source_mode: 'Gemini AI Forensic Copilot' | 'Deterministic Evidence Engine (Fallback)';
  generated_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  avatarBadge: string;
  department: string;
  accountId?: string;
  permissions: string[];
  bio?: string;
}

export interface TransactionExplanation {
  transaction_id: string;
  deduction_title: string;
  verdict: 'HIGH_RISK_ANOMALY' | 'LEGITIMATE_NORMAL';
  sherlock_observation: string;
  why_flagged_or_cleared: string[];
  network_linkage_analysis: string;
  recommended_action: string;
  cited_entities: string[];
  analyzed_at: string;
}

