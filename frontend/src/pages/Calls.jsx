import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import api from "@/lib/api";
import {
  Phone,
  PhoneDisconnect,
  CheckCircle,
  XCircle,
  SpeakerHigh,
  AddressBook,
  ClockCounterClockwise,
  Star,
  Plus,
  DownloadSimple,
} from "@phosphor-icons/react";
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
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState("");

  // --- New: tabs, contacts, favourites ---
  const [activeTab, setActiveTab] = useState("history"); // "contacts" | "history" | "favourites"
  const [contacts, setContacts] = useState([]);
  const [contactImportSupported, setContactImportSupported] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  const hasConnectedRef = useRef(false);
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

  const loadContacts = async () => {
    try {
      const { data } = await api.get("/voice/contacts");
      setContacts(data);
    } catch (_e) {
      // Contacts endpoint may not exist yet on the backend — fail quietly.
      setContacts([]);
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

  const loadAudioOutputs = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        toast.error("Audio device selection is not supported on this browser.");
        return;
      }

      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((d) => d.kind === "audiooutput");

      setAudioDevices(outputs);

      if (outputs.length && !selectedOutputDevice) {
        setSelectedOutputDevice(outputs[0].deviceId);
      }
    } catch (_err) {
      toast.error("Could not load speaker or Bluetooth devices.");
    }
  }, [selectedOutputDevice]);

  const changeAudioOutput = async (deviceId) => {
    const audio = remoteAudioRef.current || document.getElementById("remoteAudio");
    if (!audio) return;

    if (!audio.setSinkId) {
      toast.error("Speaker or Bluetooth switching is not supported on this browser.");
      return;
    }

    try {
      await audio.setSinkId(deviceId);
      setSelectedOutputDevice(deviceId);
      toast.success("Audio output changed.");
    } catch (_err) {
      toast.error("Could not switch audio output.");
    }
  };

  useEffect(() => {
    loadConfig();
    loadHistory();
    loadContacts();
    fetchQuote("+263");

    // Feature-detect the Contact Picker API. Supported on Android Chrome;
    // NOT supported on iPhone Safari (Apple has no equivalent API).
    setContactImportSupported(
      typeof navigator !== "undefined" &&
        "contacts" in navigator &&
        "select" in navigator.contacts
    );
  }, []);

  useEffect(() => {
    if (status === "in-call") {
      loadAudioOutputs();
    }
  }, [status, loadAudioOutputs]);

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
      hasConnectedRef.current = true;

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

      setElapsedSeconds(0);
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
      hasConnectedRef.current = false;

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

  // Now accepts an optional target so Contacts/Favourites can trigger a call
  // directly without waiting on state to update.
  const dial = async (targetOverride) => {
    const target = (targetOverride || number).trim();

    if (!target) {
      toast.error("Please enter a phone number.");
      return;
    }

    if (!target.startsWith("+")) {
      toast.error("Use international format, for example +26377XXXXXXX.");
      return;
    }

    setNumber(target);

    try {
      await api.get(`/voice/rate-quote?to=${encodeURIComponent(target)}`);
      setNoBalance(false);
    } catch (_err) {
      setNoBalance(true);
      return;
    }

    if (status !== "ready") return;

    hasConnectedRef.current = false;

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
    const wasConnected = hasConnectedRef.current;

    callStartRef.current = null;
    setElapsedSeconds(0);
    hasConnectedRef.current = false;

    api
      .post("/voice/call-log", {
        to: number,
        to_name: "",
        direction: "outbound",
        duration_seconds: wasConnected ? duration : 0,
        status: wasConnected ? "completed" : "no_answer",
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

  // --- New: Contacts ---
  const handleAddContact = async (e) => {
    e.preventDefault();

    const name = newContactName.trim();
    const num = newContactNumber.trim();

    if (!num.startsWith("+")) {
      toast.error("Use international format, for example +26377XXXXXXX.");
      return;
    }

    setAddingContact(true);
    try {
      await api.post("/voice/contacts", { name, number: num });
      toast.success("Contact added.");
      setNewContactName("");
      setNewContactNumber("");
      loadContacts();
    } catch (_err) {
      toast.error("Could not add contact.");
    } finally {
      setAddingContact(false);
    }
  };

  const importFromPhone = async () => {
    if (!contactImportSupported) {
      toast.error(
        "Importing contacts isn't supported on this device's browser (this includes iPhone Safari). Please add contacts manually below."
      );
      return;
    }

    try {
      const selected = await navigator.contacts.select(["name", "tel"], { multiple: true });

      let importedCount = 0;
      for (const c of selected) {
        const name = c.name?.[0] || "";
        const tel = c.tel?.[0] || "";
        if (tel) {
          await api.post("/voice/contacts", { name, number: tel }).catch(() => {});
          importedCount += 1;
        }
      }

      toast.success(`Imported ${importedCount} contact${importedCount === 1 ? "" : "s"}.`);
      loadContacts();
    } catch (_err) {
      toast.error("Could not import contacts.");
    }
  };

  // --- New: Favourites, derived from call history (most-called numbers) ---
  const favourites = useMemo(() => {
    const counts = {};

    for (const h of history) {
      if (!h.to) continue;
      if (!counts[h.to]) {
        counts[h.to] = { number: h.to, name: h.to_name || "", count: 0 };
      }
      counts[h.to].count += 1;
      if (!counts[h.to].name && h.to_name) {
        counts[h.to].name = h.to_name;
      }
    }

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [history]);

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

  const statusBadgeClasses = (s) => {
    if (s === "completed") return "bg-green-600 text-black";
    if (s === "failed" || s === "billing_failed") return "bg-red-600 text-white";
    if (s === "no_answer") return "bg-yellow-500 text-black";
    return "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white";
  };

  const statusBadgeLabel = (s) => {
    if (s === "no_answer") return "no answer";
    if (s === "billing_failed") return "billing failed";
    return s;
  };

  const tabButtonClasses = (tab) =>
    `flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs md:text-sm font-medium transition-colors ${
      activeTab === tab
        ? "bg-green-600 text-black"
        : "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
    }`;

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
              <>
                <p className="text-sm font-mono font-medium mt-1 text-black/80" data-testid="call-duration">
                  {formatDuration(elapsedSeconds)}
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  <button
                    onClick={loadAudioOutputs}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black text-white px-3 py-1.5 text-xs font-medium w-fit"
                    type="button"
                  >
                    <SpeakerHigh size={14} weight="fill" />
                    Speaker / Bluetooth
                  </button>

                  {audioDevices.length > 0 && (
                    <select
                      value={selectedOutputDevice}
                      onChange={(e) => changeAudioOutput(e.target.value)}
                      className="max-w-xs rounded-lg bg-white text-black px-3 py-2 text-xs outline-none"
                    >
                      {audioDevices.map((device, index) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Audio output ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </>
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
          onClick={() => dial()}
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
            className="mt-3 text-center text-xs px-1 text-neutral-500 dark:text-neutral-400"
            data-testid="rate-quote"
          >
            <span className="font-medium text-black dark:text-white">
              {quote.free
                ? "Free in-app call"
                : `You can call for about ${Math.floor(quote.max_minutes)} minutes with your current balance.`}
            </span>
          </div>
        )}
      </div>

      {/* --- Tabs: Contacts / History / Favourites --- */}
      <div className="space-y-4" data-testid="calls-tabs">
        <div className="flex gap-2 rounded-xl p-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
          <button
            className={tabButtonClasses("contacts")}
            onClick={() => setActiveTab("contacts")}
            data-testid="tab-contacts"
          >
            <AddressBook size={16} weight="bold" /> Contacts
          </button>
          <button
            className={tabButtonClasses("history")}
            onClick={() => setActiveTab("history")}
            data-testid="tab-history"
          >
            <ClockCounterClockwise size={16} weight="bold" /> History
          </button>
          <button
            className={tabButtonClasses("favourites")}
            onClick={() => setActiveTab("favourites")}
            data-testid="tab-favourites"
          >
            <Star size={16} weight="bold" /> Favourites
          </button>
        </div>

        {activeTab === "contacts" && (
          <div className="space-y-4" data-testid="contacts-tab">
            <button
              onClick={importFromPhone}
              className="inline-flex items-center gap-1.5 rounded-full bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-medium"
              data-testid="import-contacts-button"
            >
              <DownloadSimple size={16} weight="bold" />
              Import from phone
            </button>

            {!contactImportSupported && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Contact import isn't available on this browser (iPhone Safari doesn't support it) — add contacts manually below.
              </p>
            )}

            <form
              onSubmit={handleAddContact}
              className="rounded-xl p-4 space-y-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              data-testid="add-contact-form"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="h-11 rounded-lg px-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none focus:border-green-600 text-black dark:text-white"
                  data-testid="new-contact-name"
                />
                <input
                  type="tel"
                  placeholder="+263 77 000 0000"
                  value={newContactNumber}
                  onChange={(e) => setNewContactNumber(e.target.value)}
                  required
                  className="h-11 rounded-lg px-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none focus:border-green-600 text-black dark:text-white"
                  data-testid="new-contact-number"
                />
              </div>
              <button
                type="submit"
                disabled={addingContact}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-600 text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
                data-testid="add-contact-button"
              >
                <Plus size={16} weight="bold" /> {addingContact ? "Adding…" : "Add contact"}
              </button>
            </form>

            {contacts.length === 0 && (
              <div className="rounded-xl p-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-sm text-neutral-500">No contacts yet.</p>
              </div>
            )}

            {contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-4 flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              >
                <div>
                  <p className="font-medium text-sm text-black dark:text-white">{c.name || c.number}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{c.number}</p>
                </div>

                <button
                  onClick={() => dial(c.number)}
                  disabled={isOnCall}
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-600 text-black px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  <Phone size={14} weight="fill" /> Call
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3" data-testid="recent-calls">
            {history.length === 0 && (
              <div className="rounded-xl p-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-sm text-neutral-500">No recent calls yet.</p>
              </div>
            )}

            {history.map((h) => (
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

                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClasses(h.status)}`}>
                  {statusBadgeLabel(h.status)}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "favourites" && (
          <div className="space-y-3" data-testid="favourites-tab">
            {favourites.length === 0 && (
              <div className="rounded-xl p-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <p className="text-sm text-neutral-500">
                  Favourites are built automatically from who you call most — make a few calls and they'll show up here.
                </p>
              </div>
            )}

            {favourites.map((f) => (
              <div
                key={f.number}
                className="rounded-xl p-4 flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              >
                <div className="flex items-center gap-3">
                  <Star size={18} weight="fill" className="text-green-600" />
                  <div>
                    <p className="font-medium text-sm text-black dark:text-white">{f.name || f.number}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {f.number} · {f.count} call{f.count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => dial(f.number)}
                  disabled={isOnCall}
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-600 text-black px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  <Phone size={14} weight="fill" /> Call
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
