import { useEffect, useRef, useState } from "react";
import api, { ACCENTS } from "@/lib/api";
import { Phone, PhoneDisconnect, CheckCircle, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTelnyxDevice } from "@/hooks/useTelnyxDevice";

export default function Calls() {
  const [number, setNumber] = useState("+263");
  const [history, setHistory] = useState([]);
  const [quote, setQuote] = useState(null);
  const [voiceConfig, setVoiceConfig] = useState(null);
  const callStartRef = useRef(null);

  const {
    status,
    error,
    incomingCall,
    makeCall,
    hangup,
    acceptIncoming,
    rejectIncoming,
  } = useTelnyxDevice(true);

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/voice/call-history");
      setHistory(data);
    } catch (_e) {}
  };

  const loadConfig = async () => {
    try {
      const { data } = await api.get("/voice/config");
      setVoiceConfig(data);
    } catch (_e) {}
  };

  const fetchQuote = async (target) => {
    const trimmed = (target || "").trim();
    if (trimmed.length < 3) return;

    try {
      const { data } = await api.get(`/voice/rate-quote?to=${encodeURIComponent(trimmed)}`);
      setQuote(data);
    } catch (err) {
      setQuote(null);
      const msg = err?.response?.data?.detail;
      if (msg) toast.error(msg);
    }
  };

  useEffect(() => {
    loadConfig();
    loadHistory();
    fetchQuote("+263");
  }, []);

  useEffect(() => {
    if (status === "in-call" && !callStartRef.current) {
      callStartRef.current = Date.now();
    }

    if (status === "ready" && callStartRef.current) {
      const duration = Math.floor((Date.now() - callStartRef.current) / 1000);
      const captured = number;
      callStartRef.current = null;

      api
        .post("/voice/call-log", {
          to: captured,
          to_name: "",
          direction: "outbound",
          duration_seconds: duration,
          status: "completed",
        })
        .then(loadHistory)
        .catch(() => {});
    }
  }, [status, number]);

  const updateNumber = (value) => {
    setNumber(value);
    fetchQuote(value);
  };

  const dial = async () => {
    const target = number.trim();

    if (!target) {
      toast.error("Please enter a phone number.");
      return;
    }

    if (!target.startsWith("+")) {
      toast.error("Use international format, for example +26377XXXXXXX.");
      return;
    }

    try {
      await api.get(`/voice/rate-quote?to=${encodeURIComponent(target)}`);
    } catch (err) {
      const msg = err?.response?.data?.detail || "You do not have airtime to call. Please add balance to make calls.";
      toast.error(msg);
      return;
    }

    if (status !== "ready") {
      toast.error(status === "registering" ? "Calling is still connecting…" : `Calling is not ready yet (${status})`);
      return;
    }

    try {
      await makeCall(target);
      toast.success(`Calling ${target}…`);
    } catch (err) {
      toast.error(err?.message || "Call failed");
      await api
        .post("/voice/call-log", {
          to: target,
          to_name: "",
          direction: "outbound",
          duration_seconds: 0,
          status: "failed",
        })
        .catch(() => {});
      loadHistory();
    }
  };

  const endCall = () => {
    hangup();

    const startedAt = callStartRef.current;
    const duration = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    callStartRef.current = null;

    api
      .post("/voice/call-log", {
        to: number,
        to_name: "",
        direction: "outbound",
        duration_seconds: duration,
        status: "completed",
      })
      .then(loadHistory)
      .catch(() => {});
  };

  const statusLabel =
    {
      idle: "Initializing…",
      registering: "Connecting…",
      ready: "Ready to call",
      calling: "Ringing…",
      "in-call": "On call",
      error: error || "Error",
    }[status] || status;

  const statusColor =
    status === "ready"
      ? "bg-[#22C55E] text-white"
      : status === "in-call"
      ? "bg-[#16A34A] text-white"
      : status === "error"
      ? "bg-red-600 text-white"
      : "bg-white";

  const incomingNumber =
    incomingCall?.options?.remoteCallerNumber ||
    incomingCall?.remoteCallerNumber ||
    incomingCall?.callerNumber ||
    "Unknown caller";

  return (
    <div className="space-y-6" data-testid="calls-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="overline text-neutral-500">VOICE · ZIMBABWE +263</p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Calls.</h1>
          <p className="text-sm text-neutral-700 mt-2">Enter a number and call Zimbabwe mobile or landline numbers.</p>
        </div>

        <span className={`nb-pill ${statusColor}`} data-testid="voice-status">
          <CheckCircle size={12} weight="bold" /> {statusLabel}
        </span>
      </div>

      {voiceConfig && !voiceConfig.enabled && (
        <div className="nb-card p-4 flex items-start gap-3 bg-[#4ADE80]/40 backdrop-blur-sm" data-testid="voip-banner">
          <Warning size={24} weight="bold" />
          <div className="flex-1">
            <p className="font-bold text-sm">Calling is not active yet.</p>
            <p className="text-xs text-neutral-700 mt-1">{voiceConfig.reason}</p>
          </div>
        </div>
      )}

      {incomingCall && (
        <div className="nb-card p-5 flex items-center justify-between bg-[#16A34A] text-white" data-testid="incoming-call">
          <div>
            <p className="overline">INCOMING</p>
            <p className="text-2xl font-black mt-1">{incomingNumber}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={acceptIncoming} className="nb-btn bg-[#4ADE80] text-black" data-testid="accept-incoming">
              <Phone size={18} weight="fill" /> Accept
            </button>
            <button onClick={rejectIncoming} className="nb-btn bg-red-600 text-white" data-testid="reject-incoming">
              <PhoneDisconnect size={18} weight="bold" /> Reject
            </button>
          </div>
        </div>
      )}

      {(status === "calling" || status === "in-call") && (
        <div className="nb-card p-5 flex items-center justify-between bg-[#16A34A] text-white" data-testid="active-call-bar">
          <div>
            <p className="overline">{status === "calling" ? "RINGING" : "ON CALL"}</p>
            <p className="text-2xl font-black mt-1 mono">{number}</p>
          </div>
          <button onClick={endCall} className="nb-btn bg-red-600 text-white" data-testid="hangup-button">
            <PhoneDisconnect size={18} weight="bold" /> End
          </button>
        </div>
      )}

      <div className="nb-card p-6 md:p-8 max-w-md mx-auto bg-white">
        <label className="overline text-neutral-600">Phone number</label>
        <input
          type="tel"
          inputMode="tel"
          className="nb-input mt-2 text-2xl md:text-3xl font-black mono"
          placeholder="+263 77 000 0000"
          value={number}
          onChange={(e) => updateNumber(e.target.value)}
          data-testid="call-number-input"
        />

        <button
          onClick={dial}
          disabled={!number || status === "calling" || status === "in-call"}
          className="nb-btn w-full mt-5 h-14 text-base text-white"
          style={{ backgroundColor: ACCENTS.calling }}
          data-testid="call-button"
        >
          <Phone size={22} weight="fill" /> {status === "calling" ? "Ringing…" : "Call"}
        </button>

        {quote && (
          <div className="mt-3 flex items-center justify-between text-xs px-1" data-testid="rate-quote">
            <span className="text-neutral-600">
              {quote.free ? "In-app · " : `${quote.rate_name} · `}
              <span className="mono font-bold">${quote.rate_per_minute.toFixed(2)}/min</span>
            </span>
            <span className="text-neutral-600">
              {quote.free ? "Free" : `~${Math.floor(quote.max_minutes)} min on $${quote.balance.toFixed(2)}`}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3" data-testid="recent-calls">
        <div>
          <p className="overline text-neutral-500">RECENT CALLS</p>
          <h2 className="text-2xl font-black">Call history</h2>
        </div>

        {history.length === 0 && (
          <div className="nb-card p-5 bg-white">
            <p className="text-sm text-neutral-500">No recent calls yet.</p>
          </div>
        )}

        {history.slice(0, 8).map((h) => (
          <div key={h.id} className="nb-card p-4 flex items-center justify-between bg-white">
            <div>
              <p className="font-bold">{h.to_name || h.to}</p>
              <p className="text-xs text-neutral-500 mono">
                {new Date(h.created_at).toLocaleString()}
                {h.duration_seconds ? ` · ${Math.floor(h.duration_seconds / 60)}m ${h.duration_seconds % 60}s` : ""}
              </p>
            </div>
            <span
              className={`nb-pill ${
                h.status === "completed"
                  ? "bg-[#16A34A] text-white"
                  : h.status === "failed" || h.status === "billing_failed"
                  ? "bg-red-600 text-white"
                  : "bg-[#4ADE80]"
              }`}
            >
              {h.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
