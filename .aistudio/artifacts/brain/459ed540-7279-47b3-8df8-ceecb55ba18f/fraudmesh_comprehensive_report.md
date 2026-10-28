# FraudMesh: Complete Technical & Forensic Architecture Report
**Intelligent Financial Crime Detection & Graph Forensic Platform**
*Uncover Hidden Connections. Decode Financial Crime.*

---

## 1. Executive Summary & Purpose

**FraudMesh** is a specialized, production-grade anti-money laundering (AML) and financial graph forensics platform designed to uncover coordinated money laundering topologies, mule conduits, circular fund flows, and anomalous transaction behaviors across temporal financial networks. 

Traditional rule-based transaction monitoring systems analyze transactions in isolation, missing complex multi-hop schemes such as **Split-and-Merge (Smurfing/Fan-Out Fan-In)**, **Circular Wash Transfers**, **Layered Mule Chains**, and **Temporal Velocity Bursts**. FraudMesh bridges this gap by combining:
1. **D3.js Directed Graph Analytics** for real-time visual forensics and multi-hop neighborhood exploration.
2. **ARTT (Adaptive Risk-Aware Temporal Transaction Traverser)**, a priority-queue graph traversal algorithm enforcing chronological ordering and fund retention continuity.
3. **Transaction Digital DNA**, a 10-axis behavioral baseline comparison engine distinguishing habitual rhythms from anomalous shifts.
4. **8 Modular Pattern Detectors** and a centralized 0–100 risk scoring engine with granular explainability.
5. **In-Memory Machine Learning Benchmark Suite** training and evaluating 5 distinct classifiers without label leakage.
6. **Server-Side Gemini AI Forensic Copilot** generating structured case narratives and statutory filing recommendations.

---

## 2. Platform Architecture & 8-Stage Real-Time Pipeline

FraudMesh executes an 8-stage real-time intelligence pipeline that processes raw financial transactions into forensic case files:

```
[1. Ingestion / Transfer] ──► [2. Graph Building & Adjacency]
           │                                 │
           ▼                                 ▼
[3. Digital DNA Profiling]  ◄──►  [4. 8 Pattern Detectors]
           │                                 │
           ▼                                 ▼
[5. Centralized Risk Engine] ──► [6. ARTT Multi-Hop Traversal]
           │                                 │
           ▼                                 ▼
[7. Machine Learning Inference] ► [8. Copilot & Case Management]
```

### The 8 Stages:
1. **Transaction Ingestion & Ledger Validation**: Validates account existence, balances, velocity constraints, idempotency, and currency standards (`INR`, `Asia/Kolkata` timezone).
2. **Directed Graph Assembly & Topology Analysis**: Updates node in/out-degrees, volume-weighted adjacency lists, Tarjan cycle detection, and betweenness centrality.
3. **Digital DNA Baseline Comparison**: Evaluates 10 behavioral dimensions against historical baselines, outputting deviation scores and data sufficiency flags (`Sufficient Baseline` vs. `Insufficient baseline`).
4. **Modular Pattern Detection**: Runs 8 independent algorithmic detectors (`DET-SPLIT`, `DET-CYCLE`, `DET-FAN`, `DET-PASSTHROUGH`, `DET-VELOCITY`, `DET-DNA`, `DET-ARTT`, `DET-SPLIT-MERGE`).
5. **Centralized Risk Scoring**: Synthesizes detector activations, behavioral deviations, and counterparty risks into a calibrated `[0, 100]` risk score.
6. **ARTT Temporal Graph Traversal**: Automatically follows suspicious fund flows from origin to destination across multi-hop paths under strict temporal and amount retention constraints.
7. **Multi-Model Inference & Benchmarking**: Evaluates transactions against 5 ML models (Rule-Based, Logistic Regression, Random Forest, GBDT, Deep MLP).
8. **Forensic Copilot & Case Escalation**: Generates structured forensic summaries and binds evidence to official case dockets for regulatory escalation.

---

## 3. Synthetic Banking Mesh & 6 Fraud Scenarios

The platform incorporates a reproducible synthetic banking mesh generated with fixed seed `#20261023`:
- **85 Accounts** (`ACC-001` through `ACC-085`), covering Individual Savings, Current/Corporate, and Suspicious Intermediary profiles.
- **~1,000 Processed Transfers** representing over INR 2.46 Crores in ledger movement.
- **6 Realistic Financial Topologies**:
  1. `scenario_1_normal` (Baseline Control · `ACC-001`): Routine salary credits, household UPI transfers, grocery purchases, and utility bill payments during daytime hours.
  2. `scenario_2_split` (Structuring / Smurfing · `ACC-014`): Systematic division of large lump sums into 8 sub-INR 50,000 payments to deliberately evade regulatory reporting thresholds.
  3. `scenario_3_mule` (Mule Chain · `ACC-021` → `ACC-025`): Rapid pass-through layering where funds hit newly activated accounts and exit within minutes.
  4. `scenario_4_circular` (Circular Wash Transfers · `ACC-031` → `ACC-032` → `ACC-033` → `ACC-034` → `ACC-031`): Closed directed loop returning capital to the originator to create artificial turnover.
  5. `scenario_5_burst` (Nocturnal Velocity Burst · `ACC-042`): Sudden high-frequency transfers between 01:00 AM and 03:00 AM IST on dormant accounts.
  6. `scenario_6_split_merge` (Complex Split-and-Merge · `ACC-050` → `ACC-055`): Coordinated fan-out from `ACC-050` through 4 intermediary conduits (`ACC-051`..`ACC-054`) converging into collection node `ACC-055`.

