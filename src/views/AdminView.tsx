// src/views/AdminView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert, FlatList, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import types for mock data
import { User, UserRole } from '../mocks/mockUsers';
import { AssignedTask, TaskVerificationStatus } from '../mocks/mockAssignedTasks';
import { TaskLibraryItem } from '../mocks/mockTaskLibrary';
import { RewardItem } from '../mocks/mockRewards';
import { TicketTransaction } from '../mocks/mockTickets';
import { Announcement } from '../mocks/mockAnnouncements';
import { Instrument } from '../mocks/mockInstruments';

// Import helpers
import { getTaskTitle, getInstrumentNames } from '../utils/helpers';

// Import PupilViewProps for the getStudentData helper return type
import { PupilViewProps } from './PupilView';

// Import the new section components
import { AdminDashboardSection } from '../components/admin/AdminDashboardSection';
import { AdminUsersSection } from '../components/admin/AdminUsersSection';
import { AdminTasksSection } from '../components/admin/AdminTasksSection';
import { AdminRewardsSection } from '../components/admin/AdminRewardsSection';
import { AdminHistorySection } from '../components/admin/AdminHistorySection';
import { AdminAnnouncementsSection } from '../components/admin/AdminAnnouncementsSection';
import { AdminInstrumentsSection } from '../components/admin/AdminInstrumentsSection';

// Import the new student detail component
import { AdminStudentDetailView } from '../components/admin/AdminStudentDetailView';

// Import shared styles
import { adminSharedStyles } from '../components/admin/adminSharedStyles';


// Define simplified types used across Admin components (can be moved to a shared types file later)
export interface SimplifiedStudent {
    id: string;
    name: string;
    instrumentIds?: string[];
    balance: number;
}

export interface SimplifiedUser {
     id: string;
     name: string;
     role: UserRole;
}


interface AdminViewProps {
    user: User;
    allUsers: User[];
    allPupils: SimplifiedStudent[];
    allTeachers: SimplifiedUser[];
    allParents: SimplifiedUser[];
    allAssignedTasks: AssignedTask[];
    taskLibrary: TaskLibraryItem[];
    rewardsCatalog: RewardItem[];
    allTicketHistory: TicketTransaction[];
    announcements: Announcement[];
    mockInstruments: Instrument[];

    onManualTicketAdjust: (studentId: string, amount: number, notes: string) => void;
    onRedeemReward: (studentId: string, rewardId: string) => void;
    onVerifyTask: (taskId: string, status: TaskVerificationStatus, points: number) => void;
    onAssignTask: (taskId: string, studentId: string) => void;
    onReassignTaskMock: (originalTaskId: string, studentId: string) => void;

    onCreateUser: (userData: any) => void;
    onEditUser: (userId: string, userData: any) => void;
    onDeleteUser: (userId: string) => void;
    onCreateTaskLibraryItem: (taskData: any) => void;
    onEditTaskLibraryItem: (taskId: string, taskData: any) => void;
    onDeleteTaskLibraryItem: (taskId: string) => void;
    onCreateReward: (rewardData: any) => void;
    onEditReward: (rewardId: string, rewardData: any) => void;
    onDeleteReward: (rewardId: string) => void;
    onCreateAnnouncement: (announcementData: any) => void;
    onEditAnnouncement: (announcementId: string, announcementData: any) => void;
    onDeleteAnnouncement: (announcementId: string) => void;
    onCreateInstrument: (instrumentData: any) => void;
    onEditInstrument: (instrumentId: string, instrumentData: any) => void;
    onDeleteInstrument: (instrumentId: string) => void;
    getStudentData: (studentId: string) => PupilViewProps | undefined; // Helper to get full student mock data
}


// No longer need list item components here, they are in their section files or AdminStudentDetailView.


