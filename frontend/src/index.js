import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/common`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage', // Use localStorage instead of sessionStorage
    storeAuthStateInCookie: true, // Enable cookie storage for non-HTTPS
  },
  system: {
    allowNativeBroker: false,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: 'Info',
    },
  },
};

// Initialize MSAL with error handling
let msalInstance;
try {
  msalInstance = new PublicClientApplication(msalConfig);
} catch (error) {
  console.error('MSAL initialization error:', error);
  // Create a mock instance for development
  msalInstance = {
    initialize: () => Promise.resolve(),
    acquireTokenSilent: () => Promise.reject(new Error('MSAL not available')),
    loginPopup: () => Promise.reject(new Error('MSAL not available')),
    logoutPopup: () => Promise.reject(new Error('MSAL not available')),
    getAllAccounts: () => [],
  };
}

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" />
        </BrowserRouter>
      </QueryClientProvider>
    </MsalProvider>
  </React.StrictMode>
);
