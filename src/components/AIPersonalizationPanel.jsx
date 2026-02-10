import React, { useState } from 'react';
import './AIPersonalizationPanel.css';

export default function AIPersonalizationPanel({ aiAgent, onClose }) {
  const [profile, setProfile] = useState(aiAgent.userProfile);
  const [showAdvanced, setShowAdvanced] = useState(false);

  function handleSave() {
    aiAgent.userProfile = { ...profile };
    aiAgent.saveUserProfile();
    onClose && onClose();
  }

  function handleReset() {
    if (confirm('This will clear your chat history and preferences. Are you sure?')) {
      aiAgent.resetProfile();
      setProfile(aiAgent.userProfile);
    }
  }

  return (
    <div className="ai-personalization-panel">
      <div className="panel-header">
        <h3>Personalize Soli</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <div className="form-section">
          <h4>Basic Information</h4>
          
          <div className="form-group">
            <label>Your Name (optional)</label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={(e) => setProfile({...profile, name: e.target.value})}
              placeholder="How should Soli address you?"
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={profile.location || ''}
              onChange={(e) => setProfile({...profile, location: e.target.value})}
              placeholder="City, State"
            />
          </div>

          <div className="form-group">
            <label>Property Type</label>
            <select 
              value={profile.propertyType || ''} 
              onChange={(e) => setProfile({...profile, propertyType: e.target.value})}
            >
              <option value="">Select...</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="agricultural">Agricultural</option>
            </select>
          </div>

          <div className="form-group">
            <label>Solar Interest</label>
            <select 
              value={profile.solarInterest || ''} 
              onChange={(e) => setProfile({...profile, solarInterest: e.target.value})}
            >
              <option value="">Select...</option>
              <option value="individual">Individual Solar</option>
              <option value="community">Community Solar</option>
              <option value="both">Both Options</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h4>Communication Preferences</h4>
          
          <div className="form-group">
            <label>Communication Style</label>
            <select 
              value={profile.preferences.communicationStyle || 'friendly'} 
              onChange={(e) => setProfile({
                ...profile, 
                preferences: {...profile.preferences, communicationStyle: e.target.value}
              })}
            >
              <option value="friendly">Friendly & Conversational</option>
              <option value="professional">Professional & Direct</option>
              <option value="technical">Technical & Detailed</option>
            </select>
          </div>

          <div className="form-group">
            <label>Detail Level</label>
            <select 
              value={profile.preferences.detailLevel || 'moderate'} 
              onChange={(e) => setProfile({
                ...profile, 
                preferences: {...profile.preferences, detailLevel: e.target.value}
              })}
            >
              <option value="brief">Brief & Concise</option>
              <option value="moderate">Moderate Detail</option>
              <option value="detailed">Comprehensive & Detailed</option>
            </select>
          </div>

          <div className="form-group">
            <label>Solar Experience</label>
            <select 
              value={profile.priorExperience || ''} 
              onChange={(e) => setProfile({...profile, priorExperience: e.target.value})}
            >
              <option value="">Select...</option>
              <option value="beginner">New to Solar</option>
              <option value="intermediate">Some Knowledge</option>
              <option value="expert">Experienced</option>
            </select>
          </div>
        </div>

        {showAdvanced && (
          <div className="form-section">
            <h4>Advanced Settings</h4>
            
            <div className="stats-display">
              <div className="stat-item">
                <span>Interactions:</span>
                <span>{profile.interactions}</span>
              </div>
              <div className="stat-item">
                <span>Member Since:</span>
                <span>{new Date(profile.firstVisit).toLocaleDateString()}</span>
              </div>
              <div className="stat-item">
                <span>Topics Discussed:</span>
                <span>{profile.preferences.topics.join(', ') || 'None yet'}</span>
              </div>
            </div>

            <button className="reset-btn" onClick={handleReset}>
              Reset All Data
            </button>
          </div>
        )}

        <button 
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>
      </div>

      <div className="panel-actions">
        <button className="cancel-btn" onClick={onClose}>Cancel</button>
        <button className="save-btn" onClick={handleSave}>Save Preferences</button>
      </div>
    </div>
  );
}