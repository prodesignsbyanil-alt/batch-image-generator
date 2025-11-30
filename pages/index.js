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
      } catch (e) {
        // ignore
      }
    }
    if (storedIdx) {
      const n = parseInt(storedIdx, 10);
      if (!Number.isNaN(n)) setActiveKeyIndex(n);
    }
  }, []);

  const handleLogin = () => {
    if (!email.trim()) {
      setStatusMessage("Please enter an email to continue.");
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
    setStatusMessage("API keys saved to localStorage in this browser.");
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
    const nextIdx = valid[(start + 1) % valid.length].idx;

    setActiveKeyIndex(nextIdx);
    return valid[(start + 1) % valid.length].k;
  };

  const handleStart = async () => {
    if (!items.length) {
      setStatusMessage("Load some prompts first.");
      return;
    }

    const anyKey = apiKeys.some((k) => k.trim().length > 0);
    if (!anyKey) {
      setStatusMessage("Please set at least one Gemini API key.");
      return;
    }

    setIsRunning(true);
    setStatusMessage("Batch generation running...");

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
          throw new Error("No valid Gemini key found.");
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
    setStatusMessage("Batch generation finished.");
  };

  if (!loggedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-title">{SITE_NAME}</div>
          <div className="login-subtitle">
            Email login is required to use this batch image generator.
          </div>
          <div className="login-form">
            <label className="login-label">
              Work email
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button className="btn btn-primary" onClick={handleLogin}>
              Login
            </button>
          </div>
          <div className="login-footer">
            Your email is only stored in this browser (localStorage). It is not
            sent to any backend.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <div className="app-title">
            {SITE_NAME}
          </div>
          <div className="small-text">
            Batch prompts → Gemini image model → downloadable PNG files
          </div>
        </div>
        <div className="header-right">
          <div className="login-badge">
            <span>Logged in as</span>
            <span className="login-email">{email}</span>
            <div className="login-actions">
              <button className="btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
          <div className="dev-box">
            <span>Developed By</span>
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
              borderRadius: 999,
              border: "1px solid rgba(34,197,94,0.7)",
              background:
                "linear-gradient(90deg, rgba(34,197,94,0.12), rgba(56,189,248,0.12))",
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
                  One prompt per line. They will run sequentially.
                </div>
              </div>
              <div className="status-pill">
                Loaded: {items.length}
              </div>
            </div>

            <textarea
              className="prompt-textarea"
              value={rawPrompts}
              onChange={(e) => setRawPrompts(e.target.value)}
              placeholder={
                "Example:\nMinimal black and white silhouette of a lone tree on a hill\nVector wolf silhouette in front of a moon, white background"
              }
            />

            <div className="prompt-actions">
              <div className="prompt-actions-left">
                <button
                  className="btn btn-primary"
                  disabled={!rawPrompts.trim().length || isRunning}
                  onClick={loadPrompts}
                >
                  Load Prompts
                </button>
                <button
                  className="btn"
                  disabled={isRunning}
                  onClick={resetAll}
                >
                  Reset
                </button>
              </div>
              <div className="small-text">
                Current: {items.length ? currentIndex + 1 : 0} / {items.length}
              </div>
            </div>

            <div className="status-row">
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
              <div className="small-text">
                Completed:{" "}
                {items.filter((i) => i.status === "done").length}
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Generation Controls</div>
                <div className="card-subtitle">
                  Add up to 10 Gemini API keys. The app will rotate through
                  them for each request.
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
                  <div className="api-label">
                    <span>Key {idx + 1}</span>
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

            <div className="api-footer">
              <button className="btn" onClick={saveKeys}>
                Save API Keys
              </button>
              <span>
                Keys are stored only in this browser (localStorage).
              </span>
            </div>
          </section>
        </div>

        <section className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Generation Preview</div>
              <div className="card-subtitle">
                Each generated image with its status, prompt and suggested
                filename.
              </div>
            </div>
          </div>

          <div className="queue-list">
            {!items.length && (
              <div className="small-text">
                No prompts yet. Enter prompts and click "Load Prompts" above.
              </div>
            )}

            {items.map((item) => (
              <div className="preview-item" key={item.id}>
                <div className="preview-header">
                  <div>
                    <div className="preview-index">
                      #{item.id + 1}
                    </div>
                    {item.fileName && (
                      <div className="preview-filename">{item.fileName}</div>
                    )}
                  </div>
                  <div
                    className={
                      "preview-status " +
                      (item.status === "pending"
                        ? "pending"
                        : item.status === "processing"
                        ? "processing"
                        : item.status === "done"
                        ? "done"
                        : "error")
                    }
                  >
                    {item.status}
                  </div>
                </div>
                <div className="preview-prompt">{item.prompt}</div>
                {item.error && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#fecaca",
                      marginTop: 4,
                    }}
                  >
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
                      <span>
                        Your browser controls the final download folder.
                      </span>
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
          Developed by <strong>Anil Chandra</strong> &mdash; Follow:{" "}
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