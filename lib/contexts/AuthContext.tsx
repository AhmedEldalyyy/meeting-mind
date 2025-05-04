'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Define the User type
export type User = {
  id: string;
  name: string;
  email: string;
  role: string; // "TEAM_LEADER" or "TEAM_MEMBER"
};

// Define the context type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  isTeamLeader: () => boolean;
  isTeamMember: () => boolean;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  isTeamLeader: () => false,
  isTeamMember: () => false,
});

// Export the hook for using this context
export const useAuth = () => useContext(AuthContext);

// Create the provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const router = useRouter();

  // Function to get the current user from the server
  const getCurrentUser = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check for the current user when the component mounts
  useEffect(() => {
    getCurrentUser();
  }, []);

  // Handle redirects when user state or shouldRedirect changes
  useEffect(() => {
    if (shouldRedirect) {
      router.push(shouldRedirect);
      router.refresh();
      setShouldRedirect(null);
    }
  }, [shouldRedirect, router]);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/auth/login', { email, password });
      setUser(response.data.user);
      // Force a hard redirect
      window.location.href = '/dashboard';
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string, role: string) => {
    try {
      setIsLoading(true);
      await axios.post('/api/auth/register', { name, email, password, role });
      
      // Auto login after registration
      const loginResponse = await axios.post('/api/auth/login', {
        email: email,
        password: password
      });
      
      // Set user data from login response
      setUser(loginResponse.data.user);
      
      // Use window.location for a hard redirect that forces a complete refresh
      window.location.href = '/dashboard';
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await axios.post('/api/auth/logout');
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if user is a team leader
  const isTeamLeader = () => {
    return user?.role === 'TEAM_LEADER';
  };

  // Helper function to check if user is a team member
  const isTeamMember = () => {
    return user?.role === 'TEAM_MEMBER';
  };

  // The value that will be provided to consumers of this context
  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    isTeamLeader,
    isTeamMember,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 