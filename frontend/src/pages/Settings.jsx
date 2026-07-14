// src/pages/Settings.jsx

import { useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";

export default function Settings() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    setNotice("");

    if (form.newPassword !== form.confirm) {
      setError(
        "New password and confirmation do not match."
      );

      return;
    }

    setSaving(true);

    try {
      await api.post(
        "/auth/change-password",
        form
      );

      setNotice(
        "Password updated successfully."
      );

      setForm({
        currentPassword: "",
        newPassword: "",
        confirm: "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="page"
      style={{
        background: "#e5e7eb", // LIGHT GREY
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      {/* HEADER */}
      <div
        className="section-header"
        style={{
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#111827",
          }}
        >
          Settings
        </h2>
      </div>

      {/* SETTINGS CARD */}
      <div
        className="card"
        style={{
          maxWidth: "520px",
          background: "white",
          borderRadius: "24px",
          padding: "32px",
          boxShadow:
            "0 6px 24px rgba(0,0,0,0.06)",
        }}
      >
        {/* ACCOUNT */}
        <h4
          className="subhead"
          style={{
            fontSize: "22px",
            fontWeight: "700",
            marginBottom: "20px",
            color: "#111827",
          }}
        >
          Account
        </h4>

        <div
          className="detail-grid"
          style={{
            display: "grid",
            gap: "18px",
            marginBottom: "30px",
          }}
        >
          <div className="detail-field">
            <span
              className="detail-label"
              style={{
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Login ID
            </span>

            <div
              className="detail-value"
              style={{
                fontWeight: "600",
                color: "#111827",
                marginTop: "4px",
              }}
            >
              {user?.employeeCode}
            </div>
          </div>

          <div className="detail-field">
            <span
              className="detail-label"
              style={{
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Email
            </span>

            <div
              className="detail-value"
              style={{
                fontWeight: "600",
                color: "#111827",
                marginTop: "4px",
              }}
            >
              {user?.email}
            </div>
          </div>

          <div className="detail-field">
            <span
              className="detail-label"
              style={{
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              Role
            </span>

            <div
              className="detail-value"
              style={{
                fontWeight: "600",
                color: "#111827",
                marginTop: "4px",
              }}
            >
              {user?.role === "admin"
                ? "Admin / HR Officer"
                : "Employee"}
            </div>
          </div>
        </div>

        {/* SECURITY */}
        <h4
          className="subhead"
          style={{
            fontSize: "22px",
            fontWeight: "700",
            marginBottom: "20px",
            color: "#111827",
          }}
        >
          Security — Change Password
        </h4>

        <form
          className="stacked-form"
          onSubmit={handleSubmit}
        >
          {/* ERROR */}
          {error && (
            <div
              className="alert alert-error"
              style={{
                background: "#fee2e2",
                color: "#dc2626",
                padding: "14px",
                borderRadius: "12px",
                marginBottom: "18px",
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}
          {notice && (
            <div
              className="alert alert-success"
              style={{
                background: "#dcfce7",
                color: "#15803d",
                padding: "14px",
                borderRadius: "12px",
                marginBottom: "18px",
              }}
            >
              {notice}
            </div>
          )}

          {/* CURRENT PASSWORD */}
          <label
            style={{
              display: "block",
              marginBottom: "18px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Current Password

            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) =>
                setForm({
                  ...form,
                  currentPassword:
                    e.target.value,
                })
              }
              required={
                !user?.mustChangePassword
              }
              style={inputStyle}
            />
          </label>

          {/* NEW PASSWORD */}
          <label
            style={{
              display: "block",
              marginBottom: "18px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            New Password

            <input
              type="password"
              value={form.newPassword}
              onChange={(e) =>
                setForm({
                  ...form,
                  newPassword:
                    e.target.value,
                })
              }
              required
              minLength={6}
              style={inputStyle}
            />
          </label>

          {/* CONFIRM PASSWORD */}
          <label
            style={{
              display: "block",
              marginBottom: "18px",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Confirm New Password

            <input
              type="password"
              value={form.confirm}
              onChange={(e) =>
                setForm({
                  ...form,
                  confirm: e.target.value,
                })
              }
              required
              minLength={6}
              style={inputStyle}
            />
          </label>

          {/* HINT */}
          <p
            className="field-hint"
            style={{
              color: "#6b7280",
              fontSize: "14px",
              marginBottom: "20px",
            }}
          >
            At least 6 characters,
            with one letter and one number.
          </p>

          {/* BUTTON */}
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={saving}
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
            {saving
              ? "Updating…"
              : "Update Password"}
          </button>
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