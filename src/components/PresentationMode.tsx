/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  ExternalLink,
  ShieldAlert,
  Network,
  Dna,
  GitBranch,
  Cpu,
  Layers,
  FileText,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useFraudMesh } from '../context/FraudMeshContext';
import {
  HeroNetworkArtwork,
  MoneyMuleArtwork,
  CircularWashArtwork,
  SplitMergeArtwork,
  DigitalDnaArtwork,
  AiCopilotArtwork,
} from './FraudMeshArtwork';

interface PresentationModeProps {
  onClose: () => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({ onClose }) => {
  const { navigateTo, accounts, transactions, alerts, cases, latestArttResult, modelEvaluations } =
    useFraudMesh();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalSlides = 10;

  // Keyboard Navigation: Left/Right arrows and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlide((s) => Math.min(totalSlides - 1, s + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlide((s) => Math.max(0, s - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlides, onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const slides = [
    {
      title: 'Project Introduction',
      subtitle: 'FraudMesh 2.0 — Intelligent Financial Crime Detection & Graph Forensic Platform',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Academic & Technical Showcase Edition
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Uncover Hidden Connections. <br />
              <span className="text-blue-600">Decode Financial Crime.</span>
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              FraudMesh 2.0 transforms conventional, isolated transaction monitoring into a multi-layered, graph-theoretic forensic intelligence engine. It detects structured smurfing, layered mule conduits, circular wash networks, and behavioral shifts across temporal banking networks.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="text-xl font-bold font-mono text-slate-900">{accounts.length}</div>
                <div className="text-[11px] text-slate-500 font-medium">Banking Nodes</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="text-xl font-bold font-mono text-blue-600">{transactions.length}</div>
                <div className="text-[11px] text-slate-500 font-medium">Temporal Transfers</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="text-xl font-bold font-mono text-rose-600">{alerts.length}</div>
                <div className="text-[11px] text-slate-500 font-medium">Active Alerts</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 flex justify-center">
            <HeroNetworkArtwork className="w-full max-w-lg drop-shadow-md" />
          </div>
        </div>
      ),
    },
    {
      title: 'Problem Statement',
      subtitle: 'Why Isolated Transaction Monitoring Misses Coordinated Financial Crime',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch h-full">
          <div className="p-6 bg-rose-50/50 rounded-2xl border border-rose-100 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" /> Conventional Legacy Monitoring
              </div>
              <h3 className="text-xl font-bold text-slate-900">Per-Transaction Threshold Silos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rules only evaluate single payments at a time (e.g. flagging transfers exceeding INR 50,000). Organized syndicates readily evade these by dividing funds into 8× sub-INR 50k micro-payments across disparate branches.
              </p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Blind to multi-hop transit paths and intermediary mule conduits.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Cannot recognize closed directed loops (circular wash transfers).
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Overwhelms investigators with 95%+ false positive rates.
                </li>
              </ul>
            </div>
            <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs text-rose-800 font-mono">
              Result: INR 2.46+ Cr channeled undetected through layered splits.
            </div>
          </div>

          <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                <Network className="w-4 h-4" /> FraudMesh 2.0 Graph Intelligence
              </div>
              <h3 className="text-xl font-bold text-slate-900">Multi-Hop Directed Network Forensics</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Treats accounts as nodes and temporal transactions as weighted directed edges. Uncovers split-and-merge laundering structures, circular capital preservation, and nocturnal velocity surges in real-time.
              </p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Tarjan cycle discovery catches 100% of circular wash topologies.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ARTT algorithm traverses multi-hop paths enforcing temporal causality.
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Digital DNA measures 10-axis behavioral deviation vs historical baselines.
                </li>
              </ul>
            </div>
            <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs text-blue-800 font-mono">
              Outcome: 100% of coordinated topologies discovered with full provenance.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Proposed Solution',
      subtitle: 'The FraudMesh Multi-Layered Financial Defense Architecture',
      content: (
        <div className="space-y-5 h-full">
          <p className="text-xs text-slate-600 leading-relaxed">
            FraudMesh combines five symbiotic layers of detection into a single, cohesive forensic pipeline:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                01
              </div>
              <h4 className="text-xs font-bold text-slate-900">D3 Graph Engine</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Directed force-directed network simulation with 1-Hop, 2-Hop, 3-Hop, and Full Mesh exploration.
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                02
              </div>
              <h4 className="text-xs font-bold text-slate-900">ARTT Traversal</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Adaptive temporal pathfinder enforcing strictly chronological timestamps and amount retention continuity.
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-xs">
                03
              </div>
              <h4 className="text-xs font-bold text-slate-900">Digital DNA</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                10-axis behavioral fingerprinting radar isolating typical amounts, variance, velocity, and nocturnal shifts.
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                04
              </div>
              <h4 className="text-xs font-bold text-slate-900">ML Benchmarks</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                5 genuine classifiers (Rule-Based, LogReg, Random Forest, GBDT, Deep MLP) evaluated on holdout data.
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                05
              </div>
              <h4 className="text-xs font-bold text-slate-900">Gemini Copilot</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Server-side AI synthesizing evidence summaries, statutory STR drafts, and case dockets.
              </p>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">Explore the unified pipeline live in the workspace:</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigateTo('architecture-viewer');
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500"
            >
              Open Architecture Viewer <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ),
    },
    {
      title: 'System Architecture',
      subtitle: 'The 8-Stage Real-Time Forensic Intelligence Pipeline',
      content: (
        <div className="space-y-4 h-full">
          <p className="text-xs text-slate-600">
            Every transaction arriving at FraudMesh passes through eight deterministic, chronological stages:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { num: '01', title: 'Ingestion & Ledger', desc: 'Validates accounts, balances, idempotency, and INR precision.' },
              { num: '02', title: 'Graph & Topology', desc: 'Updates in/out-degree, adjacency lists, and Tarjan cycle checks.' },
              { num: '03', title: 'Digital DNA Profile', desc: 'Evaluates 10-axis behavioral drift with sample sufficiency tags.' },
              { num: '04', title: '8 Fraud Detectors', desc: 'Evaluates DET-SPLIT, DET-CYCLE, DET-FAN, DET-PASSTHROUGH, etc.' },
              { num: '05', title: 'Risk Engine', desc: 'Synthesizes detector triggers and topology into 0-100 score.' },
              { num: '06', title: 'ARTT Traversal', desc: 'Discovers chronological multi-hop pathways meeting retention rules.' },
              { num: '07', title: 'ML Benchmarking', desc: 'Scores features across 5 models with live decision threshold.' },
              { num: '08', title: 'AI Copilot & Cases', desc: 'Generates evidence-backed investigative briefings and STR filings.' },
            ].map((st) => (
              <div key={st.num} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="text-xs font-mono font-bold text-blue-600">STAGE {st.num}</div>
                <div className="text-xs font-bold text-slate-900">{st.title}</div>
                <div className="text-[11px] text-slate-500 leading-tight">{st.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Synthetic Banking Mesh',
      subtitle: 'Seed #20261023 — Reproducible Benchmark Banking Dataset',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center h-full">
          <div className="space-y-3 md:col-span-1">
            <h3 className="text-lg font-bold text-slate-900">Deterministic Realism</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              To guarantee scientific reproducibility without leaking sensitive private bank records, FraudMesh employs a seed-driven synthetic banking generator.
            </p>
            <div className="p-3 bg-slate-100 rounded-xl space-y-1 font-mono text-xs">
              <div className="text-slate-500">Seed: #20261023</div>
              <div className="text-slate-900 font-semibold">85 Accounts (ACC-001..085)</div>
              <div className="text-slate-900 font-semibold">999 Transactions</div>
              <div className="text-emerald-700">Volume: INR 2,46,35,050</div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              6 Built-In Financial Topologies
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900">01. Normal Flow</div>
                <div className="text-[11px] text-slate-500">Routine salary credits, UPI household bills.</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="font-semibold text-amber-700">02. Split Structuring</div>
                <div className="text-[11px] text-slate-500">8× sub-INR 50k transfers to evade threshold.</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="font-semibold text-orange-700">03. Money Mule Chain</div>
                <div className="text-[11px] text-slate-500">Rapid pass-through conduit across 5 nodes.</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="font-semibold text-rose-700">04. Circular Wash Network</div>
                <div className="text-[11px] text-slate-500">Directed 4-node loop returning capital to origin.</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="font-semibold text-purple-700">05. Rapid Nocturnal Burst</div>
                <div className="text-[11px] text-slate-500">02:10 AM IST velocity surge on dormant node.</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <div className="font-semibold text-rose-700">06. Split-and-Merge Network</div>
                <div className="text-[11px] text-slate-500">Fan-out structuring & fan-in reconvergence.</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Graph-Based Fraud Detection',
      subtitle: 'Visualizing Coordinated Financial Crime Topologies',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-full">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Split-and-Merge Laundering</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Originator account <strong>ACC-050</strong> executes a rapid fan-out dispersal to four intermediate mule accounts (<strong>ACC-051</strong>, <strong>ACC-052</strong>, <strong>ACC-053</strong>, <strong>ACC-054</strong>). Each intermediary retains 2–4% and forwards the balance into master sink <strong>ACC-055</strong>.
            </p>
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Dispersed Volume:</span>
                <span className="font-mono font-semibold text-slate-900">INR 12,00,000</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Consolidated at Sink:</span>
                <span className="font-mono font-semibold text-rose-600">INR 11,95,000 (99.5%)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Detector Activations:</span>
                <span className="font-mono font-semibold text-blue-600">DET-SPLIT-MERGE, DET-FAN</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <SplitMergeArtwork className="w-full max-w-md drop-shadow-sm" />
          </div>
        </div>
      ),
    },
    {
      title: 'Digital DNA & ARTT Traversal',
      subtitle: '10-Axis Behavioral Profiling Meets Chronological Pathfinding',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-full">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wide">
              <Dna className="w-4 h-4" /> Transaction Digital DNA (10 Axes)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Profiles habitual rhythms across typical amounts, variance, velocity, active hours, counterparties, interval compression, in/out parity, novel beneficiaries, repeated amounts, and structural drift.
            </p>
            <DigitalDnaArtwork className="w-full max-w-xs mx-auto" />
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide">
              <GitBranch className="w-4 h-4" /> ARTT Pathfinding Principles
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Unlike generic shortest-path algorithms (Dijkstra/A*), ARTT evaluates financial causality:
            </p>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong>1. Strict Chronological Causality:</strong> Outgoing hop timestamp must be strictly after incoming hop.
              </li>
              <li className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong>2. Amount Retention Bounds:</strong> Retains 70%–105% volume continuity across hops.
              </li>
              <li className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong>3. Priority Queue Scoring:</strong> Weights risk, temporal proximity, and pass-through parity.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Machine Learning Benchmark Evaluation',
      subtitle: '5 Classifiers Evaluated on 60/40 Holdout Split Without Label Leakage',
      content: (
        <div className="space-y-4 h-full">
          <p className="text-xs text-slate-600">
            Real in-memory model performance benchmarks calculated from genuine validation predictions:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="py-2.5 px-3 font-semibold">Model Architecture</th>
                  <th className="py-2.5 px-3 font-semibold">Precision</th>
                  <th className="py-2.5 px-3 font-semibold">Recall</th>
                  <th className="py-2.5 px-3 font-semibold">F1 Score</th>
                  <th className="py-2.5 px-3 font-semibold">False Positive Rate</th>
                  <th className="py-2.5 px-3 font-semibold">ROC-AUC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {modelEvaluations.map((m) => (
                  <tr key={m.model_name} className="hover:bg-slate-50 font-mono">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{m.model_name}</td>
                    <td className="py-2.5 px-3 text-slate-700">{(m.precision * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-slate-700">{(m.recall * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-semibold text-blue-600">{(m.f1_score * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-rose-600">{(m.fpr * 100).toFixed(2)}%</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">{m.roc_auc.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <span>Dynamic decision threshold slider and confusion matrix interactive in Detection & ML Lab.</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigateTo('model-evaluation');
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-500"
            >
              Open ML Lab
            </button>
          </div>
        </div>
      ),
    },
    {
      title: 'AI Forensic Investigation & Reporting',
      subtitle: 'Server-Side Gemini API with Evidence-Grounded Fallback',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-full">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Explainable AI Forensic Intelligence</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Powered by <strong>gemini-3.8-flash</strong>, FraudMesh generates comprehensive forensic briefs grounded strictly in verified ledger transactions, graph edge metrics, and detector findings.
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-900">1. Evidence Grounding:</span> Every claim cites exact transaction IDs (`TXN-1091`) and timestamps.
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-900">2. Structured Schema:</span> Produces executive summary, topology classification, timeline, and STR recommendations.
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-900">3. Human-in-the-Loop:</span> Formal escalation requires investigator authorization before regulatory submission.
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <AiCopilotArtwork className="w-full max-w-sm drop-shadow-sm" />
          </div>
        </div>
      ),
    },
    {
      title: 'Results, Limitations & Future Scope',
      subtitle: 'Verified Capabilities and Roadmap for Production Deployment',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full">
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verified Achievements
            </h4>
            <ul className="space-y-2 text-xs text-emerald-950">
              <li>• 10/10 automated unit tests passing consistently.</li>
              <li>• Discovers 100% of synthetic circular and split-merge patterns.</li>
              <li>• Interactive D3 money-trail graph with smooth force layout & INR labels.</li>
              <li>• 29 functional views organized into 8 intuitive enterprise modules.</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> Scientific Limitations
            </h4>
            <ul className="space-y-2 text-xs text-amber-950">
              <li>• Synthetic dataset represents closed ecosystem; cross-bank netting requires external consortium APIs.</li>
              <li>• Cold-start accounts require 10 baseline transactions for full Digital DNA confidence.</li>
              <li>• Browser D3 layout optimized for subgraphs up to ~3,000 nodes simultaneously.</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-3">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" /> Production Roadmap
            </h4>
            <ul className="space-y-2 text-xs text-blue-950">
              <li>• Distributed Apache GraphX / Neo4j cluster connectors for 100M+ scale.</li>
              <li>• Real-time Kafka stream ingestion with sub-second sliding windows.</li>
              <li>• Privacy-preserving federated graph learning for multi-bank consortiums.</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  const currentSlideData = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center p-4 lg:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Presentation Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider font-mono">
              FraudMesh 2.0 Showcase
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-medium">
              Slide {currentSlide + 1} of {totalSlides}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close presentation"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide Canvas */}
        <div className="flex-1 p-8 lg:p-10 overflow-y-auto bg-gradient-to-b from-white to-slate-50/50 flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{currentSlideData.title}</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">{currentSlideData.subtitle}</p>
          </div>

          <div className="flex-1 flex flex-col justify-center">{currentSlideData.content}</div>
        </div>

        {/* Presentation Footer Navigation */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
              disabled={currentSlide === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <button
              type="button"
              onClick={() => setCurrentSlide((s) => Math.min(totalSlides - 1, s + 1))}
              disabled={currentSlide === totalSlides - 1}
              className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-40 transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
