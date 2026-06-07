import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import { ArrowUpRight, ArrowDownLeft, X, Plus, CheckCircle, Clock } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function WalletPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const cancelled = searchParams.get("cancelled");

  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState([]);
  const [showSend, setShowSend] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [packages, setPackages] = useState(null);
  const [pollStatus, setPollStatus] = useState(null); // {state, info}

  const reload = async () => {
    const [b, t] = await Promise.all([
      api.get("/wallet/balance"),
      api.get("/wallet/transactions"),
    ]);
    setBalance(b.data.balance);
    setTxs(t.data);
  };

  useEffect(() => {
    Promise.all([
      api.get("/wallet/balance"),
      api.get("/wallet/transactions"),
      api.get("/wallet/topup/packages"),
    ]).then(([b, t, p]) => {
      setBalance(b.data.balance);
      setTxs(t.data);
      setPackages(p.data);
    }).catch(() => {});
  }, []);

  // Poll Stripe Checkout status after returning from Stripe
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const attemptsRef = { current: 0 };
    const tick = () => {
      if (cancelled) return;
      attemptsRef.current += 1;
      api.get(`/wallet/topup/status/${sessionId}`)
        .then(({ data }) => {
          if (cancelled) return;
          if (data.payment_status === "paid") {
            setPollStatus({ state: "success", info: data });
            toast.success(`Wallet credited with $${data.credited.toFixed(2)}!`);
            reload();
            refresh();
            setTimeout(() => navigate("/wallet", { replace: true }), 4000);
            return;
          }
          if (data.status === "expired") {
            setPollStatus({ state: "expired", info: data });
            return;
          }
          setPollStatus({ state: "pending", info: null });
          if (attemptsRef.current < 8) {
            setTimeout(tick, 2000);
          } else {
            setPollStatus({ state: "timeout", info: data });
          }
        })
        .catch(() => {
          if (!cancelled) setPollStatus({ state: "error", info: null });
        });
    };
    tick();
    return () => { cancelled = true; };
  }, [sessionId, navigate, refresh]);

  useEffect(() => {
    if (cancelled) {
      toast.error("Top-up cancelled.");
      navigate("/wallet", { replace: true });
    }
  }, [cancelled, navigate]);

  const sendMoney = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/wallet/send", {
        recipient_email: recipient,
        amount: parseFloat(amount),
        note,
      });
      toast.success("Money sent!");
      setShowSend(false);
      setRecipient(""); setAmount(""); setNote("");
      await reload();
      await refresh();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to send";
      toast.error(typeof msg === "string" ? msg : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  const startTopUp = async (pkgAmount) => {
    setBusy(true);
    try {
      const { data } = await api.post("/wallet/topup/checkout", {
        package_amount: pkgAmount,
        origin_url: window.location.origin,
      });
      window.location.assign(data.url);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not start checkout");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="wallet-page">
      <div>
        <p className="overline text-neutral-500">YOUR WALLET</p>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Money.</h1>
      </div>

      {pollStatus && (
        <div className={`nb-card p-4 flex items-start gap-3 backdrop-blur-sm ${
          pollStatus.state === "success" ? "bg-[#009639] text-white" :
          pollStatus.state === "pending" ? "bg-[#FFCD00]/80" :
          "bg-[#DE2010] text-white"
        }`} data-testid="topup-status-banner">
          {pollStatus.state === "success" ? <CheckCircle size={24} weight="bold" /> : <Clock size={24} weight="bold" />}
          <div className="flex-1">
            {pollStatus.state === "pending" && <p className="font-bold text-sm">Confirming your payment… give us a sec.</p>}
            {pollStatus.state === "success" && <p className="font-bold text-sm">Top-up successful! ${pollStatus.info?.credited?.toFixed(2)} credited (fee: ${pollStatus.info?.fee?.toFixed(2)}).</p>}
            {pollStatus.state === "expired" && <p className="font-bold text-sm">This checkout session expired. Please start a new one.</p>}
            {pollStatus.state === "timeout" && <p className="font-bold text-sm">Still confirming with Stripe. Refresh in a minute — your balance will update.</p>}
            {pollStatus.state === "error" && <p className="font-bold text-sm">Could not verify the payment. Contact support if your card was charged.</p>}
          </div>
        </div>
      )}

      <div className="nb-card p-6 md:p-10 backdrop-blur-sm" style={{ backgroundColor: ACCENTS.wallet }} data-testid="balance-card">
        <p className="overline">CURRENT BALANCE</p>
        <p className="text-6xl md:text-8xl font-black tracking-tighter mono mt-3" data-testid="wallet-balance">
          ${balance.toFixed(2)}
        </p>
        <p className="text-sm mt-2 font-medium">@{user?.email}</p>
        <div className="grid grid-cols-3 gap-3 mt-8">
          <button
            onClick={() => setShowTopUp(true)}
            className="nb-btn h-14 text-base bg-[#009639] text-white"
            data-testid="wallet-topup-button"
          >
            <Plus size={20} weight="bold" /> Top Up
          </button>
          <button
            onClick={() => setShowSend(true)}
            disabled={balance <= 0}
            className="nb-btn h-14 text-base bg-black text-white"
            data-testid="wallet-send-button"
          >
            <ArrowUpRight size={20} weight="bold" /> Send
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(user?.email || "");
              toast.success("Email copied — share to receive money");
            }}
            className="nb-btn h-14 text-base bg-white"
            data-testid="wallet-request-button"
          >
            <ArrowDownLeft size={20} weight="bold" /> Request
          </button>
        </div>
      </div>

      <div>
        <p className="overline text-neutral-500 mb-3">RECENT ACTIVITY</p>
        <div className="space-y-2" data-testid="transactions-list">
          {txs.length === 0 && (
            <div className="nb-card p-6 text-sm text-neutral-700 bg-white/90 backdrop-blur-sm">
              No transactions yet. Tap <span className="font-black">Top Up</span> to add funds, then send to a friend.
            </div>
          )}
          {txs.map((tx) => {
            const isOutgoing = tx.from_id === user?.id;
            const other = isOutgoing ? tx.to_name : tx.from_name;
            return (
              <div key={tx.id} className="nb-card p-4 flex items-center justify-between bg-white/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center"
                    style={{ backgroundColor: isOutgoing ? "#0A0A0A" : ACCENTS.wallet }}
                  >
                    {isOutgoing
                      ? <ArrowUpRight size={18} weight="bold" color="white" />
                      : <ArrowDownLeft size={18} weight="bold" color="black" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{isOutgoing ? "To" : "From"} {other}</p>
                    <p className="text-xs text-neutral-500">{new Date(tx.created_at).toLocaleString()}{tx.note ? ` · ${tx.note}` : ""}</p>
                  </div>
                </div>
                <p className={`text-lg font-black mono ${isOutgoing ? "text-black" : "text-[#009639]"}`}>
                  {isOutgoing ? "-" : "+"}${tx.amount.toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Up modal */}
      {showTopUp && packages && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowTopUp(false)}>
          <div onClick={(e) => e.stopPropagation()} className="nb-card p-6 w-full max-w-md bg-white space-y-4 max-h-[90vh] overflow-y-auto" data-testid="topup-modal">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Top up wallet</h2>
              <button type="button" onClick={() => setShowTopUp(false)} data-testid="close-topup-modal"><X size={22} weight="bold" /></button>
            </div>
            <p className="text-sm text-neutral-600">
              Add funds via Stripe. {packages.deposit_fee_percent > 0 && (
                <>A <span className="font-black">{packages.deposit_fee_percent}%</span> processing fee applies.</>
              )}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {packages.packages.map((p) => (
                <button
                  key={p.amount}
                  onClick={() => startTopUp(p.amount)}
                  disabled={busy}
                  data-testid={`topup-package-${p.amount}`}
                  className="nb-btn flex-col h-auto py-4 bg-white text-left"
                >
                  <span className="text-2xl font-black mono">${p.amount.toFixed(0)}</span>
                  <span className="text-xs text-neutral-500 font-medium mt-1">
                    +${p.credited.toFixed(2)} credit · ${p.fee.toFixed(2)} fee
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 text-center">
              Powered by Stripe. Test card: <span className="mono font-bold">4242 4242 4242 4242</span> · any future date · any CVC
            </p>
          </div>
        </div>
      )}

      {/* Send modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowSend(false)}>
          <form
            onSubmit={sendMoney}
            onClick={(e) => e.stopPropagation()}
            className="nb-card p-6 w-full max-w-md bg-white space-y-4"
            data-testid="send-money-modal"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Send money</h2>
              <button type="button" onClick={() => setShowSend(false)} data-testid="close-send-modal"><X size={22} weight="bold" /></button>
            </div>
            <div>
              <label className="overline">Recipient email</label>
              <input type="email" required className="nb-input mt-2" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="friend@superapp.com" data-testid="send-recipient-input" />
            </div>
            <div>
              <label className="overline">Amount</label>
              <input type="number" min="0.01" step="0.01" required className="nb-input mt-2 mono text-2xl" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="send-amount-input" />
            </div>
            <div>
              <label className="overline">Note (optional)</label>
              <input className="nb-input mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For pizza" data-testid="send-note-input" />
            </div>
            <button disabled={busy} className="nb-btn w-full h-12" style={{ backgroundColor: ACCENTS.wallet, color: "black" }} data-testid="send-confirm-button">
              {busy ? "Sending…" : "Confirm"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
