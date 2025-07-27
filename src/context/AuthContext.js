import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const TOKEN_KEY = process.env.REACT_APP_TOKEN_KEY || 'pos_token'; // ✅ Dynamic key

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUser({ ...decoded, token });
      } catch (err) {
        console.error('Invalid token format:', err);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    const decoded = JSON.parse(atob(token.split('.')[1]));
    setUser({ ...decoded, token });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, token: user?.token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
