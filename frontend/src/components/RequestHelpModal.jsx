import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, MapPin, Phone, MessageSquare, Loader2, Mic, Square, Play, Trash2, AlertTriangle, CheckCircle, Clock, Wrench, Car } from 'lucide-react';
import { createServiceRequest, getUserVehicles, aiDiagnoseAudio } from '../services/api';

const VEHICLE_MODELS = [
    // --- Cars ---
    "Maruti Suzuki Swift", "Maruti Suzuki WagonR", "Maruti Suzuki Baleno", "Maruti Suzuki Alto", "Maruti Suzuki Dzire", "Maruti Suzuki Ertiga", "Maruti Suzuki Brezza",
    "Hyundai i20", "Hyundai i10 Nios", "Hyundai Creta", "Hyundai Venue", "Hyundai Verna", "Hyundai Alcazar", "Hyundai Tucson",
    "Tata Nexon", "Tata Tiago", "Tata Punch", "Tata Harrier", "Tata Safari", "Tata Altroz", "Tata Tigor",
    "Mahindra Scorpio-N", "Mahindra Thar", "Mahindra XUV700", "Mahindra Bolero", "Mahindra XUV300",
    "Honda City", "Honda Amaze", "Honda Elevate",
    "Toyota Innova Hycross", "Toyota Fortuner", "Toyota Glanza", "Toyota Urban Cruiser",
    "Kia Seltos", "Kia Sonet", "Kia Carens", "Kia EV6",
    "Volkswagen Virtus", "Volkswagen Taigun", "Volkswagen Tiguan",
    "Skoda Slavia", "Skoda Kushaq", "Skoda Kodiaq",
    "MG Hector", "MG Astor", "MG ZS EV",
    
    // --- Two-Wheelers (Bikes & Scooters) ---
    "Royal Enfield Classic 350", "Royal Enfield Bullet 350", "Royal Enfield Himalayan", "Royal Enfield Hunter 350", "Royal Enfield Meteor 350", "Royal Enfield Interceptor 650",
    "Hero Splendor Plus", "Hero HF Deluxe", "Hero Passion Pro", "Hero Glamour", "Hero XPulse 200", "Hero Pleasure Plus", "Hero Destini",
    "Honda Activa 6G", "Honda Activa 125", "Honda Shine", "Honda SP 125", "Honda Unicorn", "Honda Dio", "Honda Hornet 2.0", "Honda CB350",
    "Bajaj Pulsar 125", "Bajaj Pulsar 150", "Bajaj Pulsar NS200", "Bajaj Pulsar 220F", "Bajaj Platina", "Bajaj CT100", "Bajaj Avenger", "Bajaj Dominar 400", "Bajaj Chetak (EV)",
    "TVS Apache RTR 160", "TVS Apache RTR 200", "TVS Apache RR 310", "TVS Jupiter", "TVS XL100", "TVS Ntorq 125", "TVS Raider 125", "TVS iQube (EV)",
    "Yamaha R15 V4", "Yamaha MT-15", "Yamaha FZ-S", "Yamaha RayZR 125", "Yamaha Fascino 125", "Yamaha Aerox 155",
    "Suzuki Access 125", "Suzuki Burgman Street", "Suzuki Gixxer SF 250", "Suzuki V-Strom SX",
    "KTM Duke 200", "KTM Duke 390", "KTM RC 200", "KTM Adventure 390",
    "Ola S1 Pro", "Ola S1 Air", "Ather 450X", "TVS iQube",
    
    "Other Car", "Other Bike/Scooter"
];

const YEARS = Array.from({ length: 17 }, (_, i) => (2026 - i).toString());

