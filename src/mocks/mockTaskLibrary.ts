

export interface TaskLibraryItem {
  id: string;
  title: string;
  description: string;
  baseTickets: number;
}


export const initialMockTaskLibrary: TaskLibraryItem[] = [
  {
    id: 'tasklib-1',
    title: 'Practice 15 minutes',
    description: 'Daily practice on your instrument',
    baseTickets: 10,
  },
  {
    id: 'tasklib-2',
    title: 'Learn Scale C Major',
    description: 'Play the C Major scale ascending and descending',
    baseTickets: 25,
  },
  {
    id: 'tasklib-3',
    title: 'Perform at Recital',
    description: 'Participate in the quarterly student recital',
    baseTickets: 100,
  },
  {
    id: 'tasklib-4',
    title: 'Teach Buddy a Chord',
    description: 'Help a fellow student learn a new chord',
    baseTickets: 15,
  },
];


export const mockTaskLibrary = initialMockTaskLibrary;