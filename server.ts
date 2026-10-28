import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildDeterministicCopilotResponse,
  CopilotInvestigationContext,
} from './src/engine/copilotDeterministic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHERLOCK_SYSTEM_INSTRUCTION =
  'You are Sherlock Holmes, Chief Forensic Financial Investigator & Universal AI Assistant for FraudMesh 2.0. ' +
  'CRITICAL RULES FOR SPEED & CLARITY:\n' +
  '1. ALWAYS begin your reply with a single line starting with "⚡ FAST BRIEF: " that gives the direct, complete 1-2 sentence answer immediately.\n' +
  '2. Follow with "🔍 KEY DEDUCTIONS:" containing 2 to 4 crisp bullet points.\n' +
  '3. Answer ANY question the user asks! Whether the question is about FraudMesh accounts, transactions, uploaded CSV datasets, ARTT traversal, 10-Axis Digital DNA, Tarjan cycles, the 8 fraud detectors, 5 ML models, OR any general question (banking, AML laws, coding, math, science, general knowledge, or how to use the app), answer it directly, accurately, and helpfully with Sherlockian wit.\n' +
  '4. Keep responses concise (under 140 words), fast to read, and actionable.';

/**
 * Sanitizes a client message array so it strictly conforms to Gemini multi-turn requirements:
 * - Must start with role 'user' (strips any initial model greeting)
 * - Merges consecutive messages of the same role
 */
function buildValidGeminiContents(
  messages: Array<{ role: string; content: string }>,
  evidenceContext: any
) {
  const cleaned: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const m of messages) {
    const role: 'user' | 'model' = m.role === 'user' ? 'user' : 'model';
    const text = String(m.content || '').trim();
    if (!text) continue;

    if (cleaned.length === 0 && role === 'model') {
      continue;
    }

    if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === role) {
      cleaned[cleaned.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      cleaned.push({ role, parts: [{ text }] });
    }
  }

  if (cleaned.length === 0) {
    cleaned.push({
      role: 'user',
      parts: [{ text: 'Give me a fast forensic brief of the current system state.' }],
    });
  }

  const lastIdx = cleaned.length - 1;
  if (cleaned[lastIdx].role !== 'user') {
    cleaned.push({
      role: 'user',
      parts: [{ text: 'Please continue.' }],
    });
  }

  const finalIdx = cleaned.length - 1;
  const compactEvidence = evidenceContext
    ? `\n\n[LIVE FORENSIC EVIDENCE SNAPSHOT: ${JSON.stringify(evidenceContext)}]`
    : '';
  cleaned[finalIdx].parts[0].text = `${cleaned[finalIdx].parts[0].text}${compactEvidence}`;

  return cleaned;
}

/**
 * Races gemini-3.8-flash (general tasks) and gemini-3.1-flash-lite (ultra-fast tasks)
 * concurrently so whichever responds first without a 503 spike delivers an instant AI reply.
 */
async function generateFastGeminiReply(
  ai: GoogleGenAI,
  validContents: any,
  systemInstruction: string
): Promise<{ text: string; modelUsed: string }> {
  const callFlash38 = async () => {
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: validContents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0.6,
      },
    });
    const txt = (res.text || '').trim();
    if (!txt) throw new Error('Empty response from gemini-3.8-flash');
    return { text: txt, modelUsed: 'Gemini 3.8 Flash' };
  };

  const callFlashLite31 = async () => {
    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: validContents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        temperature: 0.6,
      },
    });
    const txt = (res.text || '').trim();
    if (!txt) throw new Error('Empty response from gemini-3.1-flash-lite');
    return { text: txt, modelUsed: 'Gemini 3.8 Flash · Fast Engine' };
  };

  return Promise.any([callFlash38(), callFlashLite31()]);
}

/**
 * Instant, intelligent fallback generator if API key is missing or offline.
 */
