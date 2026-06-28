import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import { Plus, X, MagnifyingGlass, UploadSimple, Image } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Marketplace() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "goods",
    image_url: "",      // kept for backward compat — stores first image
    images: [],         // array of up to 5 base64 strings
  });
  const [previews, setPreviews] = useState([]);   // base64 previews for the upload UI
  const [busy, setBusy] = useState(false);

  const load = async (cat = filter, query = q) => {
    const params = {};
    if (cat !== "all") params.category = cat;
    if (query) params.q = query;
    const { data } = await api.get("/marketplace/listings", { params });
    setItems(data);
  };

  useEffect(() => {
    api
      .get("/marketplace/listings")
      .then(({ data }) => setItems(data))
      .catch(() => {});
  }, []);

  const handlePictureUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // How many slots are still available?
    const slotsLeft = 5 - previews.length;
    const toProcess = files.slice(0, slotsLeft);

    if (files.length > slotsLeft) {
      toast.error(`You can only upload up to 5 pictures. Added ${toProcess.length}.`);
    }

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        setPreviews((prev) => {
          const updated = [...prev, dataUrl];
          setForm((f) => ({
            ...f,
            images: updated,
            image_url: updated[0] ?? "",
          }));
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input so re-selecting same file works
    e.target.value = "";
  };

  const removePreview = (index) => {
    setPreviews((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      setForm((f) => ({
        ...f,
        images: updated,
        image_url: updated[0] ?? "",
      }));
      return updated;
    });
  };

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
      setPreviews([]);
      setForm({
        title: "",
        description: "",
        price: "",
        category: "goods",
        image_url: "",
        images: [],
      });
      await load();
    } catch {
      toast.error("Could not create listing");
    } finally {
      setBusy(false);
    }
  };

  const search = (e) => {
    e.preventDefault();
    load(filter, q);
  };

  // Helper: get images array from a listing (handles old single-image listings)
  const getImages = (item) => {
    if (Array.isArray(item.images) && item.images.length > 0) return item.images;
    if (item.image_url) return [item.image_url];
    return [];
  };

  return (
    <div className="space-y-6" data-testid="marketplace-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="overline text-neutral-500">SHOP & SELL</p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">
            Marketplace.
          </h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="nb-btn text-white"
          style={{ backgroundColor: ACCENTS.marketplace }}
          data-testid="new-listing-button"
        >
          <Plus size={18} weight="bold" /> New Listing
        </button>
      </div>

      {/* Search */}
      <form onSubmit={search} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            className="nb-input pl-11"
            placeholder="Search listings…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="market-search-input"
          />
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-4 top-1/2 -translate-y-1/2"
          />
        </div>
        <button className="nb-btn bg-black text-white" data-testid="market-search-button">
          Search
        </button>
      </form>

      {/* Filters */}
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
            style={
              filter === t.key
                ? { backgroundColor: ACCENTS.marketplace, color: "white" }
                : {}
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Listings grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="listings-grid"
      >
        {items.length === 0 && (
          <div className="col-span-full nb-card p-6 text-sm text-neutral-500">
            No listings yet. Be the first to post!
          </div>
        )}

        {items.map((item) => {
          const imgs = getImages(item);
          return (
            <Link
              key={item.id}
              to={`/marketplace/${item.id}`}
              className="nb-card bg-white transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] overflow-hidden"
              data-testid={`listing-${item.id}`}
            >
              {/* Image strip — shown only when there are images */}
              {imgs.length > 0 && (
                <div className="flex h-40 overflow-hidden border-b-2 border-black">
                  {/* Primary image takes more space */}
                  <div
                    className="flex-1 bg-neutral-100"
                    style={{
                      backgroundImage: `url(${imgs[0]})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  {/* Thumbnails for extra images */}
                  {imgs.length > 1 && (
                    <div className="flex flex-col w-16 border-l-2 border-black">
                      {imgs.slice(1, 4).map((src, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-neutral-100 border-b border-black last:border-b-0"
                          style={{
                            backgroundImage: `url(${src})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                      ))}
                      {/* "+N more" badge if there are more than 4 images */}
                      {imgs.length > 4 && (
                        <div className="flex-1 bg-black flex items-center justify-center border-b border-black last:border-b-0">
                          <span className="text-white text-xs font-black">
                            +{imgs.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Card body */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-black text-lg line-clamp-1">{item.title}</p>
                    <p className="text-xs text-neutral-500 line-clamp-1">
                      by {item.seller_name}
                    </p>
                  </div>
                  <span className="nb-pill bg-white text-xs">${item.price}</span>
                </div>

                <p className="text-sm text-neutral-600 line-clamp-2 mt-3">
                  {item.description}
                </p>

                <div className="flex items-center justify-between mt-4">
                  <span
                    className="nb-pill text-xs"
                    style={{
                      backgroundColor:
                        item.category === "goods"
                          ? ACCENTS.marketplace
                          : ACCENTS.community,
                      color: "white",
                    }}
                  >
                    {item.category}
                  </span>

                  {imgs.length > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-neutral-400">
                      <Image size={13} weight="bold" />
                      {imgs.length}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="nb-card p-6 w-full max-w-md bg-white space-y-4 max-h-[90vh] overflow-y-auto"
            data-testid="new-listing-modal"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">New listing</h2>
              <button type="button" onClick={() => setShowCreate(false)}>
                <X size={22} weight="bold" />
              </button>
            </div>

            <div>
              <label className="overline">Title</label>
              <input
                required
                className="nb-input mt-2"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                data-testid="listing-title-input"
              />
            </div>

            <div>
              <label className="overline">Description</label>
              <textarea
                required
                rows={3}
                className="nb-textarea mt-2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid="listing-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="overline">Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="nb-input mt-2 mono"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  data-testid="listing-price-input"
                />
              </div>
              <div>
                <label className="overline">Category</label>
                <select
                  className="nb-input mt-2"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  data-testid="listing-category-select"
                >
                  <option value="goods">Goods</option>
                  <option value="services">Services</option>
                </select>
              </div>
            </div>

            {/* Multi-image upload */}
            <div>
              <div className="flex items-center justify-between">
                <label className="overline">Pictures</label>
                <span className="text-xs text-neutral-400">{previews.length} / 5</span>
              </div>

              {/* Preview grid */}
              {previews.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {previews.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square nb-card overflow-hidden"
                    >
                      <img
                        src={src}
                        alt={`Preview ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePreview(i)}
                        className="absolute top-0.5 right-0.5 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center"
                        aria-label="Remove image"
                      >
                        <X size={9} weight="bold" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 text-center text-white text-[8px] font-black bg-black/60 py-0.5">
                          MAIN
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button — hidden when at limit */}
              {previews.length < 5 && (
                <label
                  className="nb-btn w-full mt-2 h-12 bg-white cursor-pointer"
                  data-testid="listing-upload-picture-button"
                >
                  <UploadSimple size={18} weight="bold" />
                  {previews.length === 0 ? "Upload Pictures" : "Add More"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePictureUpload}
                    data-testid="listing-picture-input"
                  />
                </label>
              )}

              <p className="text-xs text-neutral-400 mt-1">
                Up to 5 pictures. First image is the cover.
              </p>
            </div>

            <button
              disabled={busy}
              className="nb-btn w-full h-12 text-white"
              style={{ backgroundColor: ACCENTS.marketplace }}
              data-testid="listing-submit-button"
            >
              {busy ? "Posting…" : "Post Listing"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
