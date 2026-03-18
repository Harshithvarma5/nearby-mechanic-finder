import React, { useState, useEffect } from 'react';
import { getServiceRequests, updateRequestStatus, updateMechanicStatus, getMechanicByPhone, updateMechanicLocation, searchParts, uploadMechanicKyc, escalateToTow } from '../services/api';
import { LayoutDashboard, Clock, CheckCircle, MapPin, Phone, LogOut, Loader2, AlertCircle, Wrench, Mic, MessageSquare, Search, Box, ShieldCheck, Truck } from 'lucide-react';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';

const MechanicDashboard = ({ theme, toggleTheme, showToast }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [phone, setPhone] = useState(localStorage.getItem('mechanicPhone') || '');
    const [mechanicInfo, setMechanicInfo] = useState(null);
    const [requests, setRequests] = useState([]);
    const [historyRequests, setHistoryRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('available');
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ completed: 0, earnings: 0 });
    const [etaRequestId, setEtaRequestId] = useState(null); // Track which request is getting an ETA

    // --- Spare Parts State ---
    const [partQuery, setPartQuery] = useState('');
    const [partResults, setPartResults] = useState([]);
    const [searchingParts, setSearchingParts] = useState(false);

    // --- KYC State ---
    const [uploadingKyc, setUploadingKyc] = useState(false);

    useEffect(() => {
        const storedPhone = localStorage.getItem('mechanicPhone');
        if (storedPhone) {
            autoLogin(storedPhone);
        } else {
            setLoading(false);
            setError("No active session found. Please login again.");
        }
    }, []);

    const autoLogin = async (storedPhone) => {
        setLoading(true);
        try {
            const info = await getMechanicByPhone(storedPhone);
            setMechanicInfo(info);
            setStatus(info.availability || 'available');
            setIsLoggedIn(true);
            setPhone(storedPhone);
            fetchRequests(info);
            fetchHistory(storedPhone);
        } catch (err) {
            console.error("Auto-login Error:", err);
            setError("Session expired or invalid. Please login again.");
            localStorage.removeItem('mechanicPhone');
            localStorage.removeItem('userRole');
        } finally {
            setLoading(false);
        }
    };

    const fetchRequests = async (info = mechanicInfo) => {
        if (!info) return;
        setLoading(true);
        try {
            const data = await getServiceRequests('pending');
            
            // 1. Calculate distance and match info for each request
            const mappedRequests = data.map(req => {
                let dist = null;
                if (info && info.lat && info.lng && req.lat && req.lng) {
                    dist = calculateDistance(info.lat, info.lng, req.lat, req.lng);
                }

                const issueLower = req.issue.toLowerCase();
                
                // expertise check
                const isExpertiseMatch = info?.services?.some(service => 
                    issueLower.includes(service.toLowerCase()) || 
                    service.toLowerCase().includes(issueLower)
                );

                // General keywords that every mechanic should see
                const generalKeywords = ['mechanic', 'help', 'repair', 'broken', 'starting', 'fix', 'stop', 'smoke', 'problem'];
                const isGeneralMatch = generalKeywords.some(kw => issueLower.includes(kw));

                return { ...req, distance: dist, isExpertiseMatch, isGeneralMatch };
            });

            // 2. Filter requests based on criteria
            const filtered = mappedRequests.filter(req => {
                // Distance check: discard if more than 50km away (extended for testing)
                if (req.distance !== null && req.distance > 50) return false;

                // Always show if it matches expertise
                if (req.isExpertiseMatch) return true;
                
                // Show if it's general repair and close by (within 30km)
                if (req.isGeneralMatch && req.distance !== null && req.distance < 30) return true;

                // Fallback: show if very close (under 10km) regardless of text match
                if (req.distance !== null && req.distance < 10) return true;

                return false;
            });

            setRequests(filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0)));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to calculate distance (Earth's radius in km)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    const fetchHistory = async (mechanicPhone = phone) => {
        try {
            const results = await Promise.all([
                getServiceRequests('accepted', mechanicPhone),
                getServiceRequests('completed', mechanicPhone),
                getServiceRequests('cancelled', mechanicPhone)
            ]);
            const combined = [...results[0], ...results[1], ...results[2]];
            setHistoryRequests(combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            
            // Calculate stats
            const completed = results[1].length;
            setStats({
                completed: completed,
                earnings: completed * 500 // Assuming 500 per request
            });
        } catch (err) {
            console.error("History fetch failed", err);
        }
    };

    // Location Broadcasting for "Uber Style" Tracking
    useEffect(() => {
        if (!isLoggedIn || !phone) return;

        let watchId = null;
        const acceptedRequests = historyRequests.filter(r => r.status === 'accepted');

        if (acceptedRequests.length > 0) {
            console.log("📍 DEBUG: Starting location broadcast for accepted jobs...");
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    // Update location for all accepted requests
                    acceptedRequests.forEach(req => {
                        updateMechanicLocation(req._id, latitude, longitude)
                            .catch(err => console.error("Broadcast failed:", err));
                    });
                },
                (err) => console.error("Geolocation Error:", err),
                { enableHighAccuracy: true, distanceFilter: 10 } // Update every 10 meters
            );
        }

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [isLoggedIn, historyRequests, phone]);

    const handleStatusUpdate = async (newStatus) => {
        try {
            await updateMechanicStatus(phone, newStatus);
            setStatus(newStatus);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAcceptRequest = async (requestId, etaValue) => {
        try {
            await updateRequestStatus(requestId, 'accepted', phone, etaValue);
            fetchRequests();
            fetchHistory();
            showToast(`Request accepted! ETA: ${etaValue}.`, "success");
            setEtaRequestId(null);
        } catch (err) {
            console.error(err);
            showToast("Failed to accept request.", "error");
        }
    };

    const handleCompleteRequest = async (requestId) => {
        try {
            await updateRequestStatus(requestId, 'completed', phone);
            fetchHistory();
            showToast("Work marked as completed!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to update job.", "error");
        }
    };

    const handleSearchParts = async (e) => {
        e.preventDefault();
        if (!partQuery.trim()) return;
        setSearchingParts(true);
        try {
            const lat = mechanicInfo?.location?.coordinates[1] || mechanicInfo?.lat || 0;
            const lng = mechanicInfo?.location?.coordinates[0] || mechanicInfo?.lng || 0;
            const results = await searchParts(partQuery, lat, lng, 20); // 20km radius
            setPartResults(results || []);
            if (results?.length === 0) showToast("No vendors found with this part nearby.", "error");
        } catch (err) {
            console.error("Failed to search parts:", err);
            showToast("Failed to search parts.", "error");
        } finally {
            setSearchingParts(false);
        }
    };

    const handleKycUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            showToast("File size must be less than 5MB.", "error");
            return;
        }

        setUploadingKyc(true);
        try {
            await uploadMechanicKyc(file);
            showToast("KYC Document uploaded securely! Pending Administrator review.", "success");
            autoLogin(phone); // Reload mechanic state to reflect 'pending'
        } catch (err) {
            console.error("KYC Upload Error:", err);
            showToast("Failed to upload KYC document: " + (err.response?.data?.detail || "Unknown error"), "error");
        } finally {
            setUploadingKyc(false);
        }
    };

    if (loading) {
        return (
            <div className={`app-container ${theme}`}>
                <Navbar theme={theme} toggleTheme={toggleTheme} />
                <div className="loader-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <Loader2 className="spin" size={48} color="var(--primary)" />
                    <p style={{ marginLeft: '1rem' }}>Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className={`app-container ${theme}`}>
                <Navbar theme={theme} toggleTheme={toggleTheme} />
                <div className="error-container" style={{ textAlign: 'center', padding: '10rem 2rem' }}>
                    <AlertCircle size={48} color="red" style={{ marginBottom: '1rem' }} />
                    <h2>Unauthorized Access</h2>
                    <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>{error || "Please login to access the dashboard."}</p>
                    <button className="btn btn-primary" onClick={() => window.location.href = '/login'}>Go to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`app-container ${theme}`}>
            <Navbar theme={theme} toggleTheme={toggleTheme} />
            <div className="dashboard-layout">
                <header className="dashboard-header">
                    <div className="header-info">
                        <h1><LayoutDashboard size={24} /> Mechanic Dashboard</h1>
                        <p>Welcome back, <strong>{mechanicInfo?.shopName || 'Mechanic'}</strong>!</p>
                        <div className="expertise-tags">
                            {mechanicInfo?.services?.map(s => (
                                <span key={s} className="expertise-tag">{s}</span>
                            ))}
                        </div>
                    </div>
                    
                    <div className="dashboard-stats">
                        <div className="stat-card">
                            <span className="stat-label">Earnings</span>
                            <span className="stat-value">₹{stats.earnings}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Jobs Done</span>
                            <span className="stat-value">{stats.completed}</span>
                        </div>
                    </div>

                    <div className="header-actions">
                        <div className="status-toggle-group">
                            <button 
                                className={`status-btn ${status === 'available' ? 'active' : ''}`}
                                onClick={() => handleStatusUpdate('available')}
                            >Available</button>
                            <button 
                                className={`status-btn ${status === 'busy' ? 'active' : ''}`}
                                onClick={() => handleStatusUpdate('busy')}
                            >Busy</button>
                            <button 
                                className={`status-btn ${status === 'closed' ? 'active' : ''}`}
                                onClick={() => handleStatusUpdate('closed')}
                            >Closed</button>
                        </div>
                    </div>
                </header>

                {/* KYC STATUS BANNER */}
                {(!mechanicInfo?.isVerified) && (
                    <div className="kyc-banner" style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldCheck size={20} className={mechanicInfo?.kyc_status === 'approved' ? 'text-success' : 'text-warning'} />
                            Identity Verification (KYC) required to unlock full functionality
                        </h3>
                        
                        {mechanicInfo?.kyc_status === 'not_submitted' && (
                            <div>
                                <p style={{ color: 'var(--text-light)', marginBottom: '1rem', lineHeight: '1.5' }}>Please upload a clear picture of your valid Government ID (Aadhar Card, Driver's License, or Business Registration) to securely verify your identity. <br/>This protects users and increases your platform trust score.</p>
                                <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleKycUpload} style={{ display: 'block', marginBottom: '1rem' }} disabled={uploadingKyc} />
                                {uploadingKyc && <p style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><Loader2 size={16} className="spin" /> Uploading securely...</p>}
                            </div>
                        )}
                        
                        {mechanicInfo?.kyc_status === 'pending' && (
                            <div style={{ padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Clock size={20} /> Your KYC document has been received and is currently under review by our administrators. Please check back later.
                            </div>
                        )}
                        
                        {mechanicInfo?.kyc_status === 'rejected' && (
                            <div>
                                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <AlertCircle size={20} /> <strong>Verification Rejected:</strong> {mechanicInfo.kyc_rejection_reason || 'Document was invalid or illegible.'}
                                </div>
                                <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>Please re-upload a clear, valid document to proceed:</p>
                                <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleKycUpload} style={{ display: 'block', marginBottom: '1rem' }} disabled={uploadingKyc} />
                                {uploadingKyc && <p style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><Loader2 size={16} className="spin" /> Uploading securely...</p>}
                            </div>
                        )}
                    </div>
                )}

                <div className="dashboard-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        New Requests ({requests.length})
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        My History ({historyRequests.length})
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'parts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('parts')}
                    >
                        Find Spare Parts
                    </button>
                </div>

                <main className="dashboard-content">
                    {activeTab === 'pending' && (
                        <section className="requests-section">
                            <h2>New Requests Matched for You</h2>
                            {loading ? (
                                <div className="loader-container">
                                    <Loader2 className="spin" size={40} />
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="empty-dashboard">
                                    <CheckCircle size={48} />
                                    <p>No matching requests at the moment.</p>
                                    <button onClick={() => fetchRequests()} className="btn btn-secondary">Refresh</button>
                                </div>
                            ) : (
                                <div className="requests-grid">
                                    {requests.map(req => (
                                        <div key={req._id} className={`request-card ${req.isExpertiseMatch ? 'highlight-match' : ''}`}>
                                            <div className="status-container">
                                                <div className="request-status">PENDING</div>
                                                {req.isExpertiseMatch && (
                                                    <div className="expertise-badge">
                                                        <CheckCircle size={10} /> MATCHES EXPERTISE
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="request-issue">{req.issue}</h3>
                                            <div className="request-info">
                                                <div className="info-item">
                                                    <Phone size={14} /> <span>{req.userPhone}</span>
                                                </div>
                                                <div 
                                                    className="info-item location-link"
                                                    onClick={() => window.open(`https://www.google.com/maps?q=${req.lat},${req.lng}`, '_blank')}
                                                    style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '600' }}
                                                    title="Open in Google Maps"
                                                >
                                                    <MapPin size={14} /> 
                                                    <span>
                                                        {req.distance ? `${req.distance.toFixed(1)} km away` : 'Near you'} (Navigate)
                                                    </span>
                                                </div>
                                                <div className="info-item date-info">
                                                    <Clock size={14} /> <span>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>

                                            {req.vehicleModel && (
                                                <div className="vehicle-info-badge">
                                                    <Wrench size={12} />
                                                    <span>{req.vehicleYear} {req.vehicleModel} ({req.engineType})</span>
                                                </div>
                                            )}

                                            {req.voiceData && (
                                                <div className="request-voice">
                                                    <h4><Mic size={14} /> Voice Message:</h4>
                                                    <audio src={req.voiceData} controls className="request-audio" />
                                                </div>
                                            )}

                                            <button 
                                                className="btn btn-primary accept-btn"
                                                onClick={() => setEtaRequestId(req._id)}
                                            >
                                                Accept Request
                                            </button>

                                            {etaRequestId === req._id && (
                                                <div className="eta-selection-container">
                                                    <h4>Select ETA:</h4>
                                                    <div className="eta-selection-grid">
                                                        {['10 mins', '20 mins', '30 mins', '45 mins', '1 hour', 'ASAP'].map(val => (
                                                            <button 
                                                                key={val} 
                                                                className="eta-option"
                                                                onClick={() => handleAcceptRequest(req._id, val)}
                                                            >
                                                                {val}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button className="btn-text" onClick={() => setEtaRequestId(null)} style={{marginTop: '0.5rem', fontSize: '0.8rem'}}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                    
                    {activeTab === 'history' && (
                        <section className="history-section">
                            <h2>Your Job History</h2>
                            <div className="requests-grid">
                                {historyRequests.length === 0 ? (
                                    <p>No history yet.</p>
                                ) : (
                                    historyRequests.map(req => (
                                        <div key={req._id} className={`request-card status-${req.status}`}>
                                            <div className="request-status">{req.status.toUpperCase()}</div>
                                            <h3 className="request-issue">{req.issue}</h3>
                                            <div className="request-info">
                                                <div className="info-item">
                                                    <Phone size={14} /> <span>{req.userPhone}</span>
                                                </div>
                                                {req.eta && (
                                                    <div className="info-item">
                                                        <Clock size={14} /> <span>ETA: {req.eta}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {req.vehicleModel && (
                                                <div className="vehicle-info-badge small">
                                                    <span>{req.vehicleYear} {req.vehicleModel}</span>
                                                </div>
                                            )}

                                            {req.status === 'accepted' && (
                                                <>
                                                    <ChatBox 
                                                        requestId={req._id}
                                                        senderPhone={req.mechanicPhone || phone}
                                                        receiverName="User"
                                                        isMechanic={true}
                                                    />
                                                    <button 
                                                        className="btn btn-success"
                                                        style={{ background: 'var(--success)', color: 'white', marginTop: '1rem', width: '100%' }}
                                                        onClick={() => handleCompleteRequest(req._id)}
                                                    >
                                                        Mark as Completed
                                                    </button>
                                                    <button
                                                        style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                                        onClick={async () => {
                                                            if (!window.confirm('Call for a Tow Truck? This will alert nearby tow drivers.')) return;
                                                            try {
                                                                await escalateToTow(req._id);
                                                                showToast('🚛 Tow Truck request sent! Nearby drivers are being alerted.', 'success');
                                                                fetchHistory();
                                                            } catch (err) {
                                                                showToast(err.response?.data?.detail || 'Failed to escalate', 'error');
                                                            }
                                                        }}
                                                    >
                                                        <Truck size={16} /> Vehicle Needs Tow Truck
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    )}

                    {activeTab === 'parts' && (
                        <section className="parts-section" style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Box size={24} className="text-primary" />
                                <h2 style={{ margin: 0 }}>Auto Parts Locater</h2>
                            </div>
                            <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
                                Need a spare part urgently to complete a repair? Search our network of local Auto Parts Vendors to see who has it in stock nearby.
                            </p>
                            
                            <form onSubmit={handleSearchParts} style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '600px', marginBottom: '2rem' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Search part name, e.g. Honda Civic Alternator..." 
                                        value={partQuery}
                                        onChange={(e) => setPartQuery(e.target.value)}
                                        style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: '8px' }}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={searchingParts}>
                                    {searchingParts ? <Loader2 size={18} className="spin" /> : 'Search Nearby'}
                                </button>
                            </form>

                            {partResults.length > 0 && (
                                <div className="vendors-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <h3 style={{ marginBottom: '0.5rem' }}>{partResults.length} Vendors Found:</h3>
                                    {partResults.map((result, idx) => (
                                        <div key={idx} className="vendor-card" style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{result.vendor.shopName}</h3>
                                                    <div style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', gap: '1rem' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={14} /> {result.vendor.address}</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={14} /> {result.vendor.phone}</span>
                                                    </div>
                                                </div>
                                                <a href={`tel:${result.vendor.phone}`} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                                                    <Phone size={16} /> Call Shop
                                                </a>
                                            </div>
                                            
                                            <div className="matched-parts" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                                <strong style={{ fontSize: '0.9rem' }}>In Stock:</strong>
                                                <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {result.parts.map(p => (
                                                        <li key={p._id} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px' }}>
                                                            <span>{p.partName} <small style={{ color: 'var(--text-light)' }}>(PN: {p.partNumber || 'N/A'})</small></span>
                                                            <strong style={{ color: 'var(--success)' }}>₹{p.price}</strong>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MechanicDashboard;
