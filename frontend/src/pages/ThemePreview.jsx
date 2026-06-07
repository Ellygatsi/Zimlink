import { Phone, Wallet, Storefront, ChatsCircle, Heart } from "@phosphor-icons/react";

const THEMES = [
  {
    key: "A",
    name: "Heritage Bold",
    tagline: "Loud, proud, neo-brutalist",
    background: "#FFF8EC",
    surface: "#FFFFFF",
    text: "#0A0A0A",
    subtext: "#404040",
    accentDot: "#FFCD00",
    border: "#0A0A0A",
    modules: {
      calling:   { bg: "#009639", fg: "#FFFFFF" },
      wallet:    { bg: "#FFCD00", fg: "#0A0A0A" },
      market:    { bg: "#DE2010", fg: "#FFFFFF" },
      community: { bg: "#0A0A0A", fg: "#FFFFFF" },
    },
    btn: { bg: "#0A0A0A", fg: "#FFFFFF" },
    shadow: "4px 4px 0px rgba(0,0,0,1)",
    radius: "12px",
    borderWidth: "2px",
  },
  {
    key: "B",
    name: "Sunset Harare",
    tagline: "Modern fintech polish",
    background: "#FFFAF0",
    surface: "#FFFFFF",
    text: "#1F2937",
    subtext: "#6B7280",
    accentDot: "#F5C518",
    border: "#E5E7EB",
    modules: {
      calling:   { bg: "#00A651", fg: "#FFFFFF" },
      wallet:    { bg: "#F5C518", fg: "#1F2937" },
      market:    { bg: "#E63946", fg: "#FFFFFF" },
      community: { bg: "#1F2937", fg: "#FFFFFF" },
    },
    btn: { bg: "#1F2937", fg: "#FFFFFF" },
    shadow: "0 8px 24px rgba(31, 41, 55, 0.08)",
    radius: "18px",
    borderWidth: "1px",
  },
  {
    key: "C",
    name: "Soapstone",
    tagline: "Earthy, premium, mature",
    background: "#F4EBDC",
    surface: "#FFFDF5",
    text: "#1A1A1A",
    subtext: "#6B5E50",
    accentDot: "#D4A82C",
    border: "#3B2E1F",
    modules: {
      calling:   { bg: "#0B6E4F", fg: "#FFFDF5" },
      wallet:    { bg: "#D4A82C", fg: "#1A1A1A" },
      market:    { bg: "#B7472A", fg: "#FFFDF5" },
      community: { bg: "#2C2C2C", fg: "#FFFDF5" },
    },
    btn: { bg: "#0B6E4F", fg: "#FFFDF5" },
    shadow: "0 6px 16px rgba(59, 46, 31, 0.18)",
    radius: "14px",
    borderWidth: "1.5px",
  },
];

function FlagStripe() {
  return (
    <div style={{ display: "flex", height: "4px", width: "100%" }}>
      <div style={{ flex: 1, background: "#009639" }} />
      <div style={{ flex: 1, background: "#FFCD00" }} />
      <div style={{ flex: 1, background: "#DE2010" }} />
      <div style={{ flex: 1, background: "#0A0A0A" }} />
    </div>
  );
}

