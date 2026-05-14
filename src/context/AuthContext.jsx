import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const API_URL = 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is still authenticated on mount
  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  async function verifyToken(authToken) {
    try {
      const response = await fetch(`${API_URL}/api/auth/user`, {
        headers: { Authorization: `Bearer ${authToken}` },
        mode: 'cors',
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(authToken);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Token verification failed:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  }

  async function signup(username, email, password) {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Signup failed: ${response.statusText}`);
      }

      const data = await response.json();
      setUser({ id: data.id, username: data.username, email: data.email });
      setToken(data.token);
      localStorage.setItem('authToken', data.token);
      return data;
    } catch (err) {
      console.error('Signup error:', err);
      throw err;
    }
  }

  async function login(email, password) {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Login failed: ${response.statusText}`);
      }

      const data = await response.json();
      setUser({ id: data.id, username: data.username, email: data.email });
      setToken(data.token);
      localStorage.setItem('authToken', data.token);
      return data;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
  }

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isLoggedIn: !!user,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
