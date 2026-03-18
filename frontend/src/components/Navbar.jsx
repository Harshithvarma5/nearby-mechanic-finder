import React from 'react';
import { Wrench, PlusCircle, Home, Sun, Moon, LogOut, User, Car } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ theme, toggleTheme, onOpenGarage }) => {
    const navigate = useNavigate();
    const role = localStorage.getItem('userRole');
    const userPhone = localStorage.getItem('userPhone');
    const mechPhone = localStorage.getItem('mechanicPhone');

    const handleLogout = () => {
        localStorage.removeItem('userRole');
        localStorage.removeItem('userPhone');
        localStorage.removeItem('mechanicPhone');
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <Link to={role === 'mechanic' ? '/dashboard' : '/'} className="nav-brand" style={{ textDecoration: 'none' }}>
                <Wrench className="w-6 h-6" />
                <span>Nearby Mechanic Finder</span>
            </Link>
            
            <div className="nav-links">
                <button 
                    onClick={toggleTheme} 
                    className="theme-toggle"
                    aria-label="Toggle theme"
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        color: 'var(--text-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        transition: 'var(--transition)'
                    }}
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                {role === 'user' && (
                    <>
                        <Link to="/" className="nav-link">
                            <Home size={18} />
                            <span>Home</span>
                        </Link>
                        <button onClick={onOpenGarage} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--text-light)' }}>
                            <Car size={18} />
                            <span>My Garage</span>
                        </button>
                    </>
                )}

                {role === 'mechanic' && (
                    <Link to="/dashboard" className="nav-link">
                        <Home size={18} />
                        <span>Dashboard</span>
                    </Link>
                )}

                {!role && (
                    <Link to="/register-mechanic" className="nav-link btn-register-nav">
                        <PlusCircle size={18} />
                        <span>Register your shop</span>
                    </Link>
                )}

                {role && (
                    <div className="nav-profile-section">
                        <div className="user-indicator">
                            <User size={14} />
                            <span>{userPhone || mechPhone}</span>
                        </div>
                        <button onClick={handleLogout} className="logout-btn-nav" title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
