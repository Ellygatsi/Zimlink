import { useCallback, useEffect, useRef, useState } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";

export function useTelnyxDevice(enabled = true) {
  const clientRef = useRef(null);
  const callRef = useRef(null);
  const connectedRef = useRef(false);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    const loginToken = process.env.REACT_APP_TELNYX_LOGIN_TOKEN;
    const login = process.env.REACT_APP_TELNYX_SIP_USERNAME;
    const password = process.env.REACT_APP_TELNYX_SIP_PASSWORD;

    const options = loginToken
      ? { login_token: loginToken }
      : login && password
      ? { login, password }
      : null;

    if (!options) {
      setStatus("error");
      setError("Missing Telnyx credentials. Add REACT_APP_TELNYX_LOGIN_TOKEN or REACT_APP_TELNYX_SIP_USERNAME and REACT_APP_TELNYX_SIP_PASSWORD to frontend/.env, then restart npm start.");
      return;
    }

    setStatus("registering");
    setError("");

    const client = new TelnyxRTC(options);
    clientRef.current = client;

    client.on("telnyx.ready", () => {
      connectedRef.current = true;
      setStatus("ready");
      setError("");
    });

    client.on("telnyx.socket.open", () => {
      setStatus("registering");
    });

    client.on("telnyx.socket.close", () => {
      connectedRef.current = false;
      setStatus("error");
      setError("Telnyx connection closed. Check Telnyx credentials and WebRTC connection settings.");
    });

    client.on("telnyx.error", (err) => {
      console.error("Telnyx error:", err);
      connectedRef.current = false;
      setStatus("error");
      setError(err?.message || err?.error || "Telnyx connection error");
    });

    client.on("telnyx.notification", (notification) => {
      const call = notification?.call;
      if (!call) return;

      if (notification.type === "callUpdate") {
        const state = call.state;

        // TEMP DEBUG: log every call state transition so we can see
        // exactly what fires (or doesn't) when the remote side hangs up.
        console.log("TELNYX CALL STATE:", state, "direction:", call.direction);

        if (state === "ringing" && call.direction === "inbound") {
          setIncomingCall(call);
        }

        if (["trying", "requesting", "recovering", "early", "ringing"].includes(state)) {
          callRef.current = call;
          setActiveCall(call);
          if (call.direction !== "inbound") setStatus("calling");
        }

        if (["active", "held"].includes(state)) {
          callRef.current = call;
          setActiveCall(call);
          setIncomingCall(null);
          setStatus("in-call");
        }

        if (["hangup", "destroy", "purge"].includes(state)) {
          callRef.current = null;
          setActiveCall(null);
          setIncomingCall(null);
          setStatus(connectedRef.current ? "ready" : "error");
        }
      }
    });

    client.connect();

    return () => {
      try {
        if (callRef.current) callRef.current.hangup();
        client.disconnect();
      } catch (_e) {}
      callRef.current = null;
      clientRef.current = null;
      connectedRef.current = false;
    };
  }, [enabled]);

  const makeCall = useCallback(async (destinationNumber) => {
    const client = clientRef.current;
    if (!client || status !== "ready") {
      throw new Error(`Telnyx client is not ready yet (${status}).`);
    }

    const callerName = process.env.REACT_APP_TELNYX_CALLER_NAME || "ZimLink";
    const callerNumber = process.env.REACT_APP_TELNYX_CALLER_NUMBER || "";

    const call = client.newCall({
      destinationNumber,
      callerName,
      callerNumber,
    });

    callRef.current = call;
    setActiveCall(call);
    setStatus("calling");
    return call;
  }, [status]);

  const hangup = useCallback(() => {
    try {
      if (callRef.current) callRef.current.hangup();
    } catch (_e) {}
    callRef.current = null;
    setActiveCall(null);
    setIncomingCall(null);
    setStatus(connectedRef.current ? "ready" : "error");
  }, []);

  const acceptIncoming = useCallback(() => {
    if (incomingCall) {
      incomingCall.answer();
      callRef.current = incomingCall;
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setStatus("in-call");
    }
  }, [incomingCall]);

  const rejectIncoming = useCallback(() => {
    if (incomingCall) incomingCall.hangup();
    setIncomingCall(null);
  }, [incomingCall]);

  return {
    status,
    error,
    activeCall,
    incomingCall,
    makeCall,
    hangup,
    acceptIncoming,
    rejectIncoming,
  };
}