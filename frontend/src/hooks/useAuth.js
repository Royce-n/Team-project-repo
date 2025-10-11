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
      localStorage.removeItem('token');
      sessionStorage.removeItem('sessionToken');
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['X-Session-Token'];
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  };

  // Handle tab visibility changes and heartbeat
  useEffect(() => {
    let heartbeatInterval;
    let sessionToken = sessionStorage.getItem('sessionToken');

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Tab is hidden/minimized - mark session as inactive
        if (sessionToken) {
          try {
            await api.post('/auth/sessions/inactive', { sessionToken });
          } catch (error) {
            console.log('Failed to mark session as inactive:', error);
          }
        }
        // Clear heartbeat when tab is hidden
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      } else {
        // Tab is visible - mark session as active and start heartbeat
        if (sessionToken) {
          try {
            await api.post('/auth/sessions/active', { sessionToken });
            // Start heartbeat to keep session active
            startHeartbeat();
          } catch (error) {
            console.log('Failed to mark session as active:', error);
          }
        }
      }
    };

    const handleBeforeUnload = async () => {
      // Clean up session when tab is actually closed
      if (sessionToken) {
        try {
          // Use sendBeacon for reliable delivery even when page is unloading
          const data = JSON.stringify({ sessionToken });
          navigator.sendBeacon('/api/auth/sessions/close', data);
        } catch (error) {
          console.log('Failed to cleanup session on close:', error);
        }
      }
    };

    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      
      heartbeatInterval = setInterval(async () => {
        if (!document.hidden && sessionToken) {
          try {
            await api.post('/auth/sessions/heartbeat', { sessionToken });
          } catch (error) {
            console.log('Heartbeat failed:', error);
            // If heartbeat fails, session might be expired
            if (error.response?.status === 401) {
              clearInterval(heartbeatInterval);
              setUser(null);
              localStorage.removeItem('token');
              sessionStorage.removeItem('sessionToken');
              delete api.defaults.headers.common['Authorization'];
              delete api.defaults.headers.common['X-Session-Token'];
            }
          }
        }
      }, 30000); // Heartbeat every 30 seconds
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Start heartbeat if tab is visible
    if (!document.hidden && sessionToken) {
      startHeartbeat();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, []);

  // Handle authentication when accounts change
  useEffect(() => {
    const handleAuth = async () => {
      if (inProgress !== 'none') {
        return; // Wait for MSAL to finish
      }

      // Check if we have a stored token first
      const storedToken = localStorage.getItem('token');
      const storedSessionToken = sessionStorage.getItem('sessionToken');
      if (storedToken && !api.defaults.headers.common['Authorization']) {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        if (storedSessionToken) {
          api.defaults.headers.common['X-Session-Token'] = storedSessionToken;
        }
        try {
          const profileResponse = await api.get('/auth/profile');
          setUser(profileResponse.data.user);
          setLoading(false);
          return;
        } catch (error) {
          console.log('Stored token invalid, clearing...');
          localStorage.removeItem('token');
          sessionStorage.removeItem('sessionToken');
          delete api.defaults.headers.common['Authorization'];
          delete api.defaults.headers.common['X-Session-Token'];
        }
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
          const sessionToken = backendResponse.data.sessionToken;
          api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
          if (sessionToken) {
            api.defaults.headers.common['X-Session-Token'] = sessionToken;
            localStorage.setItem('sessionToken', sessionToken);
          }
          localStorage.setItem('token', jwtToken);
          
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
          const sessionToken = backendResponse.data.sessionToken;
          api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
          if (sessionToken) {
            api.defaults.headers.common['X-Session-Token'] = sessionToken;
            localStorage.setItem('sessionToken', sessionToken);
          }
          localStorage.setItem('token', jwtToken);
          
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
      // Notify server to remove session
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.log('Server logout failed, continuing with client logout');
      }

      await instance.logoutRedirect({
        postLogoutRedirectUri: window.location.origin
      });
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['X-Session-Token'];
      localStorage.removeItem('token');
      sessionStorage.removeItem('sessionToken');
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
