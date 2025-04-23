// src/contexts/DataContext.tsx

import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';

// Import User type and initial mock users data
import { User } from '../types/userTypes';
import { mockUsers as initialMockUsers } from '../mocks/mockUsers'; // Use initial mock data

// --- Define the minimal Context Type ---
// Only include what's strictly needed for DevelopmentViewSelector
interface DataContextType {
  currentMockUsers: Record<string, User>;
  // Add setCurrentMockUsers if you need to modify users from here (unlikely for just the selector)
  // setCurrentMockUsers: React.Dispatch<React.SetStateAction<Record<string, User>>>;
}
// --- End Minimal Context Type ---

// Create the context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Create the provider component
export const DataProvider = ({ children }: { children: ReactNode }) => {
  // --- State for mock users ---
  const [currentMockUsers, setCurrentMockUsers] = useState<Record<string, User>>(initialMockUsers);
  // --- End State ---

  // --- Memoize the context value ---
  // Include only the necessary properties
  const value = useMemo(
    () => ({
      currentMockUsers,
      // setCurrentMockUsers, // Include if needed
    }),
    [currentMockUsers] // Dependency array includes the state
  );
  // --- End Memoize ---

  // Provide the value to children
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Custom hook to consume the context
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    // Provide a clear error message if used outside the provider
    throw new Error('useData must be used within a DataProvider');
  }
  // Runtime check to ensure the expected property is present
  if (!context.currentMockUsers) {
      console.error("DataContext value is missing 'currentMockUsers' property!");
      // You might want to return a default or throw here depending on strictness
  }
  return context;
};