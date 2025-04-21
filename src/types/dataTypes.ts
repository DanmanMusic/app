// src/types/dataTypes.ts
import { User } from './userTypes';
import { AssignedTask } from '../mocks/mockAssignedTasks'; // Adjust path as needed
import { TicketTransaction } from '../mocks/mockTickets'; // Adjust path as needed
import { RewardItem } from '../mocks/mockRewards'; // Adjust path as needed
import { Announcement } from '../mocks/mockAnnouncements'; // Adjust path as needed
import { TaskLibraryItem } from '../mocks/mockTaskLibrary'; // Adjust path as needed
import { Instrument } from '../mocks/mockInstruments'; // Adjust path as needed

export interface SimplifiedStudent {
  id: string;
  name: string;
  instrumentIds: string[];
  balance: number;
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
  // Note: onMarkTaskComplete is specific to the direct StudentView usage
  // and might not belong in this generic data structure if used elsewhere
  // without that function. Let's keep it for now as DataContext provides it.
  onMarkTaskComplete?: (taskId: string) => void;
}