---

## 4. Interactive D3.js Directed Money Trail Graph

The **Money Trail Explorer** renders an interactive directed force-directed graph:
- **Node Encodings**: Node radius is scaled by total volume, color-coded by composite risk level (`Low` = Emerald, `Medium` = Amber, `High` = Crimson), with outer rings indicating cycle membership or active ARTT focus.
- **Edge Encodings**: Directed arrows with transaction amount labels (`INR 3.10L`, `INR 48k`), color-coded by risk, with animated dashing on flagged pathways.
- **Interactive Controls**:
  - Hop Distance Expansion: 1-Hop, 2-Hop, 3-Hop, or Full Mesh.
  - Risk Filter: All, High Risk Only, Medium Risk, Low Risk.
  - Amount Filter: ≥ INR 0, ≥ INR 25,000, ≥ INR 48,000 (Structuring), ≥ INR 1,00,000.
  - Viewport Controls: Zoom In, Zoom Out, Reset Center, Clamped Bounds, and SVG Vector Export.

---

## 5. ARTT: Adaptive Risk-Aware Temporal Transaction Traverser

ARTT is FraudMesh's core proprietary multi-hop graph exploration algorithm:

### Core Rules:
1. **Strict Temporal Causality**: For any path `A -> B -> C`, the incoming transaction `T_in(A -> B)` must occur **strictly before** the outgoing transaction `T_out(B -> C)`:
   $$\text{timestamp}(T_{out}) > \text{timestamp}(T_{in})$$
2. **Temporal Window Constraint**: The elapsed time between incoming and outgoing transfers must not exceed the configurable window (default: 48 hours).
3. **Amount Retention Continuity**: The outgoing amount must maintain continuity with the incoming pool:
   $$\text{minRetention} \le \frac{\text{amount}(T_{out})}{\text{amount}(T_{in})} \le \text{maxRetention}$$
4. **Adaptive Priority-Queue Selection**: Next-hop edges are evaluated using a 5-factor weighted objective:
   $$\text{Score} = w_1 \cdot \text{Risk} + w_2 \cdot \text{AmountRatio} + w_3 \cdot \text{TemporalProximity} + w_4 \cdot \text{PassThrough} + w_5 \cdot \text{Centrality}$$

### ARTT Features:
- **Full Traceability**: Logs every candidate edge examined, including acceptance or explicit rejection reasons (`violates_chronology`, `retention_ratio_out_of_bounds`, `max_depth_exceeded`).
- **Interactive Animation Controls**: Step (+1 Tx), Play/Pause, 1x/2x/4x speed selector, and pathway highlighting.
- **Explainability Panel**: Answers *"Why did ARTT select this path?"* with mathematical breakdowns for every selected edge.

---

## 6. Transaction Digital DNA Engine

Digital DNA models each account's habitual behavioral rhythm across **10 Orthogonal Axes**:

| Axis | Feature Name | Normal Rationale | Anomaly Indicator |
|---|---|---|---|
| 1 | **Typical Amount** | Routine payroll / expenses | Significant multiple of median |
| 2 | **Amount Variability** | Standard variance | Uncharacteristically zero variance (structuring) |
| 3 | **Daily Frequency** | 1–3 transfers per day | Sudden 10x spike in transfers |
| 4 | **Activity Hours** | Daytime banking (09:00–20:00 IST) | Nocturnal transactions (00:00–05:00 IST) |
| 5 | **Counterparty Breadth**| Known recurring contacts | Sudden fan-out to multiple novel nodes |
| 6 | **Interval Compression** | Hours/days between transactions | Seconds/minutes between transfers |
| 7 | **In/Out Pass-Through** | Balanced accumulation & spend | ~100% inflow-to-outflow matching in <1 hour |
| 8 | **New Beneficiaries** | Low percentage of novel targets | 100% transfers to first-time recipients |
| 9 | **Repeated Patterns** | Variable amounts | Identical amounts sent in rapid succession |
| 10 | **Behavioral Shift** | Steady rolling profile | Acute structural shift in composite score |

### Sufficiency Handling:
- **`Sufficient Baseline`**: Calculated when account history has ≥10 transactions, allowing full statistical deviation scoring.
- **`Insufficient baseline`**: Accounts with <10 transactions trigger a cold-start protective profile, preventing false positives while alerting investigators to thin history.

---

## 7. 8 Modular Fraud Pattern Detectors

