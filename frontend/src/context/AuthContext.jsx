import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, BACKEND_ORIGIN } from '../services/api';

const AuthContext = createContext();

const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;

  try {
    return new URL(url, BACKEND_ORIGIN).toString();
  } catch (error) {
    return url;
  }
};

const normalizeUserMedia = (user) => {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const normalizedImage = resolveAssetUrl(user.profile_image || user.profilePicture);
  return {
    ...user,
    profile_image: normalizedImage || user.profile_image || null,
    profilePicture: normalizedImage || user.profilePicture || null
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      setLoading(true);

      // Guard against a hanging backend by racing the request against a timeout
      const timeoutMs = 3000; // 3 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth request timed out')), timeoutMs)
      );

      const response = await Promise.race([authAPI.me(), timeoutPromise]);
      // If the backend returns a full response object, use response.data; otherwise assume already-structured
      setUser(normalizeUserMedia(response.data || response.user || response));
    } catch (error) {
      if (error.response?.status === 404) {
        try {
          const verifyResponse = await authAPI.verify();
          setUser(normalizeUserMedia(verifyResponse.data.user || verifyResponse.data));
          return;
        } catch (verifyError) {
          console.error('Error fetching user (verify fallback):', verifyError);
        }
      } else {
        console.error('Error fetching user:', error.message || error);
      }

      // Don't keep the app blocked if auth fails — clear token and continue
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      // Use the centralized API instance from services/api.js
      const response = await authAPI.login(credentials);

      // Destructure data safely
      const { token, user } = response.data;

      // Validation: Stop if the server sent a success status but no token
      if (!token) {
        throw new Error("Server responded successfully but no token was provided.");
      }

      // Safe Decoding (optional, just for logging)
      try {
        const payload = token.split('.')[1];
        if (!payload) throw new Error("Invalid token format");

        const userDataFromToken = JSON.parse(atob(payload));
        console.log("Authenticated User:", userDataFromToken);
      } catch (decodeError) {
        console.warn("Could not decode token payload, using user object from response instead.");
      }

      // Persist and Update State
      localStorage.setItem('token', token);
      setToken(token);
      setUser(normalizeUserMedia(user));

      return user;

    } catch (error) {
      // Better Error Handling
      const message = error.response?.data?.message || error.message || "Login failed";
      console.error("Login error:", message);

      // Re-throw so the UI (Login.jsx) can show an error message to the user
      throw new Error(message);
    }
  };

  const socialLogin = async (payload) => {
    try {
      const response = await authAPI.socialLogin(payload);
      const { token, user } = response.data;

      if (!token) {
        throw new Error('Server responded successfully but no token was provided.');
      }

      localStorage.setItem('token', token);
      setToken(token);
      setUser(normalizeUserMedia(user));

      return user;
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Social login failed';
      console.error('Social login error:', message);
      throw new Error(message);
    }
  };

  const completeOAuthLogin = async (oauthToken) => {
    if (!oauthToken) {
      throw new Error('Missing OAuth token');
    }

    localStorage.setItem('token', oauthToken);
    setToken(oauthToken);

    const response = await authAPI.me();
    const resolvedUser = normalizeUserMedia(response.data || response.user || response);
    setUser(resolvedUser);
    return resolvedUser;
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, socialLogin, completeOAuthLogin, refreshUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
