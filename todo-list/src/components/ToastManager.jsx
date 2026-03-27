import React, { useState, useEffect } from 'react';
import './ToastManager.css';

// Global dispatch helper so any component can trigger a toast without React Context
export const showToast = (title, message, type = 'info') => {
  window.dispatchEvent(
    new CustomEvent('app-toast', { detail: { title, message, type, id: Date.now() + Math.random() } })
  );
};

export default function ToastManager() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleAddToast = (e) => {
      const newToast = e.detail;
      setToasts(prev => [...prev, newToast]);

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 5000);
    };

    window.addEventListener('app-toast', handleAddToast);
    return () => window.removeEventListener('app-toast', handleAddToast);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast-message toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'warning' ? '⚠️' : toast.type === 'error' ? '🔴' : '🔔'}
          </div>
          <div className="toast-content">
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
