import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { ArrowLeft, CalendarStar, MapPin, Ticket, Minus, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    api.get(`/events/${id}`).then(({ data }) => setEvent(data)).catch(() => {
      toast.error("Could not load event");
      navigate("/events");
    });
  }, [id, navigate]);

  if (!event) return <div className="p-6 text-sm text-neutral-500">Loading…</div>;

  const remaining = Number(event.total_tickets || 0) - Number(event.tickets_sold || 0);
  const totalCost = (event.price * quantity).toFixed(2);

  const buyTicket = async () => {
    setBusy(true);
    try {
      await api.post(`/events/${id}/buy-ticket`, { quantity });
      toast.success(`${quantity} ticket${quantity > 1 ? "s" : ""} purchased! Check your email.`);
      const { data } = await api.get(`/events/${id}`);
      setEvent(data);
      setQuantity(1);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Purchase failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/events")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
      >
        <ArrowLeft size={16} weight="bold" /> Back to events
      </button>

      {event.image_url && (
        <div className="rounded-2xl overflow-hidden h-64 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="rounded-2xl p-6 space-y-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-black dark:text-white">{event.title}</h1>
          <span className="rounded-full px-3 py-1.5 text-base font-medium bg-black dark:bg-white text-white dark:text-black shrink-0">
            ${event.price}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-green-600 text-black">
            <CalendarStar size={14} weight="bold" />
            {new Date(event.date_time).toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white">
            <MapPin size={14} weight="bold" />
            {event.venue}, {event.city}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white">
            <Ticket size={14} weight="bold" />
            {remaining} tickets left
          </span>
        </div>

        <p className="text-sm text-neutral-500 leading-relaxed">{event.description}</p>

        {remaining > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3">
              <span className="text-sm font-medium text-black dark:text-white">Number of tickets</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-black dark:text-white"
                >
                  <Minus size={14} weight="bold" />
                </button>
                <span className="text-lg font-medium text-black dark:text-white w-4 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(remaining, Math.min(10, q + 1))}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-black dark:text-white"
                >
                  <Plus size={14} weight="bold" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-neutral-500">Total</span>
              <span className="text-lg font-medium text-black dark:text-white">${totalCost}</span>
            </div>

            <p className="text-xs text-neutral-500 text-center">
              Tickets will be sent to your email after purchase
            </p>
          </div>
        )}

        <button
          onClick={buyTicket}
          disabled={busy || remaining === 0}
          className={`w-full h-12 rounded-xl font-medium disabled:opacity-50 ${
            remaining === 0
              ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
              : "bg-green-600 text-black"
          }`}
        >
          {remaining === 0
            ? "Sold out"
            : busy
            ? "Processing…"
            : `Buy ${quantity} ticket${quantity > 1 ? "s" : ""} · $${totalCost}`}
        </button>
      </div>
    </div>
  );
}