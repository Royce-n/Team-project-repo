import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { api } from '../services/api';

export const useAuth = () => {
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to clear MSAL state
  const clearAuthState = () => {
    try {
      if (instance) {
        instance.clearCache();
        instance.setActiveAccount(null);
      }
      localStorage.removeItem('msal.cache');
      sessionStorage.clear();
      setUser(null);
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  };

  // Handle authentication when accounts change
  useEffect(() => {
    const handleAuth = async () => {
      if (inProgress !== 'none') {
        return; // Wait for MSAL to finish
      }

      if (accounts.length > 0) {
        try {
          const account = accounts[0];
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: ['User.Read'],
            account: account
          });

          // Authenticate with backend to get JWT token
          const backendResponse = await api.post('/auth/office365', {
            accessToken: tokenResponse.accessToken
          });

          // Set the JWT token from backend
          const jwtToken = backendResponse.data.token;
          api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
          
          // Now get user profile with JWT token
          try {
            const profileResponse = await api.get('/auth/profile');
            setUser(profileResponse.data.user);
          } catch (error) {
            console.log('Profile fetch failed, user not authenticated');
            setUser(null);
          }
        } catch (error) {
          console.error('Token acquisition failed:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    handleAuth();
  }, [accounts, inProgress, instance]);

  const login = async () => {
    try {
      setLoading(true);
      
      // Check if MSAL is available
      if (!instance || !instance.loginPopup) {
        throw new Error('Authentication not available. Please ensure you are using HTTPS or localhost.');
      }

      // Check if there's already an interaction in progress by trying to get accounts
      const accounts = instance.getAllAccounts();
      if (accounts.length > 0) {
        // User is already logged in, try to get token silently
        try {
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: ['User.Read'],
            account: accounts[0]
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
          console.log('Silent token acquisition failed, proceeding with popup login');
        }
      }

      // Clear any stuck state before attempting login
      clearAuthState();
      
      // Wait a bit longer to ensure any previous interactions are cleared
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use loginRedirect instead of loginPopup to avoid interaction conflicts
      await instance.loginRedirect({
        scopes: ['User.Read'],
        prompt: 'select_account'
      });

      // Note: loginRedirect will redirect the page, so this code won't execute
      // The authentication will be handled by the useEffect when the page loads
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await instance.logoutRedirect({
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
    loading: loading || inProgress !== 'none',
    login,
    logout,
    clearAuthState,
    isAuthenticated: !!user
  };
};
