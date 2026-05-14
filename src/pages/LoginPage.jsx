import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    // Validation
    if (!email.trim()) {
      setError('Please enter your email');
      setIsLoading(false);
      return;
    }
    if (!password) {
      setError('Please enter your password');
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      setSuccessMessage('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (err) {
      console.error('Login failed:', err);
      if (err.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Is the backend running on http://localhost:5000?');
      } else if (err.message.includes('Invalid')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
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
            <p className="eyebrow">Welcome back</p>
            <h1 className="headline-animate">Sign in to your account</h1>
            <p>Access your analysis history, marketplace listings, and saved results</p>
          </div>
        </div>
      </section>

      <section className="auth-section" style={{ padding: '60px 20px' }}>
        <div className="container" style={{ maxWidth: '500px' }}>
          <div className="auth-card" style={{ padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '30px', textAlign: 'center' }}>Login to Verdara</h2>
            
            <form onSubmit={handleSubmit}>
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

              <div className="form-group" style={{ marginBottom: '24px' }}>
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
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px', color: '#666' }}>
              <p style={{ margin: 0, fontSize: '0.95em' }}>
                Don't have an account? <a href="/signup" style={{ color: '#28a745', textDecoration: 'none', fontWeight: 'bold' }}>Create one here</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default LoginPage;
