import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useQuery } from 'react-query';
import { api } from '../services/api';

export const useAuth = () => {
  const { instance, accounts } = useMsal();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { data: userData, isLoading } = useQuery(
    'userProfile',
    () => api.get('/auth/profile').then(res => res.data),
    {
      enabled: !!accounts[0],
      retry: false,
      onError: () => {
        setUser(null);
        setLoading(false);
      }
    }
  );

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (accounts.length > 0) {
          const account = accounts[0];
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: ['User.Read'],
            account: account
          });

          // Set the token in API service
          api.defaults.headers.common['Authorization'] = `Bearer ${tokenResponse.accessToken}`;
          
          if (userData) {
            setUser(userData.user);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [accounts, instance, userData]);

  const login = async () => {
    try {
      setLoading(true);
      
      // Check if MSAL is available
      if (!instance || !instance.loginPopup) {
        throw new Error('Authentication not available. Please ensure you are using HTTPS or localhost.');
      }

      const loginResponse = await instance.loginPopup({
        scopes: ['User.Read'],
        prompt: 'select_account'
      });

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['User.Read'],
        account: loginResponse.account
      });

      // Authenticate with backend
      const backendResponse = await api.post('/auth/office365', {
        accessToken: tokenResponse.accessToken
      });

      // Set the JWT token from backend
      const jwtToken = backendResponse.data.token;
      api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
      
      setUser(backendResponse.data.user);
      return backendResponse.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin
      });
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user,
    loading: loading || isLoading,
    login,
    logout,
    isAuthenticated: !!user
  };
};
