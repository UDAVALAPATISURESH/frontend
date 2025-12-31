import React, { createContext, useContext, useState, useEffect } from 'react';
import { gql } from '@apollo/client';
import { client } from '../apollo/client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      role
      scopes
    }
  }
`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      client
        .query({ 
          query: ME_QUERY,
          fetchPolicy: 'network-only',
          errorPolicy: 'all'
        })
        .then(({ data, errors }) => {
          if (data?.me) {
            setUser(data.me);
          } else if (errors) {
            // Token invalid or expired
            localStorage.removeItem('token');
            setUser(null);
          }
        })
        .catch((error) => {
          // Network error or invalid token
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

