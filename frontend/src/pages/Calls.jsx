import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Phone, PhoneDisconnect, CheckCircle, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useTelnyxDevice } from "@/hooks/useTelnyxDevice";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Calls() {
  const [number, setNumber] = useState("+263");
  const [history, setHistory] = useState([]);
  const [quote, setQuote] = useState(null);
  const [voiceConfig, setVoiceConfig] = useState(null);
  const [noBalance, setNoBalance] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const callStartRef = useRef(null);
  const timerRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const {
    status,
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
    } catch (_e) {
      setVoiceConfig({ enabled: false, configured: false });
    }
  };

  const fetchQuote = async (target) => {
    const trimmed = (target || "").trim();
    if (trimmed.length < 3) return;

    try {
      const { data } = await api.get(`/voice/rate-quote?to=${encodeURIComponent(trimmed)}`);
      setQuote(data);
      setNoBalance(false);
    } catch (_err) {
      setQuote(null);
    }
  };

  useEffect(() => {
    loadConfig();
    loadHistory();
    fetchQuote("+263");
  }, []);

  useEffect(() => {
    const audio = remoteAudioRef.current || document.getElementById("remoteAudio");

    if (!audio) return;

    audio.autoplay = true;
    audio.playsInline = true;
    audio.muted = false;
    audio.volume = 1;

    const tryPlay = async () => {
      try {
        await audio.play();
      } catch (_err) {}
    };

    if (status === "in-call" || status === "calling") {
      tryPlay();
    }
  }, [status, incomingCall]);

  useEffect(() => {
    if (status === "in-call") {
      if (!callStartRef.current) {
        callStartRef.current = Date.now();
      }

      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          if (callStartRef.current) {
            setElapsedSeconds(Math.floor((Date.now() - callStartRef.current) / 1000));
          }
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (status !== "in-call") {
        setElapsedSeconds(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    if (status === "ready" && callStartRef.current) {
      const duration = Math.floor((Date.now() - callStartRef.current) / 1000);
      const captured = number;

      callStartRef.current = null;
      setElapsedSeconds(0);

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
    setNoBalance(false);
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
      setNoBalance(false);
    } catch (_err) {
      setNoBalance(true);
      return;
    }

    if (status !== "ready") return;

    try {
      await makeCall(target);
    } catch (_err) {
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
    setElapsedSeconds(0);

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

  const handleAcceptIncoming = async () => {
    try {
      await acceptIncoming();

      setTimeout(() => {
        const audio = remoteAudioRef.current || document.getElementById("remoteAudio");
        if (audio) {
          audio.muted = false;
          audio.volume = 1;
          audio.play().catch(() => {});
        }
      }, 300);
    } catch (_err) {
      toast.error("Could not accept the call.");
    }
  };

  const isReady = voiceConfig?.enabled && status === "ready";
  const isOnCall = status === "calling" || status === "in-call";

  const statusColor = isOnCall
    ? "bg-green-700 text-white"
    : isReady
    ? "bg-green-600 text-black"
    : "bg-red-600 text-white";

  const statusLabel = isOnCall
    ? status === "calling"
      ? "Ringing…"
      : "On call"
    : isReady
    ? "Ready"
    : "Not ready";

  const incomingNumber =
    incomingCall?.options?.remoteCallerNumber ||
    incomingCall?.remoteCallerNumber ||
    incomingCall?.callerNumber ||
    "Unknown caller";

  return (
    <div className="space-y-5 md:space-y-6" data-testid="calls-page">
      <audio
        id="remoteAudio"
        ref={remoteAudioRef}
        autoPlay
        playsInline
        controls={false}
        className="hidden"
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">
            Voice · Zimbabwe +263
          </p>
          <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-black dark:text-white">
            Calls.
          </h1>
          <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 md:mt-2">
            Enter a number and call Zimbabwe mobile or landline numbers.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium w-fit ${statusColor}`}
          data-testid="voice-status"
        >
          {isReady || isOnCall ? <CheckCircle size={14} weight="bold" /> : <XCircle size={14} weight="bold" />}
          {statusLabel}
        </span>
      </div>

      {incomingCall && (
        <div className="rounded-xl p-5 flex items-center justify-between bg-green-600" data-testid="incoming-call">
          <div>
            <p className="text-[10px] font-medium tracking-widest text-black/70 uppercase">Incoming</p>
            <p className="text-2xl font-medium mt-1 text-black">{incomingNumber}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAcceptIncoming}
              className="inline-flex items-center gap-1.5 rounded-full bg-black text-white px-4 py-2 text-sm font-medium"
              data-testid="accept-incoming"
            >
              <Phone size={16} weight="fill" /> Accept
            </button>

            <button
              onClick={rejectIncoming}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white px-4 py-2 text-sm font-medium"
              data-testid="reject-incoming"
            >
              <PhoneDisconnect size={16} weight="bold" /> Reject
            </button>
          </div>
        </div>
      )}

      {isOnCall && (
        <div className="rounded-xl p-5 flex items-center justify-between bg-green-600" data-testid="active-call-bar">
          <div>
            <p className="text-[10px] font-medium tracking-widest text-black/70 uppercase">
              {status === "calling" ? "Ringing" : "On call"}
            </p>
            <p className="text-2xl font-medium mt-1 text-black">{number}</p>

            {status === "in-call" && (
              <p className="text-sm font-mono font-medium mt-1 text-black/80" data-testid="call-duration">
                {formatDuration(elapsedSeconds)}
              </p>
            )}
          </div>

          <button
            onClick={endCall}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white px-4 py-2 text-sm font-medium"
            data-testid="hangup-button"
          >
            <PhoneDisconnect size={16} weight="bold" /> End
          </button>
        </div>
      )}

      <div className="rounded-2xl p-6 md:p-8 max-w-md mx-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Phone number</label>

        <input
          type="tel"
          inputMode="tel"
          className="w-full mt-2 text-2xl md:text-3xl font-medium bg-transparent border-b-2 border-neutral-300 dark:border-neutral-700 focus:border-green-600 outline-none py-2 text-black dark:text-white"
          placeholder="+263 77 000 0000"
          value={number}
          onChange={(e) => updateNumber(e.target.value)}
          data-testid="call-number-input"
        />

        <button
          onClick={dial}
          disabled={!number || isOnCall}
          className="w-full mt-5 h-14 rounded-xl text-base font-medium bg-green-600 text-black flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
          data-testid="call-button"
        >
          <Phone size={20} weight="fill" /> {status === "calling" ? "Ringing…" : "Call"}
        </button>

        {noBalance && (
          <p className="mt-3 text-xs text-center text-red-600 dark:text-red-400" data-testid="no-balance-message">
            You do not have enough airtime to make this call. Please top up your wallet.
          </p>
        )}

        {!noBalance && quote && (
          <div
            className="mt-3 flex items-center justify-between text-xs px-1 text-neutral-500 dark:text-neutral-400"
            data-testid="rate-quote"
          >
            <span>
              {quote.free ? "In-app · " : `${quote.rate_name} · `}
              <span className="font-medium text-black dark:text-white">
                ${quote.rate_per_minute.toFixed(2)}/min
              </span>
            </span>
            <span>
              {quote.free ? "Free" : `~${Math.floor(quote.max_minutes)} min on $${quote.balance.toFixed(2)}`}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3" data-testid="recent-calls">
        <div>
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">Recent calls</p>
          <h2 className="text-xl md:text-2xl font-medium mt-1 text-black dark:text-white">Call history</h2>
        </div>

        {history.length === 0 && (
          <div className="rounded-xl p-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm text-neutral-500">No recent calls yet.</p>
          </div>
        )}

        {history.slice(0, 8).map((h) => (
          <div
            key={h.id}
            className="rounded-xl p-4 flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          >
            <div>
              <p className="font-medium text-sm text-black dark:text-white">{h.to_name || h.to}</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {new Date(h.created_at).toLocaleString()}
                {h.duration_seconds ? ` · ${Math.floor(h.duration_seconds / 60)}m ${h.duration_seconds % 60}s` : ""}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                h.status === "completed"
                  ? "bg-green-600 text-black"
                  : h.status === "failed" || h.status === "billing_failed"
                  ? "bg-red-600 text-white"
                  : "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white"
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