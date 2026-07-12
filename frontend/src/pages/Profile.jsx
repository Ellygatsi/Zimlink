import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  User,
  Envelope,
  Trash,
  ChatCircle,
  SignOut,
  CaretRight,
  X,
  ShieldCheck,
  CheckCircle,
} from "@phosphor-icons/react";

export default function Profile() {
  const { user, logout, refresh } = useAuth();

  const [activePanel, setActivePanel] = useState(null);

  // Edit profile
  const [name, setName] = useState(user?.name || "");
  const [profileBusy, setProfileBusy] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailStep, setEmailStep] = useState("request");
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  // Delete account
  const [deleteStep, setDeleteStep] = useState("confirm");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Support
  const [message, setMessage] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

  const initials = useMemo(() => {
    const parts = (user?.name || "ZimLink User")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [user?.name]);

  const closePanel = () => {
    setActivePanel(null);
  };

  const openPanel = (panel) => {
    setActivePanel(panel);

    if (panel === "profile") {
      setName(user?.name || "");
    }

    if (panel === "email") {
      setEmailStep("request");
      setNewEmail("");
      setOldCode("");
      setNewCode("");
    }

    if (panel === "delete") {
      setDeleteStep("confirm");
      setDeleteCode("");
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setProfileBusy(true);

    try {
      await api.patch("/auth/profile", { name: name.trim() });
      await refresh();
      toast.success("Profile updated.");
      closePanel();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update profile");
    } finally {
      setProfileBusy(false);
    }
  };

  const requestEmailChange = async (e) => {
    e.preventDefault();
    setEmailBusy(true);

    try {
      await api.post("/auth/email-change/request", {
        new_email: newEmail.trim().toLowerCase(),
      });

      toast.success("Verification codes sent.");
      setEmailStep("verify");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send codes");
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmailChange = async (e) => {
    e.preventDefault();
    setEmailBusy(true);

    try {
      await api.post("/auth/email-change/confirm", {
        new_email: newEmail.trim().toLowerCase(),
        old_email_code: oldCode,
        new_email_code: newCode,
      });

      await refresh();
      toast.success("Email updated successfully.");
      setEmailStep("request");
      setNewEmail("");
      setOldCode("");
      setNewCode("");
      closePanel();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update email");
    } finally {
      setEmailBusy(false);
    }
  };

  const requestDeleteAccount = async () => {
    setDeleteBusy(true);

    try {
      await api.post("/auth/delete-account/request");
      toast.success("Verification code sent to your email.");
      setDeleteStep("verify");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send code");
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteBusy(true);

    try {
      await api.post("/auth/delete-account/confirm", {
        code: deleteCode,
      });

      await logout();
      window.location.href = "/login";
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not delete account");
    } finally {
      setDeleteBusy(false);
    }
  };

  const sendSupport = async (e) => {
    e.preventDefault();
    setSupportBusy(true);

    try {
      await api.post("/support/message", { message });
      toast.success("Message sent. We'll get back to you.");
      setMessage("");
      closePanel();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send message");
    } finally {
      setSupportBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const menuItems = [
    {
      key: "profile",
      title: "Edit profile",
      description: "Update your name and personal details",
      icon: User,
      iconClasses:
        "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400",
    },
    {
      key: "email",
      title: "Change email",
      description: "Update the email connected to your account",
      icon: Envelope,
      iconClasses:
        "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400",
    },
    {
      key: "support",
      title: "Support",
      description: "Get help or send us a message",
      icon: ChatCircle,
      iconClasses:
        "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400",
    },
    {
      key: "delete",
      title: "Delete account",
      description: "Permanently delete your account and data",
      icon: Trash,
      iconClasses:
        "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
      danger: true,
    },
  ];

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6"
      data-testid="profile-page"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-green-600 md:text-xs">
          Account
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-black dark:text-white md:text-5xl">
          My account
        </h1>

        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Manage your profile, security, and support settings.
        </p>
      </div>

      {/* Profile overview */}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-8">
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-green-100/70 blur-2xl dark:bg-green-900/20" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-green-600 text-2xl font-semibold text-black shadow-sm md:h-24 md:w-24 md:text-3xl">
            {initials || "ZU"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-semibold text-black dark:text-white md:text-3xl">
                {user?.name || "ZimLink User"}
              </h2>

              {user?.email_verified !== false && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-950/60 dark:text-green-400">
                  <CheckCircle size={13} weight="fill" />
                  Verified
                </span>
              )}
            </div>

            <p className="mt-1 truncate text-sm text-neutral-500 dark:text-neutral-400 md:text-base">
              {user?.email}
            </p>

            <p className="mt-3 text-xs text-neutral-400">
              Your ZimLink account information
            </p>
          </div>
        </div>
      </section>

      {/* Account options */}
      <section>
        <div className="mb-3">
          <h2 className="text-xl font-semibold text-black dark:text-white">
            Manage your account
          </h2>

          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Select an option to make changes without leaving this page.
          </p>
        </div>

        <div className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.key;

            return (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() =>
                    isActive ? closePanel() : openPanel(item.key)
                  }
                  className={`group flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-neutral-900 md:p-5 ${
                    item.danger
                      ? "border-red-100 hover:border-red-300 dark:border-red-950 dark:hover:border-red-800"
                      : isActive
                      ? "border-green-500"
                      : "border-neutral-200 hover:border-green-300 dark:border-neutral-800 dark:hover:border-green-800"
                  }`}
                  aria-expanded={isActive}
                  data-testid={`profile-menu-${item.key}`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full md:h-14 md:w-14 ${item.iconClasses}`}
                  >
                    <Icon size={25} weight="bold" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-base font-semibold md:text-lg ${
                        item.danger
                          ? "text-red-600 dark:text-red-400"
                          : "text-black dark:text-white"
                      }`}
                    >
                      {item.title}
                    </span>

                    <span className="mt-0.5 block text-sm text-neutral-500 dark:text-neutral-400">
                      {item.description}
                    </span>
                  </span>

                  {isActive ? (
                    <X
                      size={21}
                      weight="bold"
                      className="shrink-0 text-neutral-400"
                    />
                  ) : (
                    <CaretRight
                      size={21}
                      weight="bold"
                      className="shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1"
                    />
                  )}
                </button>

                {isActive && (
                  <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-950 md:p-6">
                    {/* Edit profile */}
                    {item.key === "profile" && (
                      <form
                        onSubmit={updateProfile}
                        className="space-y-5"
                        data-testid="edit-profile-panel"
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-black dark:text-white">
                            Edit profile
                          </h3>
                          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            Update the name displayed throughout ZimLink.
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                            Full name
                          </label>

                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                            className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-black outline-none transition-colors focus:border-green-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                            Email
                          </label>

                          <input
                            value={user?.email || ""}
                            disabled
                            className="mt-2 h-12 w-full cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-100 px-4 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
                          />

                          <p className="mt-2 text-xs text-neutral-400">
                            Use the Change email option to update your email.
                          </p>
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={closePanel}
                            className="h-11 rounded-xl border border-neutral-200 px-5 font-medium text-black dark:border-neutral-700 dark:text-white"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={
                              profileBusy ||
                              !name.trim() ||
                              name.trim() === (user?.name || "").trim()
                            }
                            className="h-11 rounded-xl bg-green-600 px-5 font-medium text-black disabled:opacity-50"
                          >
                            {profileBusy ? "Saving…" : "Save changes"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Change email */}
                    {item.key === "email" && (
                      <div data-testid="change-email-panel">
                        {emailStep === "request" ? (
                          <form
                            onSubmit={requestEmailChange}
                            className="space-y-5"
                          >
                            <div>
                              <h3 className="text-lg font-semibold text-black dark:text-white">
                                Change email
                              </h3>

                              <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                                We will send one verification code to your
                                current email and another to your new email.
                              </p>
                            </div>

                            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                              <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                                Current email
                              </p>

                              <p className="mt-1 text-sm font-medium text-black dark:text-white">
                                {user?.email}
                              </p>
                            </div>

                            <div>
                              <label className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                                New email
                              </label>

                              <input
                                type="email"
                                required
                                autoFocus
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-black outline-none transition-colors focus:border-green-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                              />
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                              <button
                                type="button"
                                onClick={closePanel}
                                className="h-11 rounded-xl border border-neutral-200 px-5 font-medium text-black dark:border-neutral-700 dark:text-white"
                              >
                                Cancel
                              </button>

                              <button
                                type="submit"
                                disabled={
                                  emailBusy ||
                                  !newEmail.trim() ||
                                  newEmail.trim().toLowerCase() ===
                                    user?.email?.toLowerCase()
                                }
                                className="h-11 rounded-xl bg-green-600 px-5 font-medium text-black disabled:opacity-50"
                              >
                                {emailBusy
                                  ? "Sending codes…"
                                  : "Send verification codes"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <form
                            onSubmit={confirmEmailChange}
                            className="space-y-5"
                          >
                            <div>
                              <h3 className="text-lg font-semibold text-black dark:text-white">
                                Verify both emails
                              </h3>

                              <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                                Enter the code sent to your current email and
                                the code sent to{" "}
                                <span className="font-medium text-black dark:text-white">
                                  {newEmail}
                                </span>
                                .
                              </p>
                            </div>

                            <div>
                              <label className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                                Current email code
                              </label>

                              <input
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={oldCode}
                                onChange={(e) =>
                                  setOldCode(
                                    e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6)
                                  )
                                }
                                required
                                autoFocus
                                placeholder="000000"
                                className="mt-2 h-14 w-full rounded-xl border border-neutral-200 bg-white px-4 text-center text-2xl font-semibold tracking-[0.35em] text-black outline-none focus:border-green-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                                New email code
                              </label>

                              <input
                                inputMode="numeric"
                                maxLength={6}
                                value={newCode}
                                onChange={(e) =>
                                  setNewCode(
                                    e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6)
                                  )
                                }
                                required
                                placeholder="000000"
                                className="mt-2 h-14 w-full rounded-xl border border-neutral-200 bg-white px-4 text-center text-2xl font-semibold tracking-[0.35em] text-black outline-none focus:border-green-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                              />
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setEmailStep("request");
                                  setOldCode("");
                                  setNewCode("");
                                }}
                                className="h-11 rounded-xl border border-neutral-200 px-5 font-medium text-black dark:border-neutral-700 dark:text-white"
                              >
                                Start over
                              </button>

                              <button
                                type="submit"
                                disabled={
                                  emailBusy ||
                                  oldCode.length !== 6 ||
                                  newCode.length !== 6
                                }
                                className="h-11 rounded-xl bg-green-600 px-5 font-medium text-black disabled:opacity-50"
                              >
                                {emailBusy
                                  ? "Confirming…"
                                  : "Confirm email change"}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Support */}
                    {item.key === "support" && (
                      <form
                        onSubmit={sendSupport}
                        className="space-y-5"
                        data-testid="support-panel"
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-black dark:text-white">
                            Contact support
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                            Describe your issue and we will reply to{" "}
                            <span className="font-medium text-black dark:text-white">
                              {user?.email}
                            </span>
                            .
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                            Your message
                          </label>

                          <textarea
                            required
                            rows={6}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tell us what you need help with…"
                            className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white p-4 text-black outline-none transition-colors focus:border-green-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                          />
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={closePanel}
                            className="h-11 rounded-xl border border-neutral-200 px-5 font-medium text-black dark:border-neutral-700 dark:text-white"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={supportBusy || !message.trim()}
                            className="h-11 rounded-xl bg-green-600 px-5 font-medium text-black disabled:opacity-50"
                          >
                            {supportBusy ? "Sending…" : "Send message"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Delete account */}
                    {item.key === "delete" && (
                      <div data-testid="delete-account-panel">
                        {deleteStep === "confirm" ? (
                          <div className="space-y-5">
                            <div>
                              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                                Delete account
                              </h3>

                              <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                                This action is permanent. Your wallet data,
                                tickets, listings, contacts, and account
                                information cannot be recovered.
                              </p>
                            </div>

                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                A six-digit confirmation code will be sent to{" "}
                                {user?.email}.
                              </p>
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                              <button
                                type="button"
                                onClick={closePanel}
                                className="h-11 rounded-xl border border-neutral-200 px-5 font-medium text-black dark:border-neutral-700 dark:text-white"
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={requestDeleteAccount}
                                disabled={deleteBusy}
                                className="h-11 rounded-xl bg-red-600 px-5 font-medium text-white disabled:opacity-50"
                              >
                                {deleteBusy
                                  ? "Sending code…"
                                  : "Send deletion code"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <form
                            onSubmit={confirmDeleteAccount}
                            className="space-y-5"
                          >
                            <div>
                              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                                Confirm account deletion
                              </h3>

                              <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                                Enter the code sent to{" "}
                                <span className="font-medium text-black dark:text-white">
                                  {user?.email}
                                </span>
                                .
                              </p>
                            </div>

                            <input
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              value={deleteCode}
                              onChange={(e) =>
                                setDeleteCode(
                                  e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6)
                                )
                              }
                              required
                              autoFocus
                              placeholder="000000"
                              className="h-14 w-full rounded-xl border border-red-300 bg-white px-4 text-center text-2xl font-semibold tracking-[0.35em] text-black outline-none focus:border-red-600 dark:border-red-900 dark:bg-neutral-900 dark:text-white"
                            />

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteStep("confirm");
                                  setDeleteCode("");
                                }}
                                className="h-11 rounded-xl border border-neutral-200 px-5 font-medium text-black dark:border-neutral-700 dark:text-white"
                              >
                                Back
                              </button>

                              <button
                                type="submit"
                                disabled={
                                  deleteBusy || deleteCode.length !== 6
                                }
                                className="h-11 rounded-xl bg-red-600 px-5 font-medium text-white disabled:opacity-50"
                              >
                                {deleteBusy
                                  ? "Deleting…"
                                  : "Permanently delete account"}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Security note */}
      <section className="flex items-start gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/30">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-black">
          <ShieldCheck size={24} weight="fill" />
        </span>

        <div>
          <h2 className="font-semibold text-black dark:text-white">
            Your security matters
          </h2>

          <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            Sensitive changes require email verification to help protect your
            ZimLink account.
          </p>
        </div>
      </section>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white font-medium text-black transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
        data-testid="logout-button"
      >
        <SignOut size={19} weight="bold" />
        Log out
      </button>
    </div>
  );
}
