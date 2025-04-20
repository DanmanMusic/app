// src/components/admin/AdminUsersSection.tsx
import React, { useState } from 'react'; // Import useState
import { View, Text, StyleSheet, Button, Alert, FlatList, Platform } from 'react-native';

import { SimplifiedStudent, SimplifiedUser } from '../../views/AdminView';
import { UserRole, User } from '../../mocks/mockUsers';
import { Instrument } from '../../mocks/mockInstruments';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';

import { getInstrumentNames } from '../../utils/helpers';

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// Import the new modal component
import CreateUserModal from './CreateUserModal';


interface AdminUsersSectionProps {
  allPupils: SimplifiedStudent[];
  allTeachers: SimplifiedUser[];
  allParents: SimplifiedUser[];
  mockInstruments: Instrument[];
  // Updated onCreateUser prop signature to match modal
  onCreateUser: (userData: Omit<User, 'id'>) => void;
  onViewManageUser: (userId: string, role: UserRole | 'public') => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  taskLibrary: TaskLibraryItem[];
  // Props passed down from AdminView to control the modal
  isCreateUserModalVisible: boolean;
  setIsCreateUserModalVisible: (visible: boolean) => void;
  allUsers: User[]; // Pass full users list for modal lookups
}

const AdminUserItem = ({
  user,
  onViewManage,
}: {
  user: SimplifiedUser;
  onViewManage: (userId: string, role: UserRole | 'public') => void;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>
      {user.name} ({user.role})
    </Text>
    <View style={adminSharedStyles.itemActions}>
       <Button title="View/Manage (Mock)" onPress={() => onViewManage(user.id, user.role)} />
    </View>
  </View>
);

const AdminPupilItem = ({
  pupil,
  mockInstruments,
  onViewManage,
  onAssignTask,
}: {
  pupil: SimplifiedStudent;
  mockInstruments: Instrument[];
  onViewManage: (pupilId: string, role: UserRole) => void;
  onAssignTask: (studentId: string) => void;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>{pupil.name} (Pupil)</Text>
    <Text style={appSharedStyles.itemDetailText}>Instrument(s): {getInstrumentNames(pupil.instrumentIds, mockInstruments)}</Text>
    <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>Balance: {pupil.balance} Tickets</Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="View/Manage" onPress={() => onViewManage(pupil.id, 'pupil')} />
      <Button title="Assign Task (Mock)" onPress={() => onAssignTask(pupil.id)} />
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
  onAssignTask,
  taskLibrary,
  isCreateUserModalVisible, // Destructure modal props
  setIsCreateUserModalVisible,
  allUsers, // Destructure allUsers prop
}) => {
  const handleAssignTaskToStudent = (studentId: string) => {
    Alert.prompt(
      'Assign Task',
      `Assign which task ID from library to student ${studentId}? (e.g., tasklib-1)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: taskId => {
            if (taskId && taskLibrary.some(t => t.id === taskId)) {
              onAssignTask(taskId, studentId);
            } else {
              Alert.alert('Invalid Task ID', 'Please enter a valid task library ID.');
            }
          },
        },
      ],
      Platform.OS === 'ios' ? 'default' : 'plain-text'
    );
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Users</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        {/* Update button to open the modal */}
        <Button title="Create New User" onPress={() => setIsCreateUserModalVisible(true)} />
      </View>

      <Text style={adminSharedStyles.sectionSubTitle}>Pupils ({allPupils.length})</Text>
      <FlatList
        data={allPupils.sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AdminPupilItem
            pupil={item}
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

      <Text style={adminSharedStyles.sectionSubTitle}>Teachers ({allTeachers.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button
          title="Create New Teacher (Mock)"
          onPress={() => onCreateUser({ role: 'teacher', name: 'New Teacher' })} // Simplified mock
        />
      </View>
      <FlatList
        data={allTeachers
          .map(t => ({ id: t.id, name: t.name, role: t.role }) as SimplifiedUser)
          .sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AdminUserItem user={item} onViewManage={onViewManageUser} />}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No teachers found.</Text>
        )}
      />

      <Text style={adminSharedStyles.sectionSubTitle}>Parents ({allParents.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New Parent (Mock)" onPress={() => onCreateUser({ role: 'parent', name: 'New Parent' })} /> // Simplified mock
      </View>
      <FlatList
        data={allParents
          .map(p => ({ id: p.id, name: p.name, role: p.role }) as SimplifiedUser)
          .sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AdminUserItem user={item} onViewManage={onViewManageUser} />}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No parents found.</Text>
        )}
      />

      {/* Render the modal controlled by state */}
      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
        onCreateUser={onCreateUser} // Pass the prop from App.tsx
        allPupils={allPupils} // Pass data needed for mock selectors
        mockInstruments={mockInstruments} // Pass data needed for mock selectors
      />
    </View>
  );
};