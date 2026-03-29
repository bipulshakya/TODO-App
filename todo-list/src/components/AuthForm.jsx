import React, { useState } from 'react';
import API_URL from '../config';
import './AuthForm.css';

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setMode(prev => (prev === 'login' ? 'register' : 'login'));
    setError('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      // Store auth data and notify parent (including admin role)
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_username', data.username);
      localStorage.setItem('auth_is_admin', String(Boolean(data.isAdmin)));
      onAuthSuccess(data.token, data.username, Boolean(data.isAdmin));
    } catch (err) {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-bg-orb orb-1" />
      <div className="auth-bg-orb orb-2" />
      <div className="auth-bg-orb orb-3" />

      <div className="auth-shell">
        <aside className="auth-side-panel" aria-hidden="true">
          <p className="auth-side-kicker">Plan. Track. Finish.</p>
          <h2 className="auth-side-title">Own every task in one focused workspace</h2>
          <p className="auth-side-text">
            Build your day with clear priorities, fast updates, and a board made for both desktop and mobile.
          </p>
          <ul className="auth-side-points">
            <li>Quick drag-and-drop task flow</li>
            <li>Calendar and dashboard insights</li>
            <li>Secure access with admin controls</li>
          </ul>
        </aside>

        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">✅</span>
            <h1 className="auth-app-title">TODO LIST</h1>
          </div>

          <h2 className="auth-heading">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="auth-subheading">
            {mode === 'login'
              ? 'Sign in and continue where you left off.'
              : 'Register now and start organizing your work.'}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="auth-username">Username</label>
              <input
                id="auth-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <span>⚠️</span> {error}
              </div>
            )}

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <span className="auth-spinner" />
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="auth-toggle-text">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              className="auth-toggle-btn"
              onClick={toggleMode}
            >
              {mode === 'login' ? ' Register' : ' Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;
