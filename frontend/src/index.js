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
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || 'cad72c8c-cc16-4d72-9455-d710d9e8ca7e',
    authority: `https://login.microsoftonline.com/organizations`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false, // Disable cookie storage for SPA
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

// Check if we're in a secure context (HTTPS or localhost)
const isSecureContext = window.isSecureContext || 
                       window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';

// Initialize MSAL with error handling
let msalInstance;
if (isSecureContext) {
  try {
    msalInstance = new PublicClientApplication(msalConfig);
  } catch (error) {
    console.error('MSAL initialization error:', error);
    msalInstance = null;
  }
} else {
  console.warn('MSAL requires HTTPS or localhost. Authentication will be limited.');
  msalInstance = null;
}

// Create a fallback instance for non-secure contexts
if (!msalInstance) {
  msalInstance = {
    initialize: () => Promise.resolve(),
    acquireTokenSilent: () => Promise.reject(new Error('Authentication requires HTTPS or localhost')),
    loginPopup: () => Promise.reject(new Error('Authentication requires HTTPS or localhost')),
    logoutPopup: () => Promise.reject(new Error('Authentication requires HTTPS or localhost')),
    getAllAccounts: () => [],
    addEventCallback: () => {},
    removeEventCallback: () => {},
    initializeWrapperLibrary: () => Promise.resolve(),
    getLogger: () => ({
      error: () => {},
      warn: () => {},
      info: () => {},
      verbose: () => {},
      clone: () => ({
        error: () => {},
        warn: () => {},
        info: () => {},
        verbose: () => {},
      }),
    }),
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
