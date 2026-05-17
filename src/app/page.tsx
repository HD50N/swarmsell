"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PLATFORMS = [
  { id: "amazon",   label: "Amazon",   color: "#FF9900" },
  { id: "etsy",     label: "Etsy",     color: "#F1641E" },
  { id: "ebay",     label: "eBay",     color: "#E53238" },
  { id: "walmart",  label: "Walmart",  color: "#0071CE" },
];

const CATEGORIES = [
  "Jewelry & Accessories",
  "Clothing & Apparel",
  "Home Decor",
  "Candles & Beauty",
  "Art & Collectibles",
  "Electronics",
  "Sports & Outdoors",
  "Food & Gourmet",
  "Toys & Games",
  "Other",
];

const STATS = [
  { value: "4", label: "platforms" },
  { value: "10", label: "agents" },
  { value: "live", label: "market data" },
];

type AgentStatus = "idle" | "launching";

const DEMO_PRODUCT = {
  name: "Hand-Poured Soy Candle — Lavender & Cedar (8 oz)",
  category: "Candles & Beauty",
  description:
    "Small-batch soy candle in a reusable amber jar. 45+ hour burn, cotton wick, phthalate-free fragrance. Made in the USA. Good for home office, gifts, and self-care.",
  cost: "4.25",
  margin: "40",
  platforms: ["amazon", "etsy", "ebay", "walmart"],
  images: [] as string[],
};

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [margin, setMargin] = useState("40");
  const [platforms, setPlatforms] = useState<Set<string>>(
    new Set(["amazon", "etsy", "ebay", "walmart"])
  );
  const [images, setImages] = useState<{ preview: string; b64: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<AgentStatus>("idle");

  const togglePlatform = (id: string) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const processFiles = useCallback((files: File[]) => {
    files.filter((f) => f.type.startsWith("image/")).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        setImages((prev) => [
          ...prev,
          { preview: data, b64: data.split(",")[1] },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(Array.from(e.dataTransfer.files));
    },
    [processFiles]
  );

  const canLaunch = name.trim() && category && platforms.size > 0;

  const saveAndGoToDashboard = (payload: {
    name: string;
    category: string;
    description: string;
    cost: string;
    margin: string;
    platforms: string[];
    images: string[];
  }) => {
    localStorage.setItem("swarmsell-product", JSON.stringify(payload));
    router.push("/dashboard");
  };

  const handleLaunch = () => {
    if (!canLaunch || status === "launching") return;
    setStatus("launching");
    saveAndGoToDashboard({
      name,
      category,
      description,
      cost,
      margin,
      platforms: Array.from(platforms),
      images: images.map((i) => i.b64),
    });
  };

  const handleViewDemoDashboard = () => {
    if (status === "launching") return;
    setName(DEMO_PRODUCT.name);
    setCategory(DEMO_PRODUCT.category);
    setDescription(DEMO_PRODUCT.description);
    setCost(DEMO_PRODUCT.cost);
    setMargin(DEMO_PRODUCT.margin);
    setPlatforms(new Set(DEMO_PRODUCT.platforms));
    setImages([]);
    saveAndGoToDashboard(DEMO_PRODUCT);
  };

  const inputBase: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--edge)",
    borderRadius: 6,
    color: "var(--text)",
    fontSize: 14,
    padding: "10px 14px",
    width: "100%",
    transition: "border-color 0.2s",
  };

  const focusAmber = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "var(--amber)");
  const blurEdge = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "var(--edge)");

  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>
      {/* ─── HEADER ─────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--edge)",
          background: "var(--void)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}
          className="flex items-center justify-between h-14"
        >
          <div className="flex items-center gap-3">
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: "var(--amber)",
              }}
            >
              SWARMSELL
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--sub)",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-mono)",
              }}
            >
              v2.0 · MULTI-PLATFORM SELLER KIT
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "var(--signal)",
                  animation: "pulseLive 2s ease infinite",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--sub)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>
                BROWSERBASE READY
              </span>
            </div>
            <button
              type="button"
              onClick={handleViewDemoDashboard}
              disabled={status === "launching"}
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                color: "var(--amber)",
                border: "1px solid rgba(240,160,40,0.35)",
                borderRadius: 6,
                padding: "6px 14px",
                background: "rgba(240,160,40,0.07)",
                cursor: status === "launching" ? "not-allowed" : "pointer",
                opacity: status === "launching" ? 0.6 : 1,
                transition: "background 0.2s",
              }}
            >
              VIEW DEMO DASHBOARD →
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO ───────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 32px 56px" }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--amber)",
            letterSpacing: "0.18em",
            fontFamily: "var(--font-mono)",
            marginBottom: 24,
            animation: "fadeUp 0.5s ease both",
          }}
        >
          ◆ SWARM INTELLIGENCE FOR SMALL BUSINESS
        </div>

        <h1
          style={{
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: "-0.03em",
            marginBottom: 20,
            animation: "fadeUp 0.5s 0.1s ease both",
            opacity: 0,
          }}
        >
          <span style={{ fontSize: "clamp(52px, 7vw, 96px)", display: "block", color: "var(--text)" }}>
            List everywhere.
          </span>
          <span style={{ fontSize: "clamp(52px, 7vw, 96px)", display: "block", color: "var(--amber)" }}>
            In 60 seconds.
          </span>
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "var(--sub)",
            maxWidth: 560,
            lineHeight: 1.65,
            marginBottom: 40,
            animation: "fadeUp 0.5s 0.2s ease both",
            opacity: 0,
          }}
        >
          Browserbase scouts live competitor prices on every platform.
          Claude writes your listings. Everything fires simultaneously —
          Amazon, Etsy, eBay, Walmart, Facebook.
        </p>

        {/* Stats */}
        <div
          className="flex items-center gap-8"
          style={{ marginBottom: 40, animation: "fadeUp 0.5s 0.3s ease both", opacity: 0 }}
        >
          {STATS.map((s, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "var(--text)",
                  letterSpacing: "-0.02em",
                }}
              >
                {s.value}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--sub)",
                  letterSpacing: "0.1em",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </span>
              {i < STATS.length - 1 && (
                <span style={{ color: "var(--rim)", marginLeft: 8 }}>·</span>
              )}
            </div>
          ))}
        </div>

        {/* Platform badges row */}
        <div
          className="flex flex-wrap gap-2"
          style={{ animation: "fadeUp 0.5s 0.4s ease both", opacity: 0 }}
        >
          {PLATFORMS.map((p) => (
            <div
              key={p.id}
              style={{
                border: `1px solid var(--edge)`,
                borderRadius: 4,
                padding: "4px 12px",
                fontSize: 11,
                letterSpacing: "0.1em",
                fontFamily: "var(--font-mono)",
                color: p.color,
                background: `${p.color}10`,
              }}
            >
              {p.label.toUpperCase()}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FORM ───────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 32px 80px",
          animation: "fadeUp 0.6s 0.35s ease both",
          opacity: 0,
        }}
      >
        <div
          style={{
            border: "1px solid var(--edge)",
            borderRadius: 12,
            background: "var(--panel)",
            overflow: "hidden",
          }}
        >
          {/* Form header */}
          <div
            style={{
              borderBottom: "1px solid var(--edge)",
              padding: "20px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--sub)",
                  letterSpacing: "0.12em",
                  fontFamily: "var(--font-mono)",
                  marginBottom: 4,
                }}
              >
                STEP 1 OF 1
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                Tell us about your product
              </h2>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--dim)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}
            >
              {platforms.size} platform{platforms.size !== 1 ? "s" : ""} selected
            </div>
          </div>

          <div style={{ padding: "28px" }}>
            {/* Row 1: Name + Category */}
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--sub)", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", display: "block", marginBottom: 8 }}>
                  PRODUCT NAME *
                </label>
                <input
                  style={inputBase}
                  placeholder="e.g. Handmade Silver Ring"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={focusAmber}
                  onBlur={blurEdge}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--sub)", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", display: "block", marginBottom: 8 }}>
                  CATEGORY *
                </label>
                <select
                  style={{ ...inputBase, cursor: "pointer" }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  onFocus={focusAmber}
                  onBlur={blurEdge}
                >
                  <option value="" disabled style={{ background: "var(--surface)" }}>
                    Select a category...
                  </option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} style={{ background: "var(--surface)" }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: "var(--sub)", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", display: "block", marginBottom: 8 }}>
                PRODUCT DESCRIPTION
              </label>
              <textarea
                style={{ ...inputBase, resize: "vertical", minHeight: 100 }}
                placeholder="Describe your product — materials, process, what makes it special..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={focusAmber as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
                onBlur={blurEdge as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
              />
            </div>

            {/* Row 2: Cost + Margin */}
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--sub)", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", display: "block", marginBottom: 8 }}>
                  SUPPLIER COST ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputBase}
                  placeholder="8.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  onFocus={focusAmber}
                  onBlur={blurEdge}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--sub)", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", display: "block", marginBottom: 8 }}>
                  TARGET MARGIN (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  style={inputBase}
                  placeholder="40"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  onFocus={focusAmber}
                  onBlur={blurEdge}
                />
              </div>
            </div>

            {/* Platform selector */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: "var(--sub)", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", display: "block", marginBottom: 12 }}>
                TARGET PLATFORMS *
              </label>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((p) => {
                  const active = platforms.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      style={{
                        border: `1px solid ${active ? p.color + "60" : "var(--edge)"}`,
                        borderRadius: 6,
                        padding: "8px 18px",
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active ? p.color : "var(--sub)",
                        background: active ? p.color + "12" : "var(--surface)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image upload */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ fontSize: 11, color: "var(--sub)", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", display: "block", marginBottom: 12 }}>
                PRODUCT PHOTOS
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                style={{
                  border: `1px dashed ${isDragging ? "var(--amber)" : "var(--rim)"}`,
                  borderRadius: 8,
                  padding: images.length ? "16px" : "36px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: isDragging ? "var(--amber-glow)" : "var(--surface)",
                  transition: "all 0.2s",
                  minHeight: images.length ? "auto" : 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {images.length > 0 ? (
                  <div className="flex flex-wrap gap-3 justify-center w-full">
                    {images.map((img, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img
                          src={img.preview}
                          alt=""
                          style={{
                            width: 72,
                            height: 72,
                            objectFit: "cover",
                            borderRadius: 6,
                            border: "1px solid var(--rim)",
                          }}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); setImages((prev) => prev.filter((_, j) => j !== i)); }}
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "var(--dim)",
                            border: "none",
                            color: "var(--text)",
                            fontSize: 10,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 6,
                        border: "1px dashed var(--rim)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--sub)",
                        fontSize: 22,
                      }}
                    >
                      +
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
                    <div style={{ fontSize: 14, color: "var(--sub)" }}>
                      Drop product photos here, or click to browse
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--dim)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      JPG, PNG, WEBP · MAX 10MB EACH
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => processFiles(Array.from(e.target.files || []))}
              />
            </div>

            {/* Launch button */}
            <button
              onClick={handleLaunch}
              disabled={!canLaunch || status === "launching"}
              style={{
                width: "100%",
                padding: "18px 32px",
                borderRadius: 8,
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.14em",
                cursor: canLaunch && status !== "launching" ? "pointer" : "not-allowed",
                background:
                  canLaunch && status !== "launching"
                    ? "var(--amber)"
                    : "var(--surface)",
                color:
                  canLaunch && status !== "launching"
                    ? "#07070C"
                    : "var(--dim)",
                transition: "all 0.25s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transform:
                  canLaunch && status !== "launching" ? "scale(1)" : "scale(0.99)",
              }}
            >
              {status === "launching" ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(7,7,12,0.3)",
                      borderTopColor: "#07070C",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  LAUNCHING...
                </>
              ) : (
                <>◆ LAUNCH SWARM</>
              )}
            </button>

            {!canLaunch && (
              <p
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: "var(--dim)",
                  fontFamily: "var(--font-mono)",
                  marginTop: 12,
                  letterSpacing: "0.06em",
                }}
              >
                Fill in product name, category, and select at least one platform to launch
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--edge)",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--dim)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
          }}
        >
          SWARMSELL · POWERED BY CLAUDE + BROWSERBASE · UNCOMMON HACKS 2026
        </span>
      </footer>
    </div>
  );
}
