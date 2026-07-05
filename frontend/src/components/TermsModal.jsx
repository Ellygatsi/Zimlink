import { useEffect } from "react";

export default function TermsModal({ open, onClose, onAccept }) {
  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  if (!open) return null;

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
            Please read carefully. This is a draft and should be legally reviewed before production use.
          </p>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">1. Acceptance of Terms</h3>
            <p>
              By using ZimLink, you agree to these Terms and Conditions.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">2. Eligibility</h3>
            <p>You must be at least 18 years old to use the Service.</p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">3. Account Security</h3>
            <p>You are responsible for your account security and credentials.</p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">4. Wallet & Transfers</h3>
            <p>
              Transfers are final. We are not responsible for user input errors.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-[12px] text-black dark:text-white">5. Liability</h3>
            <p>
              The service is provided “as is” without warranties.
            </p>
          </section>

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