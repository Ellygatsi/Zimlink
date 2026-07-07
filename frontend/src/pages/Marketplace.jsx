import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
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
    image_url: "",
    images: [],
  });
  const [previews, setPreviews] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (cat = filter, query = q) => {
    try {
      const params = {};
      if (cat !== "all") params.category = cat;
      if (query) params.q = query;

      const { data } = await api.get("/marketplace/listings", { params });
      setItems(data);
    } catch {
      toast.error("Could not load listings");
    }
  }, [filter, q]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePictureUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

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

      toast.success("Listing submitted for admin approval");
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
    } catch (err) {
      toast.error(
        err?.response?.data?.detail ||
          "Could not create listing. You may need to be verified by admin first."
      );
    } finally {
      setBusy(false);
    }
  };

  const search = (e) => {
    e.preventDefault();
    load(filter, q);
  };

  const getImages = (item) => {
    if (Array.isArray(item.images) && item.images.length > 0) return item.images;
    if (item.image_url) return [item.image_url];
    return [];
  };

  return (
    <div className="space-y-5 md:space-y-6" data-testid="marketplace-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">
            Shop & sell
          </p>

          <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-black dark:text-white">
            Marketplace.
          </h1>

          <p className="text-sm text-neutral-500 mt-2">
            Only verified sellers can post. New listings are reviewed before going live.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-full bg-green-600 text-black px-4 py-2 text-sm font-medium w-fit"
          data-testid="new-listing-button"
        >
          <Plus size={16} weight="bold" /> New listing
        </button>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            className="w-full h-11 rounded-lg pl-11 pr-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 outline-none focus:border-green-600 text-black dark:text-white"
            placeholder="Search listings…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="market-search-input"
          />

          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg px-5 bg-black dark:bg-white text-white dark:text-black font-medium"
          data-testid="market-search-button"
        >
          Search
        </button>
      </form>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "goods", label: "Goods" },
          { key: "services", label: "Services" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setFilter(t.key);
              load(t.key, q);
            }}
            data-testid={`market-filter-${t.key}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === t.key
                ? "bg-green-600 text-black"
                : "bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="listings-grid">
        {items.length === 0 && (
          <div className="col-span-full rounded-xl p-6 text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            No approved listings yet.
          </div>
        )}

        {items.map((item) => {
          const imgs = getImages(item);

          return (
            <Link
              key={item.id}
              to={`/marketplace/${item.id}`}
              className="rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-transform hover:-translate-y-1"
              data-testid={`listing-${item.id}`}
            >
              {imgs.length > 0 && (
                <div className="flex h-40 overflow-hidden">
                  <div
                    className="flex-1 bg-neutral-200 dark:bg-neutral-800"
                    style={{
                      backgroundImage: `url(${imgs[0]})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />

                  {imgs.length > 1 && (
                    <div className="flex flex-col w-16">
                      {imgs.slice(1, 4).map((src, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-neutral-200 dark:bg-neutral-800 border-l border-neutral-300 dark:border-neutral-700"
                          style={{
                            backgroundImage: `url(${src})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                      ))}

                      {imgs.length > 4 && (
                        <div className="flex-1 bg-black flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            +{imgs.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-base line-clamp-1 text-black dark:text-white">
                      {item.title}
                    </p>

                    <p className="text-xs text-neutral-500 line-clamp-1">
                      by {item.seller_name}
                    </p>
                  </div>

                  <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white">
                    ${item.price}
                  </span>
                </div>

                <p className="text-sm text-neutral-500 line-clamp-2 mt-3">
                  {item.description}
                </p>

                <div className="flex items-center justify-between mt-4">
                  <span className="rounded-full px-3 py-1 text-xs font-medium bg-green-600 text-black">
                    {item.category}
                  </span>

                  {imgs.length > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-neutral-400">
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

      {showCreate && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] overflow-y-auto"
            data-testid="new-listing-modal"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-medium text-black dark:text-white">
                  New listing
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Your listing will go live after admin approval.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-neutral-500"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                Title
              </label>

              <input
                required
                className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                data-testid="listing-title-input"
              />
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                Description
              </label>

              <textarea
                required
                rows={3}
                className="w-full mt-2 rounded-lg p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid="listing-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                  Price ($)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  data-testid="listing-price-input"
                />
              </div>

              <div>
                <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                  Category
                </label>

                <select
                  className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  data-testid="listing-category-select"
                >
                  <option value="goods">Goods</option>
                  <option value="services">Services</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                  Pictures
                </label>

                <span className="text-xs text-neutral-400">{previews.length} / 5</span>
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {previews.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700"
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
                        <span className="absolute bottom-0 left-0 right-0 text-center text-white text-[8px] font-medium bg-black/60 py-0.5">
                          MAIN
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {previews.length < 5 && (
                <label
                  className="w-full mt-2 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-pointer flex items-center justify-center gap-2 text-sm font-medium text-black dark:text-white"
                  data-testid="listing-upload-picture-button"
                >
                  <UploadSimple size={18} weight="bold" />
                  {previews.length === 0 ? "Upload pictures" : "Add more"}

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

              <p className="text-xs text-neutral-500 mt-1">
                Up to 5 pictures. First image is the cover.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
              data-testid="listing-submit-button"
            >
              {busy ? "Submitting…" : "Submit for approval"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