const RequestHelpModal = ({ userLocation, onClose, onSuccess, showToast }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        userPhone: localStorage.getItem('userPhone') || '',
        issue: '',
        vehicleId: '',
        vehicleModel: localStorage.getItem('vehicleModel') || '',
        vehicleYear: localStorage.getItem('vehicleYear') || '',
        engineType: localStorage.getItem('engineType') || ''
    });
    const [garageVehicles, setGarageVehicles] = useState([]);
    const [loadingGarage, setLoadingGarage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [diagnosing, setDiagnosing] = useState(false);
    const [error, setError] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioBase64, setAudioBase64] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        loadGarage();
    }, []);

    const loadGarage = async () => {
        setLoadingGarage(true);
        try {
            const vehicles = await getUserVehicles();
            setGarageVehicles(vehicles || []);
        } catch (err) {
            console.error("Could not load garage vehicles", err);
        } finally {
            setLoadingGarage(false);
        }
    };

    const handleGarageSelection = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            setFormData({...formData, vehicleId: '', vehicleModel: '', vehicleYear: ''});
            return;
        }
        const v = garageVehicles.find(v => v._id === selectedId);
        if (v) {
            setFormData({
                ...formData,
                vehicleId: v._id,
                vehicleModel: `${v.make} ${v.model}`,
                vehicleYear: v.year
            });
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(URL.createObjectURL(blob));
                
                // Convert to base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    setAudioBase64(reader.result);
                };
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            setError("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleAiDiagnose = async () => {
        if (!audioBase64) { setError('Please record a voice message first.'); return; }
        setDiagnosing(true);
        try {
            const result = await aiDiagnoseAudio(audioBase64);
            const diagnosisText = result.transcription
                ? `${result.transcription} [AI Diagnosis: ${result.diagnosis}${result.requires_tow ? ' — TOW TRUCK REQUIRED' : ''}]`
                : result.diagnosis;
            setFormData(prev => ({ ...prev, issue: diagnosisText }));
            if (result.requires_tow) {
                showToast('⚠️ AI detected this may require a Tow Truck!', 'error');
            } else {
                showToast('✅ AI diagnosis complete! Issue field has been auto-filled.', 'success');
            }
        } catch (err) {
            const msg = err.response?.data?.detail || 'AI Diagnosis failed';
            setError(msg);
        } finally {
            setDiagnosing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userLocation) {
            setError("Location is required. Please enable GPS.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await createServiceRequest({
                ...formData,
                voiceData: audioBase64,
                lat: userLocation.lat,
                lng: userLocation.lng,
                status: 'pending'
            });
            
            // Save phone and vehicle details for persistent use
            localStorage.setItem('userPhone', formData.userPhone);
            localStorage.setItem('vehicleModel', formData.vehicleModel);
            localStorage.setItem('vehicleYear', formData.vehicleYear);
            localStorage.setItem('engineType', formData.engineType);
            
            // Redirect to tracking page - Backend returns 'id', not '_id'
            const requestId = response.id || response._id;
            if (requestId) {
                navigate(`/tracking/${requestId}`);
            }
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            const errorMsg = err.response?.data?.detail || "Failed to send request. Please check your internet/database.";
            setError(errorMsg);
            console.error("Submission error:", err);
            if (showToast) showToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content help-modal">
                <div className="modal-header">
                    <h2><Send className="text-primary" size={28} /> Broadcast Help</h2>
                    <button className="close-btn-round" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>
                
                <p className="modal-subtitle">Your request will be visible to all mechanics within 10km.</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label><Phone size={16} /> Your Phone Number</label>
                        <input 
                            type="tel" 
                            required 
                            placeholder="e.g. 9876543210"
                            value={formData.userPhone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                if (val.length <= 10) {
                                    setFormData({...formData, userPhone: val});
                                }
                            }}
                            maxLength="10"
                        />
                    </div>

                    {/* --- Garage Selection --- */}
                    {garageVehicles.length > 0 && (
                        <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px' }}>
                            <label><Car size={16} /> Quick Select from Garage</label>
                            <select value={formData.vehicleId} onChange={handleGarageSelection} style={{ marginBottom: 0 }}>
                                <option value="">-- Or enter manually below --</option>
                                {garageVehicles.map(v => (
                                    <option key={v._id} value={v._id}>
                                        {v.year} {v.make} {v.model} ({v.licensePlate})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label><CheckCircle size={14} /> Vehicle Model</label>
                            <input 
                                type="text"
                                list="vehicle-models"
                                placeholder="Search or select model..."
                                value={formData.vehicleModel}
                                onChange={(e) => setFormData({...formData, vehicleModel: e.target.value})}
                                required
                            />
                            <datalist id="vehicle-models">
                                {VEHICLE_MODELS.map(model => (
                                    <option key={model} value={model} />
                                ))}
                            </datalist>
                        </div>
                        <div className="form-group">
                            <label><Clock size={14} /> Year</label>
                            <select 
                                value={formData.vehicleYear}
                                onChange={(e) => setFormData({...formData, vehicleYear: e.target.value})}
                                required
                            >
                                <option value="">Select Year</option>
                                {YEARS.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label><Wrench size={16} /> Engine Type</label>
                        <select 
                            value={formData.engineType}
                            onChange={(e) => setFormData({...formData, engineType: e.target.value})}
                            required
                        >
                            <option value="">Select Engine</option>
                            <option value="Petrol">Petrol</option>
                            <option value="Diesel">Diesel</option>
                            <option value="EV">Electric (EV)</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label><MessageSquare size={16} /> Describe your issue (Text)</label>
                        <textarea 
                            required 
                            placeholder="e.g. My car won't start, battery might be dead..."
                            value={formData.issue}
                            onChange={(e) => setFormData({...formData, issue: e.target.value})}
                            rows="3"
                        ></textarea>
                    </div>

                    <div className="voice-section">
                        <label><Mic size={16} /> Explain via Voice (Optional)</label>
                        <div className="voice-controls">
                            {!audioBlob ? (
                                !isRecording ? (
                                    <button type="button" className="btn btn-record" onClick={startRecording}>
                                        <Mic size={18} /> Start Recording
                                    </button>
                                ) : (
                                    <button type="button" className="btn btn-stop-record" onClick={stopRecording}>
                                        <Square size={18} /> Stop
                                    </button>
                                )
                            ) : (
                                <div className="voice-preview">
                                    <audio src={audioBlob} controls />
                                    <button type="button" className="btn btn-delete-audio" onClick={() => { setAudioBlob(null); setAudioBase64(null); }}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* AI Diagnose Button - visible once audio is recorded */}
                        {audioBlob && (
                            <button
                                type="button"
                                onClick={handleAiDiagnose}
                                disabled={diagnosing}
                                style={{
                                    marginTop: '0.75rem',
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: diagnosing ? '#6366f1aa' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.95rem'
                                }}
                            >
                                {diagnosing ? <><Loader2 size={16} className="spin" /> AI Analysing...</> : <>✨ Use AI to Auto-Diagnose</>}
                            </button>
                        )}
                    </div>

                    <div className="location-badge">
                        <MapPin size={16} /> 
                        {userLocation ? ' Location detected' : ' Detecting location...'}
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn btn-primary submit-btn" disabled={loading || !userLocation}>
                        {loading ? <Loader2 className="spin" /> : 'Broadcast Emergency Help'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RequestHelpModal;
