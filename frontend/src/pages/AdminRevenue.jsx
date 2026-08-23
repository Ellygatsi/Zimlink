import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { ACCENTS } from "@/lib/api";
import {
  ArrowLeft,
  DownloadSimple,
  FileXls,
  FilePdf,
  Wallet,
  Phone,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatMonth(month) {
  // month is "YYYY-MM"
  try {
    const [y, m] = month.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return month;
  }
}

function MonthlyChart({ data, color, label }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-neutral-500">
        No data for this range yet.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.revenue), 1);
  const width = 700;
  const height = 220;
  const padding = 32;
  const barGap = 14;
  const barWidth = Math.max(
    18,
    (width - padding * 2 - barGap * (data.length - 1)) / data.length
  );

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${Math.max(width, data.length * (barWidth + barGap) + padding * 2)} ${height}`}
        className="w-full"
        style={{ minWidth: data.length * (barWidth + barGap) + padding * 2 }}
      >
        {/* baseline */}
        <line
          x1={padding}
          y1={height - padding}
          x2={Math.max(width, data.length * (barWidth + barGap) + padding * 2) - padding / 2}
          y2={height - padding}
          stroke="black"
          strokeWidth="2"
        />

        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.revenue / max) * (height - padding * 2));
          const x = padding + i * (barWidth + barGap);
          const y = height - padding - barHeight;
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                stroke="black"
                strokeWidth="1.5"
                rx="3"
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="black"
              >
                ${d.revenue.toFixed(0)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - padding + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#525252"
              >
                {formatMonth(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-neutral-500 mt-2">{label}</p>
    </div>
  );
}

const TOPUP_COLUMNS = [
  { key: "created_at", label: "Date", fmt: (v) => (v ? new Date(v).toLocaleString() : "") },
  { key: "user_email", label: "User" },
  { key: "package_amount", label: "Package ($)", fmt: (v) => Number(v || 0).toFixed(2) },
  { key: "fee_amount", label: "Fee / Revenue ($)", fmt: (v) => Number(v || 0).toFixed(2) },
  { key: "charge_amount", label: "Charged ($)", fmt: (v) => Number(v || 0).toFixed(2) },
  { key: "credited_amount", label: "Credited ($)", fmt: (v) => Number(v || 0).toFixed(2) },
  { key: "payment_status", label: "Status" },
];

const CALL_COLUMNS = [
  { key: "created_at", label: "Date", fmt: (v) => (v ? new Date(v).toLocaleString() : "") },
  { key: "user_email", label: "User" },
  { key: "to", label: "Called" },
  { key: "duration_seconds", label: "Minutes", fmt: (v) => (Number(v || 0) / 60).toFixed(2) },
  { key: "charge_amount", label: "Revenue ($)", fmt: (v) => Number(v || 0).toFixed(2) },
  { key: "cost_amount", label: "Cost ($)", fmt: (v) => Number(v || 0).toFixed(2) },
  { key: "profit_amount", label: "Profit ($)", fmt: (v) => Number(v || 0).toFixed(2) },
  { key: "status", label: "Status" },
];

export default function AdminRevenue() {
  const [tab, setTab] = useState("topups"); // "topups" | "calls"

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("all");

  const [topupData, setTopupData] = useState(null);
  const [callData, setCallData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTopups = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      if (status !== "all") params.set("status", status);
      const { data } = await api.get(`/admin/revenue/topups?${params.toString()}`);
      setTopupData(data);
    } catch (err) {
      toast.error("Could not load top-up revenue");
    } finally {
      setLoading(false);
    }
  };

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const { data } = await api.get(`/admin/revenue/calls?${params.toString()}`);
      setCallData(data);
    } catch (err) {
      toast.error("Could not load call revenue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "topups") fetchTopups();
    else fetchCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const applyFilters = () => {
    if (tab === "topups") fetchTopups();
    else fetchCalls();
  };

  const clearFilters = () => {
    setStart("");
    setEnd("");
    setStatus("all");
    setTimeout(() => {
      if (tab === "topups") fetchTopups();
      else fetchCalls();
    }, 0);
  };

  const activeData = tab === "topups" ? topupData : callData;
  const columns = tab === "topups" ? TOPUP_COLUMNS : CALL_COLUMNS;
  const filenameBase = tab === "topups" ? "topup-revenue" : "call-revenue";

  const exportRows = useMemo(() => {
    if (!activeData) return [];
    return activeData.transactions.map((row) => {
      const out = {};
      columns.forEach((c) => {
        out[c.label] = c.fmt ? c.fmt(row[c.key]) : row[c.key] ?? "";
      });
      return out;
    });
  }, [activeData, columns]);

  const exportExcel = () => {
    if (!exportRows.length) {
      toast.error("Nothing to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab === "topups" ? "Top-up Revenue" : "Call Revenue");
    XLSX.writeFile(wb, `${filenameBase}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = () => {
    if (!exportRows.length) {
      toast.error("Nothing to export");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(
      tab === "topups" ? "Wallet Top-up Revenue" : "Call Revenue",
      14,
      16
    );
    doc.setFontSize(9);
    doc.text(
      `Range: ${start || "all time"} to ${end || "now"} — generated ${new Date().toLocaleString()}`,
      14,
      22
    );
    autoTable(doc, {
      startY: 28,
      head: [columns.map((c) => c.label)],
      body: activeData.transactions.map((row) =>
        columns.map((c) => (c.fmt ? c.fmt(row[c.key]) : row[c.key] ?? ""))
      ),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [0, 0, 0] },
    });
    doc.save(`${filenameBase}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const s = activeData?.summary;

  return (
    <div className="space-y-6" data-testid="admin-revenue-page">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-bold" data-testid="back-to-admin">
          <ArrowLeft size={16} weight="bold" /> Back to Dashboard
        </Link>
        <p className="overline text-neutral-500 mt-3">REVENUE SPLIT</p>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Revenue.</h1>
        <p className="text-sm text-neutral-700 mt-2 max-w-2xl">
          Revenue broken out by stream — wallet top-up fees vs. call charges.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" data-testid="revenue-tabs">
        <button
          onClick={() => setTab("topups")}
          className={`nb-btn ${tab === "topups" ? "text-white" : "bg-white"}`}
          style={tab === "topups" ? { backgroundColor: ACCENTS.wallet } : {}}
          data-testid="tab-topups"
        >
          <Wallet size={16} weight="bold" /> Wallet Top-ups
        </button>
        <button
          onClick={() => setTab("calls")}
          className={`nb-btn ${tab === "calls" ? "text-white" : "bg-white"}`}
          style={tab === "calls" ? { backgroundColor: "#009639" } : {}}
          data-testid="tab-calls"
        >
          <Phone size={16} weight="bold" /> Calls
        </button>
      </div>

      {/* Filters */}
      <div className="nb-card p-4 flex flex-wrap items-end gap-3" data-testid="revenue-filters">
        <div>
          <label className="overline">From</label>
          <input
            type="date"
            className="nb-input mt-2 mono"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            data-testid="filter-start"
          />
        </div>
        <div>
          <label className="overline">To</label>
          <input
            type="date"
            className="nb-input mt-2 mono"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            data-testid="filter-end"
          />
        </div>
        {tab === "topups" && (
          <div>
            <label className="overline">Status</label>
            <select
              className="nb-input mt-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              data-testid="filter-status"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        )}
        <button onClick={applyFilters} className="nb-btn bg-black text-white" data-testid="apply-filters">
          Apply
        </button>
        <button onClick={clearFilters} className="nb-btn bg-white" data-testid="clear-filters">
          Clear
        </button>

        <div className="ml-auto flex gap-2">
          <button onClick={exportExcel} className="nb-btn bg-white" data-testid="export-excel">
            <FileXls size={16} weight="bold" /> Excel
          </button>
          <button onClick={exportPDF} className="nb-btn bg-white" data-testid="export-pdf">
            <FilePdf size={16} weight="bold" /> PDF
          </button>
        </div>
      </div>

      {loading && <p className="overline">Loading…</p>}

      {!loading && activeData && (
        <>
          {/* KPIs */}
          {tab === "topups" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="nb-card p-4" style={{ backgroundColor: ACCENTS.wallet }}>
                <p className="overline">FEE REVENUE</p>
                <p className="text-2xl md:text-3xl font-black mono mt-1">${s.revenue.toFixed(2)}</p>
              </div>
              <div className="nb-card p-4 bg-white/95">
                <p className="overline">TOTAL CHARGED</p>
                <p className="text-2xl md:text-3xl font-black mono mt-1">${s.gross.toFixed(2)}</p>
              </div>
              <div className="nb-card p-4 bg-white/95">
                <p className="overline">CREDITED TO WALLETS</p>
                <p className="text-2xl md:text-3xl font-black mono mt-1">${s.credited.toFixed(2)}</p>
              </div>
              <div className="nb-card p-4 bg-white/95">
                <p className="overline">PAID TOP-UPS</p>
                <p className="text-2xl md:text-3xl font-black mono mt-1">{s.count}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="nb-card p-4" style={{ backgroundColor: "#B8F397" }}>
                <p className="overline">CALL REVENUE</p>
                <p className="text-2xl md:text-3xl font-black mono mt-1">${s.revenue.toFixed(2)}</p>
              </div>
              <div className="nb-card p-4 bg-white/95">
                <p className="overline">COST</p>
                <p className="text-2xl md:text-3xl font-black mono mt-1">${s.cost.toFixed(2)}</p>
              </div>
              <div className="nb-card p-4 bg-white/95">
                <p className="overline">PROFIT</p>
                <p className="text-2xl md:text-3xl font-black mono mt-1 text-[#009639]">${s.profit.toFixed(2)}</p>
              </div>
              <div className="nb-card p-4 bg-white/95">
                <p className="overline">MINUTES</p>
                <p className="text-2xl md:text-3xl font-black mono mt-1">{s.minutes.toFixed(0)}</p>
              </div>
              <div className="nb-card p-4 bg-white/95">
                <p className="overline">BILLED CALLS</p>
                <p className="text-2xl md:text-3xl font-black mono mt-1">{s.count}</p>
              </div>
            </div>
          )}

          {/* Month-on-month chart */}
          <div className="nb-card p-6 bg-white/95">
            <p className="overline mb-3">
              MONTH ON MONTH — {tab === "topups" ? "TOP-UP FEE REVENUE" : "CALL REVENUE"}
            </p>
            <MonthlyChart
              data={activeData.monthly}
              color={tab === "topups" ? ACCENTS.wallet : "#B8F397"}
              label={
                tab === "topups"
                  ? "Fee revenue collected per month from wallet top-ups."
                  : "Revenue collected per month from billed outbound calls."
              }
            />
          </div>

          {/* Transactions table */}
          <div className="nb-card p-6 bg-white/95">
            <p className="overline mb-4">ALL TRANSACTIONS ({activeData.transactions.length})</p>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm" data-testid="revenue-transactions-table">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b-2 border-black text-left">
                    {columns.map((c) => (
                      <th key={c.key} className="pb-2 pr-4 overline whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeData.transactions.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="py-6 text-center text-neutral-500">
                        No transactions in this range.
                      </td>
                    </tr>
                  )}
                  {activeData.transactions.map((row, i) => (
                    <tr key={row.id || i} className="border-b border-neutral-200">
                      {columns.map((c) => (
                        <td key={c.key} className="py-2 pr-4 mono text-xs whitespace-nowrap">
                          {c.fmt ? c.fmt(row[c.key]) : row[c.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
