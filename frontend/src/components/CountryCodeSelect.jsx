import { useMemo, useRef, useState, useEffect } from "react";
import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";

// A compact but broad list of countries: ISO2 code, dial code, and name.
// Flags are rendered from the ISO2 code at runtime (no need to store emoji).
export const COUNTRIES = [
  { iso2: "ZW", dial: "+263", name: "Zimbabwe" },
  { iso2: "ZA", dial: "+27", name: "South Africa" },
  { iso2: "GB", dial: "+44", name: "United Kingdom" },
  { iso2: "US", dial: "+1", name: "United States" },
  { iso2: "CA", dial: "+1", name: "Canada" },
  { iso2: "AU", dial: "+61", name: "Australia" },
  { iso2: "NZ", dial: "+64", name: "New Zealand" },
  { iso2: "IE", dial: "+353", name: "Ireland" },
  { iso2: "BW", dial: "+267", name: "Botswana" },
  { iso2: "ZM", dial: "+260", name: "Zambia" },
  { iso2: "MW", dial: "+265", name: "Malawi" },
  { iso2: "MZ", dial: "+258", name: "Mozambique" },
  { iso2: "NA", dial: "+264", name: "Namibia" },
  { iso2: "SZ", dial: "+268", name: "Eswatini" },
  { iso2: "LS", dial: "+266", name: "Lesotho" },
  { iso2: "KE", dial: "+254", name: "Kenya" },
  { iso2: "TZ", dial: "+255", name: "Tanzania" },
  { iso2: "UG", dial: "+256", name: "Uganda" },
  { iso2: "RW", dial: "+250", name: "Rwanda" },
  { iso2: "NG", dial: "+234", name: "Nigeria" },
  { iso2: "GH", dial: "+233", name: "Ghana" },
  { iso2: "EG", dial: "+20", name: "Egypt" },
  { iso2: "ET", dial: "+251", name: "Ethiopia" },
  { iso2: "DE", dial: "+49", name: "Germany" },
  { iso2: "FR", dial: "+33", name: "France" },
  { iso2: "NL", dial: "+31", name: "Netherlands" },
  { iso2: "BE", dial: "+32", name: "Belgium" },
  { iso2: "ES", dial: "+34", name: "Spain" },
  { iso2: "PT", dial: "+351", name: "Portugal" },
  { iso2: "IT", dial: "+39", name: "Italy" },
  { iso2: "CH", dial: "+41", name: "Switzerland" },
  { iso2: "SE", dial: "+46", name: "Sweden" },
  { iso2: "NO", dial: "+47", name: "Norway" },
  { iso2: "DK", dial: "+45", name: "Denmark" },
  { iso2: "FI", dial: "+358", name: "Finland" },
  { iso2: "PL", dial: "+48", name: "Poland" },
  { iso2: "AT", dial: "+43", name: "Austria" },
  { iso2: "GR", dial: "+30", name: "Greece" },
  { iso2: "AE", dial: "+971", name: "United Arab Emirates" },
  { iso2: "SA", dial: "+966", name: "Saudi Arabia" },
  { iso2: "QA", dial: "+974", name: "Qatar" },
  { iso2: "IN", dial: "+91", name: "India" },
  { iso2: "PK", dial: "+92", name: "Pakistan" },
  { iso2: "CN", dial: "+86", name: "China" },
  { iso2: "JP", dial: "+81", name: "Japan" },
  { iso2: "KR", dial: "+82", name: "South Korea" },
  { iso2: "SG", dial: "+65", name: "Singapore" },
  { iso2: "MY", dial: "+60", name: "Malaysia" },
  { iso2: "PH", dial: "+63", name: "Philippines" },
  { iso2: "BR", dial: "+55", name: "Brazil" },
  { iso2: "MX", dial: "+52", name: "Mexico" },
  { iso2: "AR", dial: "+54", name: "Argentina" },
].sort((a, b) => a.name.localeCompare(b.name));

function flagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...iso2.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0))
  );
}

export default function CountryCodeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const selected =
    COUNTRIES.find((c) => c.iso2 === value?.iso2) ||
    COUNTRIES.find((c) => c.iso2 === "ZW");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.dial.includes(s) ||
        c.iso2.toLowerCase().includes(s)
    );
  }, [search]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (country) => {
    onChange(country);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-11 px-3 rounded-lg bg-white border border-neutral-200 text-black flex items-center gap-2 outline-none focus:border-green-600"
      >
        <span className="text-lg leading-none">{flagEmoji(selected.iso2)}</span>
        <span className="text-sm font-medium">{selected.dial}</span>
        <CaretDown size={14} weight="bold" className="text-neutral-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 max-h-80 rounded-xl bg-white border border-neutral-200 shadow-xl flex flex-col">
          <div className="p-2 border-b border-neutral-100">
            <div className="flex items-center gap-2 h-9 px-2 rounded-lg bg-neutral-100">
              <MagnifyingGlass size={16} className="text-neutral-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code"
                className="bg-transparent outline-none text-sm flex-1 text-black"
              />
            </div>
          </div>

          <div className="overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-neutral-400">No matches</p>
            )}

            {filtered.map((c) => (
              <button
                key={c.iso2}
                type="button"
                onClick={() => select(c)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                  c.iso2 === selected.iso2 ? "bg-green-50" : ""
                }`}
              >
                <span className="text-lg leading-none">{flagEmoji(c.iso2)}</span>
                <span className="flex-1 text-black">{c.name}</span>
                <span className="text-neutral-400">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
