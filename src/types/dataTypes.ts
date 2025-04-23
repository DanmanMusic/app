import { Announcement } from '../mocks/mockAnnouncements';
import { AssignedTask } from '../mocks/mockAssignedTasks';
import { Instrument } from '../mocks/mockInstruments';
import { RewardItem } from '../mocks/mockRewards';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { TicketTransaction } from '../mocks/mockTickets';

import { User } from './userTypes';

export interface SimplifiedStudent {
  id: string;
  name: string;
  instrumentIds?: string[];
  balance: number;
  isActive: boolean;
}

export interface StudentProfileData {
  user: User;
  balance: number;
  assignedTasks: AssignedTask[];
  history: TicketTransaction[];
  rewardsCatalog: RewardItem[];
  announcements: Announcement[];
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[];
  onMarkTaskComplete?: (taskId: string) => void;
}
