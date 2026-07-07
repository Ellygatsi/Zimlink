import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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

  const updateUserRole = async (userId, endpoint, successMessage) => {
    setActionBusy(`${endpoint}-${userId}`);

    try {
      await api.patch(`/admin/users/${userId}/${endpoint}`);
      toast.success(successMessage);
      loadUsers();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Action failed");
    } finally {
      setActionBusy(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const text = `${u.name || ""} ${u.email || ""} ${u.phone || ""}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admins" && u.is_admin) ||
        (roleFilter === "verified" && u.is_verified_seller) ||
        (roleFilter === "regular" && !u.is_admin && !u.is_verified_seller);

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div>
        <p className="overline text-neutral-500">ADMIN</p>
        <h1 className="text-5xl font-black tracking-tighter mt-2">Users.</h1>
        <p className="text-sm text-neutral-700 mt-2">
          Manage users, wallet balances, admins, and verified sellers.
        </p>
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

        <button
          type="submit"
          disabled={busy}
          className="nb-btn bg-[#22C55E] text-white w-full"
          data-testid="admin-credit-submit"
        >
          {busy ? "Adding…" : "Add Balance"}
        </button>
      </form>

      <div className="nb-card p-5 bg-white space-y-4">
        <h2 className="text-2xl font-black">Filter Users</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="overline">Search</label>
            <input
              className="nb-input mt-2"
              placeholder="Search by name, email, or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="overline">User Type</label>
            <select
              className="nb-input mt-2"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Users</option>
              <option value="admins">Admins</option>
              <option value="verified">Verified Sellers</option>
              <option value="regular">Regular Users</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-black">All Users</h2>

        {filteredUsers.length === 0 && (
          <div className="nb-card p-5 bg-white">
            <p className="text-sm text-neutral-500">No users found.</p>
          </div>
        )}

        {filteredUsers.map((u) => (
          <div key={u.id} className="nb-card p-4 bg-white space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-black text-lg">{u.name || "No name"}</p>
                <p className="text-xs text-neutral-500">{u.email}</p>

                {u.phone && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Phone: {u.phone}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {u.is_admin && (
                    <span className="text-xs font-bold bg-[#DCFCE7] text-[#15803D] px-2 py-1 rounded">
                      Admin
                    </span>
                  )}

                  {u.is_verified_seller && (
                    <span className="text-xs font-bold bg-[#DCFCE7] text-[#15803D] px-2 py-1 rounded">
                      Verified Seller
                    </span>
                  )}

                  {!u.is_admin && !u.is_verified_seller && (
                    <span className="text-xs font-bold bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                      Regular User
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="overline">Balance</p>
                <p className="text-xl font-black">
                  ${Number(u.wallet_balance || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="overline text-neutral-500">Registered</p>
                <p className="font-bold">
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>

              <div>
                <p className="overline text-neutral-500">User ID</p>
                <p className="font-bold break-all">{u.id}</p>
              </div>

              <div>
                <p className="overline text-neutral-500">Status</p>
                <p className="font-bold">{u.status || "active"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {!u.is_admin && (
                <button
                  type="button"
                  className="nb-btn bg-black text-white"
                  disabled={actionBusy === `make-admin-${u.id}`}
                  onClick={() =>
                    updateUserRole(u.id, "make-admin", "User is now an admin")
                  }
                >
                  {actionBusy === `make-admin-${u.id}`
                    ? "Updating…"
                    : "Make Admin"}
                </button>
              )}

              {!u.is_verified_seller && (
                <button
                  type="button"
                  className="nb-btn bg-[#22C55E] text-white"
                  disabled={actionBusy === `verify-seller-${u.id}`}
                  onClick={() =>
                    updateUserRole(
                      u.id,
                      "verify-seller",
                      "User is now a verified seller"
                    )
                  }
                >
                  {actionBusy === `verify-seller-${u.id}`
                    ? "Updating…"
                    : "Verify Seller"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}