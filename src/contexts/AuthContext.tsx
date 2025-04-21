
import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';
import { UserRole } from '../types/userTypes';

type MockAuthState = {
  role: UserRole | 'public';
  userId?: string;
  viewingStudentId?: string;
};

interface AuthContextType {
  mockAuthState: MockAuthState | null;
  setMockAuthState: React.Dispatch<React.SetStateAction<MockAuthState | null>>;
  isAuthenticated: boolean;
  currentUserRole: UserRole | 'public';
  currentUserId?: string;
  currentViewingStudentId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [mockAuthState, setMockAuthState] = useState<MockAuthState | null>(null);
  const isAuthenticated = !!mockAuthState;
  const currentUserRole: UserRole | 'public' = mockAuthState?.role || 'public';
  const currentUserId: string | undefined = mockAuthState?.userId;
  const currentViewingStudentId: string | undefined = mockAuthState?.viewingStudentId;
  const value = useMemo(() => ({
    mockAuthState,
    setMockAuthState,
    isAuthenticated,
    currentUserRole,
    currentUserId,
    currentViewingStudentId,
  }), [mockAuthState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};