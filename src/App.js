import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { usePushNotifications } from './hooks/usePushNotifications';
import ScheduleTestPage from './ScheduleTestPage';
import './App.css';

// ── Constants (module level) ──────────────────────────────────────────────────
const KHR_RATE = 4100;
const NOTIFICATION_API = 'http://localhost:8081/api/test';
const TELEGRAM_BOT_USERNAME = 'ABC_BANK_Notification_Bot';

const LANG_LABELS = {
  EN: { flag: '🇬🇧', name: 'English' },
  KH: { flag: '🇰🇭', name: 'ខ្មែរ' },
  ZH: { flag: '🇨🇳', name: '中文' },
};

const UI_TEXT = {
  EN: {
    availableBalance: 'Available Balance',
    transfer: 'Transfer',
    telegramBot: 'Telegram Bot',
    enablePush: '🔔 Enable Push Notifications',
    enabling: '⏳ Enabling...',
    pushActive: '🔔 Push Notifications Active',
    disable: 'Disable',
    recentTxn: 'Recent Transactions',
    noTxn: 'No transactions yet',
    noTxnSub: 'Transactions will appear here in real-time',
    moneyReceived: '▲ Money Received',
    moneySent: '▼ Money Sent',
    sendMoney: '💸 Send Money',
    available: 'Available',
    amountLabel: 'Amount (USD)',
    descLabel: 'Description',
    descPlaceholder: 'e.g. Transfer to John',
    confirmTransfer: 'Confirm Transfer',
    processing: '⏳ Processing...',
    sent: '✅ Sent!',
    transferSent: '✅ Transfer sent! Waiting for confirmation...',
    insufficientBalance: 'Insufficient balance',
    invalidAmount: 'Please enter a valid amount',
    transferFailed: 'Transfer failed. Make sure notification-service is running.',
    registerTelegram: '✈️ Register Telegram Notifications',
    ciPlaceholder: 'Enter your CI Number',
    continue: 'Continue →',
    dashboard: 'Real-time Notification Dashboard',
  },
  KH: {
    availableBalance: 'សមតុល្យដែលមាន',
    transfer: 'ផ្ទេរប្រាក់',
    telegramBot: 'តេឡេក្រាម',
    enablePush: '🔔 បើកការជូនដំណឹង',
    enabling: '⏳ កំពុងបើក...',
    pushActive: '🔔 ការជូនដំណឹងសកម្ម',
    disable: 'បិទ',
    recentTxn: 'ប្រតិបត្តិការថ្មីៗ',
    noTxn: 'មិនទាន់មានប្រតិបត្តិការ',
    noTxnSub: 'ប្រតិបត្តិការនឹងបង្ហាញទីនេះក្នុងពេលជាក់ស្តែង',
    moneyReceived: '▲ ទទួលបានប្រាក់',
    moneySent: '▼ ផ្ទេរប្រាក់ចេញ',
    sendMoney: '💸 ផ្ទេរប្រាក់',
    available: 'សមតុល្យ',
    amountLabel: 'ចំនួនទឹកប្រាក់ (USD)',
    descLabel: 'ការពណ៌នា',
    descPlaceholder: 'ឧ. ផ្ទេរទៅ John',
    confirmTransfer: 'បញ្ជាក់ការផ្ទេរ',
    processing: '⏳ កំពុងដំណើរការ...',
    sent: '✅ បានផ្ញើ!',
    transferSent: '✅ បានផ្ញើ! កំពុងរង់ចាំការបញ្ជាក់...',
    insufficientBalance: 'សមតុល្យមិនគ្រប់គ្រាន់',
    invalidAmount: 'សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ',
    transferFailed: 'ការផ្ទេរបានបរាជ័យ។ សូមពិនិត្យ notification-service។',
    registerTelegram: '✈️ ចុះឈ្មោះការជូនដំណឹងតេឡេក្រាម',
    ciPlaceholder: 'បញ្ចូលលេខ CI របស់អ្នក',
    continue: 'បន្ត →',
    dashboard: 'ផ្ទាំងគ្រប់គ្រងការជូនដំណឹងក្នុងពេលជាក់ស្តែង',
  },
  ZH: {
    availableBalance: '可用余额',
    transfer: '转账',
    telegramBot: 'Telegram机器人',
    enablePush: '🔔 开启推送通知',
    enabling: '⏳ 开启中...',
    pushActive: '🔔 推送通知已激活',
    disable: '关闭',
    recentTxn: '最近交易',
    noTxn: '暂无交易记录',
    noTxnSub: '交易将实时显示在这里',
    moneyReceived: '▲ 收到款项',
    moneySent: '▼ 转出款项',
    sendMoney: '💸 转账',
    available: '可用余额',
    amountLabel: '金额 (USD)',
    descLabel: '描述',
    descPlaceholder: '例如：转账给 John',
    confirmTransfer: '确认转账',
    processing: '⏳ 处理中...',
    sent: '✅ 已发送!',
    transferSent: '✅ 已发送！等待确认...',
    insufficientBalance: '余额不足',
    invalidAmount: '请输入有效金额',
    transferFailed: '转账失败，请确认 notification-service 正在运行。',
    registerTelegram: '✈️ 注册Telegram通知',
    ciPlaceholder: '输入您的CI编号',
    continue: '继续 →',
    dashboard: '实时通知控制台',
  },
};

