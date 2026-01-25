import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';
import githubIcon from '../../svg/Text input.svg';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { label: 'ROI Calculator', path: '/roi-calculator' },
    { label: 'Negotiation Tool', path: '/negotiation-tool' },
    { label: 'Contracts', path: '/contract-transparency' },
  ];

  // Add Saved Contracts for authenticated users
  if (isAuthenticated) {
    navItems.push({ label: 'Saved', path: '/saved-contracts' });
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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
