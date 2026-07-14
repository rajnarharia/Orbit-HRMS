// src/pages/Attendance.jsx

import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function MyAttendance() {
  const [records, setRecords] = useState([]);
  const [today, setToday] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api
      .get("/attendance/me", {
        params: { month, year },
      })
      .then(({ data }) => {
        setRecords(data.records);
        setToday(data.today);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, [month, year]);

  async function handleCheck() {
    setBusy(true);
    setError("");

    try {
      if (today?.checkIn && !today?.checkOut) {
        await api.post("/attendance/check-out");
      } else {
        await api.post("/attendance/check-in");
      }

      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function shiftMonth(delta) {
    let m = month + delta;
    let y = year;

    if (m < 1) {
      m = 12;
      y -= 1;
    }

    if (m > 12) {
      m = 1;
      y += 1;
    }

    setMonth(m);
    setYear(y);
  }

  const isCheckedIn = today?.checkIn && !today?.checkOut;

  const presentCount = records.filter(
    (r) => r.status === "Present"
  ).length;

  const monthLabel = new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

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
        <h2>Attendance</h2>
      </div>

      <div className="welcome-banner">
        <div>
          <p className="muted">{formatDate(todayISO())}</p>

          <h3>
            {isCheckedIn
              ? "You're checked in"
              : "You're not checked in yet"}
          </h3>
        </div>

        <div className="checkin-widget">
          <div className="checkin-times">
            <div>
              <span className="muted">Check In</span>

              <strong>{today?.checkIn || "--:--"}</strong>
            </div>

            <div>
              <span className="muted">Check Out</span>

              <strong>{today?.checkOut || "--:--"}</strong>
            </div>
          </div>

          <button
            className={`btn ${
              isCheckedIn ? "btn-danger" : "btn-primary"
            }`}
            onClick={handleCheck}
            disabled={busy}
          >
            {isCheckedIn ? "Check Out →" : "Check In →"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <div className="section-header">
        <div className="month-nav">
          <button
            className="icon-btn"
            onClick={() => shiftMonth(-1)}
          >
            ←
          </button>

          <h3>{monthLabel}</h3>

          <button
            className="icon-btn"
            onClick={() => shiftMonth(1)}
          >
            →
          </button>
        </div>

        <span className="muted">
          Count of days present:{" "}
          <strong>{presentCount}</strong>
        </span>
      </div>

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Work Hours</th>
              <th>Extra Hours</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {records.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="muted"
                  style={{ textAlign: "center" }}
                >
                  No attendance records for this month.
                </td>
              </tr>
            )}

            {records.map((r) => (
              <tr key={r.id}>
                <td>
                  {new Date(r.date).toLocaleDateString(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                    }
                  )}
                </td>

                <td>
                  {new Date(r.date).toLocaleDateString(
                    "en-IN",
                    {
                      weekday: "short",
                    }
                  )}
                </td>

                <td>{r.checkIn || "—"}</td>

                <td>{r.checkOut || "—"}</td>

                <td>{r.workHours || 0} hrs</td>

                <td>{r.extraHours || 0} hrs</td>

                <td>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllAttendance() {
  const [date, setDate] = useState(todayISO());
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  function load() {
    api
      .get("/attendance", {
        params: { date },
      })
      .then(({ data }) => setRecords(data.records))
      .catch((e) => setError(e.message));
  }

  useEffect(load, [date]);

  const filtered = records.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  const presentCount = records.filter(
    (r) => r.status === "Present"
  ).length;

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
        <h2>Attendance</h2>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="date-input"
        />
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value">
            {records.length}
          </span>

          <span className="stat-label">
            Total Employees
          </span>
        </div>

        <div className="stat-card accent-green">
          <span className="stat-value">
            {presentCount}
          </span>

          <span className="stat-label">Present</span>
        </div>

        <div className="stat-card accent-amber">
          <span className="stat-value">
            {records.length - presentCount}
          </span>

          <span className="stat-label">
            Absent / Leave
          </span>
        </div>
      </div>

      <div className="search-bar">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
        >
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="1.6"
          />

          <path
            d="M21 21l-4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>

        <input
          placeholder="Search employee…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <div className="card table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Work Hours</th>
              <th>Extra Hours</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => (
              <tr key={r.userId}>
                <td>{r.name}</td>

                <td>{r.department}</td>

                <td>{r.checkIn || "—"}</td>

                <td>{r.checkOut || "—"}</td>

                <td>{r.workHours || 0} hrs</td>

                <td>{r.extraHours || 0} hrs</td>

                <td>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Attendance() {
  const { user } = useAuth();

  return user?.role === "admin" ? (
    <AllAttendance />
  ) : (
    <MyAttendance />
  );
}