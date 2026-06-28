import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const loadUsers = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load users");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const addBalance = async (e) => {
    e.preventDefault();
    if (!email || !amount) {
      toast.error("Enter email and amount");
      return;
    }

    setBusy(true);
    try {
      await api.post("/admin/users/credit-by-email", {
        email,
        amount: Number(amount),
      });
      toast.success("Balance added successfully");
      setEmail("");
      setAmount("");
      loadUsers();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add balance");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div>
        <p className="overline text-neutral-500">ADMIN</p>
        <h1 className="text-5xl font-black tracking-tighter mt-2">Users.</h1>
        <p className="text-sm text-neutral-700 mt-2">Add airtime balance to users by email address.</p>
      </div>

      <form onSubmit={addBalance} className="nb-card p-6 bg-white space-y-4 max-w-xl">
        <h2 className="text-2xl font-black">Add Balance</h2>
        <div>
          <label className="overline">User Email</label>
          <input
            type="email"
            className="nb-input mt-2"
            placeholder="user@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="admin-credit-email"
          />
        </div>
        <div>
          <label className="overline">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="nb-input mt-2"
            placeholder="10.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            data-testid="admin-credit-amount"
          />
        </div>
        <button type="submit" disabled={busy} className="nb-btn bg-[#22C55E] text-white w-full" data-testid="admin-credit-submit">
          {busy ? "Adding…" : "Add Balance"}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-2xl font-black">All Users</h2>
        {users.length === 0 && (
          <div className="nb-card p-5 bg-white">
            <p className="text-sm text-neutral-500">No users found.</p>
          </div>
        )}
        {users.map((u) => (
          <div key={u.id} className="nb-card p-4 bg-white flex items-center justify-between">
            <div>
              <p className="font-black">{u.name}</p>
              <p className="text-xs text-neutral-500">{u.email}</p>
              {u.is_admin && <p className="text-xs font-bold text-[#15803D]">Admin</p>}
            </div>
            <div className="text-right">
              <p className="overline">Balance</p>
              <p className="text-xl font-black">${Number(u.wallet_balance || 0).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
