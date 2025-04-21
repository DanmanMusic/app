export interface RewardItem {
  id: string;
  name: string;
  cost: number;
  imageUrl: string;
  description?: string;
}

export const initialMockRewardsCatalog: RewardItem[] = [
  {
    id: 'reward-1',
    name: 'Snickers Bar',
    cost: 10,
    imageUrl: 'https://via.placeholder.com/100x100/FF0000?text=Snickers',
    description: 'A delicious treat!',
  },
  {
    id: 'reward-2',
    name: 'Guitar Pick (Assorted)',
    cost: 5,
    imageUrl: 'https://via.placeholder.com/100x100/00FF00?text=Pick',
    description: 'Play your favorite tunes.',
  },
  {
    id: 'reward-3',
    name: 'Drumsticks (Pair)',
    cost: 2000,
    imageUrl: 'https://via.placeholder.com/100x100/0000FF?text=Drumsticks',
    description: 'Keep the beat going!',
  },
  {
    id: 'reward-4',
    name: 'Entry to Local Gig',
    cost: 500,
    imageUrl: 'https://via.placeholder.com/100x100/00FFFF?text=Gig',
    description: 'See a great local band perform!',
  },
  {
    id: 'reward-5',
    name: 'Beginner Guitar',
    cost: 8000,
    imageUrl: 'https://via.placeholder.com/150x150/FFFF00?text=Guitar',
    description: 'Start your guitar journey!',
  },
  {
    id: 'reward-6',
    name: 'Fender Stratocaster',
    cost: 10000,
    imageUrl: 'https://via.placeholder.com/150x150/FF00FF?text=Strat',
    description: 'Iconic sound, dream guitar!',
  },
  {
    id: 'reward-7',
    name: 'Yamaha BB435 Bass Guitar',
    cost: 15000,
    imageUrl: 'https://via.placeholder.com/150x150/FF00FF?text=Bass',
    description: 'Groove machine!',
  },
];

export const mockRewardsCatalog = initialMockRewardsCatalog;
