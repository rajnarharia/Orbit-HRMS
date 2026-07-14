// src/components/StatusBadge.jsx
const CONFIG = {
  Present: { label: 'Present', className: 'status-present' },
  Absent: { label: 'Absent', className: 'status-absent' },
  OnLeave: { label: 'On Leave', className: 'status-leave' },
  'Half-day': { label: 'Half-day', className: 'status-half' },
  Pending: { label: 'Pending', className: 'status-pending' },
  Approved: { label: 'Approved', className: 'status-present' },
  Rejected: { label: 'Rejected', className: 'status-absent' },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || { label: status, className: 'status-pending' };
  return <span className={`status-badge ${cfg.className}`}><i /> {cfg.label}</span>;
}
