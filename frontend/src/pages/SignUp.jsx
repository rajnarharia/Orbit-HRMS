// src/pages/SignUp.jsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    role: "employee",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });

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
        background: "#f3f4f6", // light gray right side
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
          background: "#f3f4f6", // light gray
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
            Sign up
          </h2>

          <p
            className="auth-subtitle"
            style={{
              color: "#6b7280",
              marginBottom: "24px",
            }}
          >
            Create your account to get started.
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

          {/* NAME */}
          <label
            style={{
              display: "block",
              marginBottom: "16px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Name

            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              autoFocus
              style={inputStyle}
            />
          </label>

          {/* EMAIL */}
          <label
            style={{
              display: "block",
              marginBottom: "16px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Email

            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              style={inputStyle}
            />
          </label>

          {/* ROLE */}
          <label
            style={{
              display: "block",
              marginBottom: "16px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Role

            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              style={inputStyle}
            >
              <option value="employee">Employee</option>
              <option value="admin">HR / Admin</option>
            </select>
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
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          </label>

          {/* CONFIRM */}
          <label
            style={{
              display: "block",
              marginBottom: "16px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Confirm Password

            <input
              type="password"
              value={form.confirm}
              onChange={(e) => update("confirm", e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          </label>

          <p
            className="field-hint"
            style={{
              color: "#6b7280",
              fontSize: "14px",
              marginBottom: "20px",
            }}
          >
            At least 6 characters, with one letter and one number.
          </p>

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
            }}
          >
            {loading ? "Creating account…" : "Sign Up"}
          </button>

          <p
            className="auth-switch"
            style={{
              marginTop: "22px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/signin"
              style={{
                color: "#4f46e5",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </p>
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