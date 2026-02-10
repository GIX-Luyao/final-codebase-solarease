import React from 'react';
import './Footer.css';

export default function Footer(){
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-inner">
        <div className="footer-left">
          <div className="brand">SolarEase</div>
          <div className="tag">Empowering communities with AI-driven solar energy insights for a sustainable future.</div>
        </div>

        <div className="footer-columns">
          <div className="col">
            <div className="col-title">Platform</div>
            <div className="col-item">Features</div>
            <div className="col-item">Pricing</div>
            <div className="col-item">Case Studies</div>
            <div className="col-item">FAQ</div>
          </div>
          <div className="col">
            <div className="col-title">Resources</div>
            <div className="col-item">Documentation</div>
            <div className="col-item">API Reference</div>
            <div className="col-item">Community Forum</div>
            <div className="col-item">Support</div>
          </div>
          <div className="col">
            <div className="col-title">Connect</div>
            <div className="col-item">GitHub</div>
            <div className="col-item">Figma</div>
            <div className="col-item">Contact</div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">© 2025 SolarEase. All rights reserved.</div>
    </footer>
  )
}
