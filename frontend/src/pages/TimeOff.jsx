// src/pages/TimeOff.jsx

import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Modal from "../components/Modal.jsx";

const EMPTY = {
  leaveType: "Paid",
  startDate: "",
  endDate: "",
  remarks: "",
};

function MyTimeOff() {
  const [leaves, setLeaves] = useState([]);

  const [balance, setBalance] =
    useState(null);

  const [showNew, setShowNew] =
    useState(false);

  const [form, setForm] = useState(EMPTY);

  const [error, setError] = useState("");

  const [saving, setSaving] =
    useState(false);

  function load() {
    api
      .get("/leave/me")
      .then(({ data }) =>
        setLeaves(data.leaves)
      )
      .catch((e) => setError(e.message));

    api
      .get("/leave/balance/me")
      .then(({ data }) =>
        setBalance(data.balance)
      )
      .catch(() => {});
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();

    setSaving(true);

    setError("");

    try {
      await api.post("/leave", form);

      setShowNew(false);

      setForm(EMPTY);

      load();
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
      <div className="section-header">
        <h2
          style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#111827",
          }}
        >
          Time Off
        </h2>

        <button
          className="btn btn-primary"
          onClick={() => setShowNew(true)}
          style={{
            background: "#4f46e5",
            color: "white",
            border: "none",
            padding: "12px 18px",
            borderRadius: "12px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          + New Request
        </button>
      </div>

      {/* STATS */}
      <div className="stat-row">
        <div className="stat-card accent-blue">
          <span className="stat-value">
            {balance?.paid ?? "—"}
          </span>

          <span className="stat-label">
            Paid Time Off
          </span>
        </div>

        <div className="stat-card accent-green">
          <span className="stat-value">
            {balance?.sick ?? "—"}
          </span>

          <span className="stat-label">
            Sick Leave
          </span>
        </div>

        <div className="stat-card accent-amber">
          <span className="stat-value">
            {
              leaves.filter(
                (l) => l.status === "Pending"
              ).length
            }
          </span>

          <span className="stat-label">
            Pending Requests
          </span>
        </div>
      </div>

      {/* ERROR */}
      {error && !showNew && (
        <div
          className="alert alert-error"
          style={{
            background: "#fee2e2",
            color: "#dc2626",
            padding: "14px",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* TABLE */}
      <div
        className="card table-card"
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "20px",
          boxShadow:
            "0 6px 24px rgba(0,0,0,0.05)",
        }}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Remarks</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {leaves.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="muted"
                  style={{
                    textAlign: "center",
                  }}
                >
                  No time-off requests yet.
                </td>
              </tr>
            )}

            {leaves.map((l) => (
              <tr key={l.id}>
                <td>You</td>

                <td>
                  {l.leaveType} Time Off
                </td>

                <td>
                  {new Date(
                    l.startDate
                  ).toLocaleDateString(
                    "en-IN"
                  )}
                </td>

                <td>
                  {new Date(
                    l.endDate
                  ).toLocaleDateString(
                    "en-IN"
                  )}
                </td>

                <td className="muted">
                  {l.remarks || "—"}

                  {l.adminComment && (
                    <div>
                      <em>
                        HR: {l.adminComment}
                      </em>
                    </div>
                  )}
                </td>

                <td>
                  <StatusBadge
                    status={l.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showNew && (
        <Modal
          title="New Time Off Request"
          onClose={() =>
            setShowNew(false)
          }
        >
          <form
            className="stacked-form"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <label>
              Time Off Type

              <select
                value={form.leaveType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    leaveType:
                      e.target.value,
                  })
                }
              >
                <option value="Paid">
                  Paid Time Off
                </option>

                <option value="Sick">
                  Sick Time Off
                </option>

                <option value="Unpaid">
                  Unpaid Leave
                </option>
              </select>
            </label>

            <div className="form-row">
              <label>
                Start Date

                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      startDate:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label>
                End Date

                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      endDate:
                        e.target.value,
                    })
                  }
                />
              </label>
            </div>

            <label>
              Remarks

              <textarea
                rows={3}
                value={form.remarks}
                onChange={(e) =>
                  setForm({
                    ...form,
                    remarks:
                      e.target.value,
                  })
                }
                placeholder="Add any additional context for HR…"
              />
            </label>

            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                marginTop: "20px",
                background: "#4f46e5",
                color: "white",
                border: "none",
                padding: "14px",
                borderRadius: "12px",
                fontWeight: "600",
              }}
            >
              {saving
                ? "Submitting…"
                : "Submit"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function AllTimeOff() {
  const [leaves, setLeaves] = useState([]);

  const [error, setError] = useState("");

  const [actioning, setActioning] =
    useState(null);

  const [comment, setComment] =
    useState("");

  function load() {
    api
      .get("/leave")
      .then(({ data }) =>
        setLeaves(data.leaves)
      )
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function decide(id, status) {
    setError("");

    try {
      await api.put(
        `/leave/${id}/status`,
        {
          status,
          adminComment: comment,
        }
      );

      setActioning(null);

      setComment("");

      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const pending = leaves.filter(
    (l) => l.status === "Pending"
  );

  return (
    <div
      className="page"
      style={{
        background: "#e5e7eb",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div className="section-header">
        <h2
          style={{
            fontSize: "32px",
            fontWeight: "700",
          }}
        >
          Time Off Requests
        </h2>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {pending.map((l) => (
              <tr key={l.id}>
                <td>{l.employeeName}</td>

                <td>{l.leaveType}</td>

                <td>
                  {new Date(
                    l.startDate
                  ).toLocaleDateString(
                    "en-IN"
                  )}
                </td>

                <td>
                  {new Date(
                    l.endDate
                  ).toLocaleDateString(
                    "en-IN"
                  )}
                </td>

                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      decide(
                        l.id,
                        "Approved"
                      )
                    }
                  >
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TimeOff() {
  const { user } = useAuth();

  return user?.role === "admin" ? (
    <AllTimeOff />
  ) : (
    <MyTimeOff />
  );
}