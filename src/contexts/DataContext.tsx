import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';

import { mockUsers as initialMockUsers } from '../mocks/mockUsers';
import { User } from '../types/userTypes';

interface DataContextType {
  currentMockUsers: Record<string, User>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [currentMockUsers, setCurrentMockUsers] = useState<Record<string, User>>(initialMockUsers);

  const value = useMemo(
    () => ({
      currentMockUsers,
    }),
    [currentMockUsers]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }

  if (!context.currentMockUsers) {
    console.error("DataContext value is missing 'currentMockUsers' property!");
  }
  return context;
};
