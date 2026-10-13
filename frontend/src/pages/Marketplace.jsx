import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import {
  Plus,
  X,
  MagnifyingGlass,
  UploadSimple,
  Image,
  MapPin,
  Bed,
  Bathtub,
  House,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import ListingFields, { labelClass } from "@/components/ListingFields";
import {
  EMPTY_FORM,
  FILTER_CATEGORIES,
  buildPayload,
  formatBathrooms,
  formatBedrooms,
  formatLocation,
  getCategory,
  getDisplayTitle,
  getImages,
  getListingTypeLabel,
  getPrice,
  getPropertyLabel,
  validateListing,
} from "@/lib/marketplace";

const MAX_PICTURES = 5;
const norm = (s) => (s || "").trim().toLowerCase();

export default function Marketplace() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [listingType, setListingType] = useState("any");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  /* ---------------------------- data ---------------------------- */

  // Category and search go to the server; country/city/rent-or-buy are
  // filtered here so the dropdowns can list every place that has posts.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== "all") params.category = category;
      if (query.trim()) params.q = query.trim();

      const { data } = await api.get("/marketplace/listings", { params });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load listings");
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useEffect(() => {
    load();
  }, [load]);

  const countryOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.country).filter(Boolean));
    if (country) set.add(country);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items, country]);

  const cityOptions = useMemo(() => {
    if (!country) return [];
    const byKey = new Map();
    items
      .filter((i) => i.country === country && i.city)
      .forEach((i) => {
        const key = norm(i.city);
        if (!byKey.has(key)) byKey.set(key, i.city.trim());
      });
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [items, country]);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (country && item.country !== country) return false;
        if (city && norm(item.city) !== norm(city)) return false;
        if (
          category === "housing" &&
          listingType !== "any" &&
          (item.listing_type || "rent") !== listingType
        ) {
          return false;
        }
        return true;
      }),
    [items, country, city, category, listingType]
  );

  /* --------------------------- filters -------------------------- */

  const changeCategory = (key) => {
    setCategory(key);
    if (key !== "housing") setListingType("any");
  };

  const changeCountry = (value) => {
    setCountry(value);
    setCity("");
  };

  const clearFilters = () => {
    setCategory("all");
    setCountry("");
    setCity("");
    setListingType("any");
    setQueryInput("");
    setQuery("");
  };

  const activeChips = [
    category !== "all" && {
      key: "category",
      label: getCategory(category).label,
      onRemove: () => changeCategory("all"),
    },
    country && {
      key: "place",
      label: city ? `${city}, ${country}` : country,
      onRemove: () => changeCountry(""),
    },
    category === "housing" &&
      listingType !== "any" && {
        key: "listingType",
        label: getListingTypeLabel(listingType),
        onRemove: () => setListingType("any"),
      },
    query && {
      key: "q",
      label: `“${query}”`,
      onRemove: () => {
        setQueryInput("");
        setQuery("");
      },
    },
  ].filter(Boolean);

  /* ------------------------- create form ------------------------ */

  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handlePictureUpload = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const slotsLeft = MAX_PICTURES - form.images.length;
    const toProcess = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) {
      toast.error(`You can upload up to ${MAX_PICTURES} pictures. Added ${toProcess.length}.`);
    }

    toProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((current) => {
          if (current.images.length >= MAX_PICTURES) return current;
          const images = [...current.images, reader.result];
          return { ...current, images, image_url: images[0] };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removePicture = (index) =>
    setForm((current) => {
      const images = current.images.filter((_, i) => i !== index);
      return { ...current, images, image_url: images[0] ?? "" };
    });

  const closeCreate = () => {
    setShowCreate(false);
    setForm(EMPTY_FORM);
  };

  const submit = async (e) => {
    e.preventDefault();

    const error = validateListing(form);
    if (error) {
      toast.error(error);
      return;
    }

    setBusy(true);
    try {
      await api.post("/marketplace/listings", {
        ...buildPayload(form),
        images: form.images,
        image_url: form.images[0] ?? "",
      });
      toast.success("Listing posted");
      closeCreate();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not post this listing.");
    } finally {
      setBusy(false);
    }
  };

  const picturesSlot = (
    <div>
      <div className="flex items-center justify-between">
        <label className={labelClass}>Pictures</label>
        <span className="text-xs text-neutral-400">
          {form.images.length} / {MAX_PICTURES}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 mt-2">
        {form.images.map((src, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700"
          >
            <img src={src} alt={`Picture ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePicture(i)}
              className="absolute top-0.5 right-0.5 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center"
              aria-label="Remove picture"
            >
              <X size={10} weight="bold" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-0 inset-x-0 text-center text-white text-[8px] font-medium bg-black/60 py-0.5">
                COVER
              </span>
            )}
          </div>
        ))}

        {form.images.length < MAX_PICTURES && (
          <label
            className="aspect-square rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 cursor-pointer flex flex-col items-center justify-center text-neutral-400 hover:text-green-600 hover:border-green-600 transition-colors"
            data-testid="listing-upload-picture-button"
          >
            {form.images.length === 0 ? <UploadSimple size={18} weight="bold" /> : <Plus size={18} weight="bold" />}
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
      </div>

      <p className="text-xs text-neutral-500 mt-1.5">
        Up to {MAX_PICTURES} pictures. The first one is the cover.
      </p>
    </div>
  );

  /* ---------------------------- render -------------------------- */

  const pillBase = "rounded-full px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5 transition-colors";
  const selectClass =
    "w-full h-11 rounded-lg px-3 text-sm font-medium bg-white dark:bg-neutral-900 border outline-none text-black dark:text-white";

  return (
    <div className="space-y-5" data-testid="marketplace-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">
            Goods, services, jobs & housing
          </p>
          <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-black dark:text-white">
            Marketplace.
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-full bg-green-600 text-black px-4 py-2 text-sm font-medium w-fit"
          data-testid="new-listing-button"
        >
          <Plus size={16} weight="bold" /> New post
        </button>
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(queryInput);
        }}
        className="flex gap-2"
      >
        <div className="flex-1 relative">
          <input
            className="w-full h-11 rounded-lg pl-11 pr-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 outline-none focus:border-green-600 text-black dark:text-white"
            placeholder="Search goods, services, jobs and housing…"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
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

      {/* Filters */}
      <div className="rounded-2xl p-4 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div>
          <p className={`${labelClass} mb-2`}>Category</p>
          <div className="flex gap-2 flex-wrap">
            {FILTER_CATEGORIES.map(({ key, label, icon: Icon }) => {
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeCategory(key)}
                  aria-pressed={active}
                  className={`${pillBase} ${
                    active
                      ? "bg-green-600 text-black"
                      : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white"
                  }`}
                  data-testid={`market-filter-${key}`}
                >
                  <Icon
                    size={15}
                    weight={active ? "bold" : "regular"}
                    className={active ? "" : "text-green-600"}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-3 items-end ${
            category === "housing" ? "lg:grid-cols-3" : ""
          }`}
        >
          <div>
            <p className={`${labelClass} mb-2`}>Country</p>
            <select
              className={`${selectClass} ${
                country ? "border-green-600" : "border-neutral-200 dark:border-neutral-800"
              }`}
              value={country}
              onChange={(e) => changeCountry(e.target.value)}
              data-testid="market-filter-country"
            >
              <option value="">All countries</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className={`${labelClass} mb-2`}>City</p>
            <select
              className={`${selectClass} disabled:opacity-50 ${
                city ? "border-green-600" : "border-neutral-200 dark:border-neutral-800"
              }`}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!country}
              data-testid="market-filter-city"
            >
              <option value="">{country ? "All cities" : "Pick a country first"}</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {category === "housing" && (
            <div className="sm:col-span-2 lg:col-span-1">
              <p className={`${labelClass} mb-2`}>Rent or buy</p>
              <div className="grid grid-cols-3 gap-1 p-1 h-11 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-medium">
                {[
                  { value: "any", label: "Any" },
                  { value: "rent", label: "For rent" },
                  { value: "sale", label: "For sale" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setListingType(opt.value)}
                    className={`rounded-md ${
                      listingType === opt.value
                        ? "bg-green-600 text-black"
                        : "text-neutral-500"
                    }`}
                    data-testid={`market-filter-listing-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Result summary */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-neutral-500">
            {loading ? "Loading…" : `${visibleItems.length} result${visibleItems.length === 1 ? "" : "s"}`}
          </span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-full pl-3 pr-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white"
              aria-label={`Remove filter ${chip.label}`}
            >
              {chip.label}
              <X size={11} weight="bold" className="text-neutral-400" />
            </button>
          ))}
        </div>

        {activeChips.length > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium underline underline-offset-2 text-black dark:text-white shrink-0"
            data-testid="market-clear-filters"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="listings-grid"
      >
        {!loading && visibleItems.length === 0 && (
          <div className="col-span-full rounded-xl p-6 text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            {activeChips.length > 0 ? "No posts match these filters." : "No posts yet."}
          </div>
        )}

        {visibleItems.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>

      {/* New post modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4"
          onClick={closeCreate}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto"
            data-testid="new-listing-modal"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium text-black dark:text-white">New post</h2>
              <button type="button" onClick={closeCreate} className="text-neutral-500" aria-label="Close">
                <X size={20} weight="bold" />
              </button>
            </div>

            <ListingFields
              form={form}
              setField={setField}
              onCategoryChange={(key) => setField("category", key)}
              picturesSlot={picturesSlot}
            />

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
              data-testid="listing-submit-button"
            >
              {busy ? "Posting…" : "Post listing"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ListingCard({ item }) {
  const images = getImages(item);
  const { label: categoryLabel, icon: CategoryIcon } = getCategory(item.category);
  const isHousing = item.category === "housing";
  const price = getPrice(item);
  const location = formatLocation(item);

  const facts = isHousing
    ? [
        { icon: Bed, text: formatBedrooms(item.bedrooms) },
        { icon: Bathtub, text: formatBathrooms(item.bathrooms) },
        { icon: House, text: getPropertyLabel(item.property_type) },
      ].filter((f) => f.text)
    : [];

  return (
    <Link
      to={`/marketplace/${item.id}`}
      className="rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-transform hover:-translate-y-1"
      data-testid={`listing-${item.id}`}
    >
      <div
        className="relative h-48 bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center"
        style={
          images[0]
            ? {
                backgroundImage: `url(${images[0]})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {!images[0] && (
          <CategoryIcon size={54} weight="duotone" className="text-green-600" />
        )}

        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-green-600 text-black">
            <CategoryIcon size={12} weight="bold" />
            {categoryLabel}
          </span>
          {isHousing && (
            <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-white text-black">
              {getListingTypeLabel(item.listing_type)}
            </span>
          )}
        </div>

        {images.length > 1 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-black/70 text-white">
            <Image size={12} weight="bold" />
            {images.length}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium line-clamp-1 text-black dark:text-white">
            {getDisplayTitle(item)}
          </p>
          <span className="text-lg font-semibold shrink-0 text-black dark:text-white">
            {price.amount}
            {price.per && (
              <span className="text-xs font-normal text-neutral-500">/{price.per}</span>
            )}
          </span>
        </div>

        {location && (
          <p className="mt-1.5 flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-1">
            <MapPin size={14} weight="fill" className="text-green-600 shrink-0" />
            {location}
          </p>
        )}

        {facts.length > 0 && (
          <div className="flex items-center gap-4 mt-3 text-sm text-neutral-700 dark:text-neutral-300">
            {facts.map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5">
                <Icon size={16} />
                {text}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm text-neutral-500 line-clamp-2 mt-3">{item.description}</p>
      </div>
    </Link>
  );
}
