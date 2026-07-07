import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { X, Plus, CheckCircle, Clock } from "@phosphor-icons/react";
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
  const [showTopUp, setShowTopUp] = useState(false);
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
    ])
      .then(([b, t, p]) => {
        setBalance(b.data.balance);
        setTxs(t.data);
        setPackages(p.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let stopped = false;
    const attemptsRef = { current: 0 };

    const tick = () => {
      if (stopped) return;

      attemptsRef.current += 1;

      api
        .get(`/wallet/topup/status/${sessionId}`)
        .then(({ data }) => {
          if (stopped) return;

          if (
            data.payment_status === "paid" ||
            data.payment_status === "succeeded" ||
            data.status === "paid" ||
            data.status === "succeeded"
          ) {
            setPollStatus({ state: "success", info: data });
            toast.success(
              `Wallet credited with $${Number(data.credited || 0).toFixed(2)}!`
            );

            reload();
            refresh();

            setTimeout(() => navigate("/wallet", { replace: true }), 4000);
            return;
          }

          if (
            data.status === "expired" ||
            data.status === "cancelled" ||
            data.payment_status === "cancelled"
          ) {
            setPollStatus({ state: "expired", info: data });
            return;
          }

          setPollStatus({ state: "pending", info: data });

          if (attemptsRef.current < 8) {
            setTimeout(tick, 2000);
          } else {
            setPollStatus({ state: "timeout", info: data });
          }
        })
        .catch(() => {
          if (!stopped) {
            setPollStatus({ state: "error", info: null });
          }
        });
    };

    tick();

    return () => {
      stopped = true;
    };
  }, [sessionId, navigate, refresh]);

  useEffect(() => {
    if (cancelled) {
      toast.error("Top-up cancelled.");
      navigate("/wallet", { replace: true });
    }
  }, [cancelled, navigate]);

  const startTopUp = async (pkgAmount) => {
    setBusy(true);

    try {
      const { data } = await api.post("/wallet/topup/checkout", {
        package_amount: pkgAmount,
        origin_url: window.location.origin,
      });

      window.location.assign(data.url);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not start Airwallex checkout");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 md:space-y-6" data-testid="wallet-page">
      <div>
        <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">
          Your wallet
        </p>
        <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-black dark:text-white">
          Wallet.
        </h1>
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
          {pollStatus.state === "success" ? (
            <CheckCircle size={22} weight="bold" />
          ) : (
            <Clock size={22} weight="bold" />
          )}

          <div className="flex-1">
            {pollStatus.state === "pending" && (
              <p className="font-medium text-sm">
                Confirming your payment… give us a sec.
              </p>
            )}

            {pollStatus.state === "success" && (
              <p className="font-medium text-sm">
                Top-up successful! $
                {Number(pollStatus.info?.credited || 0).toFixed(2)} credited
                {pollStatus.info?.fee !== undefined &&
                  ` (fee: $${Number(pollStatus.info?.fee || 0).toFixed(2)})`}
                .
              </p>
            )}

            {pollStatus.state === "expired" && (
              <p className="font-medium text-sm">
                This checkout session expired or was cancelled. Please start a new one.
              </p>
            )}

            {pollStatus.state === "timeout" && (
              <p className="font-medium text-sm">
                Still confirming with Airwallex. Refresh in a minute — your balance will update once payment is confirmed.
              </p>
            )}

            {pollStatus.state === "error" && (
              <p className="font-medium text-sm">
                Could not verify the payment. Contact support if your card was charged.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl p-6 md:p-10 bg-green-600" data-testid="balance-card">
        <p className="text-[10px] md:text-xs font-medium tracking-widest text-black/70 uppercase">
          Current balance
        </p>

        <p
          className="text-5xl md:text-8xl font-medium tracking-tight mt-2 md:mt-3 text-black"
          data-testid="wallet-balance"
        >
          ${balance.toFixed(2)}
        </p>

        <p className="text-xs md:text-sm mt-2 font-medium text-black/70">
          @{user?.email}
        </p>

        <div className="grid grid-cols-1 gap-2 md:gap-3 mt-6 md:mt-8">
          <button
            onClick={() => setShowTopUp(true)}
            className="h-12 md:h-14 rounded-xl text-xs md:text-base font-medium bg-black text-white flex items-center justify-center gap-2"
            data-testid="wallet-topup-button"
          >
            <Plus size={18} weight="bold" /> Top up
          </button>
        </div>

        <p className="text-xs mt-4 text-black/70">
          Sending and requesting money will be available soon.
        </p>
      </div>

      <div>
        <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase mb-3">
          Recent activity
        </p>

        <div className="space-y-2" data-testid="transactions-list">
          {txs.length === 0 && (
            <div className="rounded-xl p-6 text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              No transactions yet. Tap{" "}
              <span className="font-medium text-black dark:text-white">
                Top up
              </span>{" "}
              to add funds.
            </div>
          )}

          {txs.map((tx) => (
            <div
              key={tx.id}
              className="rounded-xl p-4 flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium text-sm text-black dark:text-white">
                  Wallet top-up
                </p>
                <p className="text-xs text-neutral-500">
                  {new Date(tx.created_at).toLocaleString()}
                  {tx.note ? ` · ${tx.note}` : ""}
                </p>
              </div>

              <p className="text-base font-medium text-green-600 dark:text-green-500">
                +${Number(tx.amount || 0).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {showTopUp && packages && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowTopUp(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] overflow-y-auto"
            data-testid="topup-modal"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium text-black dark:text-white">
                Top up wallet
              </h2>

              <button
                type="button"
                onClick={() => setShowTopUp(false)}
                data-testid="close-topup-modal"
                className="text-neutral-500"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <p className="text-sm text-neutral-500">
              Add funds securely via Airwallex.{" "}
              {packages.deposit_fee_percent > 0 && (
                <>
                  A{" "}
                  <span className="font-medium text-black dark:text-white">
                    {packages.deposit_fee_percent}%
                  </span>{" "}
                  processing fee applies.
                </>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {packages.packages.map((p) => (
                <button
                  key={p.amount}
                  onClick={() => startTopUp(p.amount)}
                  disabled={busy}
                  data-testid={`topup-package-${p.amount}`}
                  className="rounded-xl p-4 text-left bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-green-600 transition-colors disabled:opacity-50"
                >
                  <span className="text-2xl font-medium text-black dark:text-white block">
                    ${p.amount.toFixed(0)}
                  </span>

                  <span className="text-xs text-neutral-500 font-medium mt-1 block">
                    +${p.credited.toFixed(2)} credit · ${p.fee.toFixed(2)} fee
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs text-neutral-500 text-center">
              Payments powered by Airwallex.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}