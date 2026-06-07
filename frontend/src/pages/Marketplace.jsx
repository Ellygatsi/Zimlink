import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import { Plus, X, MagnifyingGlass } from "@phosphor-icons/react";
import { toast } from "sonner";

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1636115305669-9096bffe87fd?w=800&q=80",
  "https://images.unsplash.com/photo-1615655406736-b37c4fabf923?w=800&q=80",
  "https://images.unsplash.com/photo-1515940175183-6798529cb860?w=800&q=80",
  "https://images.unsplash.com/photo-1595303526913-c7037797ebe7?w=800&q=80",
];

export default function Marketplace() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", category: "goods", image_url: SAMPLE_IMAGES[0] });
  const [busy, setBusy] = useState(false);

  const load = async (cat = filter, query = q) => {
    const params = {};
    if (cat !== "all") params.category = cat;
    if (query) params.q = query;
    const { data } = await api.get("/marketplace/listings", { params });
    setItems(data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/marketplace/listings", {
        ...form,
        price: parseFloat(form.price),
      });
      toast.success("Listing created!");
      setShowCreate(false);
      setForm({ title: "", description: "", price: "", category: "goods", image_url: SAMPLE_IMAGES[0] });
      await load();
    } catch (err) {
      toast.error("Could not create listing");
    } finally {
      setBusy(false);
    }
  };

  const search = (e) => {
    e.preventDefault();
    load(filter, q);
  };

  return (
    <div className="space-y-6" data-testid="marketplace-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="overline text-neutral-500">SHOP & SELL</p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Marketplace.</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="nb-btn text-black" style={{ backgroundColor: ACCENTS.marketplace }} data-testid="new-listing-button">
          <Plus size={18} weight="bold" /> New Listing
        </button>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <div className="flex-1 relative">
          <input className="nb-input pl-11" placeholder="Search listings…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="market-search-input" />
          <MagnifyingGlass size={18} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2" />
        </div>
        <button className="nb-btn bg-black text-white" data-testid="market-search-button">Search</button>
      </form>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "goods", label: "Goods" },
          { key: "services", label: "Services" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setFilter(t.key); load(t.key, q); }}
            data-testid={`market-filter-${t.key}`}
            className={`nb-btn text-sm ${filter === t.key ? "" : "bg-white"}`}
            style={filter === t.key ? { backgroundColor: ACCENTS.marketplace, color: "black" } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="listings-grid">
        {items.length === 0 && (
          <div className="col-span-full nb-card p-6 text-sm text-neutral-500">No listings yet. Be the first to post!</div>
        )}
        {items.map((item) => (
          <Link key={item.id} to={`/marketplace/${item.id}`} className="nb-card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]" data-testid={`listing-${item.id}`}>
            <div className="relative aspect-square bg-neutral-100 border-b-2 border-black">
              {item.image_url ? (
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">No image</div>
              )}
              <span className="absolute top-2 right-2 nb-pill bg-white text-xs">${item.price}</span>
              <span className="absolute top-2 left-2 nb-pill text-xs" style={{ backgroundColor: item.category === "goods" ? ACCENTS.marketplace : ACCENTS.community }}>{item.category}</span>
            </div>
            <div className="p-3">
              <p className="font-bold text-sm line-clamp-1">{item.title}</p>
              <p className="text-xs text-neutral-500 line-clamp-1">by {item.seller_name}</p>
            </div>
          </Link>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="nb-card p-6 w-full max-w-md bg-white space-y-4 max-h-[90vh] overflow-y-auto" data-testid="new-listing-modal">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">New listing</h2>
              <button type="button" onClick={() => setShowCreate(false)}><X size={22} weight="bold" /></button>
            </div>
            <div>
              <label className="overline">Title</label>
              <input required className="nb-input mt-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="listing-title-input" />
            </div>
            <div>
              <label className="overline">Description</label>
              <textarea required rows={3} className="nb-textarea mt-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="listing-description-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="overline">Price ($)</label>
                <input type="number" min="0" step="0.01" required className="nb-input mt-2 mono" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="listing-price-input" />
              </div>
              <div>
                <label className="overline">Category</label>
                <select className="nb-input mt-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="listing-category-select">
                  <option value="goods">Goods</option>
                  <option value="services">Services</option>
                </select>
              </div>
            </div>
            <div>
              <label className="overline">Image</label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {SAMPLE_IMAGES.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setForm({ ...form, image_url: url })}
                    className={`aspect-square border-2 border-black rounded-lg overflow-hidden ${form.image_url === url ? "ring-4 ring-[#FF90E8]" : ""}`}
                  >
                    <img src={url} alt="opt" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <button disabled={busy} className="nb-btn w-full h-12 text-black" style={{ backgroundColor: ACCENTS.marketplace }} data-testid="listing-submit-button">
              {busy ? "Posting…" : "Post Listing"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
