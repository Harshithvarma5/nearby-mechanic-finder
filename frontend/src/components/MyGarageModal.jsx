import React, { useState, useEffect } from 'react';
import { X, Plus, Car, Trash2, Loader2, Calendar } from 'lucide-react';
import { getUserVehicles, addVehicle, deleteVehicle } from '../services/api';

const MyGarageModal = ({ onClose, showToast }) => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    
    // New vehicle form state
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [licensePlate, setLicensePlate] = useState('');

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const data = await getUserVehicles();
            setVehicles(data || []);
        } catch (error) {
            console.error("Failed to load vehicles", error);
            showToast("Failed to load garage", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddVehicle = async (e) => {
        e.preventDefault();
        if (!make || !model || !year || !licensePlate) {
            showToast("Please fill all fields", "error");
            return;
        }

        setAdding(true);
        try {
            await addVehicle({
                make, model, year, licensePlate,
                lastServiceDate: null,
                nextServiceDate: null
            });
            showToast("Vehicle added to garage!", "success");
            setMake(''); setModel(''); setYear(''); setLicensePlate('');
            fetchVehicles();
        } catch (error) {
            console.error("Failed to add vehicle", error);
            showToast("Failed to add vehicle", "error");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this vehicle?")) return;
        
        try {
            await deleteVehicle(id);
            showToast("Vehicle removed", "success");
            fetchVehicles();
        } catch (error) {
            console.error("Failed to delete vehicle", error);
            showToast("Failed to delete vehicle", "error");
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content garage-modal" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2><Car size={24} style={{ marginRight: '10px' }}/> My Digital Garage</h2>
                    <button className="close-btn" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                    
                    {/* Add Vehicle Form */}
                    <div className="add-vehicle-section" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Add New Vehicle</h3>
                        <form onSubmit={handleAddVehicle} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Make (e.g. Honda)</label>
                                <input type="text" value={make} onChange={e => setMake(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Model (e.g. Civic)</label>
                                <input type="text" value={model} onChange={e => setModel(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Year</label>
                                <input type="text" value={year} onChange={e => setYear(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>License Plate</label>
                                <input type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} required style={{ textTransform: 'uppercase' }} />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={adding} style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                                {adding ? <Loader2 className="spin" size={18}/> : <><Plus size={18}/> Add to Garage</>}
                            </button>
                        </form>
                    </div>

                    {/* Vehicles List */}
                    <div className="vehicles-list">
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Saved Vehicles</h3>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="spin" size={32} /></div>
                        ) : vehicles.length === 0 ? (
                            <p style={{ color: 'var(--text-light)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>Your garage is empty. Add a vehicle above!</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {vehicles.map(v => (
                                    <div key={v._id} className="vehicle-card" style={{ 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                        padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', 
                                        background: 'var(--bg-primary)'
                                    }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {v.year} {v.make} {v.model}
                                            </h4>
                                            <span style={{ 
                                                display: 'inline-block', background: 'var(--bg-secondary)', 
                                                padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem', 
                                                fontWeight: 'bold', fontFamily: 'monospace' 
                                            }}>
                                                {v.licensePlate}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(v._id)} 
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem' }}
                                            title="Remove Vehicle"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MyGarageModal;
