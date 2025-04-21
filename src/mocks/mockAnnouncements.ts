export type AnnouncementType = 'announcement' | 'challenge' | 'redemption_celebration';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  date: string;
  relatedStudentId?: string;
}

export const mockAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    type: 'announcement',
    title: 'Welcome to Virtual Tickets!',
    message: 'Start earning tickets today by completing tasks assigned by your teacher!',
    date: '2025-01-15T08:00:00Z',
  },
  {
    id: 'ann-2',
    type: 'challenge',
    title: 'March Practice Challenge',
    message:
      'Practice 20 days this month for a bonus 100 tickets! Check with your teacher for details.',
    date: '2025-03-01T08:00:00Z',
  },
  {
    id: 'ann-3',
    type: 'redemption_celebration',
    title: '🎉 Reward Redeemed! 🎉',
    message: 'Charlie redeemed a sweet pair of Drumsticks!',
    date: '2025-02-15T15:00:00Z',
    relatedStudentId: 'student-3',
  },
  {
    id: 'ann-4',
    type: 'announcement',
    title: 'Summer Jam July 15th!',
    message: 'Sign up now for the Summer Jam!',
    date: '2025-07-15T09:00:00Z',
  },
  {
    id: 'ann-5',
    type: 'challenge',
    title: 'Spring Scale Challenge',
    message: 'Master 3 new scales this month for extra tickets!',
    date: '2025-04-05T10:00:00Z',
  },
];
