import React, { useState, useCallback } from 'react';
import { usePushNotifications } from './hooks/usePushNotifications';
import './App.css';

const KHR_RATE = 4100;
const NOTIFICATION_API = 'http://localhost:8081/api/test';
const TELEGRAM_BOT_USERNAME = 'ABC_BANK_Notification_Bot';

function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
function formatKHR(amount) {
  return new Intl.NumberFormat('km-KH', { style: 'currency', currency: 'KHR' }).format(Math.round(amount));
}
function maskAccount(acNo) {
  if (!acNo || acNo.length <= 4) return acNo || '—';
  return '****' + acNo.slice(-4);
}
function formatTime(timeStr) {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr.replace(' ', 'T'));
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch { return timeStr; }
}

export default function App() {
  const [inputCiNo, setInputCiNo] = useState('');
  const [ciNo, setCiNo] = useState('');
  const [registered, setRegistered] = useState(false);
  const [balanceUSD, setBalanceUSD] = useState(10000.00);
  const [transactions, setTransactions] = useState([]);
  const [flashType, setFlashType] = useState(null);

  // Transfer modal state
  const [showModal, setShowModal] = useState(false);
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDesc, setTxnDesc] = useState('');
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError, setTxnError] = useState('');
  const [txnSuccess, setTxnSuccess] = useState(false);

  // ── FIX 1: Only update balance + transactions from PUSH ──────────────
  // Do NOT add transaction in handleTransfer anymore — wait for push
  const handlePushReceived = useCallback((data) => {
    if (!data || !data.eventType) return;

    const amount = parseFloat(data.amount) || 0;

    // Convert amount to USD first if currency is KHR
    const amountInUSD = data.currency === 'KHR'
      ? amount / KHR_RATE
      : amount;

    setBalanceUSD(prev =>
      data.eventType === 'INCOMING' ? prev + amountInUSD :
        data.eventType === 'OUTGOING' ? prev - amountInUSD : prev
    );

    // Flash animation
    setFlashType(data.eventType === 'INCOMING' ? 'incoming' : 'outgoing');
    setTimeout(() => setFlashType(null), 1800);

    // Add to transaction list
    setTransactions(prev => [{
      id: data.eventId || Date.now().toString(),
      eventType: data.eventType,
      amount,
      currency: data.currency || 'USD',
      acNo: data.acNo,
      description: data.description,
      eventTime: data.eventTime,
    }, ...prev].slice(0, 20));

  }, []);

  const { subscribed, loading: pushLoading, error: pushError, subscribe, unsubscribe } =
    usePushNotifications(ciNo, handlePushReceived);

  const handleLogin = () => {
    if (!inputCiNo.trim()) return;
    setCiNo(inputCiNo.trim());
    setRegistered(true);
  };

  // ── FIX 2: handleTransfer does NOT update UI — waits for push ────────
  const handleTransfer = async () => {
    const amount = parseFloat(txnAmount);
    if (!amount || amount <= 0) { setTxnError('Please enter a valid amount'); return; }
    if (amount > balanceUSD) { setTxnError('Insufficient balance'); return; }

    setTxnLoading(true);
    setTxnError('');

    try {
      const res = await fetch(`${NOTIFICATION_API}/outgoing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciNo,
          acNo: 'ACC9876543210',
          amount,
          currency: 'USD',
          description: txnDesc || 'Transfer'
        })
      });

      if (!res.ok) throw new Error('Transfer failed');

      // Show success and close modal
      // Do NOT update balance or transactions here — push notification will do it
      setTxnSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setTxnSuccess(false);
        setTxnAmount('');
        setTxnDesc('');
      }, 1200);

    } catch (e) {
      setTxnError('Transfer failed. Make sure notification-service is running.');
    } finally {
      setTxnLoading(false);
    }
  };

  // ── LOGIN ─────────────────────────────────────────────────────────────
  if (!registered) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="bank-logo">🏦</div>
          <h1> ABC BANK 🪼</h1>
          <p>Real-time Notification Dashboard</p>
          <input
            className="ci-input"
            type="text"
            placeholder="Enter your CI Number"
            value={inputCiNo}
            onChange={e => setInputCiNo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button className="btn-primary" onClick={handleLogin}>Continue →</button>
          <a
            className="tg-link-login"
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>✈️</span> Register Telegram Notifications
          </a>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────
  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <span className="bank-name">🏦 ABC BANK</span>
        <span className="ci-badge">CI: {ciNo}</span>
      </header>

      {/* Balance Card */}
      <div className={`balance-card ${flashType || ''}`}>
        <div className="balance-label">Available Balance</div>
        <div className="balance-usd">{formatUSD(balanceUSD)}</div>
        <div className="balance-khr">{formatKHR(balanceUSD * KHR_RATE)}</div>
        {flashType && (
          <div className={`balance-flash ${flashType}`}>
            {flashType === 'incoming' ? '▲ Money Received' : '▼ Money Sent'}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-row">
        <button className="btn-action btn-transfer"
          onClick={() => { setShowModal(true); setTxnError(''); setTxnSuccess(false); }}>
          <span className="btn-icon">💸</span>
          <span>Transfer</span>
        </button>
        <a
          className="btn-action btn-telegram"
          href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
          target="_blank"
          rel="noreferrer"
        >
          <span className="btn-icon">✈️</span>
          <span>Telegram Bot</span>
        </a>
      </div>

      {/* Push Notification Toggle */}
      <div className="push-section">
        {!subscribed ? (
          <button className="btn-subscribe" onClick={subscribe} disabled={pushLoading}>
            {pushLoading ? '⏳ Enabling...' : '🔔 Enable Push Notifications'}
          </button>
        ) : (
          <div className="subscribed-badge">
            <span>🔔 Push Notifications Active</span>
            <button className="btn-unsub" onClick={unsubscribe}>Disable</button>
          </div>
        )}
        {pushError && <div className="error-msg">⚠️ {pushError}</div>}
      </div>

      {/* Transactions List */}
      <div className="txn-section">
        <h2 className="section-title">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No transactions yet</p>
            <p className="empty-sub">Transactions will appear here in real-time</p>
          </div>
        ) : (
          <div className="txn-list">
            {transactions.map((txn, idx) => (
              <div key={txn.id}
                className={`txn-item ${txn.eventType === 'INCOMING' ? 'incoming' : 'outgoing'} ${idx === 0 ? 'new' : ''}`}>
                <div className="txn-icon">
                  {txn.eventType === 'INCOMING' ? '💰' : txn.eventType === 'OUTGOING' ? '💸' : '🔔'}
                </div>
                <div className="txn-details">
                  <div className="txn-desc">{txn.description || txn.eventType}</div>
                  <div className="txn-meta">
                    <span className="txn-account">{maskAccount(txn.acNo)}</span>
                    <span className="txn-time">{formatTime(txn.eventTime)}</span>
                  </div>
                </div>
                <div className="txn-amount-col">
                  <div className={`txn-amount ${txn.eventType === 'INCOMING' ? 'green' : 'red'}`}>
                    {txn.eventType === 'INCOMING' ? '+' : '-'}
                    {txn.currency === 'KHR'
                      ? formatKHR(txn.amount)
                      : formatUSD(txn.amount)}
                  </div>
                  <div className="txn-amount-khr">
                    {txn.eventType === 'INCOMING' ? '+' : '-'}
                    {txn.currency === 'KHR'
                      ? formatUSD(txn.amount / KHR_RATE)
                      : formatKHR(txn.amount * KHR_RATE)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💸 Send Money</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-balance">
              Available: <strong>{formatUSD(balanceUSD)}</strong>
            </div>
            <div className="modal-field">
              <label>Amount (USD)</label>
              <input
                type="number"
                placeholder="0.00"
                value={txnAmount}
                onChange={e => setTxnAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="modal-field">
              <label>Description</label>
              <input
                type="text"
                placeholder="e.g. Transfer to John"
                value={txnDesc}
                onChange={e => setTxnDesc(e.target.value)}
              />
            </div>
            {txnError && <div className="modal-error">⚠️ {txnError}</div>}
            {txnSuccess && <div className="modal-success">✅ Transfer sent! Waiting for confirmation...</div>}
            <button
              className="btn-confirm"
              onClick={handleTransfer}
              disabled={txnLoading || txnSuccess}
            >
              {txnLoading ? '⏳ Processing...' : txnSuccess ? '✅ Sent!' : 'Confirm Transfer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}