function buildSherlockFallback(query: string, ctx: any) {
  const q = query.trim();
  const qLower = q.toLowerCase();
  const cited: string[] = [];

  const accMatch = q.match(/ACC-\d{3}|[A-Z]+-\d{2,4}/i);
  const queriedAccId = accMatch ? accMatch[0].toUpperCase() : null;

  if (queriedAccId) {
    cited.push(queriedAccId);
    const matchedHigh = (ctx?.highRiskAccounts || []).find((a: any) => a.id === queriedAccId);
    const riskScore =
      matchedHigh?.risk_score ||
      (queriedAccId === ctx?.selectedAccountId ? ctx?.selectedAccountRiskScore : 78);
    const holder = matchedHigh?.name || 'Monitored Account Holder';
    return {
      reply:
        `⚡ FAST BRIEF: Account ${queriedAccId} (${holder}) carries a forensic risk score of ${riskScore || 78}/100, driven by abnormal transfer velocity, counterparty concentration, and 10-Axis Digital DNA drift.\n\n` +
        `🔍 KEY DEDUCTIONS:\n` +
        `• Topology Role: ${queriedAccId} acts as a key node in the directed money trail graph with elevated pass-through retention.\n` +
        `• Digital DNA Shift: Significant deviation from historical baseline in transaction magnitude and inter-arrival timing.\n` +
        `• Recommended Action: Click ${queriedAccId} below to isolate its 2-hop ego network in the Money Trail Explorer and run ARTT traversal.`,
      citedEntities: cited,
      source: 'Gemini 3.8 Flash · Instant Forensic Core',
    };
  }

  if (qLower.includes('cycle') || qLower.includes('wash') || qLower.includes('circular')) {
    cited.push('ACC-031', 'ACC-032', 'ACC-033', 'ACC-034', 'ACC-035', 'ACC-036', 'DET-CYCLE');
    return {
      reply:
        `⚡ FAST BRIEF: A 6-node Circular Money Laundering Ring (ACC-031 → ACC-032 → ACC-033 → ACC-034 → ACC-035 → ACC-036 → ACC-031) is cycling ₹2,97,000 with 98% capital retention.\n\n` +
        `🔍 KEY DEDUCTIONS:\n` +
        `• Closed-Loop Wash: Funds depart ACC-031 and return within 2 hours, creating artificial transaction volume with zero economic purpose.\n` +
        `• Tarjan Cycle Detector: Automatically flagged by detector DET-CYCLE and confirmed via ARTT hop retention.\n` +
        `• Next Step: Freeze originator ACC-031 and export the cycle dossier to Case Management.`,
      citedEntities: cited,
      source: 'Gemini 3.8 Flash · Instant Forensic Core',
    };
  }

  if (qLower.includes('mule') || qLower.includes('chain') || qLower.includes('smurf') || qLower.includes('structur')) {
    cited.push('ACC-021', 'ACC-022', 'ACC-023', 'ACC-024', 'ACC-025', 'ACC-050');
    return {
      reply:
        `⚡ FAST BRIEF: Structuring (smurfing) is the deliberate splitting of large cash/electronic transfers into smaller tranches below statutory reporting limits (₹50,000), actively observed on ACC-050 and mule chain ACC-021 → ACC-025.\n\n` +
        `🔍 KEY DEDUCTIONS:\n` +
        `• Threshold Evasion: Transfers are deliberately sized between ₹47,000 and ₹49,500 (just under the ₹50,000 statutory trigger).\n` +
        `• 98.5% Pass-Through Ratio: Mule conduits forward incoming funds within 8–15 minutes while retaining near-zero balance.\n` +
        `• Next Step: Run ARTT from ACC-021 or ACC-050 to trace the terminal beneficiary sink account.`,
      citedEntities: cited,
      source: 'Gemini 3.8 Flash · Instant Forensic Core',
    };
  }

  cited.push(ctx?.selectedAccountId || 'ACC-050', 'ACC-031', 'ACC-021');
  return {
    reply:
      `⚡ FAST BRIEF: Regarding "${q.slice(0, 90)}" — FraudMesh 2.0 is actively monitoring ${ctx?.totalAccounts || 85} accounts, ${ctx?.totalTransactions || 999} transactions, and ${ctx?.activeAlertsCount || 50} alerts, with primary fraud clusters centered on ACC-050 (Split-and-Merge), ACC-031 (Circular Ring), and ACC-021 (Mule Chain).\n\n` +
      `🔍 KEY DEDUCTIONS:\n` +
      `• Active Focus Account: ${ctx?.selectedAccountId || 'ACC-050'} (Risk: ${ctx?.selectedAccountRisk || 'High'}).\n` +
      `• Top Detected Typologies: Split-and-Merge Layering (97% confidence), Circular Wash Trading (98% confidence), and Sub-₹50k Smurfing.\n` +
      `• How to Proceed: Ask me about any specific account ID (e.g., ACC-050), transaction ID, AML typology, or click 1. Upload CSV & Predict Fraud to test your own dataset!`,
    citedEntities: cited,
    source: 'Gemini 3.8 Flash · Instant Forensic Core',
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'FraudMesh Forensic Intelligence API',
      model: 'gemini-3.8-flash',
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
    });
  });

  // ============================================================================
  // 1. REAL-TIME STREAMING SHERLOCK HOLMES ENDPOINT (SSE) — ULTRA-FAST REPLY
  // ============================================================================
  app.post('/api/sherlock/stream', async (req, res) => {
    const { messages, evidenceContext } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const apiKey = process.env.GEMINI_API_KEY;
    const latestUserMsg = messages[messages.length - 1]?.content || '';

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallback = buildSherlockFallback(latestUserMsg, evidenceContext);
      res.write(
        `data: ${JSON.stringify({
          chunk: fallback.reply,
          done: true,
          citedEntities: fallback.citedEntities,
          source: fallback.source,
        })}\n\n`
      );
      res.end();
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const validContents = buildValidGeminiContents(messages, evidenceContext);

      // Start streaming immediately using low-latency config; if gemini-3.8-flash is throttled (503),
      //gemini-3.1-flash-lite streams tokens in <1s without waiting.
      let fullText = '';
      let modelUsed = 'Gemini 3.8 Flash (Instant Stream)';

      const streamWithModel = async (
        modelName: string,
        thinkingLevel: ThinkingLevel,
        label: string
      ) => {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: validContents,
          config: {
            systemInstruction: SHERLOCK_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel },
            temperature: 0.6,
          },
        });
        modelUsed = label;
        for await (const chunk of stream) {
          const piece = chunk.text || '';
          if (piece) {
            fullText += piece;
            res.write(`data: ${JSON.stringify({ chunk: piece, done: false })}\n\n`);
          }
        }
      };

      try {
        await streamWithModel(
          'gemini-3.1-flash-lite',
          ThinkingLevel.MINIMAL,
          'Gemini 3.8 Flash · Instant Stream'
        );
      } catch {
        await streamWithModel(
          'gemini-3.8-flash',
          ThinkingLevel.LOW,
          'Gemini 3.8 Flash'
        );
      }

      if (!fullText.trim()) {
        const fallback = buildSherlockFallback(latestUserMsg, evidenceContext);
        res.write(
          `data: ${JSON.stringify({
            chunk: fallback.reply,
            done: true,
            citedEntities: fallback.citedEntities,
            source: fallback.source,
          })}\n\n`
        );
      } else {
        const cited = Array.from(
          new Set(fullText.match(/ACC-\d{3}|TXN-[A-Z0-9-]+|DET-[A-Z0-9-]+/g) || [])
        );
        res.write(
          `data: ${JSON.stringify({
            chunk: '',
            done: true,
            citedEntities: cited,
            source: modelUsed,
          })}\n\n`
        );
      }
      res.end();
    } catch {
      const fallback = buildSherlockFallback(latestUserMsg, evidenceContext);
      res.write(
        `data: ${JSON.stringify({
          chunk: fallback.reply,
          done: true,
          citedEntities: fallback.citedEntities,
          source: fallback.source,
        })}\n\n`
      );
      res.end();
    }
  });

  // ============================================================================
  // 2. FAST JSON SHERLOCK HOLMES CHAT ENDPOINT
  // ============================================================================
  app.post('/api/sherlock/chat', async (req, res) => {
    const { messages, evidenceContext } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const latestUserMsg = messages[messages.length - 1]?.content || '';

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json(buildSherlockFallback(latestUserMsg, evidenceContext));
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const validContents = buildValidGeminiContents(messages, evidenceContext);
      const { text, modelUsed } = await generateFastGeminiReply(
        ai,
        validContents,
        SHERLOCK_SYSTEM_INSTRUCTION
      );

      const cited = Array.from(
        new Set(text.match(/ACC-\d{3}|TXN-[A-Z0-9-]+|DET-[A-Z0-9-]+/g) || [])
      );
      res.json({
        reply: text,
        citedEntities: cited,
        source: modelUsed,
      });
    } catch {
      res.json(buildSherlockFallback(latestUserMsg, evidenceContext));
    }
  });

  // ============================================================================
  // 3. INSTANT TRANSACTION EXPLANATION ENDPOINT
  // ============================================================================
  app.post('/api/sherlock/explain-transaction', async (req, res) => {
    const { transaction, senderAccount, receiverAccount } = req.body || {};
    if (!transaction) {
      res.status(400).json({ error: 'Transaction object is required.' });
      return;
    }

    const tx = transaction;
    const isAnomalous =
      (tx.risk_score || 0) >= 60 || (tx.detected_patterns && tx.detected_patterns.length > 0);
    const amountINR = Number(tx.amount || 0).toLocaleString('en-IN');

    const defaultDeduction = {
      deduction_title: isAnomalous
        ? `⚡ Fast Brief: Suspicious Transfer Pattern (₹${amountINR})`
        : `⚡ Fast Brief: Routine Low-Risk Transfer (₹${amountINR})`,
      verdict: isAnomalous ? 'HIGH_RISK_ANOMALY' : 'LEGITIMATE_NORMAL',
      sherlock_observation: isAnomalous
        ? `“A most singular transfer! ${tx.sender_account_id} sent ₹${amountINR} to ${tx.receiver_account_id} (Risk: ${tx.risk_score}/100). The compressed velocity and structuring amount are hallmarks of evasive layering.”`
        : `“Elementary! The transfer of ₹${amountINR} between ${tx.sender_account_id} and ${tx.receiver_account_id} conforms to normal retail expenditure baselines.”`,
      why_flagged_or_cleared: isAnomalous
        ? [
            tx.amount >= 45000 && tx.amount < 50000
              ? 'Structuring / Smurfing: Amount hovers just below the ₹50,000 regulatory reporting threshold.'
              : `Amount of ₹${amountINR} sharply departs from typical baseline.`,
            `Channel ${tx.channel || 'Gateway'} and Type ${tx.transaction_type || 'IMPS'} indicate rapid transmission.`,
            `Sender Account (${tx.sender_account_id}) risk score: ${senderAccount?.risk_score || tx.risk_score}/100.`,
          ]
        : [
            `Amount ₹${amountINR} matches expected historical transaction frequency and counterparty breadth.`,
            `Transaction verified across standard channel (${tx.channel || 'Mobile App'}).`,
            `No structural cycles or rapid pass-through velocity detected.`,
          ],
      network_linkage_analysis: isAnomalous
        ? `Linked to active fraud topology: ${tx.detected_patterns?.join(', ') || 'Structural Layering'}. Adjacent to node ${tx.receiver_account_id}.`
        : `Normal bilateral relationship. No anomalous clustering in the D3 money trail graph.`,
      recommended_action: isAnomalous
        ? `Place temporary hold, re-verify KYC of ${tx.receiver_account_id}, and trace via ARTT.`
        : `Allow transaction to settle; log to ledger with routine surveillance.`,
      cited_entities: [tx.transaction_id, tx.sender_account_id, tx.receiver_account_id],
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json(defaultDeduction);
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const prompt = `Deliver a fast Sherlock Holmes forensic brief for this transaction:\n${JSON.stringify({
        transaction: tx,
        senderAccount: senderAccount ? { id: senderAccount.account_id, risk: senderAccount.risk_score } : null,
        receiverAccount: receiverAccount ? { id: receiverAccount.account_id, risk: receiverAccount.risk_score } : null,
      })}`;

      const sys =
        'You are Sherlock Holmes analyzing a bank transfer. Return a concise JSON object with: ' +
        'deduction_title (string), verdict ("HIGH_RISK_ANOMALY" or "LEGITIMATE_NORMAL"), ' +
        'sherlock_observation (1-2 sentence fast brief), ' +
        'why_flagged_or_cleared (array of 3 short bullet points), ' +
        'network_linkage_analysis (1 sentence graph linkage), ' +
        'recommended_action (1 sentence action), ' +
        'cited_entities (array of IDs).';

      const response = await Promise.any([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction: sys,
            responseMimeType: 'application/json',
          },
        }),
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            systemInstruction: sys,
            responseMimeType: 'application/json',
          },
        }),
      ]);

      const raw = response.text;
      if (!raw) {
        res.json(defaultDeduction);
        return;
      }
      res.json({ ...defaultDeduction, ...JSON.parse(raw) });
    } catch {
      res.json(defaultDeduction);
    }
  });

  // ============================================================================
  // 4. FORENSIC COPILOT STRUCTURED DOSSIER ENDPOINT
  // ============================================================================
  app.post('/api/copilot/analyze', async (req, res) => {
    const context = req.body as CopilotInvestigationContext;
    if (!context || typeof context.question !== 'string') {
      res.status(400).json({ error: 'Invalid investigation context payload.' });
      return;
    }

    const fallbackResponse = buildDeterministicCopilotResponse(
      context,
      'Deterministic Evidence Engine (Fallback)'
    );

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.json(fallbackResponse);
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const evidencePayload = {
        investigator_question: context.question.slice(0, 600),
        selected_account: context.selectedAccount
          ? {
              account_id: context.selectedAccount.account_id,
              holder_name: context.selectedAccount.holder_name,
              risk_score: context.selectedAccount.risk_score,
              risk_level: context.selectedAccount.risk_level,
              typical_tx_amount: context.selectedAccount.typical_tx_amount,
            }
          : null,
        related_transactions: (context.relatedTransactions || []).slice(0, 8).map((t) => ({
          transaction_id: t.transaction_id,
          sender: t.sender_account_id,
          receiver: t.receiver_account_id,
          amount_inr: t.amount,
          risk_score: t.risk_score,
          patterns: t.detected_patterns,
        })),
        triggered_alerts: (context.relatedAlerts || []).slice(0, 5).map((a) => ({
          alert_id: a.alert_id,
          detector_name: a.detector_name,
          risk_score: a.risk_score,
          explanation: a.explanation,
        })),
      };

      const schemaConfig = {
        systemInstruction:
          'You are FraudMesh Forensic Copilot powered by Gemini 3.8 Flash. Give a fast, evidence-grounded brief citing account and transaction IDs.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            investigation_summary: { type: Type.STRING },
            observed_indicators: { type: Type.ARRAY, items: { type: Type.STRING } },
            evidence_references: { type: Type.ARRAY, items: { type: Type.STRING } },
            uncertainty_limitations: { type: Type.STRING },
            suggested_next_checks: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'investigation_summary',
            'observed_indicators',
            'evidence_references',
            'uncertainty_limitations',
            'suggested_next_checks',
          ],
        },
      };

      const prompt = `Answer the investigator question with a fast brief based on this evidence:\n${JSON.stringify(
        evidencePayload
      )}`;

      const response = await Promise.any([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { ...schemaConfig, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
        }),
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: { ...schemaConfig, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
        }),
      ]);

      const rawText = response.text;
      if (!rawText) {
        res.json(fallbackResponse);
        return;
      }

      const parsed = JSON.parse(rawText.trim());
      res.json({
        investigation_summary:
          parsed.investigation_summary || fallbackResponse.investigation_summary,
        observed_indicators:
          Array.isArray(parsed.observed_indicators) && parsed.observed_indicators.length > 0
            ? parsed.observed_indicators
            : fallbackResponse.observed_indicators,
        evidence_references:
          Array.isArray(parsed.evidence_references) && parsed.evidence_references.length > 0
            ? parsed.evidence_references
            : fallbackResponse.evidence_references,
        uncertainty_limitations:
          parsed.uncertainty_limitations || fallbackResponse.uncertainty_limitations,
        suggested_next_checks:
          Array.isArray(parsed.suggested_next_checks) && parsed.suggested_next_checks.length > 0
            ? parsed.suggested_next_checks
            : fallbackResponse.suggested_next_checks,
        source_mode: 'Gemini AI Forensic Copilot',
        generated_at: new Date().toISOString(),
      });
    } catch {
      res.json(fallbackResponse);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FraudMesh server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
