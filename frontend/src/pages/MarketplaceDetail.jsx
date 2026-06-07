import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
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
      <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm font-bold" data-testid="back-to-market">
        <ArrowLeft size={16} weight="bold" /> Back
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="nb-card overflow-hidden">
          <div className="aspect-square bg-neutral-100">
            {item.image_url ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" /> : null}
          </div>
        </div>
        <div className="space-y-4">
          <span className="nb-pill" style={{ backgroundColor: item.category === "goods" ? ACCENTS.marketplace : ACCENTS.community }}>
            {item.category}
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">{item.title}</h1>
          <p className="text-4xl font-black mono">${item.price}</p>
          <p className="text-base text-neutral-700 whitespace-pre-wrap">{item.description}</p>
          <div className="nb-card p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-black bg-[#FFC900] flex items-center justify-center font-black">
              {item.seller_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">{item.seller_name}</p>
              <p className="text-xs text-neutral-500">{item.seller_email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {item.seller_id !== user?.id ? (
              <button onClick={contactSeller} className="nb-btn flex-1 text-black h-12" style={{ backgroundColor: ACCENTS.marketplace }} data-testid="contact-seller-button">
                <EnvelopeSimple size={18} weight="bold" /> Contact seller
              </button>
            ) : (
              <button onClick={handleDelete} className="nb-btn flex-1 text-white h-12" style={{ backgroundColor: ACCENTS.alert }} data-testid="delete-listing-button">
                <Trash size={18} weight="bold" /> Delete listing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
