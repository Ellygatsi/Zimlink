import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import { Plus, Trash, FloppyDisk, ArrowLeft, X } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function AdminRates() {
  const [rates, setRates] = useState([]);
  const [edited, setEdited] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", prefix: "+", rate_per_minute: "0.30", cost_per_minute: "0.15" });

  const fetchRates = () => {
    api.get("/admin/rates").then(({ data }) => {
      setRates(data);
      setEdited({});
    }).catch(() => {});
  };

  useEffect(() => {
    api.get("/admin/rates").then(({ data }) => setRates(data)).catch(() => {});
  }, []);

  const setField = (id, key, val) => {
    setEdited((e) => ({ ...e, [id]: { ...(e[id] || {}), [key]: val } }));
  };

  const save = async (id) => {
    const changes = edited[id];
    if (!changes) return;
    try {
      const body = {};
      if (changes.name !== undefined) body.name = changes.name;
      if (changes.prefix !== undefined) body.prefix = changes.prefix;
      if (changes.rate_per_minute !== undefined) body.rate_per_minute = parseFloat(changes.rate_per_minute);
      if (changes.cost_per_minute !== undefined) body.cost_per_minute = parseFloat(changes.cost_per_minute);
      await api.put(`/admin/rates/${id}`, body);
      toast.success("Rate updated");
      fetchRates();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Update failed");
    }
  };

  const remove = async (rate) => {
    if (rate.prefix === "default") { toast.error("Cannot delete default"); return; }
    if (!confirm(`Delete rate "${rate.name}" (${rate.prefix})?`)) return;
    try {
      await api.delete(`/admin/rates/${rate.id}`);
      toast.success("Deleted");
      fetchRates();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/rates", {
        name: form.name,
        prefix: form.prefix,
        rate_per_minute: parseFloat(form.rate_per_minute),
        cost_per_minute: parseFloat(form.cost_per_minute),
      });
      toast.success("Rate created");
      setShowNew(false);
      setForm({ name: "", prefix: "+", rate_per_minute: "0.30", cost_per_minute: "0.15" });
      fetchRates();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Create failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-rates-page">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-bold" data-testid="back-to-admin">
          <ArrowLeft size={16} weight="bold" /> Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mt-3">
          <div>
            <p className="overline text-neutral-500">CALL PRICING</p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Rates.</h1>
            <p className="text-sm text-neutral-700 mt-2 max-w-2xl">
              Set what you charge per minute, per destination. Longest-prefix wins. Margin = (rate − cost) × minutes.
            </p>
          </div>
          <button onClick={() => setShowNew(true)} className="nb-btn text-white" style={{ backgroundColor: ACCENTS.community }} data-testid="add-rate-button">
            <Plus size={18} weight="bold" /> Add Rate
          </button>
        </div>
      </div>

      <div className="nb-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="rates-table">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-4 py-3 text-left overline">Name</th>
                <th className="px-4 py-3 text-left overline">Prefix</th>
                <th className="px-4 py-3 text-right overline">Charge / min</th>
                <th className="px-4 py-3 text-right overline">Cost / min</th>
                <th className="px-4 py-3 text-right overline">Margin</th>
                <th className="px-4 py-3 text-right overline">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => {
                const rate = parseFloat(edited[r.id]?.rate_per_minute ?? r.rate_per_minute);
                const cost = parseFloat(edited[r.id]?.cost_per_minute ?? r.cost_per_minute);
                const margin = (rate - cost).toFixed(3);
                const dirty = !!edited[r.id];
                return (
                  <tr key={r.id} className="border-b-2 border-black last:border-0">
                    <td className="px-4 py-3">
                      <input
                        className="border-2 border-black rounded-lg px-2 py-1 w-full font-bold text-sm"
                        defaultValue={r.name}
                        onChange={(e) => setField(r.id, "name", e.target.value)}
                        data-testid={`rate-name-${r.id}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        className="border-2 border-black rounded-lg px-2 py-1 w-28 mono text-sm"
                        defaultValue={r.prefix}
                        disabled={r.prefix === "default"}
                        onChange={(e) => setField(r.id, "prefix", e.target.value)}
                        data-testid={`rate-prefix-${r.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number" step="0.01" min="0"
                        className="border-2 border-black rounded-lg px-2 py-1 w-24 mono text-right text-sm"
                        defaultValue={r.rate_per_minute}
                        onChange={(e) => setField(r.id, "rate_per_minute", e.target.value)}
                        data-testid={`rate-rate-${r.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number" step="0.001" min="0"
                        className="border-2 border-black rounded-lg px-2 py-1 w-24 mono text-right text-sm"
                        defaultValue={r.cost_per_minute}
                        onChange={(e) => setField(r.id, "cost_per_minute", e.target.value)}
                        data-testid={`rate-cost-${r.id}`}
                      />
                    </td>
                    <td className={`px-4 py-3 text-right font-black mono ${rate - cost < 0 ? "text-[#DE2010]" : "text-[#009639]"}`}>
                      ${margin}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {dirty && (
                        <button onClick={() => save(r.id)} className="nb-btn text-xs bg-[#009639] text-white mr-1" data-testid={`save-rate-${r.id}`}>
                          <FloppyDisk size={14} weight="bold" /> Save
                        </button>
                      )}
                      {r.prefix !== "default" && (
                        <button onClick={() => remove(r)} className="nb-btn text-xs bg-white" data-testid={`delete-rate-${r.id}`}>
                          <Trash size={14} weight="bold" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={create} className="nb-card p-6 w-full max-w-md bg-white space-y-4" data-testid="new-rate-modal">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">New rate</h2>
              <button type="button" onClick={() => setShowNew(false)}><X size={22} weight="bold" /></button>
            </div>
            <div>
              <label className="overline">Name</label>
              <input required className="nb-input mt-2" placeholder="e.g. Zimbabwe Mobile" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="new-rate-name" />
            </div>
            <div>
              <label className="overline">Prefix (E.164)</label>
              <input required className="nb-input mt-2 mono" placeholder="+2637" value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} data-testid="new-rate-prefix" />
              <p className="text-xs text-neutral-500 mt-1">Longest matching prefix wins. Use <span className="mono">default</span> for fallback.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="overline">Charge / min ($)</label>
                <input type="number" step="0.01" min="0" required className="nb-input mt-2 mono" value={form.rate_per_minute} onChange={(e) => setForm({ ...form, rate_per_minute: e.target.value })} data-testid="new-rate-rate" />
              </div>
              <div>
                <label className="overline">Cost / min ($)</label>
                <input type="number" step="0.001" min="0" required className="nb-input mt-2 mono" value={form.cost_per_minute} onChange={(e) => setForm({ ...form, cost_per_minute: e.target.value })} data-testid="new-rate-cost" />
              </div>
            </div>
            <button className="nb-btn w-full h-12 text-white" style={{ backgroundColor: ACCENTS.community }} data-testid="new-rate-submit">
              Create rate
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
