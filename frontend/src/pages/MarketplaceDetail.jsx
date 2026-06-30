import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { ArrowLeft, Trash, EnvelopeSimple } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function MarketplaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);

  useEffect(() => {
    api.get(`/marketplace/listings/${id}`).then(({ data }) => setItem(data)).catch(() => navigate("/marketplace"));
  }, [id, navigate]);

  if (!item) return <p className="text-sm text-neutral-500">Loading…</p>;

  const handleDelete = async () => {
    if (!confirm("Delete this listing?")) return;
    try {
      await api.delete(`/marketplace/listings/${id}`);
      toast.success("Listing deleted");
      navigate("/marketplace");
    } catch {
      toast.error("Could not delete");
    }
  };

  const contactSeller = async () => {
    if (!user) return;
    try {
      await api.post("/wallet/send", { recipient_email: item.seller_email, amount: 0.01, note: `Interested in: ${item.title}` });
      toast.success("Tiny ping sent! Seller will see your message.");
    } catch (err) {
      toast.error("Could not send message");
    }
  };

  return (
    <div className="space-y-5" data-testid="listing-detail-page">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        data-testid="back-to-market"
      >
        <ArrowLeft size={16} weight="bold" /> Back
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <div className="aspect-square bg-neutral-200 dark:bg-neutral-800">
            {item.image_url ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" /> : null}
          </div>
        </div>
        <div className="space-y-4">
          <span className="inline-block rounded-full px-3 py-1 text-xs font-medium bg-green-600 text-black">
            {item.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-black dark:text-white">{item.title}</h1>
          <p className="text-3xl font-medium text-black dark:text-white">${item.price}</p>
          <p className="text-sm text-neutral-500 whitespace-pre-wrap">{item.description}</p>
          <div className="rounded-xl p-4 flex items-center gap-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="w-11 h-11 rounded-full bg-green-600 flex items-center justify-center font-medium text-black">
              {item.seller_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-black dark:text-white">{item.seller_name}</p>
              <p className="text-xs text-neutral-500">{item.seller_email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {item.seller_id !== user?.id ? (
              <button
                onClick={contactSeller}
                className="flex-1 h-12 rounded-xl bg-green-600 text-black font-medium flex items-center justify-center gap-2"
                data-testid="contact-seller-button"
              >
                <EnvelopeSimple size={18} weight="bold" /> Contact seller
              </button>
            ) : (
              <button
                onClick={handleDelete}
                className="flex-1 h-12 rounded-xl bg-red-600 text-white font-medium flex items-center justify-center gap-2"
                data-testid="delete-listing-button"
              >
                <Trash size={18} weight="bold" /> Delete listing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}