import React, { useState, useEffect } from "react";
import { api } from "../services/api";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Debug: Log user state changes
  React.useEffect(() => {
    console.log("User state changed:", user);
  }, [user]);

  // Function to clear auth state
  const clearAuthState = () => {
    try {
      localStorage.removeItem("token");
      sessionStorage.removeItem("sessionToken");
      setUser(null);
      delete api.defaults.headers.common["Authorization"];
      delete api.defaults.headers.common["X-Session-Token"];
    } catch (error) {
      console.error("Error clearing auth state:", error);
    }
  };

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const sessionToken = sessionStorage.getItem("sessionToken");

        if (token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          if (sessionToken) {
            api.defaults.headers.common["X-Session-Token"] = sessionToken;
          }

          // Verify token with backend
          const response = await api.get("/auth/profile");
          if (response.data.success) {
            setUser(response.data.user);
          } else {
            clearAuthState();
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle tab visibility changes and heartbeat
  useEffect(() => {
    let heartbeatInterval;
    let activityTimeout;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, mark session as inactive
        const sessionToken = sessionStorage.getItem("sessionToken");
        if (sessionToken) {
          api
            .post("/auth/sessions/inactive", { sessionToken })
            .catch(console.error);
        }
        clearInterval(heartbeatInterval);
        clearTimeout(activityTimeout);
      } else {
        // Tab is visible, mark session as active and start heartbeat
        const sessionToken = sessionStorage.getItem("sessionToken");
        if (sessionToken) {
          api
            .post("/auth/sessions/active", { sessionToken })
            .catch(console.error);

          // Start heartbeat
          heartbeatInterval = setInterval(() => {
            api
              .post("/auth/sessions/heartbeat", { sessionToken })
              .catch(console.error);
          }, 30000); // Every 30 seconds
        }
      }
    };

    const handleBeforeUnload = () => {
      // Tab is closing, close session
      const sessionToken = sessionStorage.getItem("sessionToken");
      if (sessionToken) {
        navigator.sendBeacon(
          "/api/auth/sessions/close",
          JSON.stringify({ sessionToken })
        );
      }
    };

    // Set up event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Start heartbeat if user is logged in
    if (user) {
      const sessionToken = sessionStorage.getItem("sessionToken");
      if (sessionToken) {
        api
          .post("/auth/sessions/active", { sessionToken })
          .catch(console.error);

        heartbeatInterval = setInterval(() => {
          api
            .post("/auth/sessions/heartbeat", { sessionToken })
            .catch(console.error);
        }, 30000);
      }
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(heartbeatInterval);
      clearTimeout(activityTimeout);
    };
  }, [user]);

  const login = async (credentials) => {
    try {
      setLoading(true);

      // Authenticate with backend
      const response = await api.post("/auth/login", credentials);

      if (response.data.success) {
        // Set the JWT token from backend
        const jwtToken = response.data.token;
        const sessionToken = response.data.sessionToken;

        api.defaults.headers.common["Authorization"] = `Bearer ${jwtToken}`;
        if (sessionToken) {
          api.defaults.headers.common["X-Session-Token"] = sessionToken;
          sessionStorage.setItem("sessionToken", sessionToken);
        }
        localStorage.setItem("token", jwtToken);

        console.log("Setting user:", response.data.user);
        setUser(response.data.user);
        return response.data;
      } else {
        throw new Error(response.data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const sessionToken = sessionStorage.getItem("sessionToken");
      if (sessionToken) {
        await api.post(
          "/auth/logout",
          {},
          {
            headers: { "X-Session-Token": sessionToken },
          }
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthState();
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    clearAuthState,
  };
};
