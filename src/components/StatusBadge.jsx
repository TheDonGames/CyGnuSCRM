export default function StatusBadge({ status }) {
  const map = {
    'Received':           { bg: '#17a2b8', icon: 'bi-inbox' },
    'Diagnosing':         { bg: '#6c757d', icon: 'bi-search' },
    'Waiting for Parts':  { bg: '#fd7e14', icon: 'bi-clock-history' },
    'In Repair':          { bg: '#007bff', icon: 'bi-wrench' },
    'Testing':            { bg: '#6610f2', icon: 'bi-cpu' },
    'Ready For Pickup':   { bg: '#28a745', icon: 'bi-check-circle' },
    'Delivered':          { bg: '#20c997', icon: 'bi-bag-check' },
    'Canceled':           { bg: '#dc3545', icon: 'bi-x-circle' },
  };
  const cfg = map[status] || { bg: '#6c757d', icon: 'bi-circle' };
  return (
    <span
      className="badge d-inline-flex align-items-center gap-1 px-2 py-1"
      style={{ background: cfg.bg, fontSize: '0.7rem', fontWeight: 500 }}
    >
      <i className={`bi ${cfg.icon}`} style={{ fontSize: '0.65rem' }} />
      {status}
    </span>
  );
}
