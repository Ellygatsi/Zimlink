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
      <div className="w-full max-w-3xl h-[90vh] bg-white dark:bg-neutral-950 rounded-2xl shadow-xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800">

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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">

          <p className="text-[10px] text-red-500 font-medium">
            This is a draft template. It must be reviewed by a qualified attorney before production use.
          </p>

          {/* 1 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              1. Acceptance of Terms
            </h3>
            <p>
              By creating an account or using ZimLink ("the App," "the Service," "we," "us," or "our"),
              you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree, do not use the Service.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              2. Eligibility
            </h3>
            <p>
              You must be at least 18 years old to create an account and use ZimLink. By registering,
              you confirm that all information provided is accurate and current.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              3. Account Registration and Security
            </h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must notify us immediately of unauthorized access.</li>
              <li>We may suspend accounts for fraud or violations.</li>
              <li>Only one account per person is allowed.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              4. Wallet and Money Transfers
            </h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>Users may add funds and send money via the app.</li>
              <li>All transfers are final once completed.</li>
              <li>We are not responsible for incorrect recipient details.</li>
              <li>We may hold or reverse suspicious transactions.</li>
              <li>Wallet balances do not earn interest or insurance protection.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              5. Voice Calling Services
            </h3>
            <p>
              Calls are billed per minute and deducted from wallet balance in real time.
              Rates vary by destination and may change at any time. We are not responsible for call quality or network issues.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              6. Marketplace
            </h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>ZimLink does not act as buyer or seller in transactions.</li>
              <li>We do not guarantee listings, quality, or user identity.</li>
              <li>Users are responsible for legal compliance of listings.</li>
              <li>We may remove listings without notice.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              7. Events and Ticketing
            </h3>
            <p>
              Tickets may be non-refundable unless required by law. We are not responsible for cancellations,
              changes, or organizer conduct.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              8. Community Features
            </h3>
            <p>
              Users are responsible for content they post. Harmful, illegal, or abusive content may be removed.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              9. Prohibited Conduct
            </h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>No fraud, money laundering, or illegal activity.</li>
              <li>No impersonation or unauthorized access.</li>
              <li>No system interference or scraping.</li>
            </ul>
          </section>

          {/* 10 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              10. Fees and Changes
            </h3>
            <p>
              We may charge fees for services and may change pricing at any time with notice in the app or email.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              11. Intellectual Property
            </h3>
            <p>
              All ZimLink branding, logos, and system content belong to ZimLink and may not be used without permission.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              12. Disclaimer of Warranties
            </h3>
            <p>
              The service is provided “as is” without warranties of any kind.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              13. Limitation of Liability
            </h3>
            <p>
              We are not liable for indirect damages, including loss of funds, data, or profits.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              14. Indemnification
            </h3>
            <p>
              You agree to indemnify ZimLink against claims arising from your use of the service.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              15. Termination
            </h3>
            <p>
              We may suspend or terminate accounts at our discretion for violations of these Terms.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              16. Changes to Terms
            </h3>
            <p>
              We may update these Terms at any time. Continued use means acceptance of updated Terms.
            </p>
          </section>

          {/* 17 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              17. Governing Law
            </h3>
            <p>
              [To be specified based on jurisdiction of operation.]
            </p>
          </section>

          {/* 18 */}
          <section>
            <h3 className="text-[12px] font-semibold text-black dark:text-white">
              18. Contact Us
            </h3>
            <p>
              Email: <span className="font-medium">info@zimlink.me</span>
            </p>
          </section>

        </div>

        {/* FOOTER */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 px-5 py-3 flex justify-between bg-white dark:bg-neutral-950">

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