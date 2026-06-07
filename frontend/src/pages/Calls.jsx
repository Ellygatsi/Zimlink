import { useEffect, useState } from "react";
import api, { ACCENTS } from "@/lib/api";
import { Phone, PhoneDisconnect, Backspace, X, Warning, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";

const KEYS = ["1","2","3","4","5","6","7","8","9","*","0","#"];

export default function Calls() {
  const [number, setNumber] = useState("+263");
  const [contacts, setContacts] = useState([]);
  const [history, setHistory] = useState([]);
  const [voiceConfig, setVoiceConfig] = useState(null);
  const [tab, setTab] = useState("dial");
  const [callStart, setCallStart] = useState(null);

  const twilioEnabled = !!(voiceConfig && voiceConfig.enabled);
  const { status, error, activeCall, incomingCall, makeCall, hangup, acceptIncoming, rejectIncoming } =
    useTwilioDevice(twilioEnabled);

  const loadConfig = async () => {
    try {
      const { data } = await api.get("/voice/config");
      setVoiceConfig(data);
    } catch {}
  };
  const loadContacts = async () => {
    try { const { data } = await api.get("/users"); setContacts(data); } catch {}
  };
  const loadHistory = async () => {
    try { const { data } = await api.get("/voice/call-history"); setHistory(data); } catch {}
  };

  useEffect(() => {
    loadConfig(); loadContacts(); loadHistory();
  }, []);

  useEffect(() => {
    if (status === "in-call" && !callStart) setCallStart(Date.now());
    if (status === "ready" && callStart) {
      const duration = Math.floor((Date.now() - callStart) / 1000);
      api.post("/voice/call-log", {
        to: number, to_name: "",
        direction: "outbound", duration_seconds: duration, status: "completed",
      }).then(loadHistory).catch(() => {});
      setCallStart(null);
    }
  }, [status]); // eslint-disable-line

  const dial = async (target, targetName = "") => {
    if (!target) return;
    if (!twilioEnabled) {
      await api.post("/voice/call-log", {
        to: target, to_name: targetName, direction: "outbound",
        duration_seconds: 0, status: "unavailable",
      });
      toast.error(voiceConfig?.reason || "VoIP is disabled.");
      loadHistory();
      return;
    }
    if (status !== "ready") {
      toast.error(status === "registering" ? "Calling is still connecting…" : `Not ready (${status})`);
      return;
    }
    try {
      setNumber(target);
      await makeCall(target);
      toast.success(`Calling ${targetName || target}…`);
    } catch (e) {
      toast.error(e?.message || "Call failed");
      await api.post("/voice/call-log", {
        to: target, to_name: targetName, direction: "outbound",
        duration_seconds: 0, status: "failed",
      });
      loadHistory();
    }
  };

  const endCall = () => {
    hangup();
    api.post("/voice/call-log", {
      to: number, to_name: "", direction: "outbound",
      duration_seconds: callStart ? Math.floor((Date.now() - callStart) / 1000) : 0,
      status: "completed",
    }).then(loadHistory).catch(() => {});
    setCallStart(null);
  };

  const statusLabel = {
    idle: "Initializing…",
    registering: "Connecting…",
    ready: "Ready to call",
    calling: "Ringing…",
    "in-call": "On call",
    error: error || "Error",
  }[status] || status;

  const statusColor = status === "ready" ? "bg-[#00E59B]" : status === "in-call" ? "bg-[#7F6BFF] text-white" : status === "error" ? "bg-[#FF453A] text-white" : "bg-white";

  return (
    <div className="space-y-6" data-testid="calls-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="overline text-neutral-500">VOICE · ZIMBABWE +263</p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Calls.</h1>
          <p className="text-sm text-neutral-700 mt-2">Cheap, crisp calls to any Zimbabwe landline or mobile.</p>
        </div>
        {twilioEnabled && (
          <span className={`nb-pill ${statusColor}`} data-testid="voice-status">
            <CheckCircle size={12} weight="bold" /> {statusLabel}
          </span>
        )}
      </div>

      {voiceConfig && !voiceConfig.enabled && (
        <div className="nb-card p-4 flex items-start gap-3 bg-[#FFC900]/40" data-testid="voip-banner">
          <Warning size={24} weight="bold" />
          <div className="flex-1">
            <p className="font-bold text-sm">VoIP is in scaffold mode.</p>
            <p className="text-xs text-neutral-700 mt-1">{voiceConfig.reason}</p>
          </div>
        </div>
      )}

      {incomingCall && (
        <div className="nb-card p-5 flex items-center justify-between bg-[#7F6BFF] text-white" data-testid="incoming-call">
          <div>
            <p className="overline">INCOMING</p>
            <p className="text-2xl font-black mt-1">{incomingCall.parameters?.From || "Unknown caller"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={acceptIncoming} className="nb-btn bg-[#00E59B] text-black" data-testid="accept-incoming">
              <Phone size={18} weight="fill" /> Accept
            </button>
            <button onClick={rejectIncoming} className="nb-btn bg-[#FF453A] text-white" data-testid="reject-incoming">
              <PhoneDisconnect size={18} weight="bold" /> Reject
            </button>
          </div>
        </div>
      )}

      {(status === "calling" || status === "in-call") && (
        <div className="nb-card p-5 flex items-center justify-between bg-[#7F6BFF] text-white" data-testid="active-call-bar">
          <div>
            <p className="overline">{status === "calling" ? "RINGING" : "ON CALL"}</p>
            <p className="text-2xl font-black mt-1 mono">{number}</p>
          </div>
          <button onClick={endCall} className="nb-btn bg-[#FF453A] text-white" data-testid="hangup-button">
            <PhoneDisconnect size={18} weight="bold" /> End
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {["dial","contacts","history"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            data-testid={`calls-tab-${t}`}
            className={`nb-btn capitalize ${tab === t ? "" : "bg-white"}`}
            style={tab === t ? { backgroundColor: ACCENTS.calling, color: "white" } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "dial" && (
        <div className="nb-card p-6 md:p-8 max-w-md mx-auto bg-white">
          <div className="border-2 border-black rounded-xl px-5 py-4 mb-6 flex items-center justify-between bg-[#FDFBF7]">
            <input
              className="flex-1 bg-transparent text-3xl md:text-4xl font-black tracking-tighter mono outline-none placeholder:text-neutral-400"
              placeholder="+263 77…"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              data-testid="dialpad-display"
            />
            <button
              onClick={() => setNumber((n) => n.slice(0, -1))}
              className="ml-2 p-2"
              data-testid="dialpad-backspace"
              aria-label="Backspace"
            >
              <Backspace size={26} weight="bold" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setNumber((n) => n + k)}
                data-testid={`dialpad-${k}`}
                className="nb-btn h-16 text-2xl font-black bg-white"
              >
                {k}
              </button>
            ))}
          </div>
          <button
            onClick={() => dial(number, "")}
            disabled={!number || status === "calling" || status === "in-call"}
            className="nb-btn w-full mt-5 h-14 text-base text-white"
            style={{ backgroundColor: ACCENTS.calling }}
            data-testid="dialpad-call-button"
          >
            <Phone size={22} weight="fill" /> {status === "calling" ? "Ringing…" : "Call"}
          </button>
        </div>
      )}

      {tab === "contacts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="contacts-list">
          {contacts.length === 0 && <p className="text-sm text-neutral-500">No other users yet.</p>}
          {contacts.map((c) => (
            <div key={c.id} className="nb-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-black bg-[#7F6BFF] text-white flex items-center justify-center font-black">
                  {c.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-neutral-500">{c.email}</p>
                </div>
              </div>
              <button
                onClick={() => dial(c.id, c.name)}
                className="nb-btn text-white"
                style={{ backgroundColor: ACCENTS.calling }}
                data-testid={`call-contact-${c.id}`}
              >
                <Phone size={16} weight="fill" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2" data-testid="call-history">
          {history.length === 0 && <p className="text-sm text-neutral-500">No call history yet.</p>}
          {history.map((h) => (
            <div key={h.id} className="nb-card p-4 flex items-center justify-between">
              <div>
                <p className="font-bold">{h.to_name || h.to}</p>
                <p className="text-xs text-neutral-500 mono">
                  {new Date(h.created_at).toLocaleString()}
                  {h.duration_seconds ? ` · ${Math.floor(h.duration_seconds/60)}m ${h.duration_seconds%60}s` : ""}
                </p>
              </div>
              <span className={`nb-pill ${
                h.status === "completed" ? "bg-[#00E59B]" :
                h.status === "failed" ? "bg-[#FF453A] text-white" :
                "bg-[#FFC900]"
              }`}>
                {h.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
