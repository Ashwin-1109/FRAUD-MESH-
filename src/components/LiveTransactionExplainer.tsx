import React, { useEffect, useState } from 'react';
import { useFraudMesh } from '../context/FraudMeshContext';
import { TransactionExplanation } from '../types/fraudmesh';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { formatINR } from '../engine/digitalDna';

interface LiveTransactionExplainerProps {
  explanation: TransactionExplanation | null;
  onClose: () => void;
  onOpenSherlockWithQuery?: (query: string) => void;
}

export const LiveTransactionExplainer: React.FC<LiveTransactionExplainerProps> = ({
  explanation,
  onClose,
  onOpenSherlockWithQuery,
}) => {
  const { navigateTo, transactions, accounts } = useFraudMesh();
  const [minimized, setMinimized] = useState(false);

  if (!explanation) return null;

  const tx = transactions.find((t) => t.transaction_id === explanation.transaction_id);
  const isHighRisk = explanation.verdict === 'HIGH_RISK_ANOMALY';

  const handleInspectGraph = () => {
    if (tx) {
      navigateTo('money-trail-explorer', {
        accountId: tx.sender_account_id,
        txId: tx.transaction_id,
        highlightAccounts: [tx.sender_account_id, tx.receiver_account_id],
      });
      onClose();
    }
  };

  const handleConsultSherlock = () => {
    if (onOpenSherlockWithQuery) {
      onOpenSherlockWithQuery(
        `Sherlock, explain the forensic significance of transaction ${explanation.transaction_id} (amount: ₹${tx ? formatINR(tx.amount) : ''}) and advise on immediate risk mitigation.`
      );
    }
  };

  return (
    <div className="fixed top-20 right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 duration-300">
      <div
        className={`bg-white rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isHighRisk
            ? 'border-rose-300 ring-2 ring-rose-500/20 shadow-rose-950/10'
            : 'border-blue-200 ring-2 ring-blue-500/15 shadow-slate-950/10'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`px-4 py-3 flex items-center justify-between text-white ${
            isHighRisk
              ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-amber-700'
              : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold font-display tracking-tight flex items-center gap-2">
                <span>⚡ Sherlock Holmes Deduction</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-white">
                  Live
                </span>
              </div>
              <div className="text-[10px] text-white/80 font-mono">
                {explanation.transaction_id} · {tx ? formatINR(tx.amount) : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMinimized(!minimized)}
              className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 text-xs"
            >
              {minimized ? 'Expand' : 'Collapse'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!minimized && (
          <div className="p-4 space-y-3.5 text-xs text-slate-800 bg-white">
            {/* Route & Verdict */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-700">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-900">
                  {tx?.sender_account_id || 'SENDER'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-900">
                  {tx?.receiver_account_id || 'RECEIVER'}
                </span>
              </div>

              <div
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  isHighRisk
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isHighRisk ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{isHighRisk ? 'Suspicious Anomaly' : 'Normal Transfer'}</span>
              </div>
            </div>

            {/* Holmes Observation */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-slate-700 italic leading-relaxed text-[11px]">
              {explanation.sherlock_observation}
            </div>

            {/* Reasons List */}
            <div className="space-y-1.5">
              <div className="font-semibold text-slate-900 text-[11px]">
                Key Forensic Evidence Points:
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600">
                {explanation.why_flagged_or_cleared.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-blue-600 font-bold shrink-0">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Network Linkage */}
            <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/60 text-[11px] text-blue-900 leading-normal">
              <strong>Graph Topology:</strong> {explanation.network_linkage_analysis}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleInspectGraph}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors"
              >
                <span>Inspect in Money Trail</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleConsultSherlock}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Consult Sherlock</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
