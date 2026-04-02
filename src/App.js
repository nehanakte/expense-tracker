import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import AIInsights from "./AIInsights";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import "./App.css";

const months = ["All","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CATEGORIES = ["Food","Transport","Shopping","Health","Entertainment","Bills","Other"];
const COLORS = ["#667eea","#f093fb","#4facfe","#43e97b","#fa709a","#fee140","#a18cd1"];

function Charts({ expenses, subs }) {
  const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyData = monthOrder.map((m) => ({
    month: m,
    Expenses: expenses.filter((e) => e.month === m).reduce((s, e) => s + Number(e.amount), 0),
    Subscriptions: subs.filter((s) => s.month === m).reduce((sum, s) => sum + Number(s.amount), 0),
  })).filter((d) => d.Expenses > 0 || d.Subscriptions > 0);

  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
  });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  if (monthlyData.length === 0 && pieData.length === 0) {
    return <p style={{ color: "#aaa", textAlign: "center" }}>Add expenses to see charts 📊</p>;
  }

  return (
    <div>
      {monthlyData.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 8, color: "#444" }}>Monthly Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Legend />
              <Bar dataKey="Expenses" fill="#667eea" radius={[4,4,0,0]} />
              <Bar dataKey="Subscriptions" fill="#f093fb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {pieData.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 8, color: "#444" }}>Spending by Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `₹${v}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [subs, setSubs] = useState([]);
  const [budget, setBudget] = useState({});
  const [month, setMonth] = useState("All");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [mlPredicted, setMlPredicted] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [subTitle, setSubTitle] = useState("");
  const [subAmount, setSubAmount] = useState("");

  // 🤖 ML auto-categorize
  const predictCategory = async (expenseTitle) => {
    if (!expenseTitle || expenseTitle.length < 3) {
      setMlPredicted(false);
      return;
    }
    try {
      const response = await fetch("https://web-production-70a6c.up.railway.app/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: expenseTitle.toLowerCase() }),
      });
      const data = await response.json();
      setCategory(data.category);
      setMlPredicted(true);
    } catch (err) {
      setMlPredicted(false);
      console.log("ML API not available");
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    const [{ data: exp }, { data: sub }, { data: bud }] = await Promise.all([
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("budgets").select("*"),
    ]);
    setExpenses(exp || []);
    setSubs(sub || []);
    const budgetMap = {};
    (bud || []).forEach((b) => (budgetMap[b.month] = b.amount));
    setBudget(budgetMap);
  };

  const handleLogin = async (email, password, isSignup) => {
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Check your email to confirm your account!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setExpenses([]); setSubs([]); setBudget({});
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;
    const selectedDate = new Date(expenseDate);
    const expMonth = selectedDate.toLocaleString("default", { month: "short" });
    const newExp = {
      user_id: user.id,
      title,
      amount: Number(amount),
      category,
      month: expMonth,
      date: selectedDate.toISOString(),
    };
    const { data, error } = await supabase.from("expenses").insert([newExp]).select();
    if (error) { alert("Error: " + error.message); return; }
    setExpenses([data[0], ...expenses]);
    setTitle("");
    setAmount("");
    setCategory("Other");
    setMlPredicted(false);
    setExpenseDate(todayStr);
  };

  const addSub = async () => {
    if (!subTitle || !subAmount) return;
    const today = new Date();
    const newSub = {
      user_id: user.id,
      title: subTitle,
      amount: Number(subAmount),
      month: today.toLocaleString("default", { month: "short" }),
      date: today.toISOString(),
    };
    const { data, error } = await supabase.from("subscriptions").insert([newSub]).select();
    if (error) { alert("Error: " + error.message); return; }
    setSubs([data[0], ...subs]);
    setSubTitle(""); setSubAmount("");
  };

  const deleteExpense = async (id) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const deleteSub = async (id) => {
    await supabase.from("subscriptions").delete().eq("id", id);
    setSubs(subs.filter((s) => s.id !== id));
  };

  const setMonthlyBudget = async (value) => {
    if (!value) return;
    const { error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: user.id, month, amount: Number(value) },
        { onConflict: "user_id,month" }
      );
    if (error) { alert("Budget error: " + error.message); return; }
    setBudget({ ...budget, [month]: Number(value) });
  };

  const filteredExpenses = month === "All" ? expenses : expenses.filter((e) => e.month === month);
  const filteredSubs = month === "All" ? subs : subs.filter((s) => s.month === month);
  const expenseTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const subTotal = filteredSubs.reduce((sum, s) => sum + Number(s.amount), 0);
  const total = expenseTotal + subTotal;
  const currentBudget = budget[month] || 0;
  const remaining = currentBudget - total;
  const budgetPercent = currentBudget > 0 ? Math.min((total / currentBudget) * 100, 100) : 0;

  if (loading) return (
    <div style={{ textAlign: "center", marginTop: 100, fontSize: 18 }}>
      Loading...
    </div>
  );
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="container">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>💰 Expense Tracker</h1>
        <button
          onClick={handleLogout}
          style={{ width: "auto", padding: "8px 16px", background: "#ff4d4d" }}
        >
          Logout
        </button>
      </div>
      <p style={{ color: "#888", fontSize: 13, margin: "4px 0 16px" }}>{user.email}</p>

      {/* Month Filter */}
      <select onChange={(e) => setMonth(e.target.value)} value={month}>
        {months.map((m) => <option key={m}>{m}</option>)}
      </select>

      {/* Summary Card */}
      <div style={{
        background: "linear-gradient(135deg, #667eea22, #764ba222)",
        border: "1px solid #667eea33",
        borderRadius: 12, padding: 20, margin: "12px 0"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, color: "#888" }}>Total Spent</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#333" }}>₹{total.toFixed(0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#888" }}>Budget</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#333" }}>₹{currentBudget}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#888" }}>Remaining</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: remaining < 0 ? "#ff4d4d" : "#43e97b" }}>
              ₹{remaining.toFixed(0)}
            </div>
          </div>
        </div>
        {currentBudget > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 4 }}>
              <span>Budget used</span>
              <span>{budgetPercent.toFixed(0)}%</span>
            </div>
            <div style={{ background: "#ddd", borderRadius: 8, height: 10 }}>
              <div style={{
                width: `${budgetPercent}%`,
                background: budgetPercent > 90 ? "#ff4d4d" : budgetPercent > 70 ? "#fee140" : "#667eea",
                height: 10, borderRadius: 8, transition: "width 0.4s"
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Set Budget */}
      <input
        type="number"
        placeholder="Set Monthly Budget (₹)"
        defaultValue={currentBudget || ""}
        onBlur={(e) => setMonthlyBudget(e.target.value)}
      />

      {/* Analytics */}
      <h2>📊 Analytics</h2>
      <div style={{ background: "#f8f9ff", borderRadius: 12, padding: 16, marginBottom: 8 }}>
        <Charts expenses={expenses} subs={subs} />
      </div>

      {/* AI Insights */}
      <h2>🤖 AI Insights</h2>
      <div style={{ background: "#f8f9ff", borderRadius: 12, padding: 16, marginBottom: 8 }}>
        <AIInsights
          expenses={expenses}
          subs={subs}
          budget={budget}
          month={month}
        />
      </div>

      {/* Add Expense */}
      <h2>➕ Add Expense</h2>
      <form onSubmit={addExpense}>
        <input
          placeholder="Title (e.g. Uber, Zomato, Netflix)"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            predictCategory(e.target.value);
          }}
        />
        <input
          type="number"
          placeholder="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setMlPredicted(false);
          }}
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        {/* ML prediction badge */}
        {mlPredicted && (
          <p style={{
            fontSize: 12, color: "#667eea",
            margin: "2px 0 8px", fontStyle: "italic"
          }}>
            ✨ Category auto-predicted by ML model
          </p>
        )}

        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
        />
        <button type="submit">Add Expense</button>
      </form>

      {/* Expenses List */}
      <h2>🧾 Expenses</h2>
      {filteredExpenses.length === 0 && (
        <p style={{ color: "#aaa" }}>No expenses for this period</p>
      )}
      {filteredExpenses.map((e) => (
        <div key={e.id} className="expense-item">
          <div>
            <strong>{e.title}</strong>
            <span style={{
              marginLeft: 8, fontSize: 11, background: "#e8ecff",
              padding: "2px 8px", borderRadius: 12, color: "#667eea"
            }}>
              {e.category}
            </span>
            <br />
            <span style={{ fontSize: 13, color: "#888" }}>
              ₹{e.amount} · {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          </div>
          <button className="delete-btn" onClick={() => deleteExpense(e.id)}>❌</button>
        </div>
      ))}

      {/* Subscriptions */}
      <h2>🔄 Subscriptions</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          style={{ flex: 1, minWidth: 120 }}
          placeholder="Netflix / Prime"
          value={subTitle}
          onChange={(e) => setSubTitle(e.target.value)}
        />
        <input
          style={{ flex: 1, minWidth: 100 }}
          type="number"
          placeholder="Monthly fee"
          value={subAmount}
          onChange={(e) => setSubAmount(e.target.value)}
        />
        <button style={{ width: "auto", padding: "10px 16px" }} onClick={addSub}>
          Save
        </button>
      </div>
      {filteredSubs.length === 0 && (
        <p style={{ color: "#aaa" }}>No subscriptions yet</p>
      )}
      {filteredSubs.map((s) => (
        <div key={s.id} className="expense-item">
          <div>
            <strong>{s.title}</strong><br />
            <span style={{ fontSize: 13, color: "#888" }}>₹{s.amount}/mo</span>
          </div>
          <button className="delete-btn" onClick={() => deleteSub(s.id)}>❌</button>
        </div>
      ))}

    </div>
  );
}

export default App;