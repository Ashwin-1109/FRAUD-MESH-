🛡️ FraudMesh 2.0 — Intelligent Financial Crime Detection & Graph Forensic Platform
FraudMesh 2.0 is a full-stack enterprise Anti-Money Laundering (AML), Graph Topology Forensics, and Behavioral Intelligence platform. It combines Directed Graph Analytics (D3.js + Tarjan Cycle Detection), Adaptive Risk-Aware Transaction Traversal (ARTT), 10-Axis Behavioral Digital DNA Fingerprinting, 8 Real-Time Structural Fraud Detectors, 5 Machine Learning Benchmark Models, and a low-latency Sherlock Holmes AI Forensic Investigator.
🌟 Core Pillars & Innovations
1. 🕸️ Directed Money Trail Graph Intelligence
Models every bank account as a Graph Node and every financial transfer as a Directed Weighted Edge.
Automatically computes structural graph metrics in real time: In-Degree, Out-Degree, Total Inflow/Outflow, Pass-Through Retention Ratio, Betweenness Centrality, and Connected Components.
Uses Tarjan / DFS Cycle Detection to uncover closed-loop circular money laundering rings (A → B → C → D → A).
2. 🧭 ARTT (Adaptive Risk-Aware Transaction Traversal) Engine
Replaces naive breadth-first graph search with a Best-First Priority-Queue Chronological Traversal algorithm.
Evaluates every candidate outgoing edge using a 5-Factor Composite Priority Score:
Transaction Anomaly (30%)
Temporal Velocity (25%)
Structural Pattern (20%)
Counterparty Risk (15%)
Behavioral Novelty (10%)
Enforces strict chronological ordering (
) and tracks Capital Retention Ratio (%) across multi-hop mule chains, with interactive Play / Step Hop / Reset animation on the D3.js network graph.
3. 🧬 10-Axis Behavioral Digital DNA Profiler
Fingerprints every account across 10 normalized behavioral dimensions (0–100) against its 90-day historical baseline:
Typical Amount Magnitude
Amount Variability ( Dispersion / CV )
Daily Transaction Velocity
Circadian Window Adherence (Nocturnal / Odd-Hour Activity)
Counterparty Breadth (Unique Beneficiaries)
Inter-Transaction Interval Regularity
Inflow-to-Outflow Pass-Through Ratio
Channel & Device Entropy
New Beneficiary Onboarding Rate
Repeated Structuring / Sub-Threshold Rate (< ₹50,000)
Automatically assigns each account a Structural Network Role (Primary Originator, Mule Conduit, Convergence Sink, Circular Ring Member) and a Digital DNA Phenotype (e.g., DNA-CIRCULAR-WASH, DNA-MULE-RELAY, DNA-SMURF-STRUCTURING).
4. 📂 All-in-One CSV Dataset Upload & PoC Fraud Predictor
Upload any bank transaction CSV (supports full 8-column ledgers as well as minimal sender,receiver,amount exports) or choose from 5 1-Click Benchmark Presets to immediately generate a unified 5-section forensic report on a single screen:
Section A — Fraud Type Prediction Banner: Explicitly classifies what type of fraud was committed (Circular Money Laundering Ring, Split-and-Merge Layering, Money Mule Pass-Through Chain, Structuring / Smurfing, High-Velocity Burst, or Clean Legitimate Flow) with confidence %, severity, and 3-pillar proof across Graph + ARTT + Digital DNA.
Section B — Interactive D3.js Network Graph: Live force-directed topology of the uploaded dataset.
Section C — ARTT Multi-Hop Trail Player: Step-by-step animated money trail reconstruction.
Section D — 10-Axis Digital DNA Radar & Account Role Table: Interactive radar chart and structural role assignments for every uploaded account.
Section E — Transaction Ledger & 1-Click AI Deduction: Row-level risk scores, triggered detectors, and instant AI explanations.
5. 🕵️‍♂️ Sherlock Holmes AI Forensic Copilot (Instant Fast Brief)
Floating multi-turn conversational investigator and 0ms Live Transaction Explainer.
Delivers an instant ⚡ FAST BRIEF followed by 🔍 KEY DEDUCTIONS with clickable evidence chips (ACC-..., TXN-..., DET-...) that jump directly to the relevant node or transaction in the platform.
6. 🎯 8 Real-Time Fraud Detectors & 5 ML Benchmark Models
8 Deterministic Pattern Detectors:
DET-SPLIT — Structuring / Smurfing (< ₹50,000 threshold evasion)
DET-PASSTHROUGH — Rapid Pass-Through Money Mule Conduit
DET-CYCLE — Circular Money Laundering / Wash Trading Loop
DET-FAN — High Fan-Out / Fan-In Dispersion & Aggregation
DET-VELOCITY — Temporal Burst & Nocturnal Velocity Spike
DET-SPLIT-MERGE — Split-and-Merge Diamond Layering Topology
DET-DNA — 10-Axis Behavioral Digital DNA Drift
DET-AMOUNT — Extreme Baseline Magnitude Outlier
5 Quantitative ML Models Compared:
Logistic Regression, Random Forest, Gradient Boosted Trees, Isolation Forest, and FraudMesh Hybrid Graph + Digital DNA Ensemble (evaluated across Precision, Recall, F1-Score, ROC-AUC, PR-AUC, False Positive Rate, and Confusion Matrices).
👥 4 Role-Based Workspaces (1-Click Switching)
Role	Persona	Primary Capabilities
🔍 Investigator	Inspector Lestrade & Task Force	Interactive D3 Money Trail Graph, ARTT Traversal Engine, 10-Axis Digital DNA Profiler, Case Management Kanban Board, SAR Dossier Export, Sherlock AI Copilot
🏛️ Bank Admin	Vikram Malhotra (CRO)	Executive Command Center, CSV Dataset Upload Studio, 8 Fraud Detectors Threshold Tuning, 5 ML Models Evaluation, Account & Transaction Ledgers, Security Audit Logs
👤 Customer	Priya Sharma (ACC-001)	Live Banking Transfer Simulator (UPI / IMPS / NEFT / RTGS), Personal Balance & Ledger History, Real-Time Security Alerts, 1-Click Suspicious Activity Dispute Reporting
🎓 PoC Researcher	Dr. John Watson	6 Fraud Scenario Replay Simulator, Interactive Algorithm Flowcharts, AML Concept Explorer, System Architecture Blueprint, 10-Slide Presentation Showcase Mode
🚀 Guided 5-Step Proof-of-Concept (PoC) Demo Flow
Use the persistent PoC Demo Flow Bar at the top of the application to demonstrate the complete platform in 5 clicks:
1. Upload CSV & Predict Fraud → Select a preset (e.g., Circular Wash Laundering Ring or Split-and-Merge Layering) or upload a custom .csv file to see the predicted fraud type, D3 graph, ARTT trail, and Digital DNA on one screen.
2. Network Graph → Inspect the full D3.js force-directed transaction topology, filter by 1-Hop / 2-Hop / 3-Hop ego networks, and export SVG evidence.
3. ARTT Traversal → Tune priority weights, select an origin account (e.g., ACC-050), and click Play to animate the multi-hop money trail.
4. Digital DNA → Compare any account's current 10-axis behavioral polygon against its historical baseline and peer archetype.
5. Live Simulator → Replay 6 synthetic attack typologies step-by-step or switch to the Customer role to submit a live suspicious transfer and watch the detectors and Sherlock AI trigger in real time.
🛠️ Tech Stack & Project Structure
Frontend: React 19, TypeScript, Tailwind CSS v4, D3.js (d3), Lucide Icons
Backend: Node.js, Express (server.ts), Vite Middleware, Server-Sent Events (SSE) Streaming
AI Engine: @google/genai SDK (Server-Side Streaming & Structured JSON Output with deterministic fallback)
Testing: Node.js native test runner (node:test via tsx --test) covering 11 core algorithmic and forensic invariants
code
Text
├── server.ts                          # Express API server & low-latency AI streaming routes
├── src/
│   ├── App.tsx                        # Main shell, 5-Step PoC Bar & 1-Click Role Switcher
│   ├── context/
│   │   └── FraudMeshContext.tsx       # Reactive state, graph pipeline & live transaction explainer
│   ├── engine/
│   │   ├── graphEngine.ts             # Directed graph construction, centrality & Tarjan cycle detection
│   │   ├── digitalDna.ts              # 10-Axis Behavioral Digital DNA calculation engine
│   │   ├── pipeline.ts                # 8 Fraud Detectors, ARTT priority-queue traversal & ML metrics
│   │   ├── datasetForensics.ts        # Flexible CSV normalizer & isolated PoC fraud predictor
│   │   ├── syntheticData.ts           # Deterministic seeded generator (85 accounts, ~1,000 txs)
│   │   ├── copilotDeterministic.ts    # Evidence-grounded deterministic forensic copilot engine
│   │   └── fraudmesh.test.ts          # 11 automated unit & integration tests
│   └── components/
│       ├── DatasetUploadStudio.tsx    # All-in-One CSV Upload, Graph, ARTT, DNA & Fraud Predictor
│       ├── MoneyTrailGraph.tsx        # Interactive D3.js force-directed network visualization
│       ├── DigitalDNARadar.tsx        # 10-Axis SVG behavioral radar chart
│       ├── CommandCenter.tsx          # Executive KPIs, 24h IST volume chart & PoC walkthrough
│       ├── InvestigatorViews.tsx      # Money Trail, ARTT Engine, Digital DNA, Cases & Reports
│       ├── AdminViews.tsx             # Account/Tx Ledgers, Detector Sliders, ML Lab & Audit Trail
│       ├── CustomerViews.tsx          # Retail Transfer Simulator & Dispute Reporting
│       ├── ResearchViews.tsx          # Scenario Simulator, Algorithm Visualizer & Architecture
│       ├── SherlockBot.tsx            # Real-time streaming Sherlock Holmes AI Forensic Investigator
│       ├── LiveTransactionExplainer.tsx # Instant 0ms transaction deduction modal
│       ├── RoleLoginScreen.tsx        # 4-Persona authentication & 1-click launch portal
│       └── PresentationMode.tsx       # 10-Slide fullscreen executive showcase deck
⚡ Getting Started Locally
1. Install Dependencies
code
Bash
npm install
2. Configure Environment Variables
Create a .env file in the root directory (see .env.example):
code
Env
GEMINI_API_KEY=your_api_key_here
PORT=3000
(Note: If GEMINI_API_KEY is omitted, all deterministic graph detection, ARTT traversal, Digital DNA profiling, and local forensic deductions continue to operate seamlessly.)
3. Run the Development Server
code
Bash
npm run dev
Open http://localhost:3000 in your browser.
4. Run the Automated Test Suite & Type Check
code
Bash
npm test
npm run lint
npm run build
📄 CSV Format Specification
The Dataset Upload Studio supports both the full 8-column canonical format and simplified 3-column bank exports:
Minimal 3-Column Format (sender,receiver,amount)
code
CSV
sender,receiver,amount
ACC-031,ACC-032,50000
ACC-032,ACC-033,49800
ACC-033,ACC-031,49500
Full 8-Column Canonical Format
code
CSV
transaction_id,sender_account_id,receiver_account_id,amount,timestamp,transaction_type,channel,location
TXN-CW-01,ACC-031,ACC-032,50000,2026-10-23T10:00:00.000Z,IMPS,NetBanking,Mumbai MH
TXN-CW-02,ACC-032,ACC-033,49800,2026-10-23T10:20:00.000Z,IMPS,NetBanking,Mumbai MH
TXN-CW-03,ACC-033,ACC-031,49500,2026-10-23T10:45:00.000Z,IMPS,NetBanking,Mumbai MH
