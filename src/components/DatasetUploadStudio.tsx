import React, { useEffect, useMemo, useState } from 'react';
import { useFraudMesh } from '../context/FraudMeshContext';
import {
  AlertOctagon,
  ArrowRight,
  Bot,
  Download,
  FileSpreadsheet,
  Network,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';
import { formatINR } from '../engine/digitalDna';
import { parseTransactionsCSV } from '../engine/syntheticData';
import {
  analyzeUploadedDatasetForensics,
  normalizeFlexibleBankCSV,
  UploadedDatasetAnalysis,
} from '../engine/datasetForensics';
import { MoneyTrailGraph } from './MoneyTrailGraph';
import { DigitalDNARadar } from './DigitalDNARadar';

const PRESET_DATASETS = [
  {
    id: 'circular_wash',
    badge: 'Circular Laundering',
    title: '1. Circular Wash Laundering Ring (₹2,97,000)',
    description:
      '6 synthetic shell accounts transferring funds in a closed loop (ACC-031 → ... → ACC-036 → ACC-031) with 98% retention.',
    csvContent: `transaction_id,sender_account_id,receiver_account_id,amount,timestamp,transaction_type,channel,location
TXN-CW-01,ACC-031,ACC-032,50000,2026-10-23T10:00:00.000Z,IMPS,NetBanking,Mumbai MH
TXN-CW-02,ACC-032,ACC-033,49800,2026-10-23T10:20:00.000Z,IMPS,NetBanking,Mumbai MH
TXN-CW-03,ACC-033,ACC-034,49600,2026-10-23T10:45:00.000Z,IMPS,NetBanking,Mumbai MH
TXN-CW-04,ACC-034,ACC-035,49400,2026-10-23T11:10:00.000Z,IMPS,NetBanking,Mumbai MH
TXN-CW-05,ACC-035,ACC-036,49200,2026-10-23T11:35:00.000Z,IMPS,NetBanking,Mumbai MH
TXN-CW-06,ACC-036,ACC-031,49000,2026-10-23T12:00:00.000Z,IMPS,NetBanking,Mumbai MH`,
  },
  {
    id: 'split_merge',
    badge: 'Split & Merge Evasion',
    title: '2. Split-and-Merge Layering Network (₹3,92,000)',
    description:
      'Originator ACC-050 splits funds across 4 parallel intermediary conduits that reconverge into sink account ACC-056.',
    csvContent: `transaction_id,sender_account_id,receiver_account_id,amount,timestamp,transaction_type,channel,location
TXN-SM-01,ACC-050,ACC-051,49200,2026-10-23T09:00:00.000Z,IMPS,API Gateway,Bangalore KA
TXN-SM-02,ACC-050,ACC-052,49200,2026-10-23T09:03:00.000Z,IMPS,API Gateway,Bangalore KA
TXN-SM-03,ACC-050,ACC-053,49200,2026-10-23T09:06:00.000Z,IMPS,API Gateway,Bangalore KA
TXN-SM-04,ACC-050,ACC-054,49200,2026-10-23T09:09:00.000Z,IMPS,API Gateway,Bangalore KA
TXN-SM-05,ACC-051,ACC-056,48800,2026-10-23T09:30:00.000Z,RTGS,NetBanking,Bangalore KA
TXN-SM-06,ACC-052,ACC-056,48800,2026-10-23T09:32:00.000Z,RTGS,NetBanking,Bangalore KA
TXN-SM-07,ACC-053,ACC-056,48800,2026-10-23T09:34:00.000Z,RTGS,NetBanking,Bangalore KA
TXN-SM-08,ACC-054,ACC-056,48800,2026-10-23T09:36:00.000Z,RTGS,NetBanking,Bangalore KA`,
  },
  {
    id: 'mule_smurf',
    badge: 'Mule Chain + Smurfing',
    title: '3. Money Mule Structuring Chain (₹2,37,500)',
    description:
      '5-hop serial money mule chain routing structured tranches just below ₹50,000 to evade AML threshold reporting.',
    csvContent: `transaction_id,sender_account_id,receiver_account_id,amount,timestamp,transaction_type,channel,location
TXN-ML-01,ACC-021,ACC-022,48500,2026-10-23T14:00:00.000Z,RTGS,API Gateway,Delhi DL
TXN-ML-02,ACC-022,ACC-023,48000,2026-10-23T14:12:00.000Z,IMPS,Mobile App,Delhi DL
TXN-ML-03,ACC-023,ACC-024,47500,2026-10-23T14:25:00.000Z,IMPS,Mobile App,Delhi DL
TXN-ML-04,ACC-024,ACC-025,47000,2026-10-23T14:40:00.000Z,IMPS,Mobile App,Delhi DL
TXN-ML-05,ACC-025,ACC-040,46500,2026-10-23T15:00:00.000Z,NEFT,NetBanking,Delhi DL`,
  },
  {
    id: 'simple_custom_bank',
    badge: '3-Column Bank CSV',
    title: '4. Simple Bank Statement CSV (sender,receiver,amount)',
    description:
      'Demonstrates flexible CSV ingestion using minimal 3-column headers (sender, receiver, amount) with multi-hop layering.',
    csvContent: `sender,receiver,amount
CORP-ALPHA,MULE-101,95000
MULE-101,MULE-102,94200
MULE-102,MULE-103,93500
MULE-103,OFFSHORE-SINK,92800
CORP-ALPHA,MULE-104,49100
MULE-104,OFFSHORE-SINK,48700`,
  },
  {
    id: 'normal_retail',
    badge: 'Clean Legitimate Flow',
    title: '5. Clean Legitimate Retail & Salary Flow (₹29,850)',
    description:
      'Control dataset: Normal bilateral consumer UPI, utility, and vendor payments with zero circularity or mule layering.',
    csvContent: `transaction_id,sender_account_id,receiver_account_id,amount,timestamp,transaction_type,channel,location
TXN-NR-01,ACC-001,ACC-007,1850,2026-10-23T11:00:00.000Z,UPI,UPI Intent,Mumbai MH
TXN-NR-02,ACC-002,ACC-008,4200,2026-10-23T11:15:00.000Z,UPI,Mobile App,Pune MH
TXN-NR-03,ACC-003,ACC-009,12500,2026-10-23T12:00:00.000Z,NEFT,NetBanking,Chennai TN
TXN-NR-04,ACC-004,ACC-010,2400,2026-10-23T12:30:00.000Z,UPI,UPI Intent,Hyderabad TS
TXN-NR-05,ACC-005,ACC-011,8900,2026-10-23T13:10:00.000Z,IMPS,Mobile App,Delhi DL`,
  },
];

export const DatasetUploadStudio: React.FC = () => {
  const {
    accounts,
    importCSVTransactions,
    resetDataset,
    navigateTo,
    showToast,
    explainTransactionLive,
  } = useFraudMesh();

  const [csvText, setCsvText] = useState(PRESET_DATASETS[0].csvContent);
  const [selectedPreset, setSelectedPreset] = useState<string>('circular_wash');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isolateInGlobalApp, setIsolateInGlobalApp] = useState<boolean>(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Active analyzed dataset state
  const [analysis, setAnalysis] = useState<UploadedDatasetAnalysis | null>(() => {
    const norm = normalizeFlexibleBankCSV(PRESET_DATASETS[0].csvContent);
    const parsed = parseTransactionsCSV(norm);
    return parsed.valid ? analyzeUploadedDatasetForensics(parsed.transactions, accounts) : null;
  });

  // Interactive selections inside the PoC Visualizer
  const [selectedNodeId, setSelectedNodeId] = useState<string>('ACC-031');
  const [selectedTxId, setSelectedTxId] = useState<string | null>('TXN-CW-01');
  const [arttHopStep, setArttHopStep] = useState<number>(-1); // -1 = show full path
  const [arttPlaying, setArttPlaying] = useState<boolean>(false);

  const runForensicPipeline = (rawCsv: string, syncToGlobal: boolean, customLabel?: string) => {
    const normalized = normalizeFlexibleBankCSV(rawCsv);
    const parsed = parseTransactionsCSV(normalized);

    if (!parsed.valid) {
      setValidationErrors(parsed.errors);
      showToast('CSV Validation Failed', parsed.errors[0] || 'Check CSV format.', 'error');
      return;
    }

    setValidationErrors([]);
    const report = analyzeUploadedDatasetForensics(parsed.transactions, accounts);
    setAnalysis(report);
    setArttHopStep(-1);
    setArttPlaying(false);

    if (report.accounts.length > 0) {
      setSelectedNodeId(
        report.arttResult.config.startAccountId || report.accounts[0].account_id
      );
    }
    if (report.transactions.length > 0) {
      setSelectedTxId(report.transactions[0].transaction_id);
    }

    const isFraud = report.prediction.fraud_code !== 'CLEAN_LEGITIMATE_FLOW';

    if (syncToGlobal) {
      importCSVTransactions(rawCsv, isolateInGlobalApp);
    } else {
      showToast(
        customLabel || 'Forensic Graph, ARTT & Digital DNA Computed',
        `Detected: ${report.prediction.primary_fraud_type} (${report.prediction.confidence_pct}% confidence)`,
        isFraud ? 'warning' : 'success'
      );
    }
  };

  const acceptedAnimationSteps = useMemo(() => {
    if (!analysis) return [];
    const accepted = analysis.arttResult.animation_steps.filter((s) => s.accepted);
    return accepted.length > 0 ? accepted : analysis.arttResult.animation_steps;
  }, [analysis]);

  // Step-by-step ARTT playback timer
  useEffect(() => {
    if (!arttPlaying || !analysis) return;
    const totalSteps = acceptedAnimationSteps.length;
    if (totalSteps === 0) {
      setArttPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      if (arttHopStep + 1 < totalSteps) {
        setArttHopStep((prev) => prev + 1);
      } else {
        setArttPlaying(false);
      }
    }, 950);

    return () => window.clearTimeout(timer);
  }, [arttPlaying, arttHopStep, analysis, acceptedAnimationSteps.length]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    setUploadedFileName(null);
    const found = PRESET_DATASETS.find((p) => p.id === presetId);
    if (found) {
      setCsvText(found.csvContent);
      runForensicPipeline(found.csvContent, false, `Loaded Preset: ${found.badge}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        setSelectedPreset('custom');
        setUploadedFileName(file.name);
        runForensicPipeline(content, true, `Uploaded & Analyzed ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyzeFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runForensicPipeline(csvText, true);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([PRESET_DATASETS[0].csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fraudmesh_sample_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compute highlighted accounts and transactions based on ARTT playback step
  const activeHighlightedAccounts = useMemo(() => {
    if (!analysis) return [];
    if (arttHopStep < 0) return analysis.arttResult.visited_accounts;
    const stepsSlice = acceptedAnimationSteps.slice(0, arttHopStep + 1);
    const accs = new Set<string>();
    stepsSlice.forEach((s) => {
      accs.add(s.currentAccount);
      accs.add(s.targetAccount);
    });
    return Array.from(accs);
  }, [analysis, arttHopStep, acceptedAnimationSteps]);

  const activeHighlightedTxIds = useMemo(() => {
    if (!analysis) return [];
    if (arttHopStep < 0) return acceptedAnimationSteps.map((s) => s.inspectedEdgeId);
    return acceptedAnimationSteps.slice(0, arttHopStep + 1).map((s) => s.inspectedEdgeId);
  }, [analysis, arttHopStep, acceptedAnimationSteps]);

  const selectedAssignment = useMemo(() => {
    if (!analysis) return null;
    return (
      analysis.accountAssignments.find((r) => r.account_id === selectedNodeId) ||
      analysis.accountAssignments[0] ||
      null
    );
  }, [analysis, selectedNodeId]);

  const selectedDNAProfile = selectedAssignment?.dna_profile || null;
  const isFraudulent =
    analysis ? analysis.prediction.fraud_code !== 'CLEAN_LEGITIMATE_FLOW' : false;
  const topCandidatePath = analysis?.arttResult.candidate_paths[0] || null;

  return (
    <div className="space-y-6">
      {/* Top Hero Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5" />
            All-in-One Proof of Concept (PoC) Dataset Analyzer
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            Upload Bank CSV → Predict Fraud Type + ARTT Trail + Digital DNA
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Upload any bank transaction CSV (or click a benchmark preset below) to immediately visualize the
            interactive network graph, classify the exact fraud typology, run the ARTT multi-hop traversal
            engine, and assign 10-Axis Behavioral Digital DNA to every account on a single screen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer shadow-xs transition-all">
            <Upload className="w-4 h-4" />
            <span>Upload Bank .CSV File</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Sample CSV
          </button>
          <button
            type="button"
            onClick={() => {
              resetDataset();
              handleSelectPreset('circular_wash');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors border border-amber-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Full Bank Seed
          </button>
        </div>
      </div>

      {/* Step 1: 1-Click Benchmark Presets OR Custom CSV Upload */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Step 1 • Select Demo Dataset or Upload Custom CSV
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              1-Click Proof-of-Concept Benchmark Datasets
            </h2>
          </div>
          {uploadedFileName && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Active Uploaded File: {uploadedFileName}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {PRESET_DATASETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`text-left rounded-xl p-3.5 transition-all border flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 hover:border-blue-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        preset.id === 'normal_retail'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {preset.badge}
                    </span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                  </div>
                  <div className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                    {preset.title}
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-bold text-blue-700">
                  <span>Load & Analyze</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Live CSV Editor & Ingestion Controls */}
        <form onSubmit={handleAnalyzeFormSubmit} className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              <span className="font-bold text-slate-800">Flexible CSV Parser:</span> Supports full 8-column
              format OR simple{' '}
              <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono">
                sender,receiver,amount
              </code>{' '}
              bank exports.
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isolateInGlobalApp}
                  onChange={(e) => setIsolateInGlobalApp(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Isolate this dataset across all platform tabs on Sync</span>
              </label>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                CSV Validation Error ({validationErrors.length})
              </div>
              {validationErrors.map((err, i) => (
                <div key={i} className="pl-5 text-rose-700">
                  • {err}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            <div className="lg:col-span-9">
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setSelectedPreset('custom');
                }}
                placeholder="Paste bank CSV here (e.g. sender,receiver,amount or full 8-column CSV)..."
                className="w-full h-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="lg:col-span-3 flex flex-col justify-between gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-600 leading-relaxed">
                Click below to run <strong className="text-slate-900">Graph Topology Prediction</strong>,{' '}
                <strong className="text-slate-900">ARTT Traversal</strong>, and{' '}
                <strong className="text-slate-900">10-Axis Digital DNA</strong> assignment.
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Analyze CSV & Sync Graph
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* =====================================================================
          UNIFIED POC FORENSIC DASHBOARD (SECTIONS A, B, C, D, E)
      ===================================================================== */}
      {analysis && (
        <div className="space-y-6">
          {/* SECTION A: FRAUD TYPE PREDICTION & VERDICT BANNER */}
          <div
            className={`rounded-2xl border-2 p-6 shadow-xs ${
              isFraudulent
                ? 'bg-rose-50/70 border-rose-300'
                : 'bg-emerald-50/70 border-emerald-300'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200/80">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isFraudulent ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isFraudulent ? (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    {isFraudulent ? 'FRAUD DETECTED IN DATASET' : 'CLEAN DATASET VERDICT'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800">
                    Confidence: {analysis.prediction.confidence_pct}%
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800">
                    Severity: {analysis.prediction.overall_severity}
                  </span>
                </div>

                <h2 className="text-2xl font-bold font-display text-slate-900 pt-1">
                  Predicted Fraud Type: {analysis.prediction.primary_fraud_type}
                </h2>
              </div>

              {/* Key Dataset KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white rounded-xl p-3 border border-slate-200 min-w-[125px]">
                  <div className="text-[11px] text-slate-500 font-semibold">Transactions</div>
                  <div className="text-lg font-bold text-slate-900">{analysis.transactions.length}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-200 min-w-[125px]">
                  <div className="text-[11px] text-slate-500 font-semibold">Accounts Profiled</div>
                  <div className="text-lg font-bold text-slate-900">{analysis.accounts.length}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-200 min-w-[125px]">
                  <div className="text-[11px] text-slate-500 font-semibold">Total Volume</div>
                  <div className="text-lg font-bold text-slate-900">
                    {formatINR(analysis.prediction.total_volume_inr)}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-200 min-w-[125px]">
                  <div className="text-[11px] text-slate-500 font-semibold">ARTT Retention</div>
                  <div className="text-lg font-bold text-blue-700">
                    {analysis.prediction.retention_ratio_pct}%
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Narrative & 3-Pillar Proof */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5">
              <div className="lg:col-span-7 space-y-3">
                <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-blue-600" />
                    Executive Forensic Verdict & Sherlock Holmes Deduction
                  </div>
                  <p className="text-sm text-slate-900 leading-relaxed font-semibold">
                    {analysis.prediction.executive_verdict}
                  </p>
                  <p className="text-xs text-slate-600 italic border-t border-slate-100 pt-2">
                    {analysis.prediction.sherlock_deduction}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase text-blue-700 mb-1">
                      1. Graph Topology Proof
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {analysis.prediction.how_graph_predicted}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase text-purple-700 mb-1">
                      2. ARTT Traversal Proof
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {analysis.prediction.how_artt_traced}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200">
                    <div className="text-[11px] font-bold uppercase text-amber-700 mb-1">
                      3. Digital DNA Proof
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {analysis.prediction.how_dna_confirmed}
                    </p>
                  </div>
                </div>
              </div>

              {/* Typology Match Breakdown Bars */}
              <div className="lg:col-span-5 bg-white rounded-xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Graph & Behavioral Typology Match Scores
                </div>
                <div className="space-y-2.5">
                  {analysis.prediction.detected_typologies.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{item.name}</span>
                        <span
                          className={`font-mono font-bold ${
                            item.score >= 70
                              ? 'text-rose-600'
                              : item.score >= 45
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.score}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.score >= 70
                              ? 'bg-rose-600'
                              : item.score >= 45
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(4, item.score)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500">{item.evidence}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B & C: INTERACTIVE D3 GRAPH + ARTT TRAVERSAL ENGINE SIDE-BY-SIDE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Interactive D3 Network Graph of the Uploaded CSV */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    Section B • Interactive Graph Network
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Uploaded Dataset Money Trail Topology ({analysis.graphNodes.length} Nodes,{' '}
                    {analysis.graphEdges.length} Directed Edges)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    importCSVTransactions(csvText, true);
                    navigateTo('money-trail-explorer');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                >
                  <Network className="w-3.5 h-3.5" />
                  Open Fullscreen Explorer
                </button>
              </div>

              <MoneyTrailGraph
                nodes={analysis.graphNodes}
                edges={analysis.graphEdges}
                selectedAccountId={selectedNodeId}
                selectedTransactionId={selectedTxId}
                highlightedAccounts={activeHighlightedAccounts}
                highlightedTxIds={activeHighlightedTxIds}
                onSelectAccount={(accId) => setSelectedNodeId(accId)}
                onSelectTransaction={(txId) => setSelectedTxId(txId)}
                height={430}
              />

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  <strong>Tip:</strong> Click any account node on the graph to inspect its assigned{' '}
                  <strong className="text-slate-900">10-Axis Digital DNA</strong> below.
                </span>
                <span className="font-mono font-bold text-blue-700">
                  Selected Account: {selectedNodeId}
                </span>
              </div>
            </div>

            {/* Right 5 cols: ARTT Traversal Engine & Hop-by-Hop Player */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                      Section C • ARTT Traversal Engine
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      Adaptive Risk-Aware Transaction Traversal
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold">
                    Path Risk: {topCandidatePath?.path_risk_score || 78}/100
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  ARTT uses a best-first priority queue weighted by edge risk, amount retention, and
                  temporal velocity to trace where funds originated and where they converged.
                </p>

                {/* Playback Controls */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (arttHopStep >= acceptedAnimationSteps.length - 1 || arttHopStep < 0) {
                          setArttHopStep(0);
                        }
                        setArttPlaying((p) => !p);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {arttPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {arttPlaying ? 'Pause Trail' : 'Animate Money Trail'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setArttPlaying(false);
                        setArttHopStep((prev) =>
                          prev + 1 < acceptedAnimationSteps.length ? prev + 1 : 0
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Step Hop
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setArttPlaying(false);
                        setArttHopStep(-1);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Show All
                    </button>
                  </div>

                  <span className="text-xs font-bold text-slate-700">
                    {arttHopStep < 0
                      ? `All ${acceptedAnimationSteps.length} Hops Shown`
                      : `Hop ${arttHopStep + 1} of ${acceptedAnimationSteps.length}`}
                  </span>
                </div>

                {/* Traced Path Sequence Pills */}
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase text-blue-800">
                    Primary Traced Money Chain (Origin: {analysis.arttResult.config.startAccountId})
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(topCandidatePath?.accounts || analysis.arttResult.visited_accounts).map(
                      (accId, idx, arr) => (
                        <React.Fragment key={`${accId}-${idx}`}>
                          <button
                            type="button"
                            onClick={() => setSelectedNodeId(accId)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              selectedNodeId === accId
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-white text-slate-800 border border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            {accId}
                          </button>
                          {idx < arr.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </React.Fragment>
                      )
                    )}
                  </div>
                </div>

                {/* Hop-by-Hop List */}
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {acceptedAnimationSteps.map((step, idx) => {
                    const isActiveStep = arttHopStep === idx;
                    const isPassedStep = arttHopStep < 0 || idx <= arttHopStep;
                    const txObj = analysis.transactions.find(
                      (t) => t.transaction_id === step.inspectedEdgeId
                    );
                    return (
                      <div
                        key={`${step.inspectedEdgeId}-${idx}`}
                        onClick={() => {
                          setArttHopStep(idx);
                          setSelectedNodeId(step.targetAccount);
                          setSelectedTxId(step.inspectedEdgeId);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isActiveStep
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                            : isPassedStep
                            ? 'bg-white border-slate-200 hover:border-blue-300'
                            : 'bg-slate-50/50 border-slate-200 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-900">
                            Hop #{idx + 1}: {step.currentAccount} → {step.targetAccount}
                          </span>
                          <span className="font-mono font-bold text-blue-700">
                            {txObj ? formatINR(txObj.amount) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Tx: {step.inspectedEdgeId}</span>
                          <span>Score: {Math.round(step.cumulativeScore)}</span>
                          <span className="text-rose-700 font-semibold truncate max-w-[180px]">
                            {step.reason}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900">
                <strong>ARTT Summary:</strong> {analysis.arttResult.summary_note}
              </div>
            </div>
          </div>

          {/* SECTION D: 10-AXIS BEHAVIORAL DIGITAL DNA PROFILING & ROLE ASSIGNMENT */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Section D • Behavioral Digital DNA Assignment
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Assigned 10-Axis Digital DNA & Structural Network Roles for Uploaded Accounts
                </h3>
                <p className="text-xs text-slate-600">
                  Every account in the uploaded CSV is automatically fingerprinted across 10 behavioral dimensions
                  and assigned a forensic role and DNA Phenotype.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Inspect Account DNA:</span>
                <select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                >
                  {analysis.accountAssignments.map((r) => (
                    <option key={r.account_id} value={r.account_id}>
                      {r.account_id} — {r.network_role} (Risk: {r.risk_score})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 5 cols: 10-Axis Radar Chart + Selected Account Phenotype Card */}
              <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col items-center">
                {selectedAssignment && (
                  <div className="w-full mb-3 p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {selectedAssignment.account_id} ({selectedAssignment.holder_name})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                        {selectedAssignment.network_role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-rose-700">
                        {selectedAssignment.dna_phenotype}
                      </span>
                      <span className="font-bold text-slate-700">
                        DNA Drift: {selectedAssignment.dna_deviation_score}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 pt-1 border-t border-slate-100">
                      {selectedAssignment.dna_profile.summary_explanation}
                    </p>
                  </div>
                )}

                {selectedDNAProfile && (
                  <DigitalDNARadar profile={selectedDNAProfile} size={320} />
                )}
              </div>

              {/* Right 7 cols: Full Account Digital DNA & Role Assignment Table */}
              <div className="lg:col-span-7 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  All Uploaded Accounts — Structural Roles & Digital DNA Fingerprints ({analysis.accountAssignments.length})
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                        <th className="py-2.5 px-3">Account ID</th>
                        <th className="py-2.5 px-3">Assigned Role</th>
                        <th className="py-2.5 px-3">Digital DNA Phenotype</th>
                        <th className="py-2.5 px-3">Sent / Received</th>
                        <th className="py-2.5 px-3">DNA Drift</th>
                        <th className="py-2.5 px-3">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {analysis.accountAssignments.map((row) => {
                        const isSelected = row.account_id === selectedNodeId;
                        return (
                          <tr
                            key={row.account_id}
                            onClick={() => setSelectedNodeId(row.account_id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/90 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                              {row.account_id}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                  row.network_role.includes('Circular') ||
                                  row.network_role.includes('Mule')
                                    ? 'bg-rose-100 text-rose-800'
                                    : row.network_role.includes('Originator') ||
                                      row.network_role.includes('Sink')
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {row.network_role}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-800">
                              {row.dna_phenotype}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600">
                              Out: {formatINR(row.total_sent)} ({row.out_degree})<br />
                              In: {formatINR(row.total_received)} ({row.in_degree})
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-purple-700">
                              {row.dna_deviation_score}%
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  row.risk_score >= 70
                                    ? 'bg-rose-100 text-rose-800'
                                    : row.risk_score >= 45
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {row.risk_score} ({row.risk_level})
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Selected Account 10-Axis Progress Bars */}
                {selectedDNAProfile && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-800">
                      10-Axis Behavioral Breakdown for {selectedDNAProfile.account_id} —{' '}
                      <span className="text-slate-600 font-normal">
                        {selectedDNAProfile.summary_explanation}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                      {selectedDNAProfile.axes.map((ax) => (
                        <div key={ax.key} className="bg-white p-2 rounded-lg border border-slate-200">
                          <div className="text-[10px] font-semibold text-slate-500 truncate">
                            {ax.feature}
                          </div>
                          <div className="flex items-baseline justify-between mt-0.5">
                            <span className="text-xs font-bold text-slate-900">{ax.currentRaw}</span>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                ax.deviationScore >= 55 ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              Δ{ax.deviationScore}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION E: UPLOADED TRANSACTION LEDGER WITH AI EXPLAINER */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Section E • Transaction-Level Forensic Scoring
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Uploaded Transactions & Pattern Triggers ({analysis.transactions.length} Rows)
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Click <strong>Ask Sherlock AI</strong> on any row for an instant forensic deduction
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                    <th className="py-2.5 px-3">Tx ID</th>
                    <th className="py-2.5 px-3">Sender → Receiver</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Detected Fraud Signatures</th>
                    <th className="py-2.5 px-3 text-right">AI Forensic Deduction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {analysis.transactions.map((tx) => (
                    <tr key={tx.transaction_id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {tx.transaction_id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-blue-700 font-semibold">
                        {tx.sender_account_id} → {tx.receiver_account_id}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {formatINR(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {tx.transaction_type} • {tx.channel}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            tx.risk_score >= 70
                              ? 'bg-rose-100 text-rose-800'
                              : tx.risk_score >= 45
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {tx.risk_score}/100 ({tx.risk_level})
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(tx.detected_patterns.length > 0
                            ? tx.detected_patterns
                            : ['Normal Baseline Flow']
                          ).map((pat, i) => (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                tx.detected_patterns.length > 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {pat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => explainTransactionLive(tx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          Ask Sherlock AI
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
