import React, { useMemo, useState } from 'react';
import { useFraudMesh } from '../context/FraudMeshContext';
import { formatINR } from '../engine/digitalDna';
import { Transaction } from '../types/fraudmesh';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  History,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const CustomerViews: React.FC = () => {
  const {
    activePage,
    activeCustomerAccountId,
    setActiveCustomerAccountId,
    accounts,
    customers,
    transactions,
    submitCustomerTransfer,
    reportSuspiciousActivity,
    navigateTo,
  } = useFraudMesh();

  const [recipientId, setRecipientId] = useState('ACC-004');
  const [transferAmount, setTransferAmount] = useState('12500');
  const [transferType, setTransferType] = useState<Transaction['transaction_type']>('UPI');
  const [transferChannel, setTransferChannel] = useState<Transaction['channel']>('Mobile App');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [lastCreatedTx, setLastCreatedTx] = useState<Transaction | null>(null);

  const [reportTxId, setReportTxId] = useState<string>('');
  const [reportReason, setReportReason] = useState<string>(
    'I did not recognize the device fingerprint DEV-001-NEW or authorize this transfer.'
  );
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Strictly scope all Customer views to the active customer's synthetic account
  const customerAccount = useMemo(
    () =>
      accounts.find((a) => a.account_id === activeCustomerAccountId) || accounts[0],
    [accounts, activeCustomerAccountId]
  );

  const customerProfile = useMemo(
    () =>
      customers.find((c) => c.account_id === customerAccount.account_id) || customers[0],
    [customers, customerAccount]
  );

  const myTransactions = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.sender_account_id === customerAccount.account_id ||
            t.receiver_account_id === customerAccount.account_id
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [transactions, customerAccount]
  );

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setTransferError('Please enter a valid transfer amount greater than zero.');
      return;
    }
    if (amt > customerAccount.balance_inr) {
      setTransferError(`Transfer amount exceeds available balance (${formatINR(customerAccount.balance_inr)}).`);
      return;
    }
    if (recipientId === customerAccount.account_id) {
      setTransferError('Destination account must differ from sender account.');
      return;
    }

    try {
      const res = submitCustomerTransfer({
        senderAccountId: customerAccount.account_id,
        receiverAccountId: recipientId,
        amount: amt,
        transactionType: transferType,
        channel: transferChannel,
      });
      if (res.ok && res.transaction) {
        setLastCreatedTx(res.transaction);
        setTransferAmount('');
      } else {
        setTransferError(res.error || 'Transaction could not be cleared.');
      }
    } catch (err: any) {
      setTransferError(err.message || 'Transaction could not be cleared.');
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTxId && myTransactions.length > 0) {
      reportSuspiciousActivity(myTransactions[0].transaction_id, reportReason);
    } else if (reportTxId) {
      reportSuspiciousActivity(reportTxId, reportReason);
    }
    setReportSubmitted(true);
  };

  return (
    <div className="space-y-6">
      {/* Scope Banner: Clearly identify active synthetic customer persona */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-5">
        <div>
          <div className="text-xs font-mono font-semibold text-blue-700 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-blue-600" />
            SYNTHETIC CUSTOMER PORTAL
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            {customerProfile.full_name} ({customerAccount.account_id})
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Synthetic Customer Profile · KYC Tier: <span className="font-semibold text-slate-800">{customerAccount.kyc_tier}</span> · Location:{' '}
            <span className="text-slate-800 font-semibold">{customerAccount.branch_city}</span>
          </p>
        </div>

        {/* Persona Switcher within Customer Role */}
        <div className="flex items-center gap-2">
          <label htmlFor="customer-persona-select" className="text-xs font-semibold text-slate-700">
            Switch Persona:
          </label>
          <select
            id="customer-persona-select"
            value={customerAccount.account_id}
            onChange={(e) => {
              setActiveCustomerAccountId(e.target.value);
              setLastCreatedTx(null);
            }}
            className="px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
          >
            {customers.map((c) => (
              <option key={c.customer_id} value={c.account_id}>
                {c.account_id} — {c.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Module Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl w-fit">
        {[
          { id: 'customer-dashboard', label: 'Transfer Simulator' },
          { id: 'customer-tx-history', label: 'Transaction Ledger' },
          { id: 'customer-tx-status', label: 'Verification Pipeline' },
          { id: 'customer-security-alerts', label: 'Security Alerts' },
          { id: 'customer-report-activity', label: 'Report Suspicious Activity' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigateTo(tab.id as any)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activePage === tab.id
                ? 'bg-white text-blue-700 font-bold shadow-xs border border-blue-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Sub-View Content */}
      {activePage === 'customer-dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Account Summary Card */}
            <div className="lg:col-span-4 border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Account Overview
              </h2>
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500">Available Balance</div>
                <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                  {formatINR(customerAccount.balance_inr)}
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Type</span>
                  <span className="font-semibold text-slate-800">{customerAccount.account_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch City</span>
                  <span className="font-medium text-slate-700">{customerAccount.branch_city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Transactions</span>
                  <span className="font-mono font-semibold text-slate-800">{myTransactions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Protection Status</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" /> FraudMesh Active
                  </span>
                </div>
              </div>
            </div>

            {/* Transfer Simulation Form */}
            <div className="lg:col-span-8 border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  Simulate Domestic Transfer
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Dispatches an authentic transfer event through the FraudMesh 8-detector pipeline and evaluates Digital DNA baseline drift in real time.
                </p>
              </div>

              {transferError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {transferError}
                </div>
              )}

              {lastCreatedTx && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      Transaction Processed & Evaluated
                    </span>
                    <span className="font-mono font-bold text-slate-700">{lastCreatedTx.transaction_id}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-slate-700">
                    <div>
                      Amount: <span className="font-bold text-slate-900">{formatINR(lastCreatedTx.amount)}</span>
                    </div>
                    <div>
                      Risk Score:{' '}
                      <span
                        className={`font-bold ${
                          lastCreatedTx.risk_score >= 70
                            ? 'text-rose-600'
                            : lastCreatedTx.risk_score >= 40
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {lastCreatedTx.risk_score}/100
                      </span>
                    </div>
                    <div>Status: <span className="font-semibold text-slate-900">{lastCreatedTx.status}</span></div>
                    <div>Channel: <span className="text-slate-800">{lastCreatedTx.channel}</span></div>
                  </div>
                  {lastCreatedTx.risk_reasons.length > 0 && (
                    <div className="text-[11px] text-amber-800 font-medium pt-1">
                      Triggered Reasons: {lastCreatedTx.risk_reasons.join(' · ')}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="transfer-recipient-select" className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient Account
                    </label>
                    <select
                      id="transfer-recipient-select"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                    >
                      {accounts
                        .filter((a) => a.account_id !== customerAccount.account_id)
                        .map((a) => (
                          <option key={a.account_id} value={a.account_id}>
                            {a.account_id} — {a.holder_name} ({a.branch_city})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="transfer-amount-input" className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount (INR ₹)
                    </label>
                    <input
                      id="transfer-amount-input"
                      type="number"
                      min="1"
                      step="1"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="transfer-type-select" className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Rail
                    </label>
                    <select
                      id="transfer-type-select"
                      value={transferType}
                      onChange={(e) =>
                        setTransferType(e.target.value as Transaction['transaction_type'])
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                    >
                      <option value="UPI">UPI (Instant 24x7)</option>
                      <option value="IMPS">IMPS</option>
                      <option value="NEFT">NEFT (Batch Settlement)</option>
                      <option value="RTGS">RTGS (Large Value)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="transfer-channel-select" className="block text-xs font-semibold text-slate-700 mb-1">
                      Initiating Channel
                    </label>
                    <select
                      id="transfer-channel-select"
                      value={transferChannel}
                      onChange={(e) =>
                        setTransferChannel(e.target.value as Transaction['channel'])
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                    >
                      <option value="Mobile App">Mobile Banking App</option>
                      <option value="NetBanking">Net Banking Portal</option>
                      <option value="Branch">Branch Teller</option>
                      <option value="API Gateway">API Gateway</option>
                    </select>
                  </div>
                </div>

                {/* Preset quick test amounts */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500 font-medium">Quick presets:</span>
                  {[
                    { label: '₹1,500 (Routine)', amt: '1500' },
                    { label: '₹48,500 (Near Smurfing Threshold)', amt: '48500' },
                    { label: '₹2,50,000 (Large Value Outflow)', amt: '250000' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setTransferAmount(p.amt)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 border border-slate-200"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Authorize & Dispatch Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Recent Account Activity Table */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Recent Activity on This Account ({customerAccount.account_id})
              </h3>
              <button
                type="button"
                onClick={() => navigateTo('customer-tx-history')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                View Full History →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Transaction ID</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Counterparty</th>
                    <th className="py-2.5 px-3">Rail & Channel</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Risk Score</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myTransactions.slice(0, 5).map((tx) => {
                    const isOutflow = tx.sender_account_id === customerAccount.account_id;
                    return (
                      <tr key={tx.transaction_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800">{tx.transaction_id}</td>
                        <td className="py-2.5 px-3">
                          {isOutflow ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                              <ArrowUpRight className="w-3 h-3" /> Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <ArrowDownLeft className="w-3 h-3" /> Received
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {isOutflow ? tx.receiver_account_id : tx.sender_account_id}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {tx.transaction_type} · {tx.channel}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {formatINR(tx.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              tx.risk_score >= 70
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : tx.risk_score >= 40
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {tx.risk_score}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{tx.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Notifications Feed */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Recent Security Notifications
            </h3>
            <div className="space-y-2.5">
              {customerProfile.security_notifications.slice(0, 3).map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{notif.title}</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(notif.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{notif.description}</p>
                  </div>
                  {notif.related_tx_id && (
                    <button
                      type="button"
                      onClick={() => {
                        setReportTxId(notif.related_tx_id!);
                        navigateTo('customer-report-activity');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 rounded-lg whitespace-nowrap shrink-0 shadow-xs"
                    >
                      Review / Report
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View: Transaction Ledger */}
      {activePage === 'customer-tx-history' && (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Complete Personal Transaction Ledger ({customerAccount.account_id})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">Timestamp (IST)</th>
                  <th className="py-2.5 px-3">Sender → Receiver</th>
                  <th className="py-2.5 px-3">Channel & Rail</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myTransactions.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{tx.transaction_id}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                      {new Date(tx.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">
                      {tx.sender_account_id} → {tx.receiver_account_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {tx.transaction_type} · {tx.channel}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View: Verification Pipeline */}
      {activePage === 'customer-tx-status' && (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Transaction Alert & Verification Status
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Real-time clearance status for transfers associated with {customerAccount.account_id}.
            </p>
          </div>
          <div className="space-y-3">
            {myTransactions.slice(0, 6).map((tx) => (
              <div
                key={tx.transaction_id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 shadow-xs"
              >
                <div>
                  <div className="text-xs font-mono font-bold text-slate-900">
                    {tx.transaction_id} · {tx.sender_account_id} → {tx.receiver_account_id} ·{' '}
                    {formatINR(tx.amount)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Pipeline Status: <span className="text-slate-900 font-semibold">{tx.status}</span>{' '}
                    · Note: {tx.risk_reasons[0] || 'Standard verification completed'}
                  </div>
                </div>
                <div className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  ClearanceBand: {tx.risk_level} ({tx.risk_score}/100)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View: Security Alerts */}
      {activePage === 'customer-security-alerts' && (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Personal Account Security Alerts
          </h2>
          {customerProfile.security_notifications.map((n) => (
            <div
              key={n.id}
              className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{n.title}</span>
                <span className="text-xs font-mono text-slate-500">
                  Severity: {n.severity} · {new Date(n.timestamp).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{n.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* View: Report Activity */}
      {activePage === 'customer-report-activity' && (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-xs p-6 max-w-2xl space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Report Suspicious Account Activity
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Submitting a report creates a formal review item in the Fraud Investigator Case
            Management workspace without automatically labeling the transaction as confirmed fraud.
          </p>

          {reportSubmitted && (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 font-medium">
              Your report has been logged and linked to an Investigator Review Case.
            </div>
          )}

          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="report-tx-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Select Transaction to Report
              </label>
              <select
                id="report-tx-select"
                value={reportTxId || myTransactions[0]?.transaction_id || ''}
                onChange={(e) => setReportTxId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
              >
                {myTransactions.map((tx) => (
                  <option key={tx.transaction_id} value={tx.transaction_id}>
                    {tx.transaction_id} — {formatINR(tx.amount)} ({tx.sender_account_id} →{' '}
                    {tx.receiver_account_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="report-reason"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Description of Concern
              </label>
              <textarea
                id="report-reason"
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              Submit Activity Report for Investigator Review
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
