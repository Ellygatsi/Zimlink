import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
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
  const [pollStatus, setPollStatus] = useState(null);

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
    <div className="space-y-5 md:space-y-6" data-testid="wallet-page">
      <div>
        <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">Your wallet</p>
        <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-black dark:text-white">Money.</h1>
      </div>

      {pollStatus && (
        <div
          className={`rounded-xl p-4 flex items-start gap-3 ${
            pollStatus.state === "success"
              ? "bg-green-600 text-black"
              : pollStatus.state === "pending"
              ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              : "bg-red-600 text-white"
          }`}
          data-testid="topup-status-banner"
        >
          {pollStatus.state === "success" ? <CheckCircle size={22} weight="bold" /> : <Clock size={22} weight="bold" />}
          <div className="flex-1">
            {pollStatus.state === "pending" && <p className="font-medium text-sm">Confirming your payment… give us a sec.</p>}
            {pollStatus.state === "success" && (
              <p className="font-medium text-sm">
                Top-up successful! ${pollStatus.info?.credited?.toFixed(2)} credited (fee: ${pollStatus.info?.fee?.toFixed(2)}).
              </p>
            )}
            {pollStatus.state === "expired" && <p className="font-medium text-sm">This checkout session expired. Please start a new one.</p>}
            {pollStatus.state === "timeout" && <p className="font-medium text-sm">Still confirming with Stripe. Refresh in a minute — your balance will update.</p>}
            {pollStatus.state === "error" && <p className="font-medium text-sm">Could not verify the payment. Contact support if your card was charged.</p>}
          </div>
        </div>
      )}

      <div className="rounded-2xl p-6 md:p-10 bg-green-600" data-testid="balance-card">
        <p className="text-[10px] md:text-xs font-medium tracking-widest text-black/70 uppercase">Current balance</p>
        <p className="text-5xl md:text-8xl font-medium tracking-tight mt-2 md:mt-3 text-black" data-testid="wallet-balance">
          ${balance.toFixed(2)}
        </p>
        <p className="text-xs md:text-sm mt-2 font-medium text-black/70">@{user?.email}</p>
        <div className="grid grid-cols-3 gap-2 md:gap-3 mt-6 md:mt-8">
          <button
            onClick={() => setShowTopUp(true)}
            className="h-12 md:h-14 rounded-xl text-xs md:text-base font-medium bg-black text-white flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
            data-testid="wallet-topup-button"
          >
            <Plus size={18} weight="bold" /> Top up
          </button>
          <button
            onClick={() => setShowSend(true)}
            disabled={balance <= 0}
            className="h-12 md:h-14 rounded-xl text-xs md:text-base font-medium bg-black text-white flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 disabled:opacity-50"
            data-testid="wallet-send-button"
          >
            <ArrowUpRight size={18} weight="bold" /> Send
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(user?.email || "");
              toast.success("Email copied — share to receive money");
            }}
            className="h-12 md:h-14 rounded-xl text-xs md:text-base font-medium bg-black/10 text-black flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
            data-testid="wallet-request-button"
          >
            <ArrowDownLeft size={18} weight="bold" /> Request
          </button>
        </div>
      </div>

      <div>
        <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase mb-3">Recent activity</p>
        <div className="space-y-2" data-testid="transactions-list">
          {txs.length === 0 && (
            <div className="rounded-xl p-6 text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              No transactions yet. Tap <span className="font-medium text-black dark:text-white">Top up</span> to add funds, then send to a friend.
            </div>
          )}
          {txs.map((tx) => {
            const isOutgoing = tx.from_id === user?.id;
            const other = isOutgoing ? tx.to_name : tx.from_name;
            return (
              <div
                key={tx.id}
                className="rounded-xl p-4 flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isOutgoing ? "bg-black dark:bg-neutral-700" : "bg-green-600"
                    }`}
                  >
                    {isOutgoing ? (
                      <ArrowUpRight size={16} weight="bold" className="text-white" />
                    ) : (
                      <ArrowDownLeft size={16} weight="bold" className="text-black" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-black dark:text-white">
                      {isOutgoing ? "To" : "From"} {other}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(tx.created_at).toLocaleString()}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </p>
                  </div>
                </div>
                <p className={`text-base font-medium ${isOutgoing ? "text-black dark:text-white" : "text-green-600 dark:text-green-500"}`}>
                  {isOutgoing ? "-" : "+"}${tx.amount.toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {showTopUp && packages && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowTopUp(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] overflow-y-auto"
            data-testid="topup-modal"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium text-black dark:text-white">Top up wallet</h2>
              <button type="button" onClick={() => setShowTopUp(false)} data-testid="close-topup-modal" className="text-neutral-500">
                <X size={20} weight="bold" />
              </button>
            </div>
            <p className="text-sm text-neutral-500">
              Add funds via Stripe.{" "}
              {packages.deposit_fee_percent > 0 && (
                <>A <span className="font-medium text-black dark:text-white">{packages.deposit_fee_percent}%</span> processing fee applies.</>
              )}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {packages.packages.map((p) => (
                <button
                  key={p.amount}
                  onClick={() => startTopUp(p.amount)}
                  disabled={busy}
                  data-testid={`topup-package-${p.amount}`}
                  className="rounded-xl p-4 text-left bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-green-600 transition-colors"
                >
                  <span className="text-2xl font-medium text-black dark:text-white block">${p.amount.toFixed(0)}</span>
                  <span className="text-xs text-neutral-500 font-medium mt-1 block">
                    +${p.credited.toFixed(2)} credit · ${p.fee.toFixed(2)} fee
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 text-center">
              Powered by Stripe. Test card: <span className="font-medium">4242 4242 4242 4242</span> · any future date · any CVC
            </p>
          </div>
        </div>
      )}

      {showSend && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowSend(false)}>
          <form
            onSubmit={sendMoney}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4"
            data-testid="send-money-modal"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium text-black dark:text-white">Send money</h2>
              <button type="button" onClick={() => setShowSend(false)} data-testid="close-send-modal" className="text-neutral-500">
                <X size={20} weight="bold" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Recipient email</label>
              <input
                type="email"
                required
                className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="friend@superapp.com"
                data-testid="send-recipient-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className="w-full mt-2 h-14 rounded-lg px-3 text-2xl font-medium bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="send-amount-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Note (optional)</label>
              <input
                className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="For pizza"
                data-testid="send-note-input"
              />
            </div>
            <button
              disabled={busy}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
              data-testid="send-confirm-button"
            >
              {busy ? "Sending…" : "Confirm"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}