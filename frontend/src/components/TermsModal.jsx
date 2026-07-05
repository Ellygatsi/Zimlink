import { useEffect } from "react";

export default function TermsModal({ open, onClose, onAccept }) {
  if (!open) return null;

  // prevent background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl h-[85vh] bg-white dark:bg-neutral-950 rounded-2xl shadow-xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800">

        {/* HEADER */}
        <div className="sticky top-0 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-5 py-3 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Terms & Conditions
            </h2>
            <p className="text-[10px] text-neutral-500">
              Last updated: [DATE]
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Close
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">

          <p className="text-[10px] text-red-500 font-medium">
            Please read carefully. This is a draft and should be legally reviewed before launch.
          </p>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">1. Acceptance of Terms</h3>
            <p>
              By creating an account or using ZimLink (“the App,” “the Service”), you agree to be bound by these Terms.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">2. Eligibility</h3>
            <p>
              You must be at least 18 years old to use ZimLink. You confirm that all information provided is accurate and current.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">3. Account Security</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>You are responsible for your login credentials.</li>
              <li>Notify us immediately of unauthorized access.</li>
              <li>We may suspend accounts suspected of fraud or abuse.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">4. Wallet & Transfers</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>Funds can be added and sent between users.</li>
              <li>All transfers are final once completed.</li>
              <li>We are not responsible for incorrect recipient details.</li>
              <li>Balances do not earn interest or insurance coverage.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">5. Voice Calls</h3>
            <p>
              Calls are billed per minute and deducted from wallet balance in real time.
              Service quality depends on third-party networks and internet connection.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">6. Marketplace</h3>
            <p>
              ZimLink is not a party to transactions between users. We do not guarantee listings, products, or user identities.
              Users are responsible for legality of items sold.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">7. Events</h3>
            <p>
              Tickets may be non-refundable unless required by law. ZimLink is not responsible for cancellations or organizer actions.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">8. Prohibited Use</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>No fraud, money laundering, or illegal activity.</li>
              <li>No account impersonation or hacking attempts.</li>
              <li>No interference with platform operations.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">9. Liability</h3>
            <p>
              The Service is provided “as is.” We are not liable for indirect losses, including loss of funds or data.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">10. Termination</h3>
            <p>
              We may suspend or terminate accounts at our discretion for violations of these Terms.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">11. Contact</h3>
            <p>
              For questions: <span className="font-medium">info@zimlink.me</span>
            </p>
          </section>

          <p className="text-[10px] text-neutral-500 pt-4">
            This is a simplified draft version of the full Terms and should be legally reviewed before production use.
          </p>
        </div>

        {/* FOOTER */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 px-5 py-3 flex justify-between gap-3 bg-white dark:bg-neutral-950">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
          >
            Decline
          </button>

          <button
            onClick={() => {
              onAccept?.();
              onClose();
            }}
            className="text-xs px-4 py-2 rounded-lg bg-green-600 text-black font-medium"
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}