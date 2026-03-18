import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerMechanic } from '../services/api';
import Navbar from '../components/Navbar';
import { Wrench, Phone, MapPin, CheckCircle } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import MapView from '../components/MapView';

const libraries = ['places'];

const RegisterMechanic = ({ theme, toggleTheme, showToast }) => {
    const navigate = useNavigate();
    
    // Load Google Maps script globally for Autocomplete
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries
    });

    const [formData, setFormData] = useState({
        name: '',
        shopName: '',
        phone: '',
        address: '',
        services: '',
        lat: '',
        lng: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [autocomplete, setAutocomplete] = useState(null);

    const onAutocompleteLoad = (autocompleteInstance) => {
        setAutocomplete(autocompleteInstance);
    };

    const onPlaceChanged = () => {
        if (autocomplete !== null) {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setFormData(prev => ({
                    ...prev,
                    address: place.formatted_address || '',
                    lat: lat.toString(),
                    lng: lng.toString()
                }));
            }
        }
    };

    const detectLocation = () => {
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        lat: position.coords.latitude.toString(),
                        lng: position.coords.longitude.toString()
                    }));
                    setLoading(false);
                },
                (err) => {
                    console.error("Geolocation error", err);
                    setError("Could not detect location. Please enable location permissions.");
                    setLoading(false);
                }
            );
        } else {
            setError("Geolocation is not supported by your browser.");
        }
    };

    const handleMapClick = (coords) => {
        setFormData(prev => ({
            ...prev,
            lat: coords.lat.toFixed(6),
            lng: coords.lng.toFixed(6)
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Validation for phone: 10 digits only
        if (name === 'phone') {
            const onlyNums = value.replace(/[^0-9]/g, '');
            if (onlyNums.length <= 10) {
                setFormData(prev => ({ ...prev, [name]: onlyNums }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Process services into an array
            const servicesArray = formData.services.split(',').map(s => s.trim()).filter(s => s !== '');
            
            const payload = {
                ...formData,
                services: servicesArray,
                lat: parseFloat(formData.lat),
                lng: parseFloat(formData.lng)
            };

            await registerMechanic(payload);
            setSuccess(true);
            showToast("Registration successful! Welcome to the network.", "success");
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err) {
            console.error("Registration failed", err);
            const msg = err.response?.data?.detail || "Failed to register mechanic shop. Please try again.";
            setError(msg);
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="app-container">
                <Navbar theme={theme} toggleTheme={toggleTheme} />
                <div className="registration-success-container">
                    <CheckCircle className="success-icon" size={64} />
                    <h2>Mechanic registered successfully!</h2>
                    <p>Your shop will now appear on the map for users in need.</p>
                    <p>Redirecting you to the home page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Navbar theme={theme} toggleTheme={toggleTheme} />
            <div className="registration-container">
                <div className="registration-card">
                    <div className="registration-header">
                        <Wrench size={32} className="brand-icon" />
                        <h1>Register Your Shop</h1>
                        <p>Join our network and help people near you.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="registration-form">
                        <div className="form-group">
                            <label htmlFor="name">Mechanic Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="shopName">Shop Name</label>
                            <input
                                type="text"
                                id="shopName"
                                name="shopName"
                                value={formData.shopName}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Ravi's Bike Clinic"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <div className="input-with-icon">
                                    <Phone size={16} />
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        placeholder="9876543210"
                                        maxLength="10"
                                        pattern="[0-9]{10}"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="address">Full Address (Autocomplete)</label>
                            <div className="input-with-icon">
                                <MapPin size={16} />
                                {isLoaded ? (
                                    <Autocomplete
                                        onLoad={onAutocompleteLoad}
                                        onPlaceChanged={onPlaceChanged}
                                        style={{ width: '100%' }}
                                    >
                                        <input
                                            type="text"
                                            id="address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            required
                                            placeholder="Type your shop address..."
                                            style={{ width: '100%' }}
                                        />
                                    </Autocomplete>
                                ) : (
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        required
                                        placeholder="Loading maps..."
                                        style={{ width: '100%' }}
                                        disabled
                                    />
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="services">Services offered (comma separated)</label>
                            <input
                                type="text"
                                id="services"
                                name="services"
                                value={formData.services}
                                onChange={handleChange}
                                placeholder="Oil Change, Engine Repair, Puncture"
                            />
                        </div>

                        <div className="form-group">
                            <label>Shop Location on Map</label>
                            <p className="form-help">Click on the map to set your shop's exact location or use the detect button.</p>
                            <div className="registration-map-wrapper">
                                <MapView 
                                    isPicker={true}
                                    onMapClick={handleMapClick}
                                    pendingLocation={formData.lat && formData.lng ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) } : null}
                                    theme={theme}
                                />
                                <button 
                                    type="button" 
                                    className="detect-btn" 
                                    onClick={detectLocation}
                                    title="Detect my current location"
                                >
                                    <MapPin size={20} />
                                    Detect My Location
                                </button>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="lat">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    id="lat"
                                    name="lat"
                                    value={formData.lat}
                                    onChange={handleChange}
                                    required
                                    placeholder="17.385"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lng">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    id="lng"
                                    name="lng"
                                    value={formData.lng}
                                    onChange={handleChange}
                                    required
                                    placeholder="78.486"
                                />
                            </div>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button 
                            type="submit" 
                            className="btn btn-primary submit-btn"
                            disabled={loading}
                        >
                            {loading ? "Registering..." : "Register Shop"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterMechanic;
