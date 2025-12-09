import React from 'react';
import './Header.css';
import githubIcon from '../../svg/Text input.svg';

export default function Header() {
  return (
    <header className="chrome-toolbar">
      <div className="chrome-inner">
        <div className="toolbar-left">
          <div className="brand">SolarEase</div>
          <nav className="nav-links">
            <div className="nav-item">About</div>
            <div className="nav-item">Negotiation Support</div>
            <div className="nav-item">Policy</div>
            <div className="nav-item">Help</div>
          </nav>
        </div>

        <div className="toolbar-right">
          <button className="icon-btn" aria-label="extensions" />
          <div className="auth-wrap">
            <button className="github-icon" aria-label="github" title="GitHub">
              <img src={githubIcon} alt="GitHub" width="16" height="16" />
            </button>
            <button className="signup">Sign up</button>
            <button className="login">Log in</button>
          </div>
        </div>
      </div>
    </header>
  );
}
