import React, { useState, useEffect } from 'react';
import API_URL from '../config';
import './TaskHistory.css';

function formatActionTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function formatDeadline(deadline) {
  if (!deadline) return null;
  const date = new Date(deadline);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

function TaskHistory({ token, handleLogout }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'deleted'
  const [searchQuery, setSearchQuery] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tasks/history`, { headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const clearHistory = async () => {
    if (history.length === 0 || clearing) return;

    const confirmed = window.confirm('Clear all task history entries? This action cannot be undone.');
    if (!confirmed) return;

    setClearing(true);
    try {
      const res = await fetch(`${API_URL}/tasks/history`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.status === 401) { handleLogout(); return; }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to clear history');
      }

      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
      window.alert('Could not clear history. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const filtered = history.filter(item => {
    const matchesFilter = filter === 'all' || item.action === filter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = item.task_text?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const completedCount = history.filter(h => h.action === 'completed').length;
  const deletedCount = history.filter(h => h.action === 'deleted').length;

  return (
    <div className="history-container">
      {/* Header */}
      <div className="history-header">
        <div>
          <h1 className="history-title">Task History</h1>
          <p className="history-subtitle">A log of all completed and deleted tasks</p>
        </div>
        <div className="history-header-actions">
          <button className="history-refresh-btn" onClick={fetchHistory}>↻ Refresh</button>
          <button
            className="history-clear-btn"
            onClick={clearHistory}
            disabled={clearing || history.length === 0}
            title={history.length === 0 ? 'No history to clear' : 'Clear all history entries'}
          >
            {clearing ? 'Clearing...' : '🗑 Clear History'}
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="history-stats">
        <div className="history-stat-card stat-completed">
          <span className="stat-icon">✅</span>
          <div>
            <div className="stat-count">{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="history-stat-card stat-deleted">
          <span className="stat-icon">🗑</span>
          <div>
            <div className="stat-count">{deletedCount}</div>
            <div className="stat-label">Deleted</div>
          </div>
        </div>
        <div className="history-stat-card stat-total">
          <span className="stat-icon">📋</span>
          <div>
            <div className="stat-count">{history.length}</div>
            <div className="stat-label">Total Entries</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="history-controls">
        <div className="filter-group">
          <button className={`control-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`control-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>✅ Completed</button>
          <button className={`control-btn ${filter === 'deleted' ? 'active' : ''}`} onClick={() => setFilter('deleted')}>🗑 Deleted</button>
        </div>
        <input
          type="text"
          className="history-search"
          placeholder="🔍 Search history..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="history-loading">
          <div className="history-loading-spinner"></div>
          <p>Loading history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">📂</div>
          <p>No history records found.</p>
          <span>Complete or delete tasks to see them here.</span>
        </div>
      ) : (
        <div className="history-timeline">
          {filtered.map((item) => (
            <div key={item.id} className={`history-entry history-entry-${item.action}`}>
              <div className="history-entry-dot">
                {item.action === 'completed' ? '✅' : '🗑'}
              </div>
              <div className="history-entry-card">
                <div className="history-entry-header">
                  <span className="history-entry-text">{item.task_text}</span>
                  <span className={`history-action-badge action-${item.action}`}>
                    {item.action === 'completed' ? '✅ Completed' : '🗑 Deleted'}
                  </span>
                </div>
                {item.description && (
                  <p className="history-entry-desc">{item.description}</p>
                )}
                <div className="history-entry-meta">
                  {item.priority && (
                    <span className={`history-priority prio-${item.priority?.toLowerCase()}`}>
                      {item.priority === 'High' ? '🔴' : item.priority === 'Low' ? '🟢' : '🟡'} {item.priority}
                    </span>
                  )}
                  {item.deadline && (
                    <span className="history-deadline">
                      📅 Deadline: {formatDeadline(item.deadline)}
                    </span>
                  )}
                  <span className="history-timestamp">
                    🕒 {formatActionTime(item.action_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskHistory;
