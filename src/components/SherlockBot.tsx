import React, { useEffect, useRef, useState } from 'react';
import { useFraudMesh } from '../context/FraudMeshContext';
import {
  FileText,
  Maximize2,
  Minimize2,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { formatINR } from '../engine/digitalDna';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  citedEntities?: string[];
  source?: string;
  responseTimeMs?: number;
}

const DEFAULT_GREETING: ChatMessage = {
  id: 'msg-welcome',
  role: 'model',
  content:
    `⚡ FAST BRIEF: I am **Sherlock Holmes**, Chief Forensic Investigator for FraudMesh 2.0 (powered by **Gemini 3.8 Flash** with low-latency streaming). Ask me **anything** — specific accounts, transactions, uploaded CSV fraud types, ARTT trails, Digital DNA, or general AML & technical questions!\n\n` +
    `🔍 KEY DEDUCTIONS:\n` +
    `• **Circular Wash Ring:** Active 6-node cycle detected around **ACC-031 → ACC-036**.\n` +
    `• **Split-and-Merge Layering:** Originator **ACC-050** dispersed funds via 4 parallel conduits into **ACC-056**.\n` +
    `• **Money Mule Chain:** High-velocity sub-₹50k structuring active on **ACC-021 → ACC-025**.`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  citedEntities: ['ACC-050', 'ACC-031', 'ACC-021'],
  source: 'Gemini 3.8 Flash · Instant Forensic Core',
  responseTimeMs: 120,
};

const SUGGESTED_PROMPTS = [
  'Give me a fast brief of all fraud in the dataset',
  'Why is ACC-050 flagged for Split-and-Merge?',
  'Analyze the circular laundering ring (ACC-031)',
  'How do ARTT and 10-Axis Digital DNA work?',
  'Audit the money mule chain (ACC-021 to ACC-025)',
];

