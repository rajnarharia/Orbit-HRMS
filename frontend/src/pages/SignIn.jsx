// src/pages/SignIn.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(identifier, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="auth-screen"
      style={{
        display: "flex",
        minHeight: "100vh",
      }}
    >
      {/* LEFT PANEL */}
      <div
        className="auth-panel"
        style={{
          flex: 1,
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          className="auth-brand"
          style={{
            textAlign: "center",
          }}
        >
          <div
            className="brand-mark large"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "#6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "28px",
              fontWeight: "700",
              margin: "0 auto 24px",
            }}
          >
            OI
          </div>

          <h1
            style={{
              color: "white",
              fontSize: "48px",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            Orbit HRMS
          </h1>

          <p
            style={{
              color: "#d1d5db",
              fontSize: "18px",
            }}
          >
            Every workday, perfectly aligned.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        className="auth-form-wrap"
        style={{
          flex: 1,
          background: "#dfe3e8", // LIGHT GREY
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <form
          className="auth-form"
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "white",
            padding: "40px",
            borderRadius: "24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              fontSize: "36px",
              fontWeight: "700",
              marginBottom: "10px",
              color: "#111827",
            }}
          >
            Sign in
          </h2>

          <p
            className="auth-subtitle"
            style={{
              color: "#6b7280",
              marginBottom: "24px",
            }}
          >
            Welcome back. Enter your details to continue.
          </p>

          {error && (
            <div
              className="alert alert-error"
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* EMAIL */}
          <label
            style={{
              display: "block",
              marginBottom: "16px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Login ID / Email

            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              style={inputStyle}
            />
          </label>

          {/* PASSWORD */}
          <label
            style={{
              display: "block",
              marginBottom: "16px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Password

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </label>

          {/* BUTTON */}
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: "#4f46e5",
              color: "white",
              fontWeight: "600",
              fontSize: "16px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {/* SWITCH */}
          <p
            className="auth-switch"
            style={{
              marginTop: "22px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Don't have an account?{" "}
            <Link
              to="/signup"
              style={{
                color: "#4f46e5",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              Sign Up
            </Link>
          </p>

          {/* DEMO */}
          <div
            className="demo-hint"
            style={{
              marginTop: "24px",
              background: "#eef2ff",
              padding: "16px",
              borderRadius: "14px",
              color: "#4338ca",
              fontSize: "14px",
            }}
          >
            <strong>Demo accounts</strong>

            <div style={{ marginTop: "10px" }}>
              Admin — admin@hrms.com / Admin@123
            </div>

            <div style={{ marginTop: "6px" }}>
              Employee — priya.sharma@hrms.com / Welcome@123
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  marginTop: "8px",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
};