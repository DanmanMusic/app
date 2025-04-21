import React from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { SimplifiedUser } from '../../views/AdminView';
import { SimplifiedStudent } from '../../types/dataTypes';
import { UserRole, User } from '../../types/userTypes';
import { Instrument } from '../../mocks/mockInstruments';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { getInstrumentNames } from '../../utils/helpers';
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';

import CreateUserModal from './modals/CreateUserModal';

interface AdminUsersSectionProps {
  allStudents: SimplifiedStudent[];
  allTeachers: SimplifiedUser[];
  allParents: SimplifiedUser[];
  mockInstruments: Instrument[];
  onCreateUser: (userData: Omit<User, 'id'>) => void;
  onViewManageUser: (userId: string, role: UserRole) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  taskLibrary: TaskLibraryItem[];
  isCreateUserModalVisible: boolean;
  setIsCreateUserModalVisible: (visible: boolean) => void;
  allUsers: User[];
}

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

const AdminStudentItem = ({
  student,
  mockInstruments,
  onViewManage,
  onAssignTask,
}: {
  student: SimplifiedStudent;
  mockInstruments: Instrument[];
  onViewManage: (studentId: string, role: UserRole) => void;
  onAssignTask: (studentId: string) => void;
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
  allStudents,
  allTeachers,
  allParents,
  mockInstruments,
  onCreateUser,
  onViewManageUser,
  onAssignTask,
  taskLibrary,
  isCreateUserModalVisible,
  setIsCreateUserModalVisible,
  allUsers,
}) => {
  const handleAssignTaskToStudent = (studentId: string) => {
    const studentInfo = allStudents.find(p => p.id === studentId);
    const studentDisplayName = studentInfo ? studentInfo.name : studentId;
    alert(`Mock Assign Task to ${studentDisplayName}`);
  };

  const teachersList = allUsers.filter(u => u.role === 'teacher');

  return (
    <View>
      {}
      <Text style={appSharedStyles.sectionTitle}>Users</Text>
      {}
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New User" onPress={() => setIsCreateUserModalVisible(true)} />
      </View>

      {}
      <Text style={adminSharedStyles.sectionSubTitle}>Students ({allStudents.length})</Text>
      <FlatList
        data={allStudents.sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AdminStudentItem
            student={item}
            mockInstruments={mockInstruments}
            onViewManage={onViewManageUser}
            onAssignTask={handleAssignTaskToStudent}
          />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No students found.</Text>
        )}
      />

      {}
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

      {}
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

      {}
      <CreateUserModal
        visible={isCreateUserModalVisible}
        onClose={() => setIsCreateUserModalVisible(false)}
        onCreateUser={onCreateUser}
        allTeachers={teachersList}
        mockInstruments={mockInstruments}
      />
      {}
    </View>
  );
};
