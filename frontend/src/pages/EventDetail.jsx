import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import { ArrowLeft, CalendarStar, MapPin, Ticket } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/events/${id}`).then(({ data }) => setEvent(data)).catch(() => {
      toast.error("Could not load event");
      navigate("/events");
    });
  }, [id]);

  if (!event) return <div className="p-6 text-sm text-neutral-500">Loading…</div>;

  const remaining = Number(event.total_tickets || 0) - Number(event.tickets_sold || 0);

  const buyTicket = async () => {
    setBusy(true);
    try {
      await api.post(`/events/${id}/buy-ticket`);
      toast.success("Ticket purchased!");
      const { data } = await api.get(`/events/${id}`);
      setEvent(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Purchase failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/events")} className="nb-btn bg-white">
        <ArrowLeft size={18} weight="bold" /> Back to Events
      </button>

      {event.image_url && (
        <div className="nb-card overflow-hidden h-64 border-2 border-black">
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="nb-card p-6 space-y-4 bg-white">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl font-black tracking-tighter">{event.title}</h1>
          <span className="nb-pill bg-black text-white text-lg">${event.price}</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <span className="nb-pill text-sm text-white" style={{ backgroundColor: ACCENTS.calling }}>
            <CalendarStar size={14} weight="bold" />
            {new Date(event.date_time).toLocaleString()}
          </span>
          <span className="nb-pill text-sm bg-white">
            <MapPin size={14} weight="bold" />
            {event.venue}, {event.city}
          </span>
          <span className="nb-pill text-sm bg-white">
            <Ticket size={14} weight="bold" />
            {remaining} tickets left
          </span>
        </div>

        <p className="text-sm text-neutral-700 leading-relaxed">{event.description}</p>

        <button
          onClick={buyTicket}
          disabled={busy || remaining === 0}
          className="nb-btn w-full h-12 text-white"
          style={{ backgroundColor: remaining === 0 ? "#aaa" : ACCENTS.calling }}
        >
          {remaining === 0 ? "Sold Out" : busy ? "Processing…" : "Buy Ticket"}
        </button>
      </div>
    </div>
  );
}