function ThemeCard({ t }) {
  const card = (extra = {}) => ({
    background: t.surface,
    border: `${t.borderWidth} solid ${t.border}`,
    borderRadius: t.radius,
    boxShadow: t.shadow,
    padding: "16px",
    ...extra,
  });
  return (
    <div style={{ background: t.background, padding: "20px", borderRadius: "16px", color: t.text, fontFamily: "Satoshi, sans-serif", minHeight: "780px" }}>
      <FlagStripe />
      <div style={{ paddingTop: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontFamily: "Cabinet Grotesk", fontSize: "32px", fontWeight: 900, letterSpacing: "-0.03em" }}>
            ZIM<span style={{ color: t.accentDot }}>·</span>LINK
          </h2>
          <span style={{ fontFamily: "JetBrains Mono", fontSize: "11px", letterSpacing: "0.15em", color: t.subtext, textTransform: "uppercase" }}>
            Theme {t.key}
          </span>
        </div>
        <p style={{ marginTop: "4px", fontSize: "12px", color: t.subtext, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {t.name} · {t.tagline}
        </p>

        {/* Headline */}
        <h1 style={{ margin: "20px 0 4px", fontFamily: "Cabinet Grotesk", fontSize: "44px", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.04em" }}>
          Hey, friend.
        </h1>
        <p style={{ margin: 0, color: t.subtext, fontSize: "13px" }}>
          Calls, money, marketplace, community — Zim Link.
        </p>

        {/* Big wallet card */}
        <div style={card({ background: t.modules.wallet.bg, color: t.modules.wallet.fg, marginTop: "18px" })}>
          <p style={{ fontFamily: "JetBrains Mono", fontSize: "10px", letterSpacing: "0.2em", margin: 0, opacity: 0.7, textTransform: "uppercase" }}>
            Wallet Balance
          </p>
          <p style={{ fontFamily: "JetBrains Mono", fontSize: "44px", fontWeight: 900, margin: "8px 0 0", letterSpacing: "-0.04em" }}>
            $562.90
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontWeight: 800, fontSize: "13px" }}>
            <Wallet size={18} weight="bold" /> Send & Receive
          </div>
        </div>

        {/* Module grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
          <div style={card({ background: t.modules.calling.bg, color: t.modules.calling.fg })}>
            <Phone size={22} weight="bold" />
            <p style={{ fontFamily: "JetBrains Mono", fontSize: "10px", letterSpacing: "0.2em", margin: "10px 0 4px", textTransform: "uppercase", opacity: 0.85 }}>
              Calls
            </p>
            <p style={{ fontFamily: "Cabinet Grotesk", fontSize: "22px", fontWeight: 900, margin: 0 }}>7</p>
            <p style={{ fontSize: "11px", margin: "2px 0 0", opacity: 0.8 }}>+263 ready</p>
          </div>
          <div style={card({ background: t.modules.community.bg, color: t.modules.community.fg })}>
            <ChatsCircle size={22} weight="bold" />
            <p style={{ fontFamily: "JetBrains Mono", fontSize: "10px", letterSpacing: "0.2em", margin: "10px 0 4px", textTransform: "uppercase", opacity: 0.85 }}>
              Community
            </p>
            <p style={{ fontFamily: "Cabinet Grotesk", fontSize: "22px", fontWeight: 900, margin: 0 }}>12</p>
            <p style={{ fontSize: "11px", margin: "2px 0 0", opacity: 0.8 }}>Diaspora posts</p>
          </div>
        </div>

        {/* Marketplace strip */}
        <div style={card({ background: t.modules.market.bg, color: t.modules.market.fg, marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" })}>
          <div>
            <Storefront size={22} weight="bold" />
            <p style={{ fontFamily: "JetBrains Mono", fontSize: "10px", letterSpacing: "0.2em", margin: "10px 0 4px", textTransform: "uppercase", opacity: 0.85 }}>
              Marketplace
            </p>
            <p style={{ fontFamily: "Cabinet Grotesk", fontSize: "18px", fontWeight: 900, margin: 0 }}>
              4 listings live
            </p>
          </div>
          <button style={{
            background: t.surface, color: t.text,
            border: `${t.borderWidth} solid ${t.border}`,
            borderRadius: t.radius, padding: "8px 14px",
            fontWeight: 800, fontSize: "12px",
            boxShadow: t.shadow,
          }}>
            Browse →
          </button>
        </div>

        {/* Sample button row */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          <button style={{
            background: t.btn.bg, color: t.btn.fg,
            border: `${t.borderWidth} solid ${t.border}`,
            borderRadius: t.radius, padding: "10px 18px",
            fontWeight: 800, fontSize: "13px",
            boxShadow: t.shadow, flex: 1,
          }}>
            Call Zimbabwe
          </button>
          <button style={{
            background: t.surface, color: t.text,
            border: `${t.borderWidth} solid ${t.border}`,
            borderRadius: t.radius, padding: "10px 14px",
            fontWeight: 800, fontSize: "13px",
            boxShadow: t.shadow,
          }}>
            <Heart size={14} weight="bold" />
          </button>
        </div>

        {/* Color swatches */}
        <div style={{ marginTop: "20px", display: "flex", gap: "6px" }}>
          {[t.modules.calling.bg, t.modules.wallet.bg, t.modules.market.bg, t.modules.community.bg, t.surface].map((c) => (
            <div key={c} style={{
              flex: 1, height: "24px", borderRadius: "6px",
              background: c, border: `1px solid ${t.border}`,
              fontFamily: "JetBrains Mono", fontSize: "8px",
              color: c === "#FFFFFF" || c === "#FFFDF5" ? t.text : "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{c.toUpperCase()}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ThemePreview() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", padding: "30px", fontFamily: "Satoshi, sans-serif" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Cabinet Grotesk", fontSize: "44px", fontWeight: 900, color: "white", margin: 0, letterSpacing: "-0.03em" }}>
          Pick a theme for Zim Link 🇿🇼
        </h1>
        <p style={{ color: "#a0a0a0", marginTop: "8px", marginBottom: "30px" }}>
          All three use authentic Zimbabwean flag colors — green, gold, red, black, white — applied in different intensities and shapes.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {THEMES.map((t) => <ThemeCard key={t.key} t={t} />)}
        </div>
      </div>
    </div>
  );
}
