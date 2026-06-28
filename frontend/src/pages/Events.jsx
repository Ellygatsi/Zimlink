import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import { Plus, X, CalendarStar, UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    date_time: "",
    venue: "",
    city: "",
    price: "",
    total_tickets: "",
    image_url: "",
  });

  const load = async () => {
    const { data } = await api.get("/events");
    setEvents(data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const handlePictureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, image_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.post("/events", {
        ...form,
        price: parseFloat(form.price || 0),
        total_tickets: parseInt(form.total_tickets, 10),
      });

      toast.success("Event created!");
      setShowCreate(false);
      setSelectedFileName("");
      setForm({
        title: "",
        description: "",
        date_time: "",
        venue: "",
        city: "",
        price: "",
        total_tickets: "",
        image_url: "",
      });

      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not create event");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="events-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="overline text-neutral-500">EVENTS & TICKETS</p>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">
            Events.
          </h1>
          <p className="text-sm text-neutral-700 mt-2">
            Discover community events and buy tickets with your wallet.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="nb-btn text-white"
          style={{ backgroundColor: ACCENTS.calling }}
        >
          <Plus size={18} weight="bold" /> Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length === 0 && (
          <div className="col-span-full nb-card p-6 text-sm text-neutral-500">
            No events yet. Be the first to add one!
          </div>
        )}

        {events.map((event) => {
          const remaining =
            Number(event.total_tickets || 0) - Number(event.tickets_sold || 0);

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => navigate(`/events/${event.id}`)}
              className="nb-card overflow-hidden bg-white text-left transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]"
            >
              <div className="h-44 bg-neutral-100 border-b-2 border-black overflow-hidden">
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm font-bold">
                    No Image
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="font-black text-xl line-clamp-1">
                      {event.title}
                    </h2>
                    <p className="text-sm text-neutral-500">{event.city}</p>
                  </div>

                  <span className="nb-pill bg-white text-sm">
                    ${event.price}
                  </span>
                </div>

                <p className="text-sm text-neutral-700 line-clamp-3 mt-3">
                  {event.description}
                </p>

                <div className="flex items-center justify-between mt-5">
                  <span
                    className="nb-pill text-xs text-white"
                    style={{ backgroundColor: ACCENTS.calling }}
                  >
                    <CalendarStar size={12} weight="bold" />
                    {new Date(event.date_time).toLocaleDateString()}
                  </span>

                  <span className="text-xs font-bold text-neutral-500">
                    {remaining} left
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="nb-card p-6 w-full max-w-md bg-white space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Add event</h2>
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
              />
            </div>

            <div>
              <label className="overline">Description</label>
              <textarea
                required
                rows={3}
                className="nb-textarea mt-2"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="overline">Date & Time</label>
              <input
                required
                type="datetime-local"
                className="nb-input mt-2"
                value={form.date_time}
                onChange={(e) =>
                  setForm({ ...form, date_time: e.target.value })
                }
              />
            </div>

            <div>
              <label className="overline">Venue</label>
              <input
                required
                className="nb-input mt-2"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </div>

            <div>
              <label className="overline">City / State</label>
              <input
                required
                className="nb-input mt-2"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="overline">Ticket Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="nb-input mt-2 mono"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>

              <div>
                <label className="overline">Tickets</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="nb-input mt-2 mono"
                  value={form.total_tickets}
                  onChange={(e) =>
                    setForm({ ...form, total_tickets: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="overline">Picture</label>
              <label className="nb-btn w-full mt-2 h-12 bg-white cursor-pointer">
                <UploadSimple size={18} weight="bold" /> Upload Picture
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePictureUpload}
                />
              </label>

              {selectedFileName && (
                <p className="text-xs text-neutral-500 mt-2">
                  Selected: {selectedFileName}
                </p>
              )}
            </div>

            <button
              disabled={busy}
              className="nb-btn w-full h-12 text-white"
              style={{ backgroundColor: ACCENTS.calling }}
            >
              {busy ? "Posting…" : "Post Event"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}