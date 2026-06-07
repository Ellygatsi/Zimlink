import { useEffect, useState } from "react";
import api, { ACCENTS } from "@/lib/api";
import { Phone, Backspace, X, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";

const KEYS = ["1","2","3","4","5","6","7","8","9","*","0","#"];

export default function Calls() {
  const [number, setNumber] = useState("+263");
  const [contacts, setContacts] = useState([]);
  const [history, setHistory] = useState([]);
  const [voiceConfig, setVoiceConfig] = useState(null);
  const [tab, setTab] = useState("dial");

  const loadAll = () => {
    api.get("/voice/config").then(({ data }) => setVoiceConfig(data)).catch(() => {});
    api.get("/users").then(({ data }) => setContacts(data)).catch(() => {});
    api.get("/voice/call-history").then(({ data }) => setHistory(data)).catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  const dial = async (target, targetName = "") => {
    if (!target) return;
    if (voiceConfig && !voiceConfig.enabled) {
      // Log a "missed/unavailable" entry so history reflects activity
      await api.post("/voice/call-log", {
        to: target, to_name: targetName, direction: "outbound",
        duration_seconds: 0, status: "unavailable",
      });
      toast.error("VoIP is currently disabled. Add Twilio credentials in backend .env to activate.");
      loadAll();
      return;
    }
    // Simulated call when enabled (full Voice SDK wiring requires real keys + ngrok)
    await api.post("/voice/call-log", {
      to: target, to_name: targetName, direction: "outbound",
      duration_seconds: 0, status: "completed",
    });
    toast.success(`Calling ${targetName || target}…`);
    setNumber("+263");
    loadAll();
  };

  return (
    <div className="space-y-6" data-testid="calls-page">
      <div>
        <p className="overline text-neutral-500">VOICE · ZIMBABWE +263</p>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Calls.</h1>
        <p className="text-sm text-neutral-700 mt-2">Cheap, crisp calls to any Zimbabwe landline or mobile.</p>
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
        <div className="nb-card p-6 md:p-8 max-w-md mx-auto" style={{ backgroundColor: "white" }}>
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
            disabled={!number}
            className="nb-btn w-full mt-5 h-14 text-base text-white"
            style={{ backgroundColor: ACCENTS.calling }}
            data-testid="dialpad-call-button"
          >
            <Phone size={22} weight="fill" /> Call
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
                <p className="text-xs text-neutral-500 mono">{new Date(h.created_at).toLocaleString()}</p>
              </div>
              <span className={`nb-pill ${h.status === "unavailable" ? "bg-[#FF453A] text-white" : "bg-[#00E59B]"}`}>
                {h.status === "unavailable" ? <X size={12} weight="bold" /> : null} {h.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
