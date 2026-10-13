import { useCallback, useEffect, useMemo, useState } from "react";
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
  GlobeHemisphereWest,
  PencilSimple,
  X,
  Bed,
  Bathtub,
  House,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ListingFields from "@/components/ListingFields";
import {
  buildPayload,
  formFromItem,
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

export default function MarketplaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadItem = useCallback(async () => {
    try {
      const { data } = await api.get(`/marketplace/listings/${id}`);
      setItem(data);
      setActiveImage(0);
    } catch {
      navigate("/marketplace");
    }
  }, [id, navigate]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const isOwner = Boolean(
    item &&
      user &&
      (String(item.seller_id) === String(user.id) || item.seller_email === user.email)
  );

  const shareUrl = window.location.href;

  const shareText = useMemo(() => {
    if (!item) return "";
    const { amount, per } = getPrice(item);
    const location = formatLocation(item);
    const heading = {
      jobs: "Job opportunity",
      housing: `Property ${getListingTypeLabel(item.listing_type).toLowerCase()}`,
    }[item.category] || "Marketplace listing";

    return [
      `${heading}: ${getDisplayTitle(item)}`,
      per ? `${amount} per ${per}` : amount,
      location && `Location: ${location}`,
      shareUrl,
    ]
      .filter(Boolean)
      .join("\n");
  }, [item, shareUrl]);

  if (!item) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  const title = getDisplayTitle(item);
  const images = getImages(item);
  const { label: categoryLabel, icon: CategoryIcon } = getCategory(item.category);
  const isJob = item.category === "jobs";
  const isHousing = item.category === "housing";
  const price = getPrice(item);
  const noun = isJob ? "job" : "listing";

  const housingFacts = isHousing
    ? [
        { icon: Bed, text: formatBedrooms(item.bedrooms, true) },
        { icon: Bathtub, text: formatBathrooms(item.bathrooms, true) },
        { icon: House, text: getPropertyLabel(item.property_type) },
      ].filter((f) => f.text)
    : [];

  /* ----------------------------- edit ----------------------------- */

  const openEditModal = () => {
    setEditForm(formFromItem(item));
    setShowEditModal(true);
  };

  const setEditField = (field, value) =>
    setEditForm((current) => ({ ...current, [field]: value }));

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    const error = validateListing(editForm);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/marketplace/listings/${id}`, buildPayload(editForm));
      toast.success(isJob ? "Job updated" : "Listing updated");
      setShowEditModal(false);
      await loadItem();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update this post.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete this ${noun}?`)) return;
    try {
      await api.delete(`/marketplace/listings/${id}`);
      toast.success(isJob ? "Job deleted" : "Listing deleted");
      navigate("/marketplace");
    } catch {
      toast.error("Could not delete");
    }
  };

  /* --------------------------- contact ---------------------------- */

  const contactPoster = async () => {
    if (!user) {
      toast.error("Please sign in to contact the poster.");
      return;
    }
    try {
      await api.post("/wallet/send", {
        recipient_email: item.seller_email,
        amount: 0.01,
        note: `Interested in: ${title}`,
      });
      toast.success("The poster has been notified.");
    } catch {
      toast.error("Could not send message");
    }
  };

  /* ---------------------------- share ----------------------------- */

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
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
    window.location.href = `mailto:?subject=${encodeURIComponent(
      title
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

  const shareItemClass =
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white";

  /* ---------------------------- render ---------------------------- */

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
                <button type="button" onClick={shareToWhatsApp} className={shareItemClass}>
                  <WhatsappLogo size={20} weight="fill" /> Share on WhatsApp
                </button>
                <button type="button" onClick={shareByEmail} className={shareItemClass}>
                  <EnvelopeSimple size={20} weight="bold" /> Share by email
                </button>
                <button type="button" onClick={copyLink} className={shareItemClass}>
                  <Copy size={20} weight="bold" /> Copy link
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gallery */}
        <div className="space-y-2">
          {images.length > 0 ? (
            <>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                <img
                  src={images[activeImage] ?? images[0]}
                  alt={title}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <span className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-medium bg-black/70 text-white">
                    {activeImage + 1} / {images.length}
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {images.map((src, index) => (
                    <button
                      key={`${index}-${src.slice(-16)}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`aspect-square rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 ${
                        index === activeImage ? "ring-2 ring-green-600" : "opacity-80 hover:opacity-100"
                      }`}
                      aria-label={`Show picture ${index + 1}`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-[4/3] rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
              <CategoryIcon size={76} weight="duotone" className="text-green-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-green-600 text-black">
              <CategoryIcon size={13} weight="bold" />
              {categoryLabel}
            </span>
            {isHousing && (
              <span className="rounded-full px-3 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white">
                {getListingTypeLabel(item.listing_type)}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-black dark:text-white">
            {title}
          </h1>

          <p className="text-3xl font-medium text-black dark:text-white">
            {price.amount}{" "}
            {price.per && (
              <span className="text-base font-normal text-neutral-500">per {price.per}</span>
            )}
          </p>

          {housingFacts.length > 0 && (
            <div
              className="grid rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 divide-x divide-neutral-200 dark:divide-neutral-800 text-center"
              style={{ gridTemplateColumns: `repeat(${housingFacts.length}, minmax(0, 1fr))` }}
            >
              {housingFacts.map(({ icon: Icon, text }) => (
                <div key={text} className="p-3">
                  <Icon size={20} className="mx-auto text-green-600" />
                  <p className="text-sm font-medium mt-1 text-black dark:text-white">{text}</p>
                </div>
              ))}
            </div>
          )}

          {(item.city || item.country) && (
            <div className="grid grid-cols-2 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 divide-x divide-neutral-200 dark:divide-neutral-800">
              <div className="p-4 flex items-start gap-3 min-w-0">
                <span className="w-9 h-9 rounded-full bg-green-600/15 text-green-600 flex items-center justify-center shrink-0">
                  <MapPin size={18} weight="fill" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-neutral-500">City</p>
                  <p className="text-sm font-medium mt-0.5 text-black dark:text-white break-words">
                    {[item.city, item.state].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-3 min-w-0">
                <span className="w-9 h-9 rounded-full bg-green-600/15 text-green-600 flex items-center justify-center shrink-0">
                  <GlobeHemisphereWest size={18} weight="bold" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-neutral-500">Country</p>
                  <p className="text-sm font-medium mt-0.5 text-black dark:text-white break-words">
                    {item.country || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-neutral-500 whitespace-pre-wrap">{item.description}</p>

          <div className="flex flex-col sm:flex-row gap-2">
            {!isOwner ? (
              <button
                type="button"
                onClick={contactPoster}
                className="flex-1 h-12 rounded-xl bg-green-600 text-black font-medium flex items-center justify-center gap-2"
                data-testid="contact-seller-button"
              >
                <EnvelopeSimple size={18} weight="bold" />
                Contact about this {noun}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="flex-1 h-12 rounded-xl bg-green-600 text-black font-medium flex items-center justify-center gap-2"
                  data-testid="edit-listing-button"
                >
                  <PencilSimple size={18} weight="bold" />
                  Edit {noun}
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

      {/* Edit modal */}
      {showEditModal && editForm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <form
            onSubmit={handleEditSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-5"
            data-testid="edit-listing-modal"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium text-black dark:text-white inline-flex items-center gap-2">
                <CategoryIcon size={20} className="text-green-600" />
                Edit {noun}
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-neutral-500"
                aria-label="Close edit form"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <ListingFields form={editForm} setField={setEditField} />

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
