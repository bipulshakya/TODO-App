import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import AuthForm from './components/AuthForm';
import TodoBoard from './components/TodoBoard';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import CalendarView from './components/CalendarView';
import TaskHistory from './components/TaskHistory';
import ToastManager from './components/ToastManager';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);
  const [username, setUsername] = useState(() => localStorage.getItem('auth_username') || '');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('auth_is_admin') === 'true');
  
  // 'board', 'dashboard', 'admin', 'calendar', 'history'
  const [currentView, setCurrentView] = useState('board');

  // Theme: 'dark' (default) or 'light'
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('app_theme', next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleAuthSuccess = (newToken, newUsername, newIsAdmin) => {
    setToken(newToken);
    setUsername(newUsername);
    setIsAdmin(newIsAdmin);
    localStorage.setItem('auth_is_admin', newIsAdmin);
    setCurrentView('board');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_is_admin');
    setToken(null);
    setUsername('');
    setIsAdmin(false);
    setCurrentView('board');
  };

  if (!token) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  const renderView = () => {
    if (currentView === 'dashboard') return <Dashboard token={token} handleLogout={handleLogout} />;
    if (currentView === 'calendar') return <CalendarView token={token} handleLogout={handleLogout} />;
    if (currentView === 'history') return <TaskHistory token={token} handleLogout={handleLogout} />;
    if (currentView === 'admin' && isAdmin) return <AdminPanel token={token} handleLogout={handleLogout} username={username} />;
    return <TodoBoard token={token} handleLogout={handleLogout} />;
  };

  return (
    <div className="App" data-theme={theme}>
      {/* Dynamic Navbar with Tabs */}
      <div className="app-navbar">
        <div className="app-navbar-left">
          <span className="app-navbar-logo">Todo-List</span>
          <div className="app-navbar-tabs">
            <button 
              className={`nav-tab ${currentView === 'board' ? 'active' : ''}`}
              onClick={() => setCurrentView('board')}
            >
              Tasks
            </button>
            <button 
              className={`nav-tab ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-tab ${currentView === 'calendar' ? 'active' : ''}`}
              onClick={() => setCurrentView('calendar')}
            >
              Calendar
            </button>
            <button 
              className={`nav-tab ${currentView === 'history' ? 'active' : ''}`}
              onClick={() => setCurrentView('history')}
            >
              History
            </button>
            {isAdmin && (
              <button 
                className={`nav-tab ${currentView === 'admin' ? 'active' : ''} admin-tab`}
                onClick={() => setCurrentView('admin')}
              >
                Admin Panel 👑
              </button>
            )}
          </div>
        </div>

        <div className="app-navbar-user">
          <span className="app-navbar-greeting">👤 {username}</span>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="app-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {renderView()}
      <ToastManager />
    </div>
  );
}

export default App;
