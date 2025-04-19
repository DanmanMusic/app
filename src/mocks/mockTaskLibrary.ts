// src/mocks/mockTaskLibrary.ts

export interface TaskLibraryItem {
  id: string;
  title: string;
  description: string;
  basePoints: number;
}

export const mockTaskLibrary: TaskLibraryItem[] = [
  {
    id: 'tasklib-1',
    title: 'Practice 15 minutes',
    description: 'Daily practice on your instrument',
    basePoints: 10,
  },
  {
    id: 'tasklib-2',
    title: 'Learn Scale C Major',
    description: 'Play the C Major scale ascending and descending',
    basePoints: 25,
  },
  {
    id: 'tasklib-3',
    title: 'Perform at Recital',
    description: 'Participate in the quarterly student recital',
    basePoints: 100,
  },
  {
    id: 'tasklib-4',
    title: 'Teach Buddy a Chord',
    description: 'Help a fellow student learn a new chord',
    basePoints: 15,
  },
];
