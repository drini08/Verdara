import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

function SignupPage() {
  const { signup, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    // Validation
    if (!username.trim()) {
      setError('Please enter a username');
      setIsLoading(false);
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setIsLoading(false);
      return;
    }
    if (!email.trim()) {
      setError('Please enter an email');
      setIsLoading(false);
      return;
    }
    if (!password) {
      setError('Please enter a password');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await signup(username, email, password);
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (err) {
      console.error('Signup failed:', err);
      if (err.message.includes('Failed to fetch')) {
        setError(`Cannot connect to server. Is the backend running on ${API_URL}?`);
      } else if (err.message.includes('already exists')) {
        setError('This username or email is already taken. Please try another.');
      } else {
        setError(err.message || 'Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) {
    return (
      <section className="page-hero">
        <div className="container">
          <p style={{ textAlign: 'center', padding: '40px' }}>Loading...</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-split">
          <div>
            <p className="eyebrow">Join us</p>
            <h1 className="headline-animate">Create your Verdara account</h1>
            <p>Start analyzing crop health with AI-powered insights and access the marketplace</p>
          </div>
        </div>
      </section>

      <section className="auth-section" style={{ padding: '60px 20px' }}>
        <div className="container" style={{ maxWidth: '500px' }}>
          <div className="auth-card" style={{ padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '30px', textAlign: 'center' }}>Create Account</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="username" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Username</label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1em', boxSizing: 'border-box' }}
                  disabled={isLoading}
                  minLength="3"
                />
                <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>At least 3 characters</small>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1em', boxSizing: 'border-box' }}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="password" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1em', boxSizing: 'border-box' }}
                  disabled={isLoading}
                  minLength="6"
                />
                <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>At least 6 characters</small>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1em', boxSizing: 'border-box' }}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div style={{ padding: '12px', marginBottom: '20px', backgroundColor: '#fee', color: '#c33', borderRadius: '6px', fontSize: '0.95em', border: '1px solid #fcc' }}>
                  ⚠️ {error}
                </div>
              )}

              {successMessage && (
                <div style={{ padding: '12px', marginBottom: '20px', backgroundColor: '#efe', color: '#3a3', borderRadius: '6px', fontSize: '0.95em', border: '1px solid #cfc' }}>
                  ✓ {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: isLoading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px', color: '#666' }}>
              <p style={{ margin: 0, fontSize: '0.95em' }}>
                Already have an account? <a href="/login" style={{ color: '#28a745', textDecoration: 'none', fontWeight: 'bold' }}>Sign in here</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default SignupPage;