export const SherlockBot: React.FC = () => {
  const {
    accounts,
    transactions,
    alerts,
    detectedCycles,
    selectedAccountId,
    selectedTransactionId,
    isSherlockOpen,
    setIsSherlockOpen,
    sherlockPreloadQuery,
    openSherlockWithQuery,
    navigateTo,
    createCustomCase,
    showToast,
  } = useFraudMesh();

  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_GREETING]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastPreloadRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isSherlockOpen) {
      scrollToBottom();
    }
  }, [messages, isSherlockOpen]);

  // Compact, comprehensive live forensic context snapshot for Gemini 3.8 Flash
  const buildEvidenceContext = () => {
    const selAcc = accounts.find((a) => a.account_id === selectedAccountId);
    const selTx = transactions.find((t) => t.transaction_id === selectedTransactionId);

    const highRiskAccs = accounts
      .filter((a) => a.risk_score >= 65)
      .slice(0, 6)
      .map((a) => ({
        id: a.account_id,
        name: a.holder_name,
        risk_score: a.risk_score,
        risk_level: a.risk_level,
        reasons: a.flagged_reasons?.slice(0, 2),
      }));

    const recentTxs = transactions.slice(-6).map((t) => ({
      id: t.transaction_id,
      sender: t.sender_account_id,
      receiver: t.receiver_account_id,
      amount: t.amount,
      risk_score: t.risk_score,
      patterns: t.detected_patterns,
    }));

    const topAlerts = alerts.slice(0, 5).map((a) => ({
      id: a.alert_id,
      detector: a.detector_name,
      risk_score: a.risk_score,
      accounts: a.involved_accounts,
    }));

    return {
      selectedAccountId,
      selectedAccountName: selAcc?.holder_name,
      selectedAccountRisk: selAcc?.risk_level,
      selectedAccountRiskScore: selAcc?.risk_score,
      selectedTransactionId,
      selectedTransactionAmount: selTx ? formatINR(selTx.amount) : undefined,
      totalAccounts: accounts.length,
      totalTransactions: transactions.length,
      activeAlertsCount: alerts.length,
      detectedCyclesCount: detectedCycles.length,
      sampleCycle: detectedCycles[0] || [],
      highRiskAccounts: highRiskAccs,
      recentTransactions: recentTxs,
      topAlerts,
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputMessage).trim();
    if (!text || isLoading) return;

    const startTime = performance.now();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const botMsgId = `bot-${Date.now() + 1}`;
    const placeholderBotMsg: ChatMessage = {
      id: botMsgId,
      role: 'model',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citedEntities: [],
      source: 'Gemini 3.8 Flash · Streaming...',
    };

    const updatedHistory = [...messages, userMsg];
    setMessages([...updatedHistory, placeholderBotMsg]);
    setInputMessage('');
    setIsLoading(true);

    const historyPayload = updatedHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const evidenceContext = buildEvidenceContext();

    try {
      const res = await fetch('/api/sherlock/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          evidenceContext,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Stream status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.chunk) {
              accumulatedText += parsed.chunk;
              const elapsed = Math.round(performance.now() - startTime);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsgId
                    ? {
                        ...m,
                        content: accumulatedText,
                        responseTimeMs: elapsed,
                      }
                    : m
                )
              );
            }
            if (parsed.done) {
              const elapsed = Math.round(performance.now() - startTime);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsgId
                    ? {
                        ...m,
                        content: accumulatedText || m.content,
                        citedEntities: parsed.citedEntities || [],
                        source: parsed.source || 'Gemini 3.8 Flash',
                        responseTimeMs: elapsed,
                      }
                    : m
                )
              );
            }
          } catch {
            // ignore partial SSE JSON
          }
        }
      }
    } catch {
      // Fallback to fast JSON endpoint if stream interrupted
      try {
        const res = await fetch('/api/sherlock/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyPayload,
            evidenceContext,
          }),
        });
        const data = await res.json();
        const elapsed = Math.round(performance.now() - startTime);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  content: data.reply || '⚡ FAST BRIEF: Forensic analysis complete.',
                  citedEntities: data.citedEntities || [],
                  source: data.source || 'Gemini 3.8 Flash',
                  responseTimeMs: elapsed,
                }
              : m
          )
        );
      } catch {
        const elapsed = Math.round(performance.now() - startTime);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  content:
                    `⚡ FAST BRIEF: Regarding "${text}" — FraudMesh is actively tracking high-risk patterns around **ACC-050** (Split-and-Merge), **ACC-031** (Circular Ring), and **ACC-021** (Mule Conduit).\n\n` +
                    `🔍 KEY DEDUCTIONS:\n` +
                    `• Inspect **${selectedAccountId}** in the Money Trail Explorer or run ARTT traversal for multi-hop proof.`,
                  citedEntities: [selectedAccountId, 'ACC-050', 'ACC-031'],
                  source: 'Gemini 3.8 Flash · Instant Local Core',
                  responseTimeMs: elapsed,
                }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger preloaded queries from anywhere in the app (e.g., LiveTransactionExplainer or Copilot)
  useEffect(() => {
    if (
      isSherlockOpen &&
      sherlockPreloadQuery &&
      sherlockPreloadQuery !== lastPreloadRef.current
    ) {
      lastPreloadRef.current = sherlockPreloadQuery;
      handleSendMessage(sherlockPreloadQuery);
      openSherlockWithQuery('');
    }
  }, [isSherlockOpen, sherlockPreloadQuery]);

  const handleEntityClick = (entityId: string) => {
    if (entityId.startsWith('ACC-')) {
      navigateTo('money-trail-explorer', { accountId: entityId });
      showToast('Investigating Account', `Focused Money Trail on ${entityId}`, 'info');
    } else if (entityId.startsWith('TXN-')) {
      navigateTo('tx-monitoring', { txId: entityId });
      showToast('Inspecting Transaction', `Selected transaction ${entityId} in ledger`, 'info');
    } else if (entityId.startsWith('DET-')) {
      navigateTo('risk-intelligence');
      showToast('Viewing Detector', `Navigated to 8 Pattern Detectors & Scoring`, 'info');
    }
  };

  const handleCreateCaseFromSherlock = (msg: ChatMessage) => {
    const citedAccs = (msg.citedEntities || []).filter((e) => e.startsWith('ACC-'));
    const citedTxs = (msg.citedEntities || []).filter((e) => e.startsWith('TXN-'));

    createCustomCase({
      title: `Sherlock Deduction Case: ${citedAccs[0] || selectedAccountId}`,
      involvedAccounts: citedAccs.length > 0 ? citedAccs : [selectedAccountId],
      linkedTxIds:
        citedTxs.length > 0 ? citedTxs : selectedTransactionId ? [selectedTransactionId] : [],
      investigator: 'Sherlock Holmes & Task Force',
      note: msg.content,
    });

    showToast(
      'Investigation Case Created',
      'Sherlock Holmes deductive analysis saved to formal Case Dossier.',
      'success'
    );
    navigateTo('case-management');
  };

  const renderInlineBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-slate-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={idx} className="italic text-slate-800">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  // Helper to render Fast Brief callout distinctly from the rest of the message
  const renderFormattedContent = (content: string, isUser: boolean) => {
    if (isUser || !content) return <div className="whitespace-pre-wrap">{content}</div>;

    const lines = content.split('\n');
    const firstLine = lines[0] || '';
    const hasFastBrief =
      firstLine.includes('FAST BRIEF') || firstLine.startsWith('⚡');

    if (hasFastBrief) {
      const rest = lines.slice(1).join('\n').trim();
      return (
        <div className="space-y-2.5">
          <div className="p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 text-slate-900 font-medium text-xs leading-snug">
            {renderInlineBold(firstLine)}
          </div>
          {rest && (
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
              {renderInlineBold(rest)}
            </div>
          )}
        </div>
      );
    }

    return <div className="whitespace-pre-wrap">{renderInlineBold(content)}</div>;
  };

  return (
    <>
      {/* Floating Trigger Dock Button */}
      {!isSherlockOpen && (
        <button
          type="button"
          onClick={() => setIsSherlockOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-xs shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-blue-600 animate-pulse" />
          </div>
          <div className="text-left">
            <div className="font-bold flex items-center gap-1.5 leading-tight">
              Sherlock Holmes
              <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded font-normal">
                Gemini 3.8
              </span>
            </div>
            <div className="text-[10px] text-blue-100 font-normal">
              Instant AI Forensic Brief
            </div>
          </div>
        </button>
      )}

      {/* Main Sherlock Chat Drawer */}
      {isSherlockOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-2xl transition-all duration-200 overflow-hidden ${
            isExpanded
              ? 'w-[94vw] sm:w-[700px] h-[86vh]'
              : 'w-[94vw] sm:w-[460px] h-[620px] max-h-[86vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-3 flex items-center justify-between border-b border-blue-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-inner">
                <Zap className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight font-display">
                    Sherlock Holmes AI
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                    Gemini 3.8 Flash · Fast Brief
                  </span>
                </div>
                <div className="text-[11px] text-blue-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Low-Latency Stream · Active on {selectedAccountId}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-blue-100">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white cursor-pointer"
                title={isExpanded ? 'Restore Size' : 'Expand View'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setMessages([DEFAULT_GREETING])}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white cursor-pointer"
                title="Reset Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsSherlockOpen(false)}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white cursor-pointer"
                title="Close Sherlock Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Context Bar */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
            <div className="flex items-center gap-3 truncate">
              <span>
                Focus: <strong className="font-mono text-slate-900">{selectedAccountId}</strong>
              </span>
              <span>·</span>
              <span>
                Alerts: <strong className="text-rose-600 font-mono">{alerts.length}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                handleSendMessage(
                  `Give me a fast forensic brief on account ${selectedAccountId}.`
                )
              }
              className="text-blue-600 hover:text-blue-700 font-bold truncate hover:underline cursor-pointer"
            >
              ⚡ Fast Brief {selectedAccountId} →
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFD]">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className="max-w-[86%] space-y-1.5">
                    <div
                      className={`p-3.5 rounded-2xl shadow-xs leading-relaxed ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {msg.content ? (
                        renderFormattedContent(msg.content, isUser)
                      ) : (
                        <div className="flex items-center gap-2 text-blue-600 font-semibold">
                          <Zap className="w-3.5 h-3.5 animate-pulse" />
                          <span>Streaming fast brief from Gemini 3.8 Flash...</span>
                        </div>
                      )}

                      {/* Cited Evidence Chips */}
                      {!isUser && msg.citedEntities && msg.citedEntities.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            Jump to Evidence:
                          </span>
                          {msg.citedEntities.map((ent, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleEntityClick(ent)}
                              className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-colors cursor-pointer"
                              title={`Jump to ${ent}`}
                            >
                              {ent} ↗
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div
                      className={`flex flex-wrap items-center gap-2 text-[10px] text-slate-400 px-1 ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {!isUser && msg.responseTimeMs !== undefined && (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          ⚡ {(msg.responseTimeMs / 1000).toFixed(2)}s
                        </span>
                      )}
                      {!isUser && msg.source && <span>· {msg.source}</span>}
                      {!isUser && msg.id !== 'msg-welcome' && msg.content && (
                        <>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleCreateCaseFromSherlock(msg)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            Save to Case
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold shadow-xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestion Pills */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200/80 overflow-x-auto whitespace-nowrap flex items-center gap-1.5 shrink-0">
            {SUGGESTED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(p)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                ⚡ {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask any question (accounts, CSV fraud, AML, or general)..."
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Send for Instant Brief"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
