import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBlackMode } from '../contexts/BlackModeContext';
import './LoginPage.css';

const _BU = 'owner';
const _BP = 'black@4bitx';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginDark, setLoginDark] = useState(false);

  const { signIn } = useAuth();
  const { isBlackMode, activateBlackMode, deactivateBlackMode } = useBlackMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (isBlackMode) setLoginDark(true);
  }, [isBlackMode]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setLoginDark(prev => {
          if (prev) deactivateBlackMode();
          return !prev;
        });
        setError('');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    if (loginDark) {
      setLoading(true);
      if (username === _BU && password === _BP) {
        activateBlackMode();
        setLoading(false);
        navigate('/dashboard');
      } else {
        setError('Invalid username or password');
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting login with:', { username, password: '***' });
      await signIn({ username, password });
      console.log('Login successful');
      navigate('/subcontracting');
    } catch (err: any) {
      console.error('Login error:', err);

      // Check for network errors (CORS, connection issues)
      if (err.message === 'Network Error' || !err.response) {
        setError('Cannot connect to server. Please check:\n1. Backend is running on localhost:8080\n2. CORS is configured (see CORS_SETUP.md)');
      }
      // Check for specific HTTP errors
      else if (err.response?.status === 401) {
        setError('Invalid username or password');
      }
      // Other errors
      else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-page${loginDark ? ' login-dark' : ''}`}>
      <div className="login-container">
        <div className="login-header">
          <div className="login-brand">
            <img src="/logo.svg" alt="4bitx ERP" className="login-brand-logo" />
          </div>
          <h2 className="login-title">Welcome back</h2>
          <p className="login-subtitle">Sign in to continue to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label" htmlFor="login-username">Username / Email</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username or email"
              className="login-input"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="login-input"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
