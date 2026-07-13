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
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function MarketplaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .get(`/marketplace/listings/${id}`)
      .then(({ data }) => {
        if (active) setItem(data);
      })
      .catch(() => navigate("/marketplace"));

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const isJob = item?.category === "jobs";

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
                  ${item.rate ?? item.price} per {formatRatePeriod(item.rate_period)}
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
            {item.seller_id !== user?.id ? (
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
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 h-12 rounded-xl bg-red-600 text-white font-medium flex items-center justify-center gap-2"
                data-testid="delete-listing-button"
              >
                <Trash size={18} weight="bold" />
                {isJob ? "Delete job" : "Delete listing"}
              </button>
            )}

            <button
              type="button"
              onClick={handleNativeShare}
              className="sm:w-auto h-12 rounded-xl px-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white font-medium flex items-center justify-center gap-2"
            >
              <ShareNetwork size={18} weight="bold" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
