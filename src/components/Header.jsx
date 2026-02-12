import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';
const githubIcon = '/svg/Text input.svg';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [savedDropdownOpen, setSavedDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navItems = [
    { label: 'ROI Calculator', path: '/roi-calculator' },
    { label: 'Contracts', path: '/contract-transparency' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSavedDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isSavedActive = location.pathname === '/saved-contracts' || location.pathname === '/saved-roi-calculations';

  return (
    <header className="chrome-toolbar">
      <div className="chrome-inner">
        <div className="toolbar-left">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>SolarEase</div>
          <nav className="nav-links">
            {navItems.map((item) => (
              <div
                key={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </div>
            ))}
            {isAuthenticated && (
              <div className="nav-dropdown" ref={dropdownRef}>
                <div
                  className={`nav-item ${isSavedActive ? 'active' : ''}`}
                  onClick={() => setSavedDropdownOpen(!savedDropdownOpen)}
                >
                  Saved
                  <svg
                    className={`dropdown-arrow ${savedDropdownOpen ? 'open' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                {savedDropdownOpen && (
                  <div className="dropdown-menu">
                    <div
                      className={`dropdown-item ${location.pathname === '/saved-contracts' ? 'active' : ''}`}
                      onClick={() => {
                        navigate('/saved-contracts');
                        setSavedDropdownOpen(false);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                      </svg>
                      Contracts
                    </div>
                    <div
                      className={`dropdown-item ${location.pathname === '/saved-roi-calculations' ? 'active' : ''}`}
                      onClick={() => {
                        navigate('/saved-roi-calculations');
                        setSavedDropdownOpen(false);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      ROI Calculations
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="toolbar-right">
          <div className="auth-wrap">
            {isAuthenticated ? (
              <>
                <span className="user-email">{user?.email}</span>
                <button className="auth-btn logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button className="auth-btn login-btn" onClick={() => navigate('/login')}>
                  Sign In
                </button>
                <button className="auth-btn register-btn" onClick={() => navigate('/register')}>
                  Sign Up
                </button>
              </>
            )}
            <a
              href="https://github.com/samar1409/microgrid"
              target="_blank"
              rel="noopener noreferrer"
              className="github-icon"
              aria-label="GitHub repository"
              title="View on GitHub"
            >
              <img src={githubIcon} alt="GitHub" width="16" height="16" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
