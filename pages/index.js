import { useEffect, useState } from "react";

const SITE_NAME = "AI Batch Image Studio";

function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 8)
      .join("-") || "image"
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [rawPrompts, setRawPrompts] = useState("");
  const [items, setItems] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [apiKeys, setApiKeys] = useState(Array(10).fill(""));
  const [visibleKeys, setVisibleKeys] = useState(Array(10).fill(false));
  const [statusMessage, setStatusMessage] = useState("");
  const [activeKeyIndex, setActiveKeyIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedEmail = window.localStorage.getItem("batch_email");
    const storedKeys = window.localStorage.getItem("batch_gemini_keys");
    const storedIdx = window.localStorage.getItem("batch_gemini_key_index");
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
      } catch (e) {}
    }
    if (storedIdx) {
      const n = parseInt(storedIdx, 10);
      if (!Number.isNaN(n)) setActiveKeyIndex(n);
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

  const handleApiKeyChange = (idx, value) => {
    const next = [...apiKeys];
    next[idx] = value;
    setApiKeys(next);
  };

  const toggleKeyVisible = (idx) => {
    const next = [...visibleKeys];
    next[idx] = !next[idx];
    setVisibleKeys(next);
  };

  const saveKeys = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("batch_gemini_keys", JSON.stringify(apiKeys));
      window.localStorage.setItem("batch_gemini_key_index", String(activeKeyIndex));
    }
    setStatusMessage("API keys এই ব্রাউজারের localStorage এ সেভ হয়েছে।");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  const loadPrompts = () => {
    const lines = rawPrompts
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const list = lines.map((p, i) => ({
      id: i,
      prompt: p,
      status: "pending",
      imageUrl: null,
      fileName: null,
      error: null,
    }));

    setItems(list);
    setCurrentIndex(0);
  };

  const resetAll = () => {
    setRawPrompts("");
    setItems([]);
    setIsRunning(false);
    setCurrentIndex(0);
    setStatusMessage("");
  };

  const getNextApiKey = () => {
    const valid = apiKeys
      .map((k, idx) => ({ k: k.trim(), idx }))
      .filter((x) => x.k.length > 0);

    if (!valid.length) return null;

    const currentPos = valid.findIndex((v) => v.idx === activeKeyIndex);
    const start = currentPos >= 0 ? currentPos : 0;
    const nextEntry = valid[(start + 1) % valid.length];

    setActiveKeyIndex(nextEntry.idx);
    return nextEntry.k;
  };

  const handleStart = async () => {
    if (!items.length) {
      setStatusMessage("প্রথমে কিছু prompt লোড করুন।");
      return;
    }

    const anyKey = apiKeys.some((k) => k.trim().length > 0);
    if (!anyKey) {
      setStatusMessage("কমপক্ষে একটি Gemini API key দিন।");
      return;
    }

    setIsRunning(true);
    setStatusMessage("Batch generation শুরু হয়েছে...");

    const all = [...items];

    for (let i = 0; i < all.length; i++) {
      setCurrentIndex(i);
      all[i].status = "processing";
      setItems([...all]);

      const prompt = all[i].prompt;
      const baseName = slugify(prompt);
      const fileName = `${String(i + 1).padStart(3, "0")}-${baseName}.png`;

      try {
        const key = getNextApiKey();
        if (!key) {
          throw new Error("কোনো বৈধ Gemini key পাওয়া যায়নি।");
        }

        const resp = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            apiKey: key,
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || "API request failed.");
        }

        const data = await resp.json();
        const imageBase64 = data.imageBase64;
        const finalName = data.fileName || fileName;

        if (!imageBase64) {
          throw new Error("No image data returned.");
        }

        all[i].status = "done";
        all[i].imageUrl = `data:image/png;base64,${imageBase64}`;
        all[i].fileName = finalName;
        all[i].error = null;
      } catch (err) {
        all[i].status = "error";
        all[i].error = err.message || String(err);
      }

      setItems([...all]);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    setIsRunning(false);
    setCurrentIndex(0);
    setStatusMessage("Batch generation শেষ হয়েছে।");
  };

  if (!loggedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-title">{SITE_NAME}</div>
          <div className="login-subtitle">
            এই টুল ব্যবহার করতে আগে আপনার ইমেইল দিয়ে লগইন করুন।
          </div>
          <div className="login-form">
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button className="btn btn-primary" onClick={handleLogin}>
              Login
            </button>
          </div>
          <div className="login-footer">
            ইমেইল কেবল এই ব্রাউজারের localStorage এ সেভ হয়, অন্য কোথাও পাঠানো হয় না।
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <div className="app-title">{SITE_NAME}</div>
          <div className="app-subtitle">
            Batch prompts → Gemini image model → downloadable PNG files
          </div>
        </div>
        <div className="header-right">
          <div className="login-badge">
            <div>Logged in as</div>
            <div className="login-email">{email}</div>
            <button className="btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div className="dev-box">
            <div>Developed By</div>
            <strong>Anil Chandra Barman</strong>
          </div>
        </div>
      </header>

      <main className="app-main">
        {statusMessage && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 12px",
              borderRadius: 9999,
              border: "1px solid rgba(34,197,94,0.7)",
              background:
                "linear-gradient(90deg, rgba(34,197,94,0.15), rgba(56,189,248,0.15))",
              fontSize: 12,
            }}
          >
            {statusMessage}
          </div>
        )}

        <div className="grid-main">
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Prompt Queue</div>
                <div className="card-subtitle">
                  প্রতি লাইনে একটি করে prompt লিখুন।
                </div>
              </div>
              <div className="status-pill">Loaded: {items.length}</div>
            </div>

            <textarea
              className="prompt-textarea"
              value={rawPrompts}
              onChange={(e) => setRawPrompts(e.target.value)}
              placeholder={
                "উদাহরণ:\nMinimal black and white silhouette of a lone tree on a hill\nWolf silhouette in front of a full moon, vector, white background"
              }
            />

            <div className="prompt-actions">
              <div>
                <button
                  className="btn btn-primary"
                  disabled={!rawPrompts.trim().length || isRunning}
                  onClick={loadPrompts}
                >
                  Load Prompts
                </button>{" "}
                <button
                  className="btn"
                  disabled={isRunning}
                  onClick={resetAll}
                >
                  Reset
                </button>
              </div>
              <div>
                Current: {items.length ? currentIndex + 1 : 0} / {items.length}
              </div>
            </div>

            <div className="prompt-actions" style={{ marginTop: 8 }}>
              <div>
                Status:{" "}
                <span
                  className={
                    "status-pill " + (isRunning ? "running" : "")
                  }
                >
                  {isRunning ? "Running..." : "Idle"}
                </span>
              </div>
              <div>
                Completed: {items.filter((i) => i.status === "done").length}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Generation Controls</div>
                <div className="card-subtitle">
                  এখানে Gemini API key গুলো যোগ করুন (সর্বোচ্চ ১০টি)।
                </div>
              </div>
              <button
                className="btn btn-primary"
                disabled={!items.length || isRunning}
                onClick={handleStart}
              >
                {isRunning ? "Running..." : "Start Batch"}
              </button>
            </div>

            <div className="api-grid">
              {apiKeys.map((val, idx) => (
                <div className="api-item" key={idx}>
                  <div>
                    Key {idx + 1}{" "}
                    {activeKeyIndex === idx && (
                      <span style={{ color: "#bbf7d0" }}>(active)</span>
                    )}
                  </div>
                  <div className="api-input-row">
                    <input
                      className="api-input"
                      type={visibleKeys[idx] ? "text" : "password"}
                      value={val}
                      onChange={(e) =>
                        handleApiKeyChange(idx, e.target.value)
                      }
                      placeholder="GEMINI_API_KEY"
                    />
                    <button
                      type="button"
                      className="api-view-btn"
                      onClick={() => toggleKeyVisible(idx)}
                    >
                      {visibleKeys[idx] ? "Hide" : "View"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              <button className="btn" onClick={saveKeys}>
                Save API Keys
              </button>
              <span>Keys কেবল এই ব্রাউজারের localStorage এ সেভ হয়।</span>
            </div>
          </section>
        </div>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Generation Preview</div>
              <div className="card-subtitle">
                প্রতিটি prompt এর status, filename এবং ইমেজ preview এখানে দেখাবে।
              </div>
            </div>
          </div>

          <div className="queue-list">
            {!items.length && (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                এখনো কোনো prompt লোড করা হয়নি।
              </div>
            )}

            {items.map((item) => (
              <div className="preview-item" key={item.id}>
                <div className="preview-header">
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      #{item.id + 1}
                    </div>
                    {item.fileName && (
                      <div className="preview-filename">{item.fileName}</div>
                    )}
                  </div>
                  <div className="preview-status">{item.status}</div>
                </div>
                <div className="preview-prompt">{item.prompt}</div>
                {item.error && (
                  <div style={{ fontSize: 11, color: "#fecaca", marginTop: 4 }}>
                    Error: {item.error}
                  </div>
                )}
                {item.imageUrl && (
                  <div className="preview-image-wrapper">
                    <img
                      src={item.imageUrl}
                      alt={item.fileName || "Generated"}
                      className="preview-image"
                    />
                    <div className="preview-footer">
                      <a
                        className="link-download"
                        href={item.imageUrl}
                        download={item.fileName || "image.png"}
                      >
                        Download
                      </a>
                      <span>ব্রাউজার যে ডাউনলোড ফোল্ডার দেখায় সেখানে সেভ হবে।</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          Developed By <strong>Anil Chandra</strong> — Follow:{" "}
          <a
            className="footer-link"
            href="https://www.facebook.com/anil.chandrabarman.3"
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
        </div>
      </footer>
    </div>
  );
}