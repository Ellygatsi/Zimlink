import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import { ArrowLeft, FloppyDisk, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [feePct, setFeePct] = useState("3");
  const [minTopUp, setMinTopUp] = useState("5");
  const [maxTopUp, setMaxTopUp] = useState("500");
  const [packages, setPackages] = useState([]);
  const [newPkg, setNewPkg] = useState("");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/admin/settings"),
      api.get("/admin/topup-stats?days=30"),
    ]).then(([s, st]) => {
      setSettings(s.data);
      setFeePct(String(s.data.deposit_fee_percent));
      setMinTopUp(String(s.data.min_topup));
      setMaxTopUp(String(s.data.max_topup));
      setPackages(s.data.topup_packages);
      setStats(st.data);
    }).catch(() => {});
  }, []);

  const save = async () => {
    try {
      const { data } = await api.put("/admin/settings", {
        deposit_fee_percent: parseFloat(feePct),
        min_topup: parseFloat(minTopUp),
        max_topup: parseFloat(maxTopUp),
        topup_packages: packages.map((p) => parseFloat(p)),
      });
      setSettings(data);
      setPackages(data.topup_packages);
      toast.success("Settings saved");
    } catch (err) {
      toast.error("Save failed");
    }
  };

  const addPackage = () => {
    const v = parseFloat(newPkg);
    if (!v || v <= 0) { toast.error("Enter a valid amount"); return; }
    if (packages.includes(v)) { toast.error("Package already exists"); return; }
    setPackages([...packages, v].sort((a, b) => a - b));
    setNewPkg("");
  };

  const removePackage = (val) => {
    setPackages(packages.filter((p) => p !== val));
  };

  if (!settings) return <p className="overline">Loading…</p>;

  const s = stats?.summary || { count: 0, gross: 0, fees: 0, credited: 0 };

  return (
    <div className="space-y-6" data-testid="admin-settings-page">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-bold" data-testid="back-to-admin">
          <ArrowLeft size={16} weight="bold" /> Back to Dashboard
        </Link>
        <p className="overline text-neutral-500 mt-3">REVENUE LEVERS</p>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Settings.</h1>
        <p className="text-sm text-neutral-700 mt-2 max-w-2xl">
          Control deposit fees and top-up packages. Changes apply immediately to new top-ups.
        </p>
      </div>

      {/* Top-up Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="nb-card p-4 backdrop-blur-sm" style={{ backgroundColor: ACCENTS.wallet }}>
          <p className="overline">GROSS · 30D</p>
          <p className="text-2xl md:text-3xl font-black mono mt-1">${s.gross.toFixed(2)}</p>
        </div>
        <div className="nb-card p-4 backdrop-blur-sm bg-white/95">
          <p className="overline">FEE REVENUE</p>
          <p className="text-2xl md:text-3xl font-black mono mt-1 text-[#009639]">${s.fees.toFixed(2)}</p>
        </div>
        <div className="nb-card p-4 backdrop-blur-sm bg-white/95">
          <p className="overline">CREDITED</p>
          <p className="text-2xl md:text-3xl font-black mono mt-1">${s.credited.toFixed(2)}</p>
        </div>
        <div className="nb-card p-4 backdrop-blur-sm bg-white/95">
          <p className="overline">PAID TOPUPS</p>
          <p className="text-2xl md:text-3xl font-black mono mt-1">{s.count}</p>
        </div>
      </div>

      {/* Deposit fee config */}
      <div className="nb-card p-6 bg-white/95 backdrop-blur-sm space-y-4">
        <h2 className="text-2xl font-black">Deposit fee</h2>
        <p className="text-sm text-neutral-600">
          Charged on every Stripe top-up. User pays the full package amount; this % is kept by the platform.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="overline">Fee %</label>
            <input
              type="number" step="0.1" min="0" max="100"
              className="nb-input mt-2 mono"
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
              data-testid="fee-percent-input"
            />
          </div>
          <div>
            <label className="overline">Min top-up ($)</label>
            <input
              type="number" step="1" min="1"
              className="nb-input mt-2 mono"
              value={minTopUp}
              onChange={(e) => setMinTopUp(e.target.value)}
              data-testid="min-topup-input"
            />
          </div>
          <div>
            <label className="overline">Max top-up ($)</label>
            <input
              type="number" step="1" min="1"
              className="nb-input mt-2 mono"
              value={maxTopUp}
              onChange={(e) => setMaxTopUp(e.target.value)}
              data-testid="max-topup-input"
            />
          </div>
        </div>
      </div>

      {/* Packages */}
      <div className="nb-card p-6 bg-white/95 backdrop-blur-sm space-y-4">
        <h2 className="text-2xl font-black">Top-up packages</h2>
        <p className="text-sm text-neutral-600">
          Fixed amounts users can choose from. Frontend never sets the price — only these values are accepted by the API.
        </p>
        <div className="flex flex-wrap gap-2" data-testid="packages-list">
          {packages.map((p) => (
            <div key={p} className="nb-pill bg-[#FFCD00] flex items-center gap-2">
              ${p.toFixed(2)}
              <button onClick={() => removePackage(p)} aria-label="remove" data-testid={`remove-package-${p}`}>
                <Trash size={12} weight="bold" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number" step="1" min="1"
            className="nb-input mono w-32"
            placeholder="50"
            value={newPkg}
            onChange={(e) => setNewPkg(e.target.value)}
            data-testid="new-package-input"
          />
          <button onClick={addPackage} className="nb-btn bg-white" data-testid="add-package-button">
            <Plus size={16} weight="bold" /> Add package
          </button>
        </div>
      </div>

      <button onClick={save} className="nb-btn h-14 px-6 bg-[#009639] text-white text-base" data-testid="save-settings-button">
        <FloppyDisk size={18} weight="bold" /> Save settings
      </button>

      {/* Recent top-ups table */}
      <div className="nb-card p-6 bg-white/95 backdrop-blur-sm">
        <p className="overline mb-4">RECENT TOP-UPS</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="topups-table">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="pb-2 overline">When</th>
                <th className="pb-2 overline">User</th>
                <th className="pb-2 overline text-right">Gross</th>
                <th className="pb-2 overline text-right">Fee</th>
                <th className="pb-2 overline text-right">Credited</th>
                <th className="pb-2 overline text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recent || []).length === 0 && (
                <tr><td colSpan={6} className="py-4 text-neutral-500 text-center">No top-ups yet.</td></tr>
              )}
              {(stats?.recent || []).map((t) => (
                <tr key={t.id} className="border-b border-neutral-200">
                  <td className="py-2 mono text-xs whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="py-2">{t.user_email}</td>
                  <td className="py-2 mono text-right">${t.package_amount.toFixed(2)}</td>
                  <td className="py-2 mono text-right text-[#009639]">${t.fee_amount.toFixed(2)}</td>
                  <td className="py-2 mono text-right">${t.credited_amount.toFixed(2)}</td>
                  <td className="py-2 text-right">
                    <span className={`nb-pill text-[9px] ${
                      t.payment_status === "paid" ? "bg-[#009639] text-white" :
                      t.status === "expired" ? "bg-[#DE2010] text-white" :
                      "bg-[#FFCD00]"
                    }`}>{t.payment_status === "paid" ? "paid" : t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
