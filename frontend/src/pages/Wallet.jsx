import { useEffect, useState } from "react";
import api, { ACCENTS } from "@/lib/api";
import { ArrowUpRight, ArrowDownLeft, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function WalletPage() {
  const { user, refresh } = useAuth();
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState([]);
  const [showSend, setShowSend] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: b }, { data: t }] = await Promise.all([
      api.get("/wallet/balance"),
      api.get("/wallet/transactions"),
    ]);
    setBalance(b.balance);
    setTxs(t);
  };

  useEffect(() => {
    Promise.all([
      api.get("/wallet/balance"),
      api.get("/wallet/transactions"),
    ]).then(([b, t]) => {
      setBalance(b.data.balance);
      setTxs(t.data);
    }).catch(() => {});
  }, []);

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
      await load();
      await refresh();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to send";
      toast.error(typeof msg === "string" ? msg : "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="wallet-page">
      <div>
        <p className="overline text-neutral-500">YOUR WALLET</p>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Money.</h1>
      </div>

      <div className="nb-card p-6 md:p-10" style={{ backgroundColor: ACCENTS.wallet }} data-testid="balance-card">
        <p className="overline">CURRENT BALANCE</p>
        <p className="text-6xl md:text-8xl font-black tracking-tighter mono mt-3" data-testid="wallet-balance">
          ${balance.toFixed(2)}
        </p>
        <p className="text-sm mt-2 font-medium">@{user?.email}</p>
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button
            onClick={() => setShowSend(true)}
            className="nb-btn h-14 text-base bg-black text-white"
            data-testid="wallet-send-button"
          >
            <ArrowUpRight size={20} weight="bold" /> Send
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(user?.email || "");
              toast.success("Your email copied — share to receive money");
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
            <div className="nb-card p-6 text-sm text-neutral-500">No transactions yet. Try sending $10 to <span className="mono font-bold">user@superapp.com</span>.</div>
          )}
          {txs.map((tx) => {
            const isOutgoing = tx.from_id === user?.id;
            const other = isOutgoing ? tx.to_name : tx.from_name;
            return (
              <div key={tx.id} className="nb-card p-4 flex items-center justify-between">
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
              <input className="nb-input mt-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For pizza 🍕" data-testid="send-note-input" />
            </div>
            <button disabled={busy} className="nb-btn w-full h-12 text-white" style={{ backgroundColor: ACCENTS.wallet, color: "black" }} data-testid="send-confirm-button">
              {busy ? "Sending…" : "Confirm"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
