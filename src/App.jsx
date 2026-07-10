import { useState, useEffect, useCallback } from 'react';
import { getRepairs, getTechnicians, getSystemConfig } from './services/repairService';
import NewRepairDrawer from './components/NewRepairDrawer';
import StatusBadge from './components/StatusBadge';

export default function App() {
  const [repairs, setRepairs] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t, c] = await Promise.all([getRepairs(), getTechnicians(), getSystemConfig()]);
      setRepairs(r);
      setTechnicians(t);
      setConfig(c);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = repairs.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.repair_id?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.brand?.toLowerCase().includes(q) ||
      r.model?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q)
    );
  });

  function handleCreated(repair) {
    setRepairs(prev => [repair, ...prev]);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary shadow-sm">
        <div className="container-fluid px-4">
          <span className="navbar-brand fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-tools" />
            {config.company_name || 'CyGnuS SARL'} CRM
          </span>
          <div className="d-flex align-items-center gap-3">
            <span className="text-white-50 small">
              {repairs.length} tickets
            </span>
            <button
              className="btn btn-sm btn-light fw-semibold px-3"
              onClick={() => setShowDrawer(true)}
            >
              <i className="bi bi-plus-lg me-1" />
              New Ticket
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid px-4 py-4">
        {/* Search */}
        <div className="row mb-4">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted" />
              </span>
              <input
                className="form-control border-start-0 ps-0"
                placeholder="Search by ID, name, phone, device, status…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setSearch('')}
                >
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>
          <div className="col-auto ms-auto d-flex align-items-center gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={load} disabled={loading}>
              <i className={`bi bi-arrow-clockwise${loading ? ' spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
            <p className="mt-3 text-muted">Loading tickets…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-inbox display-4 d-block mb-3" />
            {search ? 'No tickets match your search.' : 'No repair tickets yet.'}
            {!search && (
              <div className="mt-3">
                <button className="btn btn-primary" onClick={() => setShowDrawer(true)}>
                  <i className="bi bi-plus-lg me-1" />
                  Create First Ticket
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4 fw-semibold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Ticket ID</th>
                    <th className="fw-semibold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Customer</th>
                    <th className="fw-semibold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Device</th>
                    <th className="fw-semibold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Status</th>
                    <th className="fw-semibold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Technician</th>
                    <th className="fw-semibold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Date In</th>
                    <th className="fw-semibold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }}>
                      <td className="ps-4">
                        <span className="fw-semibold text-primary small">{r.repair_id}</span>
                        {r.is_corporate && (
                          <span className="badge bg-success ms-2" style={{ fontSize: '0.6rem' }}>
                            <i className="bi bi-building me-1" />B2B
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="fw-medium small">{r.customer_name}</div>
                        {r.phone && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{r.phone}</div>}
                      </td>
                      <td>
                        <div className="small fw-medium">{[r.brand, r.model].filter(Boolean).join(' ') || '—'}</div>
                        {r.serial && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{r.serial}</div>}
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className="small text-muted">{r.technician || '—'}</td>
                      <td className="small text-muted">{r.date_in || '—'}</td>
                      <td className="small fw-medium">
                        {r.price ? `$${parseFloat(r.price).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <NewRepairDrawer
        show={showDrawer}
        onClose={() => setShowDrawer(false)}
        onCreated={handleCreated}
        technicians={technicians}
      />

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
