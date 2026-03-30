import React, { useState } from "react";

const SUGGESTIONS = [
  "Where am I overspending?",
  "How can I save more?",
  "Which subscription should I cancel?",
  "Am I on track with my budget?",
];

const FREE_MODELS = [
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-3-4b-it:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
];

export default function AIInsights({ expenses, subs, budget, month }) {
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const buildContext = () => {
    const filteredExpenses = month === "All"
      ? expenses
      : expenses.filter((e) => e.month === month);
    const filteredSubs = month === "All"
      ? subs
      : subs.filter((s) => s.month === month);

    const totalSpent = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalSubs = filteredSubs.reduce((s, e) => s + Number(e.amount), 0);
    const currentBudget = budget[month] || 0;

    const categoryBreakdown = {};
    filteredExpenses.forEach((e) => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + Number(e.amount);
    });

    return { filteredExpenses, filteredSubs, totalSpent, totalSubs, currentBudget, categoryBreakdown };
  };

  // 🔁 Try multiple models if one fails with 429
  const callAI = async (messages) => {
    for (const model of FREE_MODELS) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.REACT_APP_OPENROUTER_KEY}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Expense Tracker",
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 800,
          }),
        });

        const data = await response.json();

        // If rate limited, try next model
        if (response.status === 429) {
          console.log(`Model ${model} rate limited, trying next...`);
          continue;
        }

        // If error in response, try next model
        if (data.error) {
          console.log(`Model ${model} error:`, data.error.message);
          continue;
        }

        const text = data.choices?.[0]?.message?.content;
        if (text) return text;

      } catch (err) {
        console.log(`Model ${model} failed:`, err.message);
        continue;
      }
    }
    return null;
  };

  const generateInsights = async () => {
    setLoading(true);
    setAsked(true);

    const { filteredExpenses, filteredSubs, totalSpent, totalSubs, currentBudget, categoryBreakdown } = buildContext();

    const prompt = `You are a smart personal finance advisor for an Indian user.

Here is their expense data for ${month === "All" ? "all months" : month}:

Total Spent on Expenses: ₹${totalSpent}
Total Subscriptions: ₹${totalSubs}
Monthly Budget: ₹${currentBudget}
Remaining Budget: ₹${currentBudget - totalSpent - totalSubs}

Category Breakdown:
${Object.entries(categoryBreakdown).map(([k, v]) => `- ${k}: ₹${v}`).join("\n") || "No data"}

Subscriptions:
${filteredSubs.map((s) => `- ${s.title}: ₹${s.amount}/mo`).join("\n") || "None"}

Recent Expenses:
${filteredExpenses.slice(0, 10).map((e) => `- ${e.title} (${e.category}): ₹${e.amount}`).join("\n") || "None"}

Give 4-5 specific, actionable insights about their spending. Be friendly and concise. Use ₹ for currency. Use bullet points (•). Point out red flags and give saving tips based on their actual data.`;

    const result = await callAI([{ role: "user", content: prompt }]);

    if (result) {
      setInsights(result);
    } else {
      setInsights("⚠️ All free models are rate limited right now. Please wait 1-2 minutes and try again.");
    }

    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    setChatLoading(true);

    const { totalSpent, totalSubs, currentBudget, categoryBreakdown } = buildContext();

    const systemMessage = {
      role: "system",
      content: `You are a helpful personal finance assistant for an Indian user.
Their financial data:
- Total spent: ₹${totalSpent}
- Subscriptions: ₹${totalSubs}/mo (${subs.map((s) => `${s.title} ₹${s.amount}`).join(", ") || "none"})
- Budget: ₹${currentBudget}
- Categories: ${Object.entries(categoryBreakdown).map(([k, v]) => `${k} ₹${v}`).join(", ") || "none"}
- Recent expenses: ${expenses.slice(0, 10).map((e) => `${e.title} ₹${e.amount}`).join(", ") || "none"}
Answer questions about their finances. Be concise and friendly. Use ₹ for currency.`,
    };

    const userMsg = { role: "user", content: chatInput };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput("");

    const result = await callAI([systemMessage, ...newHistory]);

    if (result) {
      setChatHistory([...newHistory, { role: "assistant", content: result }]);
    } else {
      setChatHistory([...newHistory, {
        role: "assistant",
        content: "⚠️ Rate limited right now. Please wait a minute and try again."
      }]);
    }

    setChatLoading(false);
  };

  return (
    <div>
      {/* Generate Insights Button */}
      <button
        onClick={generateInsights}
        disabled={loading}
        style={{
          background: loading ? "#aaa" : "linear-gradient(135deg, #667eea, #764ba2)",
          color: "#fff", border: "none", borderRadius: 10,
          padding: "12px 24px", fontSize: 15, fontWeight: "bold",
          cursor: loading ? "not-allowed" : "pointer", width: "100%",
          marginBottom: 16,
        }}
      >
        {loading ? "🤖 Analyzing your spending..." : "✨ Generate AI Insights"}
      </button>

      {/* Insights Result */}
      {asked && !loading && insights && (
        <div style={{
          marginBottom: 24, background: "#f0f4ff", borderRadius: 12,
          padding: 20, border: "1px solid #667eea33"
        }}>
          <div style={{ fontSize: 13, color: "#667eea", fontWeight: "bold", marginBottom: 8 }}>
            🤖 AI Analysis · {month === "All" ? "All Time" : month}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.9, color: "#333", whiteSpace: "pre-wrap" }}>
            {insights}
          </div>
          <button
            onClick={generateInsights}
            style={{
              marginTop: 12, background: "none", border: "1px solid #667eea",
              color: "#667eea", borderRadius: 8, padding: "6px 14px",
              fontSize: 12, cursor: "pointer", width: "auto"
            }}
          >
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Chat Section */}
      <h3 style={{ marginBottom: 12, color: "#444" }}>💬 Chat with your finances</h3>

      {/* Chat messages */}
      {chatHistory.length > 0 && (
        <div style={{
          background: "#fafafa", borderRadius: 12, padding: 12,
          marginBottom: 12, maxHeight: 320, overflowY: "auto",
          border: "1px solid #eee"
        }}>
          {chatHistory.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 10,
            }}>
              <div style={{
                maxWidth: "80%",
                background: msg.role === "user" ? "#667eea" : "#fff",
                color: msg.role === "user" ? "#fff" : "#333",
                padding: "10px 14px", borderRadius: 12,
                fontSize: 13, lineHeight: 1.7,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 8 }}>
              🤖 Thinking...
            </div>
          )}
        </div>
      )}

      {/* Suggested Questions */}
      {chatHistory.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {SUGGESTIONS.map((q) => (
            <span
              key={q}
              onClick={() => setChatInput(q)}
              style={{
                background: "#e8ecff", color: "#667eea", fontSize: 12,
                padding: "5px 12px", borderRadius: 20, cursor: "pointer",
              }}
            >
              {q}
            </span>
          ))}
        </div>
      )}

      {/* Chat Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1 }}
          placeholder='Ask e.g. "Where am I overspending?"'
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendChat()}
        />
        <button
          onClick={sendChat}
          disabled={chatLoading}
          style={{ width: "auto", padding: "10px 20px" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}