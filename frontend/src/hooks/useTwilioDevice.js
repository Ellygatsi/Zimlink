import { useEffect, useState, useCallback, useRef } from "react";
import { Device } from "@twilio/voice-sdk";
import api from "@/lib/api";

export function useTwilioDevice(enabled) {
  const [device, setDevice] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | registering | ready | calling | in-call | error
  const [error, setError] = useState(null);
  const deviceRef = useRef(null);

  const fetchToken = useCallback(async () => {
    const { data } = await api.get("/voice/token");
    return data.token;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    (async () => {
      try {
        setStatus("registering");
        const token = await fetchToken();
        const d = new Device(token, { logLevel: 1, codecPreferences: ["opus", "pcmu"] });

        d.on("registered", () => mounted && setStatus("ready"));
        d.on("unregistered", () => mounted && setStatus("idle"));
        d.on("error", (e) => {
          if (!mounted) return;
          setStatus("error");
          setError(e?.message || "Twilio error");
        });
        d.on("incoming", (call) => {
          if (!mounted) return;
          setIncomingCall(call);
          call.on("disconnect", () => mounted && (setIncomingCall(null), setActiveCall(null), setStatus("ready")));
          call.on("cancel", () => mounted && setIncomingCall(null));
        });
        d.on("tokenWillExpire", async () => {
          try {
            const fresh = await fetchToken();
            await d.updateToken(fresh);
          } catch (err) {
            console.error("Token refresh failed", err);
          }
        });

        await d.register();
        if (!mounted) { d.destroy(); return; }
        deviceRef.current = d;
        setDevice(d);
      } catch (e) {
        if (!mounted) return;
        setStatus("error");
        setError(e?.response?.data?.detail || e?.message || "Could not initialise calling");
      }
    })();

    return () => {
      mounted = false;
      if (deviceRef.current) {
        try { deviceRef.current.destroy(); } catch (_e) { /* noop */ }
        deviceRef.current = null;
      }
    };
  }, [enabled, fetchToken]);

  const makeCall = useCallback(async (to) => {
    if (!device) throw new Error("Calling not ready yet");
    setStatus("calling");
    const call = await device.connect({ params: { To: to } });
    setActiveCall(call);
    call.on("accept", () => setStatus("in-call"));
    call.on("disconnect", () => { setActiveCall(null); setStatus("ready"); });
    call.on("cancel", () => { setActiveCall(null); setStatus("ready"); });
    call.on("error", (e) => { setError(e?.message); setStatus("error"); });
    return call;
  }, [device]);

  const hangup = useCallback(() => {
    if (activeCall) activeCall.disconnect();
    if (incomingCall && !activeCall) incomingCall.reject();
  }, [activeCall, incomingCall]);

  const acceptIncoming = useCallback(() => {
    if (incomingCall) {
      incomingCall.accept();
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setStatus("in-call");
    }
  }, [incomingCall]);

  const rejectIncoming = useCallback(() => {
    if (incomingCall) {
      incomingCall.reject();
      setIncomingCall(null);
    }
  }, [incomingCall]);

  return { device, status, error, activeCall, incomingCall, makeCall, hangup, acceptIncoming, rejectIncoming };
}
