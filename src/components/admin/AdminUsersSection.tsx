// src/components/admin/AdminUsersSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList, Platform } from 'react-native';

import { SimplifiedStudent, SimplifiedUser } from '../../views/AdminView';
import { UserRole, User } from '../../types/userTypes';
import { Instrument } from '../../mocks/mockInstruments';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';

import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

import CreateUserModal from './modals/CreateUserModal';

interface AdminUsersSectionProps {
  allPupils: SimplifiedStudent[];
  allTeachers: SimplifiedUser[];
  allParents: SimplifiedUser[];
  mockInstruments: Instrument[];
  onCreateUser: (userData: Omit<User, 'id'>) => void;
  onViewManageUser: (userId: string, role: UserRole) => void;
  onAssignTask: (taskId: string, studentId: string) => void; // Assuming this is still needed for student item
  taskLibrary: TaskLibraryItem[];
  isCreateUserModalVisible: boolean;
  setIsCreateUserModalVisible: (visible: boolean) => void;
  allUsers: User[];
}

// ***** DEFINITION RESTORED *****
// Renders Teachers and Parents using the SimplifiedUser structure (name = display name)
const AdminUserItem = ({
  user,
  onViewManage,
}: {
  user: SimplifiedUser;
  onViewManage: (userId: string, role: UserRole) => void;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>{user.name}</Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="View/Edit (Mock)" onPress={() => onViewManage(user.id, user.role)} />
    </View>
  </View>
);

// ***** DEFINITION RESTORED *****
// Renders Pupils using the SimplifiedStudent structure (name = display name)
const AdminPupilItem = ({
  student,
  mockInstruments,
  onViewManage,
  onAssignTask, // Keep prop if needed for the button
}: {
  student: SimplifiedStudent;
  mockInstruments: Instrument[];
  onViewManage: (pupilId: string, role: UserRole) => void;
  onAssignTask: (studentId: string) => void; // Define prop type
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
    <Text style={appSharedStyles.itemDetailText}>
      Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}
    </Text>
    <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
      Balance: {student.balance} Tickets
    </Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="View Details" onPress={() => onViewManage(student.id, 'student')} />
      <Button title="Assign Task (Mock)" onPress={() => onAssignTask(student.id)} />
    </View>
  </View>
);

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  allPupils,
  allTeachers,
  allParents,
  mockInstruments,
  onCreateUser,
  onViewManageUser,
  onAssignTask, // Ensure this prop is received if AdminPupilItem uses it
  taskLibrary,
  isCreateUserModalVisible,
  setIsCreateUserModalVisible,
  allUsers,
}) => {
  const handleAssignTaskToStudent = (studentId: string) => {
    const studentInfo = allPupils.find(p => p.id === studentId);
    const studentDisplayName = studentInfo ? studentInfo.name : studentId;
    alert(`Mock Assign Task to ${studentDisplayName}`);
    // In a real scenario, you might call the onAssignTask prop here or trigger another modal.
    // For now, AdminPupilItem calls the mock directly, but the prop could be used.
  };

  // Filter the full user list to get just teachers for the modal
  const teachersList = allUsers.filter(u => u.role === 'teacher');

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
        data={allPupils.sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          // ***** USAGE RESTORED *****
          <AdminPupilItem
            student={item}
            mockInstruments={mockInstruments}
            onViewManage={onViewManageUser}
            onAssignTask={handleAssignTaskToStudent} // Pass the handler to the item
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
        data={allTeachers.sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AdminUserItem user={item} onViewManage={onViewManageUser} />}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No teachers found.</Text>
        )}
      />

      {/* Parents List */}
      <Text style={adminSharedStyles.sectionSubTitle}>Parents ({allParents.length})</Text>
      <FlatList
        data={allParents.sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AdminUserItem user={item} onViewManage={onViewManageUser} />}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No parents found.</Text>
        )}
      />

      {/* Create User Modal */}
      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
        onCreateUser={onCreateUser}
        allTeachers={teachersList}
        mockInstruments={mockInstruments}
      />
      {/* EditUserModal is rendered in the parent AdminView component */}
    </View>
  );
};