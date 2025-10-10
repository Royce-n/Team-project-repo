import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useQuery } from 'react-query';
import { api } from '../services/api';

export const useAuth = () => {
  const { instance, accounts } = useMsal();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

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

  const { data: userData, isLoading } = useQuery(
    'userProfile',
    () => api.get('/auth/profile').then(res => res.data),
    {
      enabled: !!accounts[0] && !loading && !initializing,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error) => {
        console.error('Profile fetch error:', error);
        setUser(null);
        setLoading(false);
      }
    }
  );

  useEffect(() => {
    const initializeAuth = async () => {
      if (initializing) return;
      
      setInitializing(true);
      try {
        // Handle redirect response first
        const redirectResponse = await instance.handleRedirectPromise();
        
        if (redirectResponse) {
          // User just completed login via redirect
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: ['User.Read'],
            account: redirectResponse.account
          });

          // Authenticate with backend
          const backendResponse = await api.post('/auth/office365', {
            accessToken: tokenResponse.accessToken
          });

          // Set the JWT token from backend
          const jwtToken = backendResponse.data.token;
          api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
          
          setUser(backendResponse.data.user);
          return;
        }

        // Check for existing accounts
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
        setInitializing(false);
      }
    };

    initializeAuth();
  }, [accounts, instance, userData, initializing]);

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
    loading: loading || isLoading,
    login,
    logout,
    clearAuthState,
    isAuthenticated: !!user
  };
};
