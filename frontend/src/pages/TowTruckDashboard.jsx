import React, { useState, useEffect, useCallback } from 'react';
import { getTowRequests, acceptTowRequest, requestOtp, verifyOtp, registerTowTruck, updateTowLocation } from '../services/api';
import { Truck, Phone, MapPin, Clock, CheckCircle, Loader2, AlertCircle, LayoutDashboard, LogIn, Crosshair, Check } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
const libraries = ['places'];
import Navbar from '../components/Navbar';

const TowTruckDashboard = ({ theme, toggleTheme, showToast }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [regForm, setRegForm] = useState({ name: '', companyName: '', phone: '', address: '', lat: '', lng: '' });
    const [autocomplete, setAutocomplete] = useState(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries
    });

    const detectLocation = () => {
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setRegForm(prev => ({
                        ...prev,
                        lat: position.coords.latitude.toFixed(6),
                        lng: position.coords.longitude.toFixed(6)
                    }));
                    setLoading(false);
                    showToast('Location detected!', 'success');
                },
                (err) => {
                    console.error("Geolocation error", err);
                    showToast("Could not detect location. Please permit location access.", "error");
                    setLoading(false);
                }
            );
        }
    };

    const onPlaceChanged = () => {
        if (autocomplete !== null) {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                setRegForm(prev => ({
                    ...prev,
                    address: place.formatted_address || '',
                    lat: place.geometry.location.lat().toFixed(6),
                    lng: place.geometry.location.lng().toFixed(6)
                }));
            }
        }
    };

    // Auto-login from localStorage
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userPhone = localStorage.getItem('userPhone');
        const role = localStorage.getItem('userRole');
        if (token && userPhone && role === 'tow_truck') {
            setIsLoggedIn(true);
            setPhone(userPhone);
        }
    }, []);

    const fetchRequests = useCallback(async () => {
        setLoadingRequests(true);
        try {
            const data = await getTowRequests();
            setRequests(data || []);
        } catch (err) {
            console.error('Failed to fetch tow requests', err);
        } finally {
            setLoadingRequests(false);
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchRequests();
            const interval = setInterval(fetchRequests, 8000); // Poll every 8s
            return () => clearInterval(interval);
        }
    }, [isLoggedIn, fetchRequests]);

    // Live Location Broadcasting
    useEffect(() => {
        if (!isLoggedIn || !phone) return;

        let watchId = null;
        const acceptedRequests = requests.filter(r => r.status === 'tow_accepted');

        if (acceptedRequests.length > 0) {
            console.log("🚛 DEBUG: Starting tow location broadcast...");
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    acceptedRequests.forEach(req => {
                        updateTowLocation(req._id, latitude, longitude)
                            .catch(err => console.error("Tow Broadcast failed:", err));
                    });
                },
                (err) => console.error("Tow Geolocation Error:", err),
                { enableHighAccuracy: true, distanceFilter: 10 }
            );
        }

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [isLoggedIn, requests, phone]);

    const handleSendOtp = async () => {
        if (!phone || phone.length !== 10) { 
            showToast('Please enter a valid 10-digit phone number', 'error'); 
            return; 
        }
        setLoading(true);
        try {
            const response = await requestOtp(phone, 'tow_truck');
            setOtpSent(true);
            showToast('OTP sent successfully!', 'success');
            if (response.otp_debug) {
                showToast(`Demo Mode: OTP is ${response.otp_debug}`, 'info');
            }
        } catch (err) {
            showToast(err.response?.data?.detail || 'Failed to send OTP', 'error');
        } finally { setLoading(false); }
    };

    const handleVerifyOtp = async () => {
        if (!otp) { showToast('Enter OTP', 'error'); return; }
        setLoading(true);
        try {
            const data = await verifyOtp(phone, otp, 'tow_truck');
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('userPhone', phone);
            localStorage.setItem('userRole', 'tow_truck');
            setIsLoggedIn(true);
            showToast('Logged in successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.detail || 'Invalid OTP', 'error');
        } finally { setLoading(false); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await registerTowTruck({ ...regForm, lat: parseFloat(regForm.lat), lng: parseFloat(regForm.lng) });
            showToast('Registered! You can now login.', 'success');
            setMode('login');
            setPhone(regForm.phone);
        } catch (err) {
            showToast(err.response?.data?.detail || 'Registration failed', 'error');
        } finally { setLoading(false); }
    };

    const handleAccept = async (requestId) => {
        try {
            await acceptTowRequest(requestId);
            showToast('🚛 Tow request claimed! Navigate to the user.', 'success');
            fetchRequests();
        } catch (err) {
            showToast(err.response?.data?.detail || 'Already claimed by another driver!', 'error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userRole');
        setIsLoggedIn(false);
        setPhone('');
        setOtp('');
        setOtpSent(false);
    };

    // ── Render: Login/Register Form ──────────────────────────────────────────
    if (!isLoggedIn) {
        return (
            <div className={`app-container scrollable ${theme}`}>
                <div className="mesh-bg" />
                <Navbar theme={theme} toggleTheme={toggleTheme} />
                <div className="tow-reg-container">
                    <div className="tow-reg-card premium-glass">

                        <div className="tow-reg-header">
                            <Truck size={60} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                            <h2>Tow Truck Portal</h2>
                            <p style={{ color: 'var(--text-light)' }}>Join the largest emergency haulage network</p>
                        </div>

                        <div style={{ display: 'flex', background: 'rgba(var(--bg-rgb), 0.1)', padding: '6px', borderRadius: '14px', marginBottom: '2.5rem' }}>
                            <button onClick={() => setMode('login')} className={`btn ${mode === 'login' ? 'btn-primary' : ''}`} style={{ flex: 1, border: 'none', background: mode === 'login' ? 'var(--primary)' : 'transparent', color: mode === 'login' ? 'white' : 'var(--text-color)', borderRadius: '10px', height: '40px', fontWeight: 600 }}>Login</button>
                            <button onClick={() => setMode('register')} className={`btn ${mode === 'register' ? 'btn-primary' : ''}`} style={{ flex: 1, border: 'none', background: mode === 'register' ? 'var(--primary)' : 'transparent', color: mode === 'register' ? 'white' : 'var(--text-color)', borderRadius: '10px', height: '40px', fontWeight: 600 }}>Register</button>
                        </div>

                        {mode === 'login' ? (
                            <div className="registration-form-grid">
                                <div className="form-field glow-input">
                                    <label>
                                        <Phone size={14} /> Registered Phone Number
                                        {phone.length === 10 && <span className="status-check-badge"><Check size={10} /></span>}
                                    </label>
                                    <input 
                                        type="tel" 
                                        placeholder="e.g. 9876543210" 
                                        value={phone} 
                                        onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} 
                                        className="admin-input" 
                                    />
                                </div>
                                {!otpSent ? (
                                    <button className="submit-btn-premium" onClick={handleSendOtp} disabled={loading}>
                                        {loading ? <Loader2 size={20} className="spin" /> : <LogIn size={20} />} Get OTP to Login
                                    </button>
                                ) : (
                                    <>
                                        <div className="form-field">
                                            <label><CheckCircle size={14} /> Enter 6-Digit OTP</label>
                                            <input type="text" placeholder="000000" value={otp} onChange={e => setOtp(e.target.value)} className="admin-input" maxLength={6} />
                                        </div>
                                        <button className="submit-btn-premium" onClick={handleVerifyOtp} disabled={loading}>
                                            {loading ? <Loader2 size={20} className="spin" /> : <CheckCircle size={20} />} Verify & Access Portal
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleRegister} className="registration-form-grid">
                                <div className="form-field">
                                    <label>Driver Full Name</label>
                                    <input type="text" placeholder="Enter your name" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} className="admin-input" required />
                                </div>
                                <div className="form-field">
                                    <label>Company Name</label>
                                    <input type="text" placeholder="e.g. QuickTow Services" value={regForm.companyName} onChange={e => setRegForm({...regForm, companyName: e.target.value})} className="admin-input" required />
                                </div>
                                <div className="form-field glow-input">
                                    <label>
                                        Phone Number (OTP Verification)
                                        {regForm.phone.length === 10 && <span className="status-check-badge"><Check size={10} /></span>}
                                    </label>
                                    <input type="tel" placeholder="10-digit number" value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value.replace(/\D/g,'').slice(0,10)})} className="admin-input" required />
                                </div>
                                
                                <div className="form-field">
                                    <label>Business Address</label>
                                    {isLoaded ? (
                                        <Autocomplete onLoad={inst => setAutocomplete(inst)} onPlaceChanged={onPlaceChanged}>
                                            <input type="text" placeholder="Search or type address..." value={regForm.address} onChange={e => setRegForm({...regForm, address: e.target.value})} className="admin-input" required />
                                        </Autocomplete>
                                    ) : (
                                        <input type="text" placeholder="Address" value={regForm.address} onChange={e => setRegForm({...regForm, address: e.target.value})} className="admin-input" required />
                                    )}
                                </div>

                                <div className="coordinates-premium-box">
                                    <div className="tow-coordinates-header">
                                        <label style={{ color: 'var(--primary)', margin: 0 }}>GPS Coordinates</label>
                                        <button type="button" onClick={detectLocation} className="detect-trigger">
                                            <Crosshair size={14} /> Use My Current GPS
                                        </button>
                                    </div>
                                    <div className="coordinates-grid">
                                        <div className="form-field">
                                            <input type="number" step="any" placeholder="Latitude" value={regForm.lat} onChange={e => setRegForm({...regForm, lat: e.target.value})} className="admin-input" required />
                                        </div>
                                        <div className="form-field">
                                            <input type="number" step="any" placeholder="Longitude" value={regForm.lng} onChange={e => setRegForm({...regForm, lng: e.target.value})} className="admin-input" required />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="submit-btn-premium" disabled={loading}>
                                    {loading ? <Loader2 size={22} className="spin" /> : <Truck size={22} />} Register & Join Network
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Main Dashboard ────────────────────────────────────────────────
    return (
        <div className={`app-container ${theme}`}>
            <div className="mesh-bg" />
            <Navbar theme={theme} toggleTheme={toggleTheme} />
            <div className="dashboard-layout">
                <header className="dashboard-header">
                    <div className="header-info">
                        <h1><Truck size={24} /> Tow Truck Dispatch</h1>
                        <p>Phone: <strong>{phone}</strong></p>
                    </div>
                    <div className="header-actions">
                        <button className="admin-refresh-btn" onClick={fetchRequests} disabled={loadingRequests}>
                            {loadingRequests ? <Loader2 size={16} className="spin" /> : '⟳'} Refresh
                        </button>
                        <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
                    </div>
                </header>

                <main className="dashboard-content">
                    <section className="requests-section">
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🚨 Emergency Tow Requests
                            <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '20px', padding: '2px 10px', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                                {requests.length} pending
                            </span>
                        </h2>

                        {loadingRequests && requests.length === 0 ? (
                            <div className="loader-container"><Loader2 size={40} className="spin" /></div>
                        ) : requests.length === 0 ? (
                            <div className="empty-dashboard">
                                <CheckCircle size={48} />
                                <p>No emergency tow requests right now.</p>
                                <small style={{ color: 'var(--text-light)' }}>Auto-refreshes every 8 seconds</small>
                            </div>
                        ) : (
                            <div className="requests-grid">
                                {requests.map(req => (
                                    <div key={req._id} className="request-card" style={{ border: '2px solid #ef4444', boxShadow: '0 0 20px rgba(239,68,68,0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                                                🚨 TOW NEEDED
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                                {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <h3 style={{ margin: '0 0 1rem', lineHeight: 1.4 }}>{req.issue}</h3>

                                        <div className="request-info" style={{ marginBottom: '1rem' }}>
                                            <div className="info-item"><Phone size={14} /><span>{req.userPhone}</span></div>
                                            <div className="info-item location-link"
                                                onClick={() => window.open(`https://www.google.com/maps?q=${req.lat},${req.lng}`, '_blank')}
                                                style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '600' }}>
                                                <MapPin size={14} /><span>Navigate to Breakdown → ({req.lat?.toFixed(3)}, {req.lng?.toFixed(3)})</span>
                                            </div>
                                            {req.vehicleModel && (
                                                <div className="info-item"><Truck size={14} /><span>{req.vehicleYear} {req.vehicleModel}</span></div>
                                            )}
                                        </div>

                                        <button className="btn btn-primary accept-btn"
                                            onClick={() => handleAccept(req._id)}
                                            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', width: '100%' }}>
                                            🚛 Claim This Tow Request
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
};

export default TowTruckDashboard;
