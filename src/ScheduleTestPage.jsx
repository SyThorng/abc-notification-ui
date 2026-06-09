import { useState, useEffect, useRef } from "react";

const BASE_URL_DEFAULT = "http://localhost:8084/api/schedule";

const LANGUAGES = [
  { value: "EN", label: "EN — English" },
  { value: "KH", label: "KH — ខ្មែរ" },
  { value: "ZH", label: "ZH — 中文" },
];

function getNowDatetime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function ResponseBox({ data }) {
  if (!data) return <div className="res-box res-idle">—</div>;
  const isOk = data.ok;
  return (
    <pre className={`res-box ${isOk ? "res-ok" : "res-err"}`}>
      {JSON.stringify(data.body, null, 2)}
    </pre>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function ScheduleTestPage() {
  const [baseUrl, setBaseUrl] = useState(BASE_URL_DEFAULT);
  const [clock, setClock] = useState({ time: "", date: "" });

  // Create form
  const [create, setCreate] = useState({
    jobName: "maintenance-notice",
    message: "Bank ABC maintenance tonight at 10PM",
    datetime: getNowDatetime(),
    ciNo: "",
    acNo: "ACC-0012345",
    language: "EN",
  });
  const [resCreate, setResCreate] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);

  // Manual form
  const [manual, setManual] = useState({
    message: "Bank ABC maintenance tonight at 10PM",
    ciNo: "",
    acNo: "ACC-0012345",
    language: "EN",
  });
  const [resManual, setResManual] = useState(null);
  const [loadingManual, setLoadingManual] = useState(false);

  // Actions
  const [jobId, setJobId] = useState("1");
  const [resAction, setResAction] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      setClock({
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        date: now.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function callApi(url, method = "GET", body = null) {
    const opts = { method, headers: {} };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(url, opts);
    const json = await r.json();
    return { ok: r.ok, body: json };
  }

  async function doCreate() {
    setLoadingCreate(true);
    setResCreate(null);
    try {
      const payload = {
        ...create,
        ciNo: create.ciNo || null,
      };
      const res = await callApi(baseUrl, "POST", payload);
      setResCreate(res);
    } catch (e) {
      setResCreate({ ok: false, body: { error: e.message } });
    } finally {
      setLoadingCreate(false);
    }
  }

  async function doManual() {
    setLoadingManual(true);
    setResManual(null);
    try {
      const payload = {
        ...manual,
        ciNo: manual.ciNo || null,
      };
      const res = await callApi(`${baseUrl}/manual`, "POST", payload);
      setResManual(res);
    } catch (e) {
      setResManual({ ok: false, body: { error: e.message } });
    } finally {
      setLoadingManual(false);
    }
  }

  async function doAction(type) {
    setLoadingAction(true);
    setResAction(null);
    try {
      let res;
      if (type === "list") {
        res = await callApi(baseUrl, "GET");
      } else if (type === "trigger") {
        res = await callApi(`${baseUrl}/${jobId}/trigger`, "POST");
      } else if (type === "cancel") {
        res = await callApi(`${baseUrl}/${jobId}/cancel`, "POST");
      } else if (type === "delete") {
        res = await callApi(`${baseUrl}/${jobId}`, "DELETE");
      }
      setResAction(res);
    } catch (e) {
      setResAction({ ok: false, body: { error: e.message } });
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div className="stp-root">
      <style>{`
        .stp-root {
          max-width: 720px;
          margin: 0 auto;
          padding: 2rem 1rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #1a1a1a;
          background: #f5f5f5;
          min-height: 100vh;
        }
        .stp-root h1 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: #111;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 1.25rem;
          margin-bottom: 1rem;
        }
        .card-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #888;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .clock-time {
          font-size: 26px;
          font-weight: 600;
          font-family: 'SF Mono', 'Fira Code', monospace;
          color: #111;
          letter-spacing: 1px;
        }
        .clock-date {
          font-size: 12px;
          color: #888;
          margin-top: 2px;
        }
        .clock-url-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .url-group label {
          font-size: 11px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
        }
        .url-group input {
          width: 260px;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 12px;
        }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .grid-1 { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 10px; }
        .field label {
          font-size: 11px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          display: block;
          margin-bottom: 4px;
        }
        .field input,
        .field select,
        .field textarea {
          width: 100%;
          padding: 8px 10px;
          font-size: 13px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #fafafa;
          color: #1a1a1a;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }
        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #999;
          background: #fff;
        }
        .field textarea {
          resize: vertical;
          min-height: 64px;
          line-height: 1.5;
        }
        .btn-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.15s, transform 0.1s;
        }
        .btn:hover { opacity: 0.85; }
        .btn:active { transform: scale(0.97); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-blue  { background: #e8f0fe; color: #1a56db; border-color: #c3d7fd; }
        .btn-green { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
        .btn-amber { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .btn-red   { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .btn-gray  { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
        .id-input {
          width: 90px;
          padding: 8px 10px;
          font-size: 13px;
          font-family: 'SF Mono','Fira Code',monospace;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #fafafa;
          color: #1a1a1a;
          outline: none;
        }
        .id-input:focus { border-color: #999; background: #fff; }
        .id-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 10px;
        }
        .id-row label {
          font-size: 11px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          display: block;
          margin-bottom: 4px;
        }
        .res-box {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 6px;
          font-family: 'SF Mono','Fira Code',monospace;
          font-size: 12px;
          line-height: 1.6;
          min-height: 38px;
          max-height: 180px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .res-idle { background: #f9f9f9; border: 1px solid #eee; color: #aaa; }
        .res-ok   { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
        .res-err  { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
        .divider { height: 1px; background: #f0f0f0; margin: 12px 0; }
        @media (max-width: 480px) {
          .grid-2, .grid-3 { grid-template-columns: 1fr; }
          .clock-url-row { flex-direction: column; align-items: flex-start; }
          .url-group input { width: 100%; }
        }
      `}</style>

      <h1>🗓 Schedule service tester</h1>

      {/* Clock + Base URL */}
      <div className="card">
        <div className="clock-url-row">
          <div>
            <div className="clock-time">{clock.time}</div>
            <div className="clock-date">{clock.date}</div>
          </div>
          <div className="url-group">
            <label>Base URL</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Create Schedule */}
      <div className="card">
        <div className="card-title">📅 Create schedule</div>
        <div className="grid-2">
          <Field label="Job name">
            <input
              value={create.jobName}
              onChange={(e) => setCreate({ ...create, jobName: e.target.value })}
            />
          </Field>
          <Field label="Datetime (yyyy-MM-dd HH:mm:ss)">
            <input
              value={create.datetime}
              onChange={(e) => setCreate({ ...create, datetime: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid-1">
          <Field label="Message">
            <textarea
              value={create.message}
              onChange={(e) => setCreate({ ...create, message: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid-3">
          <Field label="CI No (blank = null = ALL)">
            <input
              value={create.ciNo}
              placeholder="00004300"
              onChange={(e) => setCreate({ ...create, ciNo: e.target.value })}
            />
          </Field>
          <Field label="Account No">
            <input
              value={create.acNo}
              onChange={(e) => setCreate({ ...create, acNo: e.target.value })}
            />
          </Field>
          <Field label="Language">
            <select
              value={create.language}
              onChange={(e) => setCreate({ ...create, language: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="btn-row">
          <button className="btn btn-blue" onClick={doCreate} disabled={loadingCreate}>
            {loadingCreate ? "⏳ Sending..." : "📤 Create"}
          </button>
          <button
            className="btn btn-gray"
            onClick={() => setCreate({ ...create, datetime: getNowDatetime() })}
          >
            ⟳ Reset datetime to now
          </button>
        </div>
        <ResponseBox data={resCreate} />
      </div>

      {/* Manual Fire */}
      <div className="card">
        <div className="card-title">⚡ Manual fire — bypass Quartz, no DB</div>
        <div className="grid-1">
          <Field label="Message">
            <textarea
              value={manual.message}
              onChange={(e) => setManual({ ...manual, message: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid-3">
          <Field label="CI No (blank = null = ALL)">
            <input
              value={manual.ciNo}
              placeholder="00004300"
              onChange={(e) => setManual({ ...manual, ciNo: e.target.value })}
            />
          </Field>
          <Field label="Account No">
            <input
              value={manual.acNo}
              onChange={(e) => setManual({ ...manual, acNo: e.target.value })}
            />
          </Field>
          <Field label="Language">
            <select
              value={manual.language}
              onChange={(e) => setManual({ ...manual, language: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="btn-row">
          <button className="btn btn-amber" onClick={doManual} disabled={loadingManual}>
            {loadingManual ? "⏳ Sending..." : "▶ Fire now"}
          </button>
        </div>
        <ResponseBox data={resManual} />
      </div>

      {/* Job Actions */}
      <div className="card">
        <div className="card-title">🔧 Job actions by ID</div>
        <div className="id-row">
          <div>
            <label>Job ID</label>
            <input
              className="id-input"
              type="number"
              min="1"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            />
          </div>
        </div>
        <div className="btn-row">
          <button className="btn btn-gray" onClick={() => doAction("list")} disabled={loadingAction}>
            📋 List all
          </button>
          <button className="btn btn-green" onClick={() => doAction("trigger")} disabled={loadingAction}>
            ▶ Trigger (Quartz)
          </button>
          <button className="btn btn-amber" onClick={() => doAction("cancel")} disabled={loadingAction}>
            🚫 Cancel
          </button>
          <button className="btn btn-red" onClick={() => doAction("delete")} disabled={loadingAction}>
            🗑 Delete
          </button>
        </div>
        {loadingAction && (
          <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>⏳ Sending...</div>
        )}
        <ResponseBox data={resAction} />
      </div>
    </div>
  );
}