// src/components/admin/AdminUsersSection.tsx
import React from 'react'; // Removed useState as modal state is handled in AdminView
import { View, Text, StyleSheet, Button, Alert, FlatList, Platform } from 'react-native';

// Use NEW Simplified types (name = display name) passed from AdminView
import { SimplifiedStudent, SimplifiedUser } from '../../views/AdminView';
// Import NEW User type definitions
import { UserRole, User } from '../../types/userTypes';
import { Instrument } from '../../mocks/mockInstruments';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';

// Import NEW helper
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

import CreateUserModal from './CreateUserModal'; // Create modal uses new User type


interface AdminUsersSectionProps {
  allPupils: SimplifiedStudent[]; // Uses display name
  allTeachers: SimplifiedUser[]; // Uses display name
  allParents: SimplifiedUser[]; // Uses display name
  mockInstruments: Instrument[];
  // Use specific signature matching App.tsx's simulation function
  onCreateUser: (userData: Omit<User, 'id'>) => void;
  // onViewManageUser expects role including 'parent' which is correct
  onViewManageUser: (userId: string, role: UserRole) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  taskLibrary: TaskLibraryItem[];
  isCreateUserModalVisible: boolean;
  setIsCreateUserModalVisible: (visible: boolean) => void;
  allUsers: User[]; // Pass full user list needed for Create Modal lookups
}

// Renders Teachers and Parents using the SimplifiedUser structure (name = display name)
const AdminUserItem = ({
  user,
  onViewManage,
}: {
  user: SimplifiedUser; // Receives object with pre-formatted display name
  onViewManage: (userId: string, role: UserRole) => void;
}) => (
  <View style={appSharedStyles.itemContainer}>
     {/* Display name is already in user.name */}
    <Text style={appSharedStyles.itemTitle}>
      {user.name}
    </Text>
    <View style={adminSharedStyles.itemActions}>
       {/* Text can remain generic as action depends on role */}
       <Button title="View/Edit (Mock)" onPress={() => onViewManage(user.id, user.role)} />
    </View>
  </View>
);

// Renders Pupils using the SimplifiedStudent structure (name = display name)
const AdminPupilItem = ({
  pupil,
  mockInstruments,
  onViewManage,
  onAssignTask,
}: {
  pupil: SimplifiedStudent; // Receives object with pre-formatted display name
  mockInstruments: Instrument[];
  onViewManage: (pupilId: string, role: UserRole) => void;
  onAssignTask: (studentId: string) => void;
}) => (
  <View style={appSharedStyles.itemContainer}>
     {/* Display name already in pupil.name */}
    <Text style={appSharedStyles.itemTitle}>{pupil.name}</Text>
    <Text style={appSharedStyles.itemDetailText}>Instrument(s): {getInstrumentNames(pupil.instrumentIds, mockInstruments)}</Text>
    <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {pupil.balance} Tickets</Text>
    <View style={adminSharedStyles.itemActions}>
      {/* Text reflects the action for pupils */}
      <Button title="View Details" onPress={() => onViewManage(pupil.id, 'pupil')} />
      <Button title="Assign Task (Mock)" onPress={() => onAssignTask(pupil.id)} />
    </View>
  </View>
);

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  allPupils, // Simplified list with display names
  allTeachers, // Simplified list with display names
  allParents, // Simplified list with display names
  mockInstruments,
  onCreateUser,
  onViewManageUser,
  onAssignTask,
  taskLibrary,
  isCreateUserModalVisible,
  setIsCreateUserModalVisible,
  allUsers, // Pass full users list
}) => {
  // Handler to initiate assigning a task to a student
  const handleAssignTaskToStudent = (studentId: string) => {
     // Find student display name from the simplified list passed in props
     const studentInfo = allPupils.find(p => p.id === studentId);
     const studentDisplayName = studentInfo ? studentInfo.name : studentId; // Use display name

     // Use simple alert for web mock
     alert(`Mock Assign Task to ${studentDisplayName}`);
     // Could use Alert.prompt or modal later
    // Alert.prompt(...)
  };

  return (
    <View>
      {/* Section Title */}
      <Text style={appSharedStyles.sectionTitle}>Users</Text>
      {/* Create User Button */}
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New User" onPress={() => setIsCreateUserModalVisible(true)} />
      </View>

      {/* Pupils List */}
      <Text style={adminSharedStyles.sectionSubTitle}>Pupils ({allPupils.length})</Text>
      <FlatList
        data={allPupils.sort((a, b) => a.name.localeCompare(b.name))} // Sort by display name
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AdminPupilItem
            pupil={item} // Pass simplified pupil object
            mockInstruments={mockInstruments}
            onViewManage={onViewManageUser}
            onAssignTask={handleAssignTaskToStudent}
          />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No pupils found.</Text>
        )}
      />

      {/* Teachers List */}
      <Text style={adminSharedStyles.sectionSubTitle}>Teachers ({allTeachers.length})</Text>
      <FlatList
        data={allTeachers.sort((a, b) => a.name.localeCompare(b.name))} // Sort by display name
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AdminUserItem user={item} onViewManage={onViewManageUser} />} // Pass simplified user object
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No teachers found.</Text>
        )}
      />

      {/* Parents List */}
      <Text style={adminSharedStyles.sectionSubTitle}>Parents ({allParents.length})</Text>
      <FlatList
        data={allParents.sort((a, b) => a.name.localeCompare(b.name))} // Sort by display name
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AdminUserItem user={item} onViewManage={onViewManageUser} />} // Pass simplified user object
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No parents found.</Text>
        )}
      />

      {/* Create User Modal */}
      {/* Pass the full user list (needed for Create Modal's internal lookups) */}
      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
        onCreateUser={onCreateUser} // Pass the prop from App.tsx via AdminView
        allPupils={allUsers.filter(u => u.role === 'pupil')} // Filter full list for pupils
        mockInstruments={mockInstruments}
      />
      {/* EditUserModal is rendered in the parent AdminView component */}
    </View>
  );
};

// No local StyleSheet needed if all styles are covered by shared ones