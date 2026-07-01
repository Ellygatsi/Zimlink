import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, CalendarStar, Envelope } from "@phosphor-icons/react";

export default function TicketSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const quantity = state?.quantity || 1;
  const eventTitle = state?.eventTitle || "the event";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-black">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center mx-auto">
          <CheckCircle size={40} weight="bold" className="text-black" />
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
            You're going!
          </h1>
          <p className="text-neutral-500 mt-2 text-sm">
            You have successfully purchased{" "}
            <span className="font-medium text-black dark:text-white">
              {quantity} ticket{quantity > 1 ? "s" : ""}
            </span>{" "}
            for{" "}
            <span className="font-medium text-black dark:text-white">{eventTitle}</span>.
          </p>
        </div>

        <div className="rounded-2xl p-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-left space-y-3">
          <div className="flex items-start gap-3">
            <Envelope size={20} weight="bold" className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Your ticket{quantity > 1 ? "s have" : " has"} been sent to your email on file. Each ticket has a unique QR code — present it at the door.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CalendarStar size={20} weight="bold" className="text-green-600 shrink-0 mt-0.5" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Check your inbox and spam folder if you don't see it within a few minutes.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/events")}
            className="w-full h-12 rounded-xl bg-green-600 text-black font-medium"
          >
            Browse more events
          </button>
          <button
            onClick={() => navigate("/home")}
            className="w-full h-12 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white font-medium"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}