FraudMesh runs 8 independent detectors evaluating structural, temporal, and statistical signatures:
1. **`DET-SPLIT` (Split Structuring)**: Flags high-frequency transfers just below regulatory reporting thresholds (e.g., INR 48,000–49,900) across short intervals.
2. **`DET-CYCLE` (Circular Wash Flows)**: Employs Tarjan's / DFS cycle detection to identify closed directed loops returning funds to originators.
3. **`DET-FAN` (Fan-Out / Fan-In)**: Identifies 1-to-N dispersion or N-to-1 aggregation exceeding configured branching ratios.
4. **`DET-PASSTHROUGH` (Rapid Conduit Transit)**: Detects intermediaries where incoming funds are disbursed within 30 minutes with >90% amount retention.
5. **`DET-VELOCITY` (Temporal Velocity Burst)**: Detects transaction acceleration exceeding 3 standard deviations above baseline, especially during nocturnal hours.
6. **`DET-DNA` (Digital DNA Anomaly)**: Triggers when the 10-axis behavioral deviation score exceeds threshold (≥65).
7. **`DET-ARTT` (Temporal Multi-Hop Trail)**: Activated when ARTT identifies a verified multi-hop pathway connecting high-risk originators and terminators.
8. **`DET-SPLIT-MERGE` (Split-and-Merge Topology)**: Detects coordinated structures combining both fan-out structuring and subsequent fan-in consolidation.

---

## 8. Machine Learning Models & Evaluation Benchmarks

FraudMesh includes a genuine, in-memory ML evaluation pipeline trained on a 60/40 hold-out split without ground-truth label leakage:
- **Rule-Based Graph Engine**: Direct deterministic heuristic benchmark.
- **Logistic Regression**: Linear statistical classifier with sigmoid calibration.
- **Random Forest**: Ensemble of decision trees with bagging.
- **XGBoost-Style GBDT**: Gradient boosted decision trees optimizing pseudo-residuals.
- **Deep Neural Network MLP**: Multi-layer perceptron with non-linear activations.

### Interactive Evaluation Metrics:
- **Live Decision Threshold Slider** (0.10 to 0.90) dynamically recalculating the Confusion Matrix (`TP`, `FP`, `TN`, `FN`).
- Real-time computation of **Precision**, **Recall**, **F1 Score**, **False Positive Rate (FPR)**, and **ROC-AUC**.

---

## 9. Server-Side AI Forensic Copilot

The AI Forensic Copilot resides in `server.ts` at `/api/copilot/analyze`:
- **Model**: Powered by `@google/genai` utilizing `gemini-3.8-flash`.
- **Structured Schema**: Guaranteed JSON response structure including Executive Summary, Network Topology Breakdown, Chronological Evidence Sequence, Forensic Findings, and Recommended Actions.
- **Deterministic Evidence-Grounded Fallback**: When `GEMINI_API_KEY` is not present, a deterministic graph-grounded engine compiles real evidence directly from graph metrics, detectors, and ARTT paths, ensuring 100% operational reliability.

---

## 10. Investigation Case Management & Reports

Investigators can track cases from initial detection to regulatory escalation:
- **Case Dossier**: Binds linked alerts, primary suspects, involved transaction IDs, and chronological timelines.
- **Interactive Actions**: Status transitions (`OPEN` -> `UNDER_INVESTIGATION` -> `ESCALATED_STR` -> `CLOSED_RESOLVED`), notes ledger with timestamp and author tags, and automated Copilot brief attachments.
- **12-Section Investigation Reports**: Generates formal, printable audit-ready reports ready for regulatory submission (e.g., FIU-IND Suspicious Transaction Reports).

---

## 11. Verification & Quality Assurance

FraudMesh includes an automated Node.js test suite in `/src/engine/fraudmesh.test.ts` verifying all core requirements:
- **TEST 1**: Normal transactions do not automatically produce high-risk alerts (`PASS`).
- **TEST 2**: Generated circular pattern (`ACC-031` -> `ACC-032` -> `ACC-033` -> `ACC-034`) is discovered by cycle detector (`PASS`).
- **TEST 3**: ARTT honors traversal depth and transaction-time constraints (`PASS`).
- **TEST 4**: Digital DNA updates after anomalous new transactions are processed (`PASS`).
- **TEST 5**: New customer transfer updates transactions, account balances, and graph edges consistently (`PASS`).
- **TEST 6**: Creating an investigation case preserves alert and transaction references (`PASS`).
- **TEST 7**: Malformed CSV files are rejected with descriptive validation messages (`PASS`).
- **TEST 8**: All account and transaction risk scores remain strictly within `[0, 100]` (`PASS`).
- **TEST 9**: Model evaluation metrics match exact confusion matrix formulas (`PASS`).
- **TEST 10**: Deterministic Copilot fallback produces complete evidence-grounded structured analysis (`PASS`).

**Result: 10/10 Unit Tests Passed. Zero Build Errors. Zero Console Errors.**
