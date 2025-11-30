import { useState } from "react";

export default function Home() {
  const [rawPrompts, setRawPrompts] = useState("");
  const [items, setItems] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

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
    }));

    setItems(initialItems);
    setCurrentIndex(0);
  };

  const handleStart = async () => {
    if (!items.length) return;
    setIsRunning(true);

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      setCurrentIndex(i);
      updatedItems[i].status = "processing";
      setItems([...updatedItems]);

      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: updatedItems[i].prompt }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "API request failed");
        }

        const data = await res.json();
        const imageUrl = `data:image/png;base64,${data.imageBase64}`;

        updatedItems[i].status = "done";
        updatedItems[i].imageUrl = imageUrl;
        updatedItems[i].error = null;
      } catch (err) {
        updatedItems[i].status = "error";
        updatedItems[i].error = err.message || "Unknown error";
      }

      setItems([...updatedItems]);

      // ছোট একটা delay রাখা হয়েছে যেন API rate‑limit একটু safe থাকে
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    setIsRunning(false);
    setCurrentIndex(0);
  };

  const handleReset = () => {
    setRawPrompts("");
    setItems([]);
    setIsRunning(false);
    setCurrentIndex(0);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>
          Batch AI Image Generator
        </h1>
        <p style={{ marginBottom: "24px", color: "#555" }}>
          এখানে এক লাইনে একটি করে prompt লিখে “Load Prompts” চাপুন, তারপর
          “Start Batch” দিয়ে এক এক করে সব prompt থেকে ইমেজ জেনারেট করতে পারেন।
          আপনার OPENAI_API_KEY আগে Vercel / লোকাল .env এ সেট করে নিন।
        </p>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Prompts (প্রতি লাইনে ১টি):
            </label>
            <textarea
              value={rawPrompts}
              onChange={(e) => setRawPrompts(e.target.value)}
              rows={14}
              style={{
                width: "100%",
                borderRadius: "8px",
                padding: "12px",
                border: "1px solid #ddd",
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: "14px",
              }}
              placeholder={`এক লাইনে এক প্রম্পট, যেমন:

A minimal black and white silhouette of a lone tree on a hill
A running wolf silhouette in front of a full moon
...`}
            />
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <button
                onClick={handleLoadPrompts}
                disabled={!rawPrompts.trim().length || isRunning}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                Load Prompts
              </button>
              <button
                onClick={handleReset}
                disabled={isRunning && items.length > 0}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  cursor: isRunning && items.length > 0 ? "not-allowed" : "pointer",
                  backgroundColor: "#ffffff",
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div
            style={{
              borderRadius: "8px",
              border: "1px solid #eee",
              padding: "16px",
              backgroundColor: "#fafafa",
            }}
          >
            <h2 style={{ fontSize: "18px", marginBottom: "12px" }}>
              Batch Controls
            </h2>
            <p style={{ fontSize: "14px", marginBottom: "8px" }}>
              Loaded prompts: <strong>{items.length}</strong>
            </p>
            <p style={{ fontSize: "14px", marginBottom: "16px" }}>
              Current index:{" "}
              <strong>
                {items.length ? currentIndex + 1 : 0} / {items.length}
              </strong>
            </p>

            <button
              onClick={handleStart}
              disabled={!items.length || isRunning}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                cursor: !items.length || isRunning ? "not-allowed" : "pointer",
                backgroundColor: isRunning ? "#9ca3af" : "#16a34a",
                color: "#fff",
                fontWeight: 600,
                width: "100%",
                marginBottom: "12px",
              }}
            >
              {isRunning ? "Running..." : "Start Batch"}
            </button>

            <p
              style={{
                fontSize: "12px",
                color: "#777",
                lineHeight: 1.5,
              }}
            >
              ⚠️ একবারে অনেক প্রম্পট দিলে সময় বেশি লাগবে এবং OpenAI rate‑limit
              এড়াতে এখানে প্রতিটি কলের মাঝে সামান্য delay রাখা হয়েছে। দরকার হলে
              আপনি কোডে delay কম/বেশি করতে পারবেন।
            </p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
            Result Status
          </h2>
          {!items.length && (
            <p style={{ color: "#666" }}>
              এখনো কোনো prompt লোড করা হয়নি। প্রথমে উপরে prompt লিখে “Load
              Prompts” ক্লিক করুন।
            </p>
          )}

          {items.length > 0 && (
            <div
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                borderRadius: "8px",
                border: "1px solid #eee",
                padding: "8px",
                backgroundColor: "#fff",
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "8px",
                    borderBottom: "1px solid #f0f0f0",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        marginBottom: "4px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <strong>Prompt {item.id + 1}:</strong> {item.prompt}
                    </div>
                    <div style={{ fontSize: "12px" }}>
                      Status:{" "}
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            item.status === "done"
                              ? "#16a34a"
                              : item.status === "error"
                              ? "#dc2626"
                              : item.status === "processing"
                              ? "#2563eb"
                              : "#6b7280",
                        }}
                      >
                        {item.status}
                      </span>
                      {item.error && (
                        <span style={{ color: "#dc2626", marginLeft: "8px" }}>
                          ({item.error})
                        </span>
                      )}
                    </div>
                    {item.imageUrl && (
                      <div style={{ marginTop: "6px" }}>
                        <a
                          href={item.imageUrl}
                          download={`image_${item.id + 1}.png`}
                          style={{
                            fontSize: "12px",
                            textDecoration: "underline",
                            color: "#2563eb",
                          }}
                        >
                          Download image
                        </a>
                      </div>
                    )}
                  </div>
                  {item.imageUrl && (
                    <div
                      style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid #eee",
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
          )}
        </section>
      </div>
    </main>
  );
}
