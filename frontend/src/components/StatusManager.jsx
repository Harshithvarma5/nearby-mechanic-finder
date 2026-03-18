import React, { useState } from 'react';
import { updateMechanicStatus } from '../services/api';
import { Settings, Check, X, Loader2, AlertCircle } from 'lucide-react';

const StatusManager = ({ onStatusUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [phone, setPhone] = useState('');
    const [status, setStatus] = useState('available');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            await updateMechanicStatus(phone, status);
            setMessage("Status updated successfully!");
            if (onStatusUpdate) onStatusUpdate();
            setTimeout(() => {
                setIsOpen(false);
                setMessage(null);
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to update status. Please check your phone number.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button className="status-manager-toggle" onClick={() => setIsOpen(true)}>
                <Settings size={18} />
                <span>Shop Dashboard</span>
            </button>
        );
    }

    return (
        <div className="status-manager-overlay">
            <div className="status-manager-card">
                <div className="status-manager-header">
                    <h3>Shop Status Dashboard</h3>
                    <button className="close-btn" onClick={() => setIsOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Register Phone Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val.length <= 10) setPhone(val);
                            }}
                            placeholder="Enter your registered phone"
                            maxLength="10"
                            required
                        />
                    </div>

                    <div className="status-options">
                        <label className="status-option">
                            <input
                                type="radio"
                                name="status"
                                value="available"
                                checked={status === 'available'}
                                onChange={(e) => setStatus(e.target.value)}
                            />
                            <span className="dot available"></span>
                            <span>Available</span>
                        </label>
                        <label className="status-option">
                            <input
                                type="radio"
                                name="status"
                                value="busy"
                                checked={status === 'busy'}
                                onChange={(e) => setStatus(e.target.value)}
                            />
                            <span className="dot busy"></span>
                            <span>Busy</span>
                        </label>
                        <label className="status-option">
                            <input
                                type="radio"
                                name="status"
                                value="closed"
                                checked={status === 'closed'}
                                onChange={(e) => setStatus(e.target.value)}
                            />
                            <span className="dot closed"></span>
                            <span>Closed</span>
                        </label>
                    </div>

                    {error && (
                        <div className="status-error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {message && (
                        <div className="status-success">
                            <Check size={16} />
                            <span>{message}</span>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
                        {loading ? <Loader2 className="spin" size={18} /> : "Update Live Status"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StatusManager;