// ── Helpers (module level) ────────────────────────────────────────────────────
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
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return timeStr; }
}

// ── Router root ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/schedule" element={<ScheduleTestPage />} />
    </Routes>
  );
}

// ── Main banking dashboard ────────────────────────────────────────────────────
function MainApp() {
  const [inputCiNo,    setInputCiNo]    = useState('');
  const [ciNo,         setCiNo]         = useState('');
  const [registered,   setRegistered]   = useState(false);
  const [balanceUSD,   setBalanceUSD]   = useState(10000.00);
  const [transactions, setTransactions] = useState([]);
  const [flashType,    setFlashType]    = useState(null);
  const [language,     setLanguage]     = useState('EN');

  // Transfer modal
  const [showModal,  setShowModal]  = useState(false);
  const [txnAmount,  setTxnAmount]  = useState('');
  const [txnDesc,    setTxnDesc]    = useState('');
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError,   setTxnError]   = useState('');
  const [txnSuccess, setTxnSuccess] = useState(false);

  const t = UI_TEXT[language];

  const handlePushReceived = useCallback((data) => {
    if (!data || !data.eventType) return;

    const amount = parseFloat(data.amount) || 0;
    const amountInUSD = data.currency === 'KHR' ? amount / KHR_RATE : amount;

    setBalanceUSD(prev =>
      data.eventType === 'INCOMING' ? prev + amountInUSD :
      data.eventType === 'OUTGOING' ? prev - amountInUSD : prev
    );

    setFlashType(data.eventType === 'INCOMING' ? 'incoming' : 'outgoing');
    setTimeout(() => setFlashType(null), 1800);

    setTransactions(prev => [{
      id:          data.eventId || Date.now().toString(),
      eventType:   data.eventType,
      amount,
      currency:    data.currency || 'USD',
      acNo:        data.acNo,
      description: data.description,
      eventTime:   data.eventTime,
    }, ...prev].slice(0, 20));
  }, [language]);

  const { subscribed, loading: pushLoading, error: pushError, subscribe, unsubscribe } =
    usePushNotifications(ciNo, handlePushReceived);

  const handleLogin = () => {
    if (!inputCiNo.trim()) return;
    setCiNo(inputCiNo.trim());
    setRegistered(true);
  };

  const handleTransfer = async () => {
    const amount = parseFloat(txnAmount);
    if (!amount || amount <= 0) { setTxnError(t.invalidAmount); return; }
    if (amount > balanceUSD)    { setTxnError(t.insufficientBalance); return; }

    setTxnLoading(true);
    setTxnError('');

    try {
      const res = await fetch(`${NOTIFICATION_API}/outgoing`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciNo,
          acNo:        'ACC9876543210',
          amount,
          currency:    'USD',
          description: txnDesc || 'Transfer',
          language,
        }),
      });

      if (!res.ok) throw new Error('Transfer failed');

      setTxnSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setTxnSuccess(false);
        setTxnAmount('');
        setTxnDesc('');
      }, 1200);
    } catch (e) {
      setTxnError(t.transferFailed);
    } finally {
      setTxnLoading(false);
    }
  };

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!registered) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="lang-selector-login">
            {Object.entries(LANG_LABELS).map(([code, { flag }]) => (
              <button
                key={code}
                className={`lang-btn ${language === code ? 'active' : ''}`}
                onClick={() => setLanguage(code)}
              >
                {flag}
              </button>
            ))}
          </div>
          <div className="bank-logo">🏦</div>
          <h1>ABC BANK 🪼</h1>
          <p>{t.dashboard}</p>
          <input
            className="ci-input"
            type="text"
            placeholder={t.ciPlaceholder}
            value={inputCiNo}
            onChange={e => setInputCiNo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button className="btn-primary" onClick={handleLogin}>{t.continue}</button>
          <a
            className="tg-link-login"
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noreferrer"
          >
            {t.registerTelegram}
          </a>
        </div>
      </div>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <div className="app">

      <header className="header">
        <span className="bank-name">🏦 ABC BANK</span>
        <span className="ci-badge">CI: {ciNo}</span>
        <div className="lang-selector">
          {Object.entries(LANG_LABELS).map(([code, { flag }]) => (
            <button
              key={code}
              className={`lang-btn ${language === code ? 'active' : ''}`}
              onClick={() => setLanguage(code)}
            >
              {flag}
            </button>
          ))}
        </div>
      </header>

      <div className={`balance-card ${flashType || ''}`}>
        <div className="balance-label">{t.availableBalance}</div>
        <div className="balance-usd">{formatUSD(balanceUSD)}</div>
        <div className="balance-khr">{formatKHR(balanceUSD * KHR_RATE)}</div>
        {flashType && (
          <div className={`balance-flash ${flashType}`}>
            {flashType === 'incoming' ? t.moneyReceived : t.moneySent}
          </div>
        )}
      </div>

      <div className="action-row">
        <button
          className="btn-action btn-transfer"
          onClick={() => { setShowModal(true); setTxnError(''); setTxnSuccess(false); }}
        >
          <span className="btn-icon">💸</span>
          <span>{t.transfer}</span>
        </button>
        <a
          className="btn-action btn-telegram"
          href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
          target="_blank"
          rel="noreferrer"
        >
          <span className="btn-icon">✈️</span>
          <span>{t.telegramBot}</span>
        </a>
      </div>

      <div className="push-section">
        {!subscribed ? (
          <button className="btn-subscribe" onClick={subscribe} disabled={pushLoading}>
            {pushLoading ? t.enabling : t.enablePush}
          </button>
        ) : (
          <div className="subscribed-badge">
            <span>{t.pushActive}</span>
            <button className="btn-unsub" onClick={unsubscribe}>{t.disable}</button>
          </div>
        )}
        {pushError && <div className="error-msg">⚠️ {pushError}</div>}
      </div>

      <div className="txn-section">
        <h2 className="section-title">{t.recentTxn}</h2>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>{t.noTxn}</p>
            <p className="empty-sub">{t.noTxnSub}</p>
          </div>
        ) : (
          <div className="txn-list">
            {transactions.map((txn, idx) => (
              <div
                key={txn.id}
                className={`txn-item ${txn.eventType === 'INCOMING' ? 'incoming' : 'outgoing'} ${idx === 0 ? 'new' : ''}`}
              >
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
                  {txn.amount > 0 && (
                    <>
                      <div className={`txn-amount ${txn.eventType === 'INCOMING' ? 'green' : 'red'}`}>
                        {txn.eventType === 'INCOMING' ? '+' : '-'}
                        {txn.currency === 'KHR' ? formatKHR(txn.amount) : formatUSD(txn.amount)}
                      </div>
                      <div className="txn-amount-khr">
                        {txn.eventType === 'INCOMING' ? '+' : '-'}
                        {txn.currency === 'KHR'
                          ? formatUSD(txn.amount / KHR_RATE)
                          : formatKHR(txn.amount * KHR_RATE)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t.sendMoney}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-balance">
              {t.available}: <strong>{formatUSD(balanceUSD)}</strong>
            </div>
            <div className="modal-field">
              <label>{t.amountLabel}</label>
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
              <label>{t.descLabel}</label>
              <input
                type="text"
                placeholder={t.descPlaceholder}
                value={txnDesc}
                onChange={e => setTxnDesc(e.target.value)}
              />
            </div>
            {txnError  && <div className="modal-error">⚠️ {txnError}</div>}
            {txnSuccess && <div className="modal-success">{t.transferSent}</div>}
            <button
              className="btn-confirm"
              onClick={handleTransfer}
              disabled={txnLoading || txnSuccess}
            >
              {txnLoading ? t.processing : txnSuccess ? t.sent : t.confirmTransfer}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}