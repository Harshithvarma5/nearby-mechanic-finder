import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, LogOut, Wrench, ClipboardList, Users, CheckCircle2,
  XCircle, RefreshCw, AlertCircle, TrendingUp, Clock, Star,
  ChevronDown, Search, BadgeCheck, BadgeX, Activity, Box, Plus, Store
} from 'lucide-react';
import {
  getAdminStats, adminListMechanics, adminVerifyMechanic, adminListRequests,
  getVendors, addVendor, getVendorParts, addPartToVendor,
  getPendingKycMechanics, approveMechanicKyc, rejectMechanicKyc
} from '../services/api';

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="admin-stat-card" style={{ '--accent': color }}>
    <div className="admin-stat-icon">
      <Icon size={22} color={color} />
    </div>
    <div className="admin-stat-info">
      <span className="admin-stat-value">{value ?? '—'}</span>
      <span className="admin-stat-label">{label}</span>
      {sub && <span className="admin-stat-sub">{sub}</span>}
    </div>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending:   { cls: 'badge-pending',   label: 'Pending'   },
    accepted:  { cls: 'badge-accepted',  label: 'Accepted'  },
    completed: { cls: 'badge-completed', label: 'Completed' },
  };
  const { cls, label } = map[status] || { cls: 'badge-pending', label: status };
  return <span className={`admin-badge ${cls}`}>{label}</span>;
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminDashboard = ({ theme, toggleTheme, showToast }) => {
  const navigate = useNavigate();
  const adminPhone = localStorage.getItem('adminPhone');

  const [tab, setTab] = useState('overview'); // 'overview' | 'mechanics' | 'kyc' | 'vendors' | 'requests'
  const [stats, setStats] = useState(null);
  const [mechanics, setMechanics] = useState([]);
  const [requests, setRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [pendingKyc, setPendingKyc] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingKyc, setLoadingKyc] = useState(false);

  // Vendor Management State
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ shopName: '', phone: '', address: '', lat: '', lng: '' });
  const [selectedVendorForParts, setSelectedVendorForParts] = useState(null);
  const [vendorParts, setVendorParts] = useState([]);
  const [newPart, setNewPart] = useState({ partName: '', partNumber: '', price: '', stockStatus: 'in_stock' });
  const [searchQuery, setSearchQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState('');
  const [togglingPhone, setTogglingPhone] = useState(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch {
      showToast('Failed to load stats', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [showToast]);

  const fetchMechanics = useCallback(async () => {
    setLoadingMechanics(true);
    try {
      const data = await adminListMechanics();
      setMechanics(data);
    } catch {
      showToast('Failed to load mechanics', 'error');
    } finally {
      setLoadingMechanics(false);
    }
  }, [showToast]);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await adminListRequests(requestFilter || null);
      setRequests(data);
    } catch {
      showToast('Failed to load requests', 'error');
    } finally {
      setLoadingRequests(false);
    }
  }, [showToast, requestFilter]);

  const fetchVendorsData = useCallback(async () => {
    setLoadingVendors(true);
    try {
      const data = await getVendors();
      setVendors(data || []);
    } catch {
      showToast('Failed to load vendors', 'error');
    } finally {
      setLoadingVendors(false);
    }
  }, [showToast]);

  const loadVendorParts = async (vendorId) => {
    try {
      const data = await getVendorParts(vendorId);
      setVendorParts(data || []);
      setSelectedVendorForParts(vendorId);
    } catch {
      showToast('Failed to load vendor parts', 'error');
    }
  };

  const fetchKycMechanics = useCallback(async () => {
    setLoadingKyc(true);
    try {
      const data = await getPendingKycMechanics();
      setPendingKyc(data || []);
    } catch {
      showToast('Failed to load pending KYC applications', 'error');
    } finally {
      setLoadingKyc(false);
    }
  }, [showToast]);

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === 'mechanics') fetchMechanics(); }, [tab, fetchMechanics]);
  useEffect(() => { if (tab === 'requests') fetchRequests(); }, [tab, fetchRequests, requestFilter]);
  useEffect(() => { if (tab === 'vendors') fetchVendorsData(); }, [tab, fetchVendorsData]);
  useEffect(() => { if (tab === 'kyc') fetchKycMechanics(); }, [tab, fetchKycMechanics]);

  // ── Verify toggle ──────────────────────────────────────────────────────────
  const handleVerifyToggle = async (phone, currentVerified) => {
    setTogglingPhone(phone);
    try {
      await adminVerifyMechanic(phone, !currentVerified);
      setMechanics(prev =>
        prev.map(m => m.phone === phone ? { ...m, isVerified: !currentVerified } : m)
      );
      showToast(
        `Mechanic ${!currentVerified ? 'verified' : 'unverified'} successfully!`,
        'success'
      );
    } catch {
      showToast('Failed to update verification status', 'error');
    } finally {
      setTogglingPhone(null);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('adminPhone');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    try {
      await addVendor({
        shopName: newVendor.shopName,
        phone: newVendor.phone,
        address: newVendor.address,
        lat: parseFloat(newVendor.lat),
        lng: parseFloat(newVendor.lng)
      });
      showToast("Vendor added successfully", "success");
      setShowAddVendor(false);
      setNewVendor({ shopName: '', phone: '', address: '', lat: '', lng: '' });
      fetchVendorsData();
    } catch (err) {
      showToast("Failed to add vendor", "error");
    }
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    try {
      await addPartToVendor(selectedVendorForParts, {
        partName: newPart.partName,
        partNumber: newPart.partNumber,
        price: parseFloat(newPart.price),
        stockStatus: newPart.stockStatus
      });
      showToast("Part added successfully", "success");
      setNewPart({ partName: '', partNumber: '', price: '', stockStatus: 'in_stock' });
      loadVendorParts(selectedVendorForParts);
    } catch (err) {
      showToast("Failed to add part", "error");
    }
  };

  // ── Filtered mechanics ─────────────────────────────────────────────────────
  const filteredMechanics = mechanics.filter(m =>
    !searchQuery ||
    m.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone?.includes(searchQuery) ||
    m.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Render: Overview ───────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="admin-overview">
      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <StatCard
          icon={Wrench}
          label="Total Mechanics"
          value={stats?.mechanics?.total}
          sub={`${stats?.mechanics?.verified ?? 0} verified`}
          color="#6366f1"
        />
        <StatCard
          icon={CheckCircle2}
          label="Verified Shops"
          value={stats?.mechanics?.verified}
          sub={`${stats?.mechanics?.unverified ?? 0} unverified`}
          color="#10b981"
        />
        <StatCard
          icon={Activity}
          label="Open Right Now"
          value={stats?.mechanics?.open}
          color="#f59e0b"
        />
        <StatCard
          icon={ClipboardList}
          label="Total Requests"
          value={stats?.requests?.total}
          sub={`${stats?.requests?.pending ?? 0} pending`}
          color="#3b82f6"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats?.requests?.pending}
          color="#f97316"
        />
        <StatCard
          icon={TrendingUp}
          label="Completed"
          value={stats?.requests?.completed}
          color="#8b5cf6"
        />
        <StatCard
          icon={Store}
          label="Auto Parts Vendors"
          value={vendors?.length || 0}
          color="#ec4899"
        />
      </div>

      {/* Quick Actions */}
      <div className="admin-quick-actions">
        <h3 className="admin-section-title">Quick Actions</h3>
        <div className="admin-quick-btns">
          <button className="admin-quick-btn" onClick={() => setTab('mechanics')}>
            <Wrench size={18} /> Manage Mechanics
          </button>
          <button className="admin-quick-btn" onClick={() => setTab('vendors')}>
            <Store size={18} /> Manage Vendors
          </button>
          <button className="admin-quick-btn" onClick={fetchStats} disabled={loadingStats}>
            <RefreshCw size={18} className={loadingStats ? 'spin' : ''} /> Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render: Mechanics Table ────────────────────────────────────────────────
  const renderMechanics = () => (
    <div className="admin-table-section">
      <div className="admin-table-toolbar">
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, phone or address…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="admin-refresh-btn" onClick={fetchMechanics} disabled={loadingMechanics}>
          <RefreshCw size={16} className={loadingMechanics ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {loadingMechanics ? (
        <div className="admin-loading"><RefreshCw size={24} className="spin" /></div>
      ) : filteredMechanics.length === 0 ? (
        <div className="admin-empty">
          <AlertCircle size={40} />
          <p>No mechanics found</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Phone</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMechanics.map(m => (
                <tr key={m._id || m.phone}>
                  <td>
                    <div className="admin-shop-cell">
                      <span className="admin-shop-name">{m.shopName}</span>
                      <span className="admin-shop-address">{m.address}</span>
                    </div>
                  </td>
                  <td><code>{m.phone}</code></td>
                  <td>
                    <span className="admin-rating">
                      <Star size={13} fill="currentColor" /> {m.rating?.toFixed(1) ?? 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-open-badge ${m.isOpen ? 'open' : 'closed'}`}>
                      {m.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td>
                    {m.isVerified
                      ? <BadgeCheck size={20} color="#10b981" />
                      : <BadgeX size={20} color="#94a3b8" />}
                  </td>
                  <td>
                    <button
                      className={`admin-verify-btn ${m.isVerified ? 'unverify' : 'verify'}`}
                      disabled={togglingPhone === m.phone}
                      onClick={() => handleVerifyToggle(m.phone, m.isVerified)}
                    >
                      {togglingPhone === m.phone
                        ? <RefreshCw size={14} className="spin" />
                        : m.isVerified ? <><XCircle size={14} /> Unverify</> : <><CheckCircle2 size={14} /> Verify</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Render: Requests Table ─────────────────────────────────────────────────
  const renderRequests = () => (
    <div className="admin-table-section">
      <div className="admin-table-toolbar">
        <div className="admin-filter-group">
          <label>Filter by status:</label>
          <select value={requestFilter} onChange={e => setRequestFilter(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button className="admin-refresh-btn" onClick={fetchRequests} disabled={loadingRequests}>
          <RefreshCw size={16} className={loadingRequests ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {loadingRequests ? (
        <div className="admin-loading"><RefreshCw size={24} className="spin" /></div>
      ) : requests.length === 0 ? (
        <div className="admin-empty">
          <AlertCircle size={40} />
          <p>No requests found</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Issue</th>
                <th>Vehicle</th>
                <th>Mechanic</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r._id}>
                  <td><code>{r.userPhone}</code></td>
                  <td className="admin-issue-cell">{r.issue}</td>
                  <td>{r.vehicleModel ? `${r.vehicleModel} ${r.vehicleYear || ''}`.trim() : '—'}</td>
                  <td>{r.mechanicPhone ? <code>{r.mechanicPhone}</code> : <span className="admin-na">Unassigned</span>}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="admin-time-cell">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Render: KYC Review ──────────────────────────────────────────────────
  const handleApproveKyc = async (phone) => {
    if (!window.confirm("Approve this mechanic's KYC document?")) return;
    try {
        await approveMechanicKyc(phone);
        showToast("KYC Approved successfully!", "success");
        fetchKycMechanics();
    } catch {
        showToast("Failed to approve KYC", "error");
    }
  };

  const handleRejectKyc = async (phone) => {
    const reason = window.prompt("Please enter a reason for rejecting this document:");
    if (!reason) return;
    try {
        await rejectMechanicKyc(phone, reason);
        showToast("KYC Rejected successfully", "success");
        fetchKycMechanics();
    } catch {
        showToast("Failed to reject KYC", "error");
    }
  };

  const renderKyc = () => (
    <div className="admin-table-section">
      <div className="admin-table-toolbar">
         <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} className="text-primary" /> Pending KYC Approvals
        </h2>
        <button className="admin-refresh-btn" onClick={fetchKycMechanics} disabled={loadingKyc}>
          <RefreshCw size={16} className={loadingKyc ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {loadingKyc ? (
        <div className="admin-loading"><RefreshCw size={24} className="spin" /></div>
      ) : pendingKyc.length === 0 ? (
        <div className="admin-empty">
          <BadgeCheck size={40} />
          <p>No pending KYC applications found</p>
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', background: 'transparent', boxShadow: 'none' }}>
            {pendingKyc.map(m => (
                <div key={m._id} className="mechanic-card" style={{ background: 'var(--card-bg)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                    <div style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0' }}>{m.name}</h3>
                        <p style={{ margin: 0, color: 'var(--text-light)' }}>{m.shopName} • {m.phone}</p>
                        <div style={{ marginTop: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
                            <a href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${m.kyc_document_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                                View Uploaded Document 🔗
                            </a>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem', textAlign: 'center' }}>
                            Submitted: {new Date(m.kyc_submitted_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--border-color)' }}>
                        <button onClick={() => handleApproveKyc(m.phone)} style={{ padding: '1rem', border: 'none', borderRight: '1px solid var(--border-color)', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', cursor: 'pointer', fontWeight: 'bold' }}>
                            Approve
                        </button>
                        <button onClick={() => handleRejectKyc(m.phone)} style={{ padding: '1rem', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>
                            Reject
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );

  // ── Render: Vendors Table ──────────────────────────────────────────────────
  const renderVendors = () => (
    <div className="admin-table-section">
      <div className="admin-table-toolbar">
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Store size={20} className="text-primary" /> Auto Parts Vendors
        </h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => setShowAddVendor(!showAddVendor)}>
            <Plus size={16} /> Add New Vendor
          </button>
          <button className="admin-refresh-btn" onClick={fetchVendorsData} disabled={loadingVendors}>
            <RefreshCw size={16} className={loadingVendors ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {showAddVendor && (
        <div className="admin-filter-group" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', width: '100%' }}>
          <h3 style={{ marginTop: 0 }}>Register New Vendor</h3>
          <form onSubmit={handleCreateVendor} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input type="text" placeholder="Shop Name" value={newVendor.shopName} onChange={e => setNewVendor({...newVendor, shopName: e.target.value})} required className="admin-input" />
            <input type="tel" placeholder="Phone Number" value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} required className="admin-input" />
            <input type="text" placeholder="Address" value={newVendor.address} onChange={e => setNewVendor({...newVendor, address: e.target.value})} className="admin-input" style={{ gridColumn: '1 / -1' }} required />
            <input type="number" step="any" placeholder="Latitude (e.g. 12.9716)" value={newVendor.lat} onChange={e => setNewVendor({...newVendor, lat: e.target.value})} required className="admin-input" />
            <input type="number" step="any" placeholder="Longitude (e.g. 77.5946)" value={newVendor.lng} onChange={e => setNewVendor({...newVendor, lng: e.target.value})} required className="admin-input" />
            <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>Save Vendor</button>
          </form>
        </div>
      )}

      {loadingVendors ? (
        <div className="admin-loading"><RefreshCw size={24} className="spin" /></div>
      ) : vendors.length === 0 ? (
        <div className="admin-empty">
          <Store size={40} />
          <p>No vendors registered yet</p>
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start', background: 'transparent', boxShadow: 'none' }}>
          
          <div className="vendors-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {vendors.map(v => (
              <div 
                key={v._id} 
                className={`vendor-sidebar-card ${selectedVendorForParts === v._id ? 'active' : ''}`}
                onClick={() => loadVendorParts(v._id)}
                style={{ 
                  padding: '1rem', background: selectedVendorForParts === v._id ? 'var(--primary)' : 'var(--bg-primary)', 
                  color: selectedVendorForParts === v._id ? 'white' : 'var(--text-color)',
                  borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color)' 
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{v.shopName}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{v.phone}</div>
              </div>
            ))}
          </div>

          <div className="vendor-parts-panel" style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {selectedVendorForParts ? (
              <>
                <h3 style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Manage Parts Inventory
                </h3>
                
                <form onSubmit={handleAddPart} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                  <input type="text" placeholder="Part Name (e.g. Brake Pad)" value={newPart.partName} onChange={e => setNewPart({...newPart, partName: e.target.value})} required className="admin-input" style={{ flex: 2 }} />
                  <input type="number" placeholder="Price (₹)" value={newPart.price} onChange={e => setNewPart({...newPart, price: e.target.value})} required className="admin-input" style={{ flex: 1 }} />
                  <button type="submit" className="btn btn-primary"><Plus size={16}/></button>
                </form>

                {vendorParts.length === 0 ? (
                  <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem 0' }}>No parts added to this vendor yet.</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Part Name</th>
                        <th>Price (₹)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorParts.map(p => (
                        <tr key={p._id}>
                          <td><strong>{p.partName}</strong> {p.partNumber && <small className="text-light">({p.partNumber})</small>}</td>
                          <td>₹{p.price}</td>
                          <td><StatusBadge status={p.stockStatus === 'in_stock' ? 'completed' : 'pending'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <div className="admin-empty" style={{ padding: '4rem 0' }}>
                <Box size={40} />
                <p>Select a vendor to manage their parts.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className={`admin-page ${theme}`}>
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <Shield size={28} color="var(--primary)" />
          <div>
            <h1>Admin Dashboard</h1>
            <span className="admin-header-phone">{adminPhone}</span>
          </div>
        </div>
        <div className="admin-header-actions">
          <button className="admin-theme-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="admin-tabs">
        {[
          { key: 'overview',  label: 'Overview',  icon: TrendingUp    },
          { key: 'mechanics', label: 'Mechanics',  icon: Wrench        },
          { key: 'kyc',       label: 'KYC Review', icon: BadgeCheck    },
          { key: 'vendors',   label: 'Vendors',    icon: Store         },
          { key: 'requests',  label: 'Requests',   icon: ClipboardList },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`admin-tab-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="admin-content">
        {tab === 'overview'  && renderOverview()}
        {tab === 'mechanics' && renderMechanics()}
        {tab === 'kyc'       && renderKyc()}
        {tab === 'vendors'   && renderVendors()}
        {tab === 'requests'  && renderRequests()}
      </main>
    </div>
  );
};

export default AdminDashboard;
