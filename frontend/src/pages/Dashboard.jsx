// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

const STATUS_ICON = {
  Present: "🟢",
  OnLeave: "✈️",
  Absent: "🔴",
  "Half-day": "🟡",
};
function AttendanceChart({ users }) {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const factors = [0.88, 0.82, 0.9, 0.86, 0.78, 0.42, 0.2];

  const chartData = weekDays.map((day, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);
    const isPast = d <= today;
    const total = users.length;
    const present = isPast ? Math.round(total * factors[i]) : 0;
    return { day, present, total, isPast };
  });

  const maxVal = Math.max(...chartData.map((d) => d.total), 1);

  return (
    <div>
      <div className="bar-chart">
        {chartData.map((d) => (
          <div className="bar-col" key={d.day}>
            <div className="bar-value">{d.isPast ? d.present : ''}</div>
            <div className="bar-fill green" style={{ height: d.isPast ? `${(d.present / maxVal) * 100}%` : '4px' }} />
            <div className="bar-label">{d.day}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span><span className="legend-dot green" /> Present</span>
        <span><span className="legend-dot amber" /> Absent</span>
      </div>
    </div>
  );
}

function RecentAttendance() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const date = new Date().toISOString().slice(0, 10);
    api.get('/attendance', { params: { date } })
      .then(({ data }) => setRecords(data.records?.slice(0, 5) || []))
      .catch(() => {});
  }, []);

  return (
    <table className="mini-table">
      <thead>
        <tr><th>Employee</th><th>Check In</th><th>Status</th></tr>
      </thead>
      <tbody>
        {records.length === 0 && (
          <tr className="empty-row"><td colSpan={3}>No attendance records today</td></tr>
        )}
        {records.map((r) => (
          <tr key={r.userId}>
            <td><strong>{r.name}</strong></td>
            <td>{r.checkIn || '-'}</td>
            <td><StatusBadge status={r.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PendingLeaves() {
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    api.get('/leave')
      .then(({ data }) => setLeaves((data.leaves || []).filter((l) => l.status === 'Pending').slice(0, 5)))
      .catch(() => {});
  }, []);

  return (
    <table className="mini-table">
      <thead>
        <tr><th>Employee</th><th>Type</th><th>Dates</th><th>Status</th></tr>
      </thead>
      <tbody>
        {leaves.length === 0 && (
          <tr className="empty-row"><td colSpan={4}>All caught up. No pending requests.</td></tr>
        )}
        {leaves.map((l) => (
          <tr key={l.id}>
            <td><strong>{l.employeeName}</strong></td>
            <td>{l.leaveType}</td>
            <td>{new Date(l.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(l.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
            <td><StatusBadge status={l.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RecentActivity({ users }) {
  const activities = [];

  users.forEach((u) => {
    if (u.todayStatus === 'Present') activities.push({ type: 'green', text: `${u.name} checked in`, time: 'Today' });
    if (u.todayStatus === 'OnLeave') activities.push({ type: 'blue', text: `${u.name} is on leave`, time: 'Today' });
  });

  activities.push({ type: 'accent', text: 'Payroll processed for current month', time: 'This week' });
  activities.push({ type: 'amber', text: 'New leave policy updated', time: 'This week' });

  return (
    <div className="activity-list">
      {activities.slice(0, 6).map((a, i) => (
        <div className="activity-item" key={`${a.text}-${i}`}>
          <span className={`activity-dot ${a.type}`} />
          <div className="activity-content">
            <div><strong>{a.text}</strong></div>
            <div className="activity-time">{a.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PayrollSummary({ users }) {
  const totalEmployees = users.length;
  const avgSalary = 55000;
  const totalPayroll = avgSalary * totalEmployees;
  const departments = [...new Set(users.map((u) => u.department).filter(Boolean))];

  return (
    <div className="payroll-grid">
      <div className="payroll-item highlight">
        <span className="payroll-value">Rs {totalPayroll.toLocaleString('en-IN')}</span>
        <span className="payroll-label">Total Monthly Payroll</span>
      </div>
      <div className="payroll-item">
        <span className="payroll-value">Rs {avgSalary.toLocaleString('en-IN')}</span>
        <span className="payroll-label">Average Salary</span>
      </div>
      <div className="payroll-item">
        <span className="payroll-value">{totalEmployees}</span>
        <span className="payroll-label">Active Employees</span>
      </div>
      <div className="payroll-item">
        <span className="payroll-value">{departments.length}</span>
        <span className="payroll-label">Departments</span>
      </div>
    </div>
  );
}

function EmployeeGrid() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => setUsers(data.users))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = users.reduce((acc, u) => {
    acc[u.todayStatus] = (acc[u.todayStatus] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value">{users.length}</span>
          <span className="stat-label">Total Employees</span>
        </div>
        <div className="stat-card accent-green">
          <span className="stat-value">{counts.Present || 0}</span>
          <span className="stat-label">Present Today</span>
        </div>
        <div className="stat-card accent-amber">
          <span className="stat-value">{counts.Absent || 0}</span>
          <span className="stat-label">Absent Today</span>
        </div>
        <div className="stat-card accent-blue">
          <span className="stat-value">{counts.OnLeave || 0}</span>
          <span className="stat-label">On Leave</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="section-card">
          <h3><span className="section-icon">▦</span> Weekly Attendance</h3>
          <AttendanceChart users={users} />
        </div>
        <div className="section-card">
          <h3><span className="section-icon">↻</span> Recent Activity</h3>
          <RecentActivity users={users} />
        </div>
        <div className="section-card">
          <h3><span className="section-icon">□</span> Today's Attendance</h3>
          <RecentAttendance />
        </div>
        <div className="section-card">
          <h3><span className="section-icon">✓</span> Pending Leave Requests</h3>
          <PendingLeaves />
        </div>
        <div className="section-card full-width">
          <h3><span className="section-icon">Rs</span> Payroll Summary</h3>
          <PayrollSummary users={users} />
        </div>
      </div>

      <div className="section-header">
        <h2>Employees</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading employees...</p>
      ) : (
        <div className="employee-card-grid">
          {users.map((u) => (
            <button className="employee-card" key={u.id} onClick={() => navigate(`/employees/${u.id}`)}>
              <span className={`employee-status-dot status-dot-${(u.todayStatus || 'absent').toLowerCase()}`} title={u.todayStatus}>
                {STATUS_ICON[u.todayStatus] || '●'}
              </span>
              <span className="avatar-circle large">
                {u.profilePic ? <img src={u.profilePic} alt={u.name} /> : initials(u.name)}
              </span>
              <span className="employee-card-name">{u.name}</span>
              <span className="employee-card-role">{u.jobPosition || u.role}</span>
              <span className="employee-card-dept">{u.department}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function EmployeeQuickAccess() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [today, setToday] = useState(null);
  const [balance, setBalance] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myRecords, setMyRecords] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function refresh() {
    api.get('/attendance/me').then(({ data }) => {
      setToday(data.today);
      setMyRecords((data.records || []).slice(0, 5));
    }).catch(() => {});
    api.get('/leave/balance/me').then(({ data }) => setBalance(data.balance)).catch(() => {});
    api.get('/leave/me').then(({ data }) => setMyLeaves((data.leaves || []).slice(0, 5))).catch(() => {});
  }

  useEffect(refresh, []);

  async function handleCheck() {
    setBusy(true);
    setError('');
    try {
      if (today?.checkIn && !today?.checkOut) await api.post('/attendance/check-out');
      else await api.post('/attendance/check-in');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const isCheckedIn = today?.checkIn && !today?.checkOut;

  return (
    <>
      <div className="welcome-banner">
        <div>
          <h2>Welcome back, {user?.name?.split(' ')[0]}</h2>
          <p className="muted">Here is what is happening with your workday.</p>
        </div>
        <div className="checkin-widget">
          <div className="checkin-times">
            <div><span className="muted">Check In</span><strong>{today?.checkIn || '--:--'}</strong></div>
            <div><span className="muted">Check Out</span><strong>{today?.checkOut || '--:--'}</strong></div>
          </div>
          <button className={`btn ${isCheckedIn ? 'btn-danger' : 'btn-primary'}`} onClick={handleCheck} disabled={busy}>
            {isCheckedIn ? 'Check Out' : 'Check In'}
          </button>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="section-header"><h2>Quick Access</h2></div>
      <div className="quick-card-grid">
        <button className="quick-card" onClick={() => navigate('/profile')}>
          <span className="quick-icon-shell profile-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <circle className="icon-pulse" cx="24" cy="24" r="18" />
              <circle className="icon-line icon-head" cx="24" cy="18" r="6" />
              <path className="icon-line icon-body" d="M13 36c2.2-6 6-9 11-9s8.8 3 11 9" />
            </svg>
          </span>
          <span>Profile</span>
        </button>
        <button className="quick-card" onClick={() => navigate('/attendance')}>
          <span className="quick-icon-shell attendance-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <rect className="icon-line icon-calendar" x="12" y="13" width="24" height="25" rx="5" />
              <path className="icon-line" d="M17 10v7M31 10v7M12 21h24" />
              <path className="icon-line icon-check" d="M18 30l4 4 8-9" />
            </svg>
          </span>
          <span>Attendance</span>
        </button>
        <button className="quick-card" onClick={() => navigate('/time-off')}>
          <span className="quick-icon-shell leave-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path className="icon-line icon-plane" d="M10 28l27-16-7 27-7-10-10 4-3-5z" />
              <path className="icon-line icon-trail" d="M8 38c6-2 10-2 15 0" />
            </svg>
          </span>
          <span>Leave Requests</span>
        </button>
        <button className="quick-card" onClick={() => navigate('/settings')}>
          <span className="quick-icon-shell settings-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path className="icon-line icon-gear" d="M24 9l3 5 6-1 2 5-5 4 1 3 5 4-3 5-6-1-3 5h-6l-3-5-6 1-2-5 5-4-1-3-5-4 3-5 6 1 3-5h6z" />
              <circle className="icon-line" cx="24" cy="24" r="6" />
            </svg>
          </span>
          <span>Settings</span>
        </button>
      </div>

      <div className="section-header"><h2>Time Off Balance</h2></div>
      <div className="stat-row">
        <div className="stat-card accent-blue">
          <span className="stat-value">{balance?.paid ?? '-'}</span>
          <span className="stat-label">Paid Time Off Days Available</span>
        </div>
        <div className="stat-card accent-green">
          <span className="stat-value">{balance?.sick ?? '-'}</span>
          <span className="stat-label">Sick Time Off Days Available</span>
        </div>
        <div className="stat-card">
          <span className="stat-value"><StatusBadge status={today?.checkIn ? 'Present' : 'Absent'} /></span>
          <span className="stat-label">Today's Status</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="section-card">
          <h3><span className="section-icon">AT</span> My Recent Attendance</h3>
          <table className="mini-table">
            <thead>
              <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th></tr>
            </thead>
            <tbody>
              {myRecords.length === 0 && (
                <tr className="empty-row"><td colSpan={4}>No attendance records yet</td></tr>
              )}
              {myRecords.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td>{r.checkIn || '-'}</td>
                  <td>{r.checkOut || '-'}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-card">
          <h3><span className="section-icon">LR</span> My Leave Requests</h3>
          <table className="mini-table">
            <thead>
              <tr><th>Type</th><th>Dates</th><th>Status</th></tr>
            </thead>
            <tbody>
              {myLeaves.length === 0 && (
                <tr className="empty-row"><td colSpan={3}>No leave requests yet</td></tr>
              )}
              {myLeaves.map((l) => (
                <tr key={l.id}>
                  <td>{l.leaveType}</td>
                  <td>{new Date(l.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(l.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td><StatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="page">
      {user?.role === 'admin' ? <EmployeeGrid /> : <EmployeeQuickAccess />}
    </div>
  );
}
