// Contract Analysis Dashboard - Database Integration Demo
import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

export default function ContractDashboard() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/contracts?userId=1`);
      const data = await response.json();
      
      if (response.ok) {
        setContracts(data.contracts || []);
        console.log('✓ Database Integration:', data);
      } else {
        setError(data.error || 'Failed to fetch contracts');
      }
    } catch (err) {
      setError('Database connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeContract = async (contract) => {
    setAnalyzing(true);
    setAiAnalysis('');
    
    try {
      const response = await fetch(`${API_URL}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze this solar contract from our database:
          
Contract: ${contract.filename}
Uploaded: ${new Date(contract.created_at).toLocaleDateString()}
Type: PPA Contract

Provide a brief analysis covering:
1. Key benefits for the user
2. Important terms to watch
3. Recommended next steps
4. How this relates to community solar options

Keep it under 150 words and friendly.`,
          context: 'contract analysis from database'
        })
      });

      const data = await response.json();
      setAiAnalysis(data.result || 'Analysis unavailable');
    } catch (err) {
      setAiAnalysis('Error generating analysis: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const dashboardStyle = {
    padding: '30px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '12px',
    margin: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px'
  };

  const statusDotStyle = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#00ff88',
    marginRight: '10px'
  };

  const badgeStyle = {
    marginLeft: 'auto',
    padding: '4px 12px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '20px',
    fontSize: '12px'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  };

  const panelStyle = {
    background: 'rgba(255,255,255,0.1)',
    padding: '20px',
    borderRadius: '8px',
    backdropFilter: 'blur(10px)'
  };

  const contractItemStyle = (isSelected) => ({
    background: isSelected ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.1)',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    border: isSelected ? '1px solid #00ff88' : '1px solid transparent',
    transition: 'all 0.2s'
  });

  const buttonStyle = (disabled, primary) => ({
    padding: primary ? '12px' : '6px 12px',
    background: disabled ? '#666' : (primary ? '#00ff88' : '#00ff88'),
    color: 'black',
    border: 'none',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: primary ? '14px' : '12px',
    fontWeight: primary ? 'bold' : 'normal',
    width: primary ? '100%' : 'auto'
  });

  const errorStyle = {
    background: 'rgba(255,0,0,0.2)',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '15px',
    border: '1px solid rgba(255,0,0,0.3)'
  };

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '20px',
    opacity: 0.7,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
    border: '2px dashed rgba(255,255,255,0.2)'
  };

  return (
    <div style={dashboardStyle}>
      <div style={headerStyle}>
        <div style={statusDotStyle}></div>
        <h2 style={{ margin: 0, fontSize: '24px' }}>📄 Contract Analysis Dashboard</h2>
        <span style={badgeStyle}>Database Integration Active</span>
      </div>
      
      <div style={gridStyle}>
        {/* Contracts List */}
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>📋 Uploaded Contracts</h3>
            <button 
              onClick={fetchContracts} 
              disabled={loading}
              style={buttonStyle(loading, false)}
            >
              {loading ? '🔄 Loading...' : '🔄 Refresh'}
            </button>
          </div>
          
          {error && (
            <div style={errorStyle}>
              ⚠️ {error}
            </div>
          )}
          
          {contracts.length > 0 ? (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {contracts.map((contract, index) => (
                <div 
                  key={index}
                  onClick={() => setSelectedContract(contract)}
                  style={contractItemStyle(selectedContract?.id === contract.id)}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    📄 {contract.filename || `Contract ${index + 1}`}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                    📅 {new Date(contract.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    🆔 ID: {contract.id}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && (
              <div style={emptyStateStyle}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>📋</div>
                <div>No contracts found</div>
                <div style={{ fontSize: '12px', marginTop: '5px' }}>
                  Simulating database with user contracts...
                </div>
              </div>
            )
          )}
        </div>

        {/* AI Analysis Panel */}
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 15px 0' }}>🤖 AI Contract Analysis</h3>
          
          {selectedContract ? (
            <>
              <div style={{ 
                background: 'rgba(0,255,136,0.1)', 
                padding: '10px', 
                borderRadius: '6px', 
                marginBottom: '15px',
                border: '1px solid rgba(0,255,136,0.3)'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  📄 {selectedContract.filename}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  Database ID: {selectedContract.id} | Uploaded: {new Date(selectedContract.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <button
                onClick={() => analyzeContract(selectedContract)}
                disabled={analyzing}
                style={buttonStyle(analyzing, true)}
              >
                {analyzing ? '🔄 Analyzing Contract...' : '🚀 Analyze with AI'}
              </button>
              
              {aiAnalysis && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '15px', 
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginTop: '15px'
                }}>
                  <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    {aiAnalysis}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px', 
              opacity: 0.7,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '6px',
              border: '2px dashed rgba(255,255,255,0.2)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🤖</div>
              <div>Select a contract to analyze</div>
              <div style={{ fontSize: '12px', marginTop: '10px' }}>
                AI will analyze contract terms, risks, and opportunities
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Database Status Footer */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: 'rgba(0,0,0,0.2)', 
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px'
      }}>
        <div>
          <strong>🗄️ Database Integration Status:</strong>
          <br />
          Host: solarease-db.postgres.database.azure.com
          <br />
          Database: solarease | Table: contracts
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#00ff88' }}>✅ Connected</div>
          <div>API Endpoint: /api/contracts</div>
          <div>AI Analysis: /api/ai</div>
        </div>
      </div>
    </div>
  );
}