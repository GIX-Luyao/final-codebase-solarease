import React, { useState, useEffect } from 'react';
import './AdminPage.css';

export default function AdminPage() {
  const [dbStatus, setDbStatus] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newContract, setNewContract] = useState({
    user_id: '1',
    filename: '',
    content: '',
    contract_type: 'PPA'
  });

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message, type }, ...prev.slice(0, 19)]);
  };

  const fetchDbStatus = async () => {
    try {
      addLog('Executing: SELECT version(), current_timestamp, pg_database_size(current_database())', 'query');
      const response = await fetch('http://localhost:3000/api/admin/database-status');
      const data = await response.json();
      setDbStatus(data);
      addLog(`Database connected: ${data.host}:${data.port}`, 'success');
    } catch (err) {
      addLog(`Database connection failed: ${err.message}`, 'error');
    }
  };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      addLog('Executing: SELECT * FROM contracts ORDER BY created_at DESC', 'query');
      const response = await fetch('http://localhost:3000/api/admin/contracts');
      const data = await response.json();
      setContracts(data.contracts || []);
      addLog(`Retrieved ${data.contracts?.length || 0} contracts from database`, 'success');
    } catch (err) {
      addLog(`Query failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addContract = async () => {
    if (!newContract.filename) {
      addLog('Filename required', 'error');
      return;
    }

    try {
      const insertQuery = `INSERT INTO contracts (user_id, filename, content, contract_type) VALUES ('${newContract.user_id}', '${newContract.filename}', '${newContract.content}', '${newContract.contract_type}')`;
      addLog(`Executing: ${insertQuery}`, 'query');
      
      const response = await fetch('http://localhost:3000/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContract)
      });
      
      if (response.ok) {
        addLog('Contract inserted successfully', 'success');
        setNewContract({ user_id: '1', filename: '', content: '', contract_type: 'PPA' });
        fetchContracts();
      } else {
        const error = await response.text();
        addLog(`Insert failed: ${error}`, 'error');
      }
    } catch (err) {
      addLog(`Insert error: ${err.message}`, 'error');
    }
  };

  const deleteContract = async (id) => {
    try {
      addLog(`Executing: DELETE FROM contracts WHERE id = ${id}`, 'query');
      const response = await fetch(`http://localhost:3000/api/admin/contracts/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        addLog(`Contract ${id} deleted`, 'success');
        fetchContracts();
      } else {
        addLog(`Delete failed for contract ${id}`, 'error');
      }
    } catch (err) {
      addLog(`Delete error: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchContracts();
    addLog('Admin panel initialized', 'info');
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>🛠️ Database Admin Panel</h1>
        <p>Live Azure PostgreSQL Database Operations</p>
      </div>

      <div className="admin-grid">
        {/* Database Status */}
        <div className="admin-card">
          <h3>📊 Database Status</h3>
          {dbStatus ? (
            <div className="db-info">
              <div className="status-row">
                <strong>Host:</strong> {dbStatus.host}:{dbStatus.port}
              </div>
              <div className="status-row">
                <strong>Database:</strong> {dbStatus.database}
              </div>
              <div className="status-row">
                <strong>Version:</strong> {dbStatus.version}
              </div>
              <div className="status-row">
                <strong>Current Time:</strong> {new Date(dbStatus.current_time).toLocaleString()}
              </div>
              <div className="status-row">
                <strong>Size:</strong> {Math.round(dbStatus.database_size / 1024 / 1024)} MB
              </div>
              <div className="status-row">
                <strong>Status:</strong> <span className="status-connected">🟢 Connected</span>
              </div>
            </div>
          ) : (
            <div className="loading">Loading database status...</div>
          )}
          <button onClick={fetchDbStatus} className="refresh-btn">
            🔄 Refresh Status
          </button>
        </div>

        {/* Contract Operations */}
        <div className="admin-card">
          <h3>📄 Contract Operations</h3>
          <div className="contract-form">
            <input
              type="text"
              placeholder="Contract filename (e.g., test_contract.pdf)"
              value={newContract.filename}
              onChange={(e) => setNewContract({...newContract, filename: e.target.value})}
            />
            <select
              value={newContract.contract_type}
              onChange={(e) => setNewContract({...newContract, contract_type: e.target.value})}
            >
              <option value="PPA">PPA</option>
              <option value="Lease">Lease</option>
              <option value="Community Solar">Community Solar</option>
            </select>
            <textarea
              placeholder="Contract content/description"
              value={newContract.content}
              onChange={(e) => setNewContract({...newContract, content: e.target.value})}
              rows="3"
            />
            <button onClick={addContract} className="add-btn">
              ➕ Insert Contract
            </button>
          </div>
          
          <div className="admin-contracts-list">
            <h4>Current Contracts ({contracts.length})</h4>
            {loading ? (
              <div className="loading">Executing database query...</div>
            ) : (
              contracts.map(contract => (
                <div key={contract.id} className="admin-contract-item">
                  <div className="admin-contract-info">
                    <strong>{contract.filename}</strong>
                    <span className="admin-contract-meta">
                      ID: {contract.id} | Type: {contract.contract_type} |
                      Created: {new Date(contract.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteContract(contract.id)}
                    className="admin-delete-btn"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
          
          <button onClick={fetchContracts} className="refresh-btn">
            🔄 Refresh Contracts
          </button>
        </div>

        {/* Live Query Log */}
        <div className="admin-card log-card">
          <h3>🔍 Live Query Log</h3>
          <div className="log-container">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry log-${log.type}`}>
                <span className="log-time">{log.timestamp}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setLogs([])} className="clear-btn">
            🗑️ Clear Log
          </button>
        </div>
      </div>
    </div>
  );
}