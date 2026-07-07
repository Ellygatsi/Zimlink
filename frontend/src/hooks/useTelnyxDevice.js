import { useCallback, useEffect, useRef, useState } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";

function attachRemoteAudio(call) {
  const audio = document.getElementById("remoteAudio");

  if (!audio || !call) return;

  const remoteStream =
    call.remoteStream ||
    call.options?.remoteStream ||
    call.peerConnection?.getRemoteStreams?.()?.[0];

  if (remoteStream) {
    audio.srcObject = remoteStream;
    audio.muted = false;
    audio.volume = 1;
    audio.autoplay = true;
    audio.playsInline = true;

    audio.play().catch((err) => {
      console.warn("Remote audio play blocked:", err);
    });
  }
}

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
      setError(
        "Missing Telnyx credentials. Add REACT_APP_TELNYX_LOGIN_TOKEN or REACT_APP_TELNYX_SIP_USERNAME and REACT_APP_TELNYX_SIP_PASSWORD."
      );
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
      setError("Telnyx connection closed.");
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

        console.log("TELNYX CALL STATE:", state, "direction:", call.direction);

        if (state === "ringing" && call.direction === "inbound") {
          callRef.current = call;
          setIncomingCall(call);
        }

        if (["trying", "requesting", "recovering", "early", "ringing"].includes(state)) {
          callRef.current = call;
          setActiveCall(call);

          if (call.direction !== "inbound") {
            setStatus("calling");
          }
        }

        if (["active", "held"].includes(state)) {
          callRef.current = call;
          setActiveCall(call);
          setIncomingCall(null);
          setStatus("in-call");

          setTimeout(() => attachRemoteAudio(call), 100);
          setTimeout(() => attachRemoteAudio(call), 500);
          setTimeout(() => attachRemoteAudio(call), 1200);
        }

        if (["hangup", "destroy", "purge"].includes(state)) {
          const audio = document.getElementById("remoteAudio");
          if (audio) {
            audio.pause();
            audio.srcObject = null;
          }

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

        const audio = document.getElementById("remoteAudio");
        if (audio) {
          audio.pause();
          audio.srcObject = null;
        }

        client.disconnect();
      } catch (_e) {}

      callRef.current = null;
      clientRef.current = null;
      connectedRef.current = false;
    };
  }, [enabled]);

  const makeCall = useCallback(
    async (destinationNumber) => {
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

      setTimeout(() => attachRemoteAudio(call), 500);

      return call;
    },
    [status]
  );

  const hangup = useCallback(() => {
    try {
      if (callRef.current) callRef.current.hangup();

      const audio = document.getElementById("remoteAudio");
      if (audio) {
        audio.pause();
        audio.srcObject = null;
      }
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

      setTimeout(() => attachRemoteAudio(incomingCall), 100);
      setTimeout(() => attachRemoteAudio(incomingCall), 500);
      setTimeout(() => attachRemoteAudio(incomingCall), 1200);
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