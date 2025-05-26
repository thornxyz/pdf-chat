import React, { useState, useEffect, ReactNode } from "react";
import {
  AuthContextType,
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthContext,
} from "../lib/types";
import { authApi } from "../lib/api";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      // Fetch user data
      authApi
        .getCurrentUser()
        .then((userData) => {
          setUser(userData);
        })
        .catch((error) => {
          console.error("Failed to fetch user data:", error);
          // Clear invalid token
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const authToken = await authApi.login(credentials);

      // Set the token first
      localStorage.setItem("token", authToken.access_token);
      setToken(authToken.access_token);

      // Now get user data (the axios interceptor will include the token)
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      await authApi.register(credentials);
      // After successful registration, automatically log in
      await login(credentials);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const logout = (): void => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children} </AuthContext.Provider>;
};
