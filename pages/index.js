\
import { useEffect, useState } from "react";

const SITE_NAME = "AI Batch Image Studio";

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join("-") || "image";
}

export default function Home() {
  const [rawPrompts, setRawPrompts] = useState("");
  const [items, setItems] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [email, setEmail] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [apiKeys, setApiKeys] = useState(Array(10).fill(""));
  const [visibleKeys, setVisibleKeys] = useState(Array(10).fill(false));
  const [statusMessage, setStatusMessage] = useState("");
  const [activeKeyIndex, setActiveKeyIndex] = useState(0);

  // Load saved data from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedEmail = window.localStorage.getItem("batch_email");
    const storedKeys = window.localStorage.getItem("batch_gemini_keys");
    const storedKeyIndex = window.localStorage.getItem("batch_gemini_key_index");
    if (storedEmail) {
      setEmail(storedEmail);
      setLoggedIn(true);
    }
    if (storedKeys) {
      try {
        const parsed = JSON.parse(storedKeys);
        if (Array.isArray(parsed) && parsed.length === 10) {
          setApiKeys(parsed);
        }
      } catch (e) {
        console.warn("Failed to parse saved keys");
      }
    }
    if (storedKeyIndex) {
      const idxNum = parseInt(storedKeyIndex, 10);
      if (!Number.isNaN(idxNum)) setActiveKeyIndex(idxNum);
    }
  }, []);

  const handleLogin = () => {
    if (!email.trim()) {
      setStatusMessage("দয়া করে একটি ইমেইল লিখুন।");
      return;
    }
    setLoggedIn(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("batch_email", email.trim());
    }
    setStatusMessage("");
  };

  const handleLogout = () => {
    setLoggedIn(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("batch_email");
    }
  };

  const handleToggleKeyVisibility = (index) => {
    const next = [...visibleKeys];
    next[index] = !next[index];
    setVisibleKeys(next);
  };

  const handleApiKeyChange = (index, value) => {
    const next = [...apiKeys];
    next[index] = value;
    setApiKeys(next);
  };

  const handleSaveKeys = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("batch_gemini_keys", JSON.stringify(apiKeys));
      window.localStorage.setItem("batch_gemini_key_index", String(activeKeyIndex));
    }
    setStatusMessage("API keys সফলভাবে সেভ হয়েছে (localStorage)।");
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const handleLoadPrompts = () => {
    const lines = rawPrompts
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const initialItems = lines.map((text, index) => ({
      id: index,
      prompt: text,
      status: "pending",
      imageUrl: null,
      error: null,
      fileName: null,
    }));

    setItems(initialItems);
    setCurrentIndex(0);
  };

  const getNextApiKey = () => {
    const filledIndexes = apiKeys
      .map((k, idx) => ({ key: k.trim(), idx }))
      .filter((k) => k.key.length > 0);

    if (!filledIndexes.length) return null;

    // round-robin based on activeKeyIndex
    let position = activeKeyIndex;
    let tries = 0;
    while (tries < filledIndexes.length) {
      const candidate = (position + tries) % filledIndexes.length;
      const idx = filledIndexes[candidate].idx;
      if (apiKeys[idx].trim().length > 0) {
        setActiveKeyIndex(idx);
        return apiKeys[idx].trim();
      }
      tries++;
    }
    return filledIndexes[0].key;
  };

  const handleStart = async () => {
    if (!items.length) {
      setStatusMessage("প্রথমে কিছু prompt লোড করুন।");
      return;
    }

    const key = getNextApiKey();
    if (!key) {
      setStatusMessage("কমপক্ষে একটি Gemini API key সেট করুন।");
      return;
    }

    setIsRunning(true);
    setStatusMessage("Batch generation চলছে...");

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      setCurrentIndex(i);
      updatedItems[i].status = "processing";
      setItems([...updatedItems]);

      const prompt = updatedItems[i].prompt;
      const fileSlug = slugify(prompt);
      const fileName = `${String(i + 1).padStart(3, "0")}-${fileSlug}.png`;

      try {
        const apiKey = getNextApiKey();
        if (!apiKey) {
          throw new Error("কোনো বৈধ Gemini API key পাওয়া যায়নি।");
        }

        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, apiKey }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "API request failed");
        }

        const data = await res.json();
        const imageUrl = `data:image/png;base64,${data.imageBase64}`;

        updatedItems[i].status = "done";
        updatedItems[i].imageUrl = imageUrl;
        updatedItems[i].fileName = data.fileName || fileName;
        updatedItems[i].error = null;
      } catch (err) {
        updatedItems[i].status = "error";
        updatedItems[i].error = err.message || "Unknown error";
      }

      setItems([...updatedItems]);

      await new Promise((resolve) => setTimeout(resolve, 1800));
    }

    setIsRunning(false);
    setCurrentIndex(0);
    setStatusMessage("Batch generation শেষ হয়েছে।");
  };

  const handleReset = () => {
    setRawPrompts("");
    setItems([]);
    setIsRunning(false);
    setCurrentIndex(0);
    setStatusMessage("");
  };

  const mainContent = (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #020617, #0f172a)",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          borderBottom: "1px solid rgba(148,163,184,0.35)",
          backdropFilter: "blur(14px)",
          background: "rgba(15,23,42,0.92)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          {/* Left: Site name */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "999px",
                background:
                  "radial-gradient(circle at 30% 0, #38bdf8, transparent 55%), radial-gradient(circle at 80% 80%, #6366f1, transparent 55%)",
                boxShadow: "0 0 25px rgba(56,189,248,0.55)",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {SITE_NAME}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                }}
              >
                Batch prompt → Gemini (Imagen) → Image
              </div>
            </div>
          </div>

          {/* Right: login + dev box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div style={{ textAlign: "right" }}>
              {!loggedIn ? (
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <input
                    type="email"
                    placeholder="Work email required"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "999px",
                      border: "1px solid #4b5563",
                      backgroundColor: "#020617",
                      color: "#e5e7eb",
                      fontSize: "13px",
                      minWidth: "210px",
                    }}
                  />
                  <button
                    onClick={handleLogin}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      border: "none",
                      background:
                        "linear-gradient(to right, #22c55e, #16a34a)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                      boxShadow: "0 0 16px rgba(34,197,94,0.45)",
                    }}
                  >
                    Login
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: "13px" }}>
                  <div style={{ color: "#9ca3af" }}>Logged in as</div>
                  <div style={{ fontWeight: 600 }}>{email}</div>
                  <button
                    onClick={handleLogout}
                    style={{
                      marginTop: "4px",
                      padding: "2px 10px",
                      borderRadius: "999px",
                      border: "1px solid #4b5563",
                      background: "transparent",
                      color: "#9ca3af",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(148,163,184,0.55)",
                padding: "8px 12px",
                background:
                  "radial-gradient(circle at 0 0, rgba(59,130,246,0.2), transparent 60%), rgba(15,23,42,0.9)",
                boxShadow: "0 0 18px rgba(37,99,235,0.35)",
                minWidth: "180px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "#9ca3af",
                  marginBottom: "2px",
                }}
              >
                Developed By
              </div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>
                Anil Chandra Barman
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px",
          paddingBottom: "80px",
        }}
      >
        {/* Status bar */}
        {statusMessage && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 12px",
              borderRadius: "999px",
              fontSize: "13px",
              background:
                "linear-gradient(to right, rgba(34,197,94,0.2), rgba(59,130,246,0.15))",
              border: "1px solid rgba(52,211,153,0.6)",
            }}
          >
            {statusMessage}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)",
            gap: "18px",
            alignItems: "flex-start",
          }}
        >
          {/* Left column: prompts + generation controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Prompts card */}
            <section
              style={{
                borderRadius: "18px",
                border: "1px solid rgba(148,163,184,0.35)",
                background:
                  "radial-gradient(circle at 0 0, rgba(59,130,246,0.1), transparent 55%), rgba(15,23,42,0.96)",
                padding: "16px 16px 14px",
                boxShadow: "0 18px 45px rgba(15,23,42,0.8)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "17px", marginBottom: "2px" }}>
                    Prompt Queue
                  </h2>
                  <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                    প্রতি লাইনে একটি করে prompt লিখুন। এগুলো ক্রমানুসারে Gemini Imagen
                    এর মাধ্যমে ইমেজ হবে।
                  </p>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(148,163,184,0.6)",
                    color: "#9ca3af",
                  }}
                >
                  Loaded:{" "}
                  <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
                    {items.length}
                  </span>
                </div>
              </div>

              <textarea
                value={rawPrompts}
                onChange={(e) => setRawPrompts(e.target.value)}
                rows={10}
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  padding: "10px 12px",
                  border: "1px solid rgba(51,65,85,0.9)",
                  resize: "vertical",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  backgroundColor: "#020617",
                  color: "#e5e7eb",
                  outline: "none",
                  boxShadow: "0 0 0 1px rgba(15,23,42,0.9)",
                }}
                placeholder={`এক লাইনে একটি prompt লিখুন, যেমন:\n\nMinimal black and white silhouette of a lone tree on a hill, clean vector style\nRunning wolf silhouette in front of a full moon, white background\n...`}
              />

              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleLoadPrompts}
                    disabled={!rawPrompts.trim().length || isRunning}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "999px",
                      border: "none",
                      cursor:
                        !rawPrompts.trim().length || isRunning
                          ? "not-allowed"
                          : "pointer",
                      background:
                        "linear-gradient(to right, #2563eb, #4f46e5)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "13px",
                      boxShadow: "0 0 20px rgba(59,130,246,0.55)",
                    }}
                  >
                    Load Prompts
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isRunning}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "999px",
                      border: "1px solid rgba(148,163,184,0.7)",
                      background: "transparent",
                      color: "#e5e7eb",
                      fontSize: "13px",
                      cursor: isRunning ? "not-allowed" : "pointer",
                    }}
                  >
                    Reset
                  </button>
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#9ca3af",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <span>
                    Current:{" "}
                    <strong>
                      {items.length ? currentIndex + 1 : 0} / {items.length}
                    </strong>
                  </span>
                  <span>
                    Status:{" "}
                    <strong>
                      {isRunning ? "Running..." : "Idle"}
                    </strong>
                  </span>
                </div>
              </div>
            </section>

            {/* Generation Controls card */}
            <section
              style={{
                borderRadius: "18px",
                border: "1px solid rgba(148,163,184,0.35)",
                background:
                  "radial-gradient(circle at 100% 0, rgba(59,130,246,0.18), transparent 60%), rgba(15,23,42,0.96)",
                padding: "16px",
                boxShadow: "0 18px 45px rgba(15,23,42,0.85)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "17px", marginBottom: "2px" }}>
                    Generation Controls
                  </h2>
                  <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                    এখানে Gemini API keys রাখুন। একাধিক key থাকলে অ্যাপটি সেগুলো
                    round-robin ভাবে ব্যবহার করবে।
                  </p>
                </div>
                <button
                  onClick={handleStart}
                  disabled={!items.length || isRunning}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: !items.length || isRunning ? "not-allowed" : "pointer",
                    background: isRunning
                      ? "linear-gradient(to right, #6b7280, #4b5563)"
                      : "linear-gradient(to right, #22c55e, #16a34a)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "13px",
                    boxShadow: isRunning
                      ? "none"
                      : "0 0 20px rgba(34,197,94,0.6)",
                    minWidth: "140px",
                  }}
                >
                  {isRunning ? "Running..." : "Start Batch"}
                </button>
              </div>

              <div
                style={{
                  borderRadius: "12px",
                  border: "1px solid rgba(51,65,85,0.9)",
                  padding: "10px 10px 6px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  background:
                    "radial-gradient(circle at 0 0, rgba(15,23,42,0.9), rgba(15,23,42,1))",
                }}
              >
                {apiKeys.map((value, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        minWidth: "60px",
                        color:
                          activeKeyIndex === index ? "#a5b4fc" : "#9ca3af",
                      }}
                    >
                      Key {index + 1}
                      {activeKeyIndex === index && (
                        <span style={{ marginLeft: 4, fontSize: 10 }}>
                          (active)
                        </span>
                      )}
                    </div>
                    <input
                      type={visibleKeys[index] ? "text" : "password"}
                      value={value}
                      onChange={(e) => handleApiKeyChange(index, e.target.value)}
                      placeholder="GEMINI_API_KEY"
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        borderRadius: "999px",
                        border: "1px solid rgba(55,65,81,0.9)",
                        backgroundColor: "#020617",
                        color: "#e5e7eb",
                        fontSize: "12px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleKeyVisibility(index)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "999px",
                        border: "1px solid rgba(75,85,99,0.9)",
                        background: "transparent",
                        color: "#e5e7eb",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      {visibleKeys[index] ? "Hide" : "View"}
                    </button>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <button
                  onClick={handleSaveKeys}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "999px",
                    border: "1px solid rgba(59,130,246,0.8)",
                    background:
                      "linear-gradient(to right, rgba(37,99,235,0.1), rgba(79,70,229,0.3))",
                    color: "#e5e7eb",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Save API Keys
                </button>
                <p style={{ fontSize: "11px", color: "#9ca3af" }}>
                  নোট: Keys গুলো ব্রাউজারের localStorage এ সেভ হবে; আলাদা সার্ভারে
                  স্টোর হয় না।
                </p>
              </div>
            </section>
          </div>

          {/* Right column: results */}
          <section
            style={{
              borderRadius: "18px",
              border: "1px solid rgba(148,163,184,0.35)",
              background:
                "radial-gradient(circle at 100% 0, rgba(56,189,248,0.18), transparent 55%), rgba(15,23,42,0.98)",
              padding: "16px",
              boxShadow: "0 18px 45px rgba(15,23,42,0.85)",
              maxHeight: "640px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "17px", marginBottom: "2px" }}>
                  Generation Preview
                </h2>
                <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                  সব জেনারেট হওয়া ইমেজ, ফাইল নাম এবং স্ট্যাটাস এখানে দেখাবে।
                </p>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  border: "1px solid rgba(148,163,184,0.7)",
                  color: "#9ca3af",
                }}
              >
                Completed:{" "}
                <span style={{ color: "#22c55e", fontWeight: 600 }}>
                  {items.filter((i) => i.status === "done").length}
                </span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                marginTop: "4px",
                borderRadius: "12px",
                border: "1px solid rgba(51,65,85,0.9)",
                backgroundColor: "#020617",
                overflowY: "auto",
                padding: "8px",
              }}
            >
              {!items.length && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#9ca3af",
                    padding: "12px",
                  }}
                >
                  এখনো কোনো prompt লোড করা হয়নি। বাম দিক থেকে prompt লিখে{" "}
                  <strong>Load Prompts</strong> ক্লিক করুন।
                </div>
              )}

              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: "10px",
                    padding: "8px",
                    borderBottom: "1px solid rgba(31,41,55,0.9)",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "12px",
                        marginBottom: "4px",
                        color: "#e5e7eb",
                      }}
                    >
                      <strong>#{item.id + 1}</strong> — {item.prompt}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        marginBottom: "2px",
                      }}
                    >
                      Status:{" "}
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            item.status === "done"
                              ? "#22c55e"
                              : item.status === "error"
                              ? "#f97316"
                              : item.status === "processing"
                              ? "#38bdf8"
                              : "#9ca3af",
                        }}
                      >
                        {item.status}
                      </span>
                      {item.error && (
                        <span style={{ color: "#f97316", marginLeft: 6 }}>
                          ({item.error})
                        </span>
                      )}
                    </div>
                    {item.fileName && (
                      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                        File name:{" "}
                        <span style={{ color: "#e5e7eb" }}>{item.fileName}</span>
                      </div>
                    )}
                    {item.imageUrl && (
                      <div style={{ marginTop: "6px" }}>
                        <a
                          href={item.imageUrl}
                          download={item.fileName || `image-${item.id + 1}.png`}
                          style={{
                            fontSize: "11px",
                            textDecoration: "underline",
                            color: "#38bdf8",
                          }}
                        >
                          Download image
                        </a>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#6b7280",
                            marginLeft: "4px",
                          }}
                        >
                          (ব্রাউজার থেকে আপনি যে ফোল্ডার সিলেক্ট করবেন সেখানে সেভ হবে)
                        </span>
                      </div>
                    )}
                  </div>
                  {item.imageUrl && (
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1px solid rgba(55,65,81,0.9)",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={item.imageUrl}
                        alt={`Preview ${item.id + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: "26px",
            borderTop: "1px dashed rgba(55,65,81,0.9)",
            paddingTop: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#9ca3af",
          }}
        >
          <div>
            Developed By{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              Anil Chandra
            </span>{" "}
            | Follow:{" "}
            <a
              href="https://www.facebook.com/anil.chandrabarman.3"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#38bdf8", textDecoration: "underline" }}
            >
              Facebook Profile
            </a>
          </div>
          <div style={{ fontSize: "11px" }}>
            Frontend-only login (email required to use generator)
          </div>
        </footer>
      </div>
    </main>
  );

  if (!loggedIn) {
    // Show the full main layout but blur the content, with a centered login notice
    return (
      <div style={{ position: "relative" }}>
        <div style={{ filter: "blur(3px)", pointerEvents: "none" }}>
          {mainContent}
        </div>
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              borderRadius: "20px",
              border: "1px solid rgba(148,163,184,0.6)",
              background:
                "radial-gradient(circle at 0 0, rgba(59,130,246,0.35), transparent 55%), rgba(15,23,42,0.98)",
              padding: "20px 20px 18px",
              boxShadow: "0 25px 70px rgba(15,23,42,0.95)",
              color: "#e5e7eb",
              fontFamily:
                "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                marginBottom: "6px",
                textAlign: "center",
              }}
            >
              Email Login Required
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#cbd5f5",
                textAlign: "center",
                marginBottom: "14px",
              }}
            >
              এই টুল ব্যবহার করতে আগে আপনার ইমেইল দিয়ে লগইন করুন। লগইন করার পরই
              আপনি prompt লোড এবং ইমেজ জেনারেট করতে পারবেন।
            </p>
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 10px",
                  borderRadius: "999px",
                  border: "1px solid rgba(55,65,81,0.9)",
                  backgroundColor: "#020617",
                  color: "#e5e7eb",
                  fontSize: "13px",
                }}
              />
              <button
                onClick={handleLogin}
                style={{
                  padding: "9px 16px",
                  borderRadius: "999px",
                  border: "none",
                  background:
                    "linear-gradient(to right, #22c55e, #16a34a)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Login
              </button>
            </div>
            <p
              style={{
                fontSize: "11px",
                color: "#9ca3af",
                textAlign: "center",
              }}
            >
              ইমেইলটি শুধু এই ব্রাউজারে localStorage এ সেভ হবে, অন্য কোথাও পাঠানো
              হবে না।
            </p>
          </div>
        </div>
      </div>
    );
  }

  return mainContent;
}
