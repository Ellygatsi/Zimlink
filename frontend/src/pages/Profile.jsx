import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, User, Envelope, Trash, ChatCircle, SignOut } from "@phosphor-icons/react";

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("profile");

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

  const updateProfile = async (e) => {
    e.preventDefault();
    setProfileBusy(true);
    try {
      await api.patch("/auth/profile", { name });
      await refresh();
      toast.success("Profile updated!");
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
      await api.post("/auth/email-change/request", { new_email: newEmail });
      toast.success("Codes sent to both email addresses");
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
        new_email: newEmail,
        old_email_code: oldCode,
        new_email_code: newCode,
      });
      await refresh();
      toast.success("Email updated successfully!");
      setEmailStep("request");
      setNewEmail("");
      setOldCode("");
      setNewCode("");
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
      toast.success("Verification code sent to your email");
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
      await api.post("/auth/delete-account/confirm", { code: deleteCode });
      await logout();
      navigate("/login");
      toast.success("Account deleted");
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
      toast.success("Message sent! We'll get back to you.");
      setMessage("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not send message");
    } finally {
      setSupportBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const tabs = [
    { key: "profile", label: "Edit profile", icon: User },
    { key: "email", label: "Change email", icon: Envelope },
    { key: "support", label: "Support", icon: ChatCircle },
    { key: "delete", label: "Delete account", icon: Trash },
  ];

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-neutral-500 hover:text-black dark:hover:text-white"
        >
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className="text-2xl md:text-3xl font-medium text-black dark:text-white">Account</h1>
      </div>

      {/* User info card */}
      <div className="rounded-2xl p-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-black font-medium text-xl">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-black dark:text-white">{user?.name}</p>
          <p className="text-sm text-neutral-500">{user?.email}</p>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.key
                ? t.key === "delete"
                  ? "bg-red-600 text-white"
                  : "bg-green-600 text-black"
                : "bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white"
            }`}
          >
            <t.icon size={14} weight="bold" /> {t.label}
          </button>
        ))}
      </div>

      {/* Edit profile */}
      {tab === "profile" && (
        <form
          onSubmit={updateProfile}
          className="rounded-2xl p-6 space-y-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        >
          <h2 className="text-lg font-medium text-black dark:text-white">Edit profile</h2>
          <div>
            <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Name</label>
            <input
              className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Email</label>
            <input
              className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-200 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-500 cursor-not-allowed"
              value={user?.email}
              disabled
            />
            <p className="text-xs text-neutral-400 mt-1">To change your email use the "Change email" tab.</p>
          </div>
          <button
            type="submit"
            disabled={profileBusy}
            className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
          >
            {profileBusy ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      {/* Change email */}
      {tab === "email" && (
        <div className="rounded-2xl p-6 space-y-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-medium text-black dark:text-white">Change email</h2>

          {emailStep === "request" ? (
            <form onSubmit={requestEmailChange} className="space-y-4">
              <p className="text-sm text-neutral-500">
                We'll send a verification code to your current email and your new email.
              </p>
              <div>
                <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">New email</label>
                <input
                  type="email"
                  required
                  className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={emailBusy}
                className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
              >
                {emailBusy ? "Sending codes…" : "Send verification codes"}
              </button>
            </form>
          ) : (
            <form onSubmit={confirmEmailChange} className="space-y-4">
              <p className="text-sm text-neutral-500">
                Enter the code sent to your <span className="font-medium text-black dark:text-white">current email</span> and the code sent to <span className="font-medium text-black dark:text-white">{newEmail}</span>.
              </p>
              <div>
                <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Code from current email</label>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full mt-2 h-12 rounded-lg text-center text-xl font-medium tracking-widest bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  value={oldCode}
                  onChange={(e) => setOldCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Code from new email</label>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full mt-2 h-12 rounded-lg text-center text-xl font-medium tracking-widest bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={emailBusy || oldCode.length !== 6 || newCode.length !== 6}
                className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
              >
                {emailBusy ? "Confirming…" : "Confirm email change"}
              </button>
              <button
                type="button"
                onClick={() => setEmailStep("request")}
                className="w-full text-sm font-medium text-neutral-500"
              >
                Start over
              </button>
            </form>
          )}
        </div>
      )}

      {/* Support */}
      {tab === "support" && (
        <form
          onSubmit={sendSupport}
          className="rounded-2xl p-6 space-y-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        >
          <h2 className="text-lg font-medium text-black dark:text-white">Chat support</h2>
          <p className="text-sm text-neutral-500">
            Describe your issue and we'll get back to you at <span className="font-medium text-black dark:text-white">{user?.email}</span>.
          </p>
          <div>
            <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Your message</label>
            <textarea
              required
              rows={5}
              className="w-full mt-2 rounded-lg p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white resize-none"
              placeholder="Describe your issue…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={supportBusy}
            className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
          >
            {supportBusy ? "Sending…" : "Send message"}
          </button>
        </form>
      )}

      {/* Delete account */}
      {tab === "delete" && (
        <div className="rounded-2xl p-6 space-y-4 bg-neutral-100 dark:bg-neutral-900 border border-red-200 dark:border-red-900">
          <h2 className="text-lg font-medium text-red-600">Delete account</h2>
          <p className="text-sm text-neutral-500">
            This is permanent. Your wallet balance, tickets, listings, and all data will be deleted and cannot be recovered.
          </p>

          {deleteStep === "confirm" ? (
            <button
              onClick={requestDeleteAccount}
              disabled={deleteBusy}
              className="w-full h-12 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50"
            >
              {deleteBusy ? "Sending code…" : "Send verification code"}
            </button>
          ) : (
            <form onSubmit={confirmDeleteAccount} className="space-y-4">
              <p className="text-sm text-neutral-500">
                Enter the code sent to <span className="font-medium text-black dark:text-white">{user?.email}</span> to permanently delete your account.
              </p>
              <input
                inputMode="numeric"
                maxLength={6}
                className="w-full h-12 rounded-lg text-center text-xl font-medium tracking-widest bg-white dark:bg-neutral-800 border border-red-300 dark:border-red-800 outline-none focus:border-red-600 text-black dark:text-white"
                value={deleteCode}
                onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              <button
                type="submit"
                disabled={deleteBusy || deleteCode.length !== 6}
                className="w-full h-12 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50"
              >
                {deleteBusy ? "Deleting…" : "Permanently delete my account"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteStep("confirm")}
                className="w-full text-sm font-medium text-neutral-500"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full h-12 rounded-xl border border-neutral-200 dark:border-neutral-800 text-black dark:text-white font-medium flex items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
      >
        <SignOut size={18} weight="bold" /> Log out
      </button>
    </div>
  );
}