// src/components/admin/AdminUsersSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList, Platform } from 'react-native';

// Import types
import { SimplifiedStudent, SimplifiedUser } from '../../views/AdminView'; // Import simplified types from the main AdminView interface
import { UserRole } from '../../mocks/mockUsers'; // Import UserRole type from mocks
import { Instrument } from '../../mocks/mockInstruments'; // Import Instrument type
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary'; // Import TaskLibraryItem for assignment mock handler

// Import helpers
import { getInstrumentNames } from '../../utils/helpers';

// Import shared styles
import { adminSharedStyles } from './adminSharedStyles';


interface AdminUsersSectionProps {
    allPupils: SimplifiedStudent[];
    allTeachers: SimplifiedUser[];
    allParents: SimplifiedUser[];
    mockInstruments: Instrument[];
    onCreateUser: (userData: any) => void;
    onViewManageUser: (userId: string, role: UserRole | 'public') => void;
     onAssignTask: (taskId: string, studentId: string) => void;
    taskLibrary: TaskLibraryItem[];
}

// Render item for User lists in Admin view - Use shared styles
// Keep (Mock) as it triggers alert for Teacher/Parent currently
const AdminUserItem = ({ user, onViewManage }: { user: SimplifiedUser; onViewManage: (userId: string, role: UserRole | 'public') => void }) => (
    <View style={adminSharedStyles.item}>
        <Text>{user.name} ({user.role})</Text>
        {/* Keep (Mock) as it only alerts for Teacher/Parent */}
        <Button title="View/Manage (Mock)" onPress={() => onViewManage(user.id, user.role)} />
    </View>
);

// Render item for Pupil lists in Admin view - Use shared styles
// Remove (Mock) for View/Manage (navigates), Keep for Assign Task (prompts)
const AdminPupilItem = ({ pupil, mockInstruments, onViewManage, onAssignTask }: {
     pupil: SimplifiedStudent;
     mockInstruments: Instrument[];
     onViewManage: (pupilId: string, role: UserRole) => void;
     onAssignTask: (studentId: string) => void;
    }) => (
    <View style={adminSharedStyles.item}>
        <Text style={adminSharedStyles.itemTitle}>{pupil.name} (Pupil)</Text>
         <Text>Instrument(s): {getInstrumentNames(pupil.instrumentIds, mockInstruments)}</Text>
        <Text>Balance: {pupil.balance} Tickets</Text>
         <View style={adminSharedStyles.itemActions}>
             {/* Remove (Mock) as it navigates to AdminStudentDetailView */}
             <Button title="View/Manage" onPress={() => onViewManage(pupil.id, 'pupil')} />
             {/* Keep (Mock) as it triggers assign prompt */}
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
}) => {

     const handleAssignTaskToStudent = (studentId: string) => {
         Alert.prompt(
              "Assign Task",
              `Assign which task ID from library to student ${studentId}? (e.g., tasklib-1)`,
              [
                  { text: "Cancel", style: "cancel" },
                  {
                      text: "Assign",
                      onPress: (taskId) => {
                           if (taskId && taskLibrary.some(t => t.id === taskId)) {
                              onAssignTask(taskId, studentId);
                          } else {
                              Alert.alert("Invalid Task ID", "Please enter a valid task library ID.");
                          }
                      }
                  },
              ],
               Platform.OS === 'ios' ? 'default' : 'plain-text'
          );
     };


    return (
        <View>
            <Text style={adminSharedStyles.sectionTitle}>Users</Text>
            <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                {/* Keep (Mock) as it only alerts */}
                <Button title="Create New User (Mock)" onPress={() => onCreateUser({})} />
            </View>

            <Text style={adminSharedStyles.sectionSubTitle}>Pupils ({allPupils.length})</Text>
            <FlatList
                data={allPupils.sort((a, b) => a.name.localeCompare(b.name))}
                keyExtractor={(item) => item.id}
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
                ListEmptyComponent={() => <Text style={adminSharedStyles.emptyListText}>No pupils found.</Text>}
            />

            <Text style={adminSharedStyles.sectionSubTitle}>Teachers ({allTeachers.length})</Text>
            <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                 {/* Keep (Mock) as it only alerts */}
                <Button title="Create New Teacher (Mock)" onPress={() => onCreateUser({ role: 'teacher' })} />
            </View>
            <FlatList
                data={allTeachers.map(t => ({ id: t.id, name: t.name, role: t.role }) as SimplifiedUser).sort((a, b) => a.name.localeCompare(b.name))}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AdminUserItem user={item} onViewManage={onViewManageUser} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => <Text style={adminSharedStyles.emptyListText}>No teachers found.</Text>}
            />

            <Text style={adminSharedStyles.sectionSubTitle}>Parents ({allParents.length})</Text>
            <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                 {/* Keep (Mock) as it only alerts */}
                <Button title="Create New Parent (Mock)" onPress={() => onCreateUser({ role: 'parent' })} />
            </View>
            <FlatList
                data={allParents.map(p => ({ id: p.id, name: p.name, role: p.role }) as SimplifiedUser).sort((a, b) => a.name.localeCompare(b.name))}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AdminUserItem user={item} onViewManage={onViewManageUser} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => <Text style={adminSharedStyles.emptyListText}>No parents found.</Text>}
            />
        </View>
    );
};