import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import {
  ArrowLeft,
  Trash,
  EnvelopeSimple,
  ShareNetwork,
  WhatsappLogo,
  Copy,
  MapPin,
  Briefcase,
  PencilSimple,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const COUNTRIES = [
  "United States",
  "Zimbabwe",
  "South Africa",
  "United Kingdom",
  "Canada",
  "Australia",
  "New Zealand",
  "Botswana",
  "Zambia",
  "Mozambique",
  "Namibia",
  "Malawi",
  "Kenya",
  "Tanzania",
  "Ghana",
  "Nigeria",
  "Uganda",
  "Rwanda",
  "Ireland",
  "Germany",
  "France",
  "Netherlands",
  "United Arab Emirates",
  "Other",
];

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

export default function MarketplaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "goods",
    job_title: "",
    rate: "",
    rate_period: "hourly",
    country: "",
    state: "",
    city: "",
  });

  const loadItem = async () => {
    try {
      const { data } = await api.get(`/marketplace/listings/${id}`);
      setItem(data);
    } catch {
      navigate("/marketplace");
    }
  };

  useEffect(() => {
    loadItem();
  }, [id]);

  const isJob = item?.category === "jobs";
  const isOwner = Boolean(
    item &&
      user &&
      (String(item.seller_id) === String(user.id) ||
        item.seller_email === user.email)
  );

  const displayTitle = useMemo(() => {
    if (!item) return "";
    return isJob ? item.job_title || item.title : item.title;
  }, [isJob, item]);

  const location = useMemo(() => {
    if (!item) return "";
    return [item.city, item.state, item.country].filter(Boolean).join(", ");
  }, [item]);

  const shareUrl = window.location.href;

  const formatRatePeriod = (period) => {
    const labels = {
      hourly: "hour",
      daily: "day",
      weekly: "week",
      biweekly: "2 weeks",
      monthly: "month",
    };

    return labels[period] || period || "period";
  };

  const shareText = useMemo(() => {
    if (!item) return "";

    const priceText = isJob
      ? `$${item.rate ?? item.price} per ${formatRatePeriod(item.rate_period)}`
      : `$${item.price}`;

    const locationText = location ? `\nLocation: ${location}` : "";

    return `${isJob ? "Job opportunity" : "Marketplace listing"}: ${displayTitle}\n${priceText}${locationText}\n${shareUrl}`;
  }, [displayTitle, isJob, item, location, shareUrl]);

  if (!item) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  const openEditModal = () => {
    setEditForm({
      title: item.title || "",
      description: item.description || "",
      price: item.price ?? "",
      category: item.category || "goods",
      job_title: item.job_title || item.title || "",
      rate: item.rate ?? item.price ?? "",
      rate_period: item.rate_period || "hourly",
      country: item.country || "",
      state: item.state || "",
      city: item.city || "",
    });

    setShowEditModal(true);
  };

  const updateEditForm = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const handleCountryChange = (country) => {
    setEditForm((current) => ({
      ...current,
      country,
      state: country === "United States" ? current.state : "",
    }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    const editingJob = editForm.category === "jobs";
    const numericPrice = Number.parseFloat(
      editingJob ? editForm.rate : editForm.price
    );

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      toast.error(editingJob ? "Enter a valid job rate." : "Enter a valid price.");
      return;
    }

    if (editingJob && !editForm.country) {
      toast.error("Select the country where the job is located.");
      return;
    }

    if (
      editingJob &&
      editForm.country === "United States" &&
      !editForm.state
    ) {
      toast.error("Select the U.S. state where the job is located.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: editingJob
          ? editForm.job_title.trim()
          : editForm.title.trim(),
        description: editForm.description.trim(),
        price: numericPrice,
        category: editForm.category,
        job_title: editingJob ? editForm.job_title.trim() : null,
        rate: editingJob ? numericPrice : null,
        rate_period: editingJob ? editForm.rate_period : null,
        country: editingJob ? editForm.country : null,
        state: editingJob ? editForm.state || null : null,
        city: editingJob ? editForm.city.trim() || null : null,
      };

      await api.put(`/marketplace/listings/${id}`, payload);

      toast.success(editingJob ? "Job updated" : "Listing updated");
      setShowEditModal(false);
      await loadItem();
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
          "Could not update this post. Make sure the backend edit route is available."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete this ${isJob ? "job" : "listing"}?`)) return;

    try {
      await api.delete(`/marketplace/listings/${id}`);
      toast.success(isJob ? "Job deleted" : "Listing deleted");
      navigate("/marketplace");
    } catch {
      toast.error("Could not delete");
    }
  };

  const contactSeller = async () => {
    if (!user) {
      toast.error("Please sign in to contact the poster.");
      return;
    }

    try {
      await api.post("/wallet/send", {
        recipient_email: item.seller_email,
        amount: 0.01,
        note: `Interested in: ${displayTitle}`,
      });

      toast.success("The poster has been notified.");
    } catch {
      toast.error("Could not send message");
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: displayTitle,
      text: shareText,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShowShareMenu(false);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    setShowShareMenu((current) => !current);
  };

  const shareToWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setShowShareMenu(false);
  };

  const shareByEmail = () => {
    const subject = isJob
      ? `Job opportunity: ${displayTitle}`
      : `Marketplace listing: ${displayTitle}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(shareText)}`;

    setShowShareMenu(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
      setShowShareMenu(false);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const images =
    Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : item.image_url
      ? [item.image_url]
      : [];

  return (
    <div className="space-y-5" data-testid="listing-detail-page">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          data-testid="back-to-market"
        >
          <ArrowLeft size={16} weight="bold" /> Back
        </Link>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-green-600 text-black text-sm font-medium"
              data-testid="edit-listing-button"
            >
              <PencilSimple size={18} weight="bold" />
              Edit
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-medium text-black dark:text-white"
              data-testid="share-listing-button"
            >
              <ShareNetwork size={18} weight="bold" /> Share
            </button>

            {showShareMenu && (
              <>
                <button
                  type="button"
                  aria-label="Close share menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setShowShareMenu(false)}
                />

                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl">
                  <button
                    type="button"
                    onClick={shareToWhatsApp}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white"
                  >
                    <WhatsappLogo size={20} weight="fill" />
                    Share on WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={shareByEmail}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white"
                  >
                    <EnvelopeSimple size={20} weight="bold" />
                    Share by email
                  </button>

                  <button
                    type="button"
                    onClick={copyLink}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white"
                  >
                    <Copy size={20} weight="bold" />
                    Copy link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          {images.length > 0 ? (
            <div className="space-y-2 p-2">
              <div className="aspect-square overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                <img
                  src={images[0]}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              </div>

              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.slice(1, 5).map((src, index) => (
                    <div
                      key={`${src}-${index}`}
                      className="aspect-square rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800"
                    >
                      <img
                        src={src}
                        alt={`${displayTitle} ${index + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
              {isJob ? (
                <Briefcase size={76} weight="duotone" className="text-green-600" />
              ) : (
                <span className="text-sm text-neutral-500">No image</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <span className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-green-600 text-black capitalize">
            {item.category}
          </span>

          <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-black dark:text-white">
            {displayTitle}
          </h1>

          {isJob ? (
            <div className="rounded-2xl p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500">
                  Rate
                </p>
                <p className="text-2xl font-medium text-black dark:text-white mt-1">
                  ${item.rate ?? item.price} per{" "}
                  {formatRatePeriod(item.rate_period)}
                </p>
              </div>

              {location && (
                <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <MapPin size={18} weight="fill" className="mt-0.5 shrink-0" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-3xl font-medium text-black dark:text-white">
              ${item.price}
            </p>
          )}

          <p className="text-sm text-neutral-500 whitespace-pre-wrap">
            {item.description}
          </p>

          <div className="rounded-xl p-4 flex items-center gap-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="w-11 h-11 rounded-full bg-green-600 flex items-center justify-center font-medium text-black">
              {item.seller_name?.[0]?.toUpperCase() || "U"}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-black dark:text-white">
                {item.seller_name}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {item.seller_email}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {!isOwner ? (
              <button
                type="button"
                onClick={contactSeller}
                className="flex-1 h-12 rounded-xl bg-green-600 text-black font-medium flex items-center justify-center gap-2"
                data-testid="contact-seller-button"
              >
                <EnvelopeSimple size={18} weight="bold" />
                {isJob ? "Contact poster" : "Contact seller"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="flex-1 h-12 rounded-xl bg-green-600 text-black font-medium flex items-center justify-center gap-2"
                >
                  <PencilSimple size={18} weight="bold" />
                  {isJob ? "Edit job" : "Edit listing"}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 h-12 rounded-xl bg-red-600 text-white font-medium flex items-center justify-center gap-2"
                  data-testid="delete-listing-button"
                >
                  <Trash size={18} weight="bold" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <form
            onSubmit={handleEditSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-black dark:text-white">
                  {editForm.category === "jobs" ? "Edit job" : "Edit listing"}
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Save your changes to update this post.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-neutral-500"
                aria-label="Close edit form"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {editForm.category === "jobs" ? (
              <>
                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    Job title
                  </label>
                  <input
                    required
                    value={editForm.job_title}
                    onChange={(event) =>
                      updateEditForm("job_title", event.target.value)
                    }
                    className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                      Rate ($)
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.rate}
                      onChange={(event) =>
                        updateEditForm("rate", event.target.value)
                      }
                      className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                      Rate period
                    </label>
                    <select
                      value={editForm.rate_period}
                      onChange={(event) =>
                        updateEditForm("rate_period", event.target.value)
                      }
                      className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Per month</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    Country
                  </label>
                  <select
                    required
                    value={editForm.country}
                    onChange={(event) =>
                      handleCountryChange(event.target.value)
                    }
                    className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                {editForm.country === "United States" && (
                  <div>
                    <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                      State
                    </label>
                    <select
                      required
                      value={editForm.state}
                      onChange={(event) =>
                        updateEditForm("state", event.target.value)
                      }
                      className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                    >
                      <option value="">Select state</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    City or town
                  </label>
                  <input
                    required
                    value={editForm.city}
                    onChange={(event) =>
                      updateEditForm("city", event.target.value)
                    }
                    className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    Title
                  </label>
                  <input
                    required
                    value={editForm.title}
                    onChange={(event) =>
                      updateEditForm("title", event.target.value)
                    }
                    className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    Price ($)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(event) =>
                      updateEditForm("price", event.target.value)
                    }
                    className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                Description
              </label>
              <textarea
                required
                rows={5}
                value={editForm.description}
                onChange={(event) =>
                  updateEditForm("description", event.target.value)
                }
                className="w-full mt-2 rounded-lg p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
