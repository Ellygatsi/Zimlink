import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
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
    <div className="space-y-5 md:space-y-6" data-testid="events-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">Events & tickets</p>
          <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-black dark:text-white">Events.</h1>
          <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 md:mt-2">
            Discover community events and buy tickets with your wallet.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-full bg-green-600 text-black px-4 py-2 text-sm font-medium w-fit"
        >
          <Plus size={16} weight="bold" /> Add event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length === 0 && (
          <div className="col-span-full rounded-xl p-6 text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            No events yet. Be the first to add one!
          </div>
        )}

        {events.map((event) => {
          const remaining = Number(event.total_tickets || 0) - Number(event.tickets_sold || 0);

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => navigate(`/events/${event.id}`)}
              className="rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left transition-transform hover:-translate-y-1"
            >
              <div className="h-44 bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                {event.image_url ? (
                  <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm font-medium">
                    No image
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="font-medium text-lg line-clamp-1 text-black dark:text-white">{event.title}</h2>
                    <p className="text-sm text-neutral-500">{event.city}</p>
                  </div>

                  <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white">
                    ${event.price}
                  </span>
                </div>

                <p className="text-sm text-neutral-500 line-clamp-3 mt-3">{event.description}</p>

                <div className="flex items-center justify-between mt-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-green-600 text-black">
                    <CalendarStar size={12} weight="bold" />
                    {new Date(event.date_time).toLocaleDateString()}
                  </span>

                  <span className="text-xs font-medium text-neutral-500">{remaining} left</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium text-black dark:text-white">Add event</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-neutral-500">
                <X size={20} weight="bold" />
              </button>
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Title</label>
              <input
                required
                className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Description</label>
              <textarea
                required
                rows={3}
                className="w-full mt-2 rounded-lg p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Date & time</label>
              <input
                required
                type="datetime-local"
                className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={form.date_time}
                onChange={(e) => setForm({ ...form, date_time: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Venue</label>
              <input
                required
                className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">City / state</label>
              <input
                required
                className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Ticket price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Tickets</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  value={form.total_tickets}
                  onChange={(e) => setForm({ ...form, total_tickets: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Picture</label>
              <label
                className="w-full mt-2 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-pointer flex items-center justify-center gap-2 text-sm font-medium text-black dark:text-white"
              >
                <UploadSimple size={18} weight="bold" /> Upload picture
                <input type="file" accept="image/*" className="hidden" onChange={handlePictureUpload} />
              </label>

              {selectedFileName && (
                <p className="text-xs text-neutral-500 mt-2">Selected: {selectedFileName}</p>
              )}
            </div>

            <button
              disabled={busy}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post event"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}