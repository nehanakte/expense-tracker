import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await onLogin(email, password, isSignup);
    setLoading(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>💰 Expense Tracker</h1>
        <p style={styles.sub}>{isSignup ? "Create your account" : "Welcome back"}</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button style={styles.btn} disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Sign Up" : "Log In"}
          </button>
        </form>

        <p style={styles.toggle}>
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <span style={styles.link} onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? "Log In" : "Sign Up"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 40,
    width: 360,
    boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
    textAlign: "center",
  },
  title: { margin: 0, fontSize: 28, color: "#333" },
  sub: { color: "#888", marginBottom: 24 },
  error: {
    background: "#ffe0e0",
    color: "#cc0000",
    padding: "10px",
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 14,
  },
  input: {
    width: "100%",
    padding: 12,
    margin: "6px 0",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 15,
    boxSizing: "border-box",
    outline: "none",
  },
  btn: {
    width: "100%",
    padding: 12,
    marginTop: 12,
    background: "#667eea",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
  },
  toggle: { marginTop: 20, color: "#666", fontSize: 14 },
  link: { color: "#667eea", cursor: "pointer", fontWeight: "bold" },
};