export const AdminView: React.FC<AdminViewProps> = ({
    user,
    allUsers,
    allPupils,
    allTeachers,
    allParents,
    allAssignedTasks,
    taskLibrary,
    rewardsCatalog,
    allTicketHistory,
    announcements,
    mockInstruments,
    onManualTicketAdjust,
    onRedeemReward,
    onVerifyTask,
    onAssignTask,
    onReassignTaskMock,
    onCreateUser, onEditUser, onDeleteUser,
    onCreateTaskLibraryItem, onEditTaskLibraryItem, onDeleteTaskLibraryItem,
    onCreateReward, onEditReward, onDeleteReward,
    onCreateAnnouncement, onEditAnnouncement, onDeleteAnnouncement,
    onCreateInstrument, onEditInstrument, onDeleteInstrument,
    getStudentData
}) => {

    const [viewingSection, setViewingSection] = React.useState<'dashboard' | 'users' | 'tasks' | 'rewards' | 'history' | 'announcements' | 'instruments'>('dashboard');
    const [viewingStudentId, setViewingStudentId] = React.useState<string | null>(null); // State for drilling down

    // Simulate viewing a student's detailed profile - get data when ID changes
    const viewingStudentData = React.useMemo(() => {
        return viewingStudentId ? getStudentData(viewingStudentId) : null;
    }, [viewingStudentId, getStudentData]); // Recalculate only when viewingStudentId changes

    // Handler to navigate to a specific user's detail/management view (Pupil drill-down, others alert)
    const handleViewManageUser = (userId: string, role: UserRole | 'public') => {
        if (role === 'pupil') {
            setViewingStudentId(userId); // Trigger drill-down
        } else {
             Alert.alert("Mock User Management", `Simulate opening edit screen for ${role} user: ${userId}`);
        }
     };

    // Handler to go back from student detail view
    const handleBackFromStudentDetail = () => {
        setViewingStudentId(null);
    };


    // If we are viewing a specific student's profile, render the detail component
    if (viewingStudentId && viewingStudentData) {
        return (
             <AdminStudentDetailView
                 studentData={viewingStudentData}
                 taskLibrary={taskLibrary}
                 mockInstruments={mockInstruments}
                 adminUserName={user.name} // Pass admin's name for display
                 onManualTicketAdjust={onManualTicketAdjust}
                 onRedeemReward={onRedeemReward}
                 onAssignTask={onAssignTask}
                 onBack={handleBackFromStudentDetail} // Pass the back handler
                 // onVerifyTask={onVerifyTask} // Uncomment if Admin will use modal from here
                 // onReassignTaskMock={onReassignTaskMock} // Uncomment if Admin will use modal from here
             />
        );
    }


    // Default Admin Dashboard View - Render sections based on state
    return (
        <SafeAreaView style={adminSharedStyles.safeArea}>
             <View style={adminSharedStyles.headerContainer}>
                 <Text style={adminSharedStyles.header}>Admin Dashboard: {user.name}</Text>
             </View>
            <ScrollView style={adminSharedStyles.container}>

                 {/* Simple Navigation between Admin sections */}
                 <View style={adminSharedStyles.adminNav}>
                     <Button title="Dashboard" onPress={() => setViewingSection('dashboard')} color={viewingSection === 'dashboard' ? 'blue' : 'gray'} />
                     <Button title="Users" onPress={() => setViewingSection('users')} color={viewingSection === 'users' ? 'blue' : 'gray'} />
                     <Button title="Tasks" onPress={() => setViewingSection('tasks')} color={viewingSection === 'tasks' ? 'blue' : 'gray'} />
                     <Button title="Rewards" onPress={() => setViewingSection('rewards')} color={viewingSection === 'rewards' ? 'blue' : 'gray'} />
                     <Button title="History" onPress={() => setViewingSection('history')} color={viewingSection === 'history' ? 'blue' : 'gray'} />
                     <Button title="Announcements" onPress={() => setViewingSection('announcements')} color={viewingSection === 'announcements' ? 'blue' : 'gray'} />
                     <Button title="Instruments" onPress={() => setViewingSection('instruments')} color={viewingSection === 'instruments' ? 'blue' : 'gray'} />
                 </View>


                {/* Render the selected section component */}
                {viewingSection === 'dashboard' && (
                    <AdminDashboardSection
                        allPupils={allPupils}
                        allTeachers={allTeachers}
                        allParents={allParents}
                        allAssignedTasks={allAssignedTasks}
                     />
                )}

                {viewingSection === 'users' && (
                     <AdminUsersSection
                         allPupils={allPupils}
                         allTeachers={allTeachers}
                         allParents={allParents}
                         mockInstruments={mockInstruments}
                         onCreateUser={onCreateUser}
                         onViewManageUser={handleViewManageUser} // Pass the handler down
                          onAssignTask={onAssignTask} // Pass assign prop down
                         taskLibrary={taskLibrary} // Pass task library down for handler
                     />
                )}

                 {viewingSection === 'tasks' && (
                    <AdminTasksSection
                         taskLibrary={taskLibrary}
                         allPupils={allPupils} // Pass pupils down for assign handler
                         onCreateTaskLibraryItem={onCreateTaskLibraryItem}
                         onEditTaskLibraryItem={onEditTaskLibraryItem}
                         onDeleteTaskLibraryItem={onDeleteTaskLibraryItem}
                         onAssignTask={onAssignTask} // Pass assign prop down
                    />
                 )}

                 {viewingSection === 'rewards' && (
                     <AdminRewardsSection
                         rewardsCatalog={rewardsCatalog}
                         onCreateReward={onCreateReward}
                         onEditReward={onEditReward}
                         onDeleteReward={onDeleteReward}
                     />
                 )}

                 {viewingSection === 'history' && (
                     <AdminHistorySection
                         allTicketHistory={allTicketHistory}
                     />
                 )}

                 {viewingSection === 'announcements' && (
                     <AdminAnnouncementsSection
                         announcements={announcements}
                         onCreateAnnouncement={onCreateAnnouncement}
                         onEditAnnouncement={onEditAnnouncement}
                         onDeleteAnnouncement={onDeleteAnnouncement}
                     />
                 )}

                 {viewingSection === 'instruments' && (
                    <AdminInstrumentsSection
                        mockInstruments={mockInstruments}
                        onCreateInstrument={onCreateInstrument}
                        onEditInstrument={onEditInstrument}
                        onDeleteInstrument={onDeleteInstrument}
                    />
                 )}

            </ScrollView>
        </SafeAreaView>
    );
};