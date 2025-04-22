// src/components/admin/AdminUsersSection.tsx
import React from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';

// Types & Mocks
import { SimplifiedStudent } from '../../types/dataTypes';
import { UserRole, User, UserStatus } from '../../types/userTypes';
import { Instrument } from '../../mocks/mockInstruments';
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary'; // Still needed for CreateUserModal? No, passed directly to modal now.

// Utils & Styles
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// Components
// import CreateUserModal from './modals/CreateUserModal'; // Modal rendering moved to AdminView
import PaginationControls from './PaginationControls';

// Types for props
type UserTab = 'students' | 'teachers' | 'parents';
type StudentFilter = 'all' | 'active' | 'inactive';

// Updated Props: Remove modal state control props
interface AdminUsersSectionProps {
  displayData: Array<User | SimplifiedStudent>;
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  activeTab: UserTab;
  setActiveTab: (tab: UserTab) => void;
  studentFilter?: StudentFilter;
  setStudentFilter?: (filter: StudentFilter) => void;
  mockInstruments: Instrument[]; // Still needed for AdminStudentItem
  // onCreateUser: (userData: Omit<User, 'id'>) => void; // Action handled by AdminView button now
  onViewManageUser: (userId: string, role: UserRole) => void;
  onInitiateAssignTaskForStudent: (studentId: string) => void;
  // taskLibrary: TaskLibraryItem[]; // No longer needed here
  // isCreateUserModalVisible: boolean; // State managed in AdminView
  // setIsCreateUserModalVisible: (visible: boolean) => void; // State managed in AdminView
  // allTeachers: User[]; // No longer needed here, passed directly to modal in AdminView
}

// --- AdminUserItem Component ---
const AdminUserItem = ({ user, onViewManage }: { user: User; onViewManage: (userId: string, role: UserRole) => void; }) => ( <View style={[appSharedStyles.itemContainer, user.status === 'inactive' ? styles.inactiveItem : {}]}> <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(user)}</Text> <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold', color: user.status === 'active' ? colors.success : colors.secondary }]}> Status: {user.status} </Text> <View style={adminSharedStyles.itemActions}> <Button title="View/Edit Details" onPress={() => onViewManage(user.id, user.role)} /> </View> </View> );
// --- AdminStudentItem Component ---
const AdminStudentItem = ({ student, mockInstruments, onViewManage, onInitiateAssignTask, }: { student: SimplifiedStudent; mockInstruments: Instrument[]; onViewManage: (studentId: string, role: UserRole) => void; onInitiateAssignTask: (studentId: string) => void; }) => ( <View style={[appSharedStyles.itemContainer, !student.isActive ? styles.inactiveItem : {}]}> <Text style={appSharedStyles.itemTitle}>{student.name}</Text> <Text style={appSharedStyles.itemDetailText}> Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)} </Text> <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold', color: student.isActive ? colors.success : colors.secondary }]}> Status: {student.isActive ? 'Active' : 'Inactive'} </Text> <View style={adminSharedStyles.itemActions}> <Button title="View Details" onPress={() => onViewManage(student.id, 'student')} /> {student.isActive && ( <Button title="Assign Task" onPress={() => onInitiateAssignTask(student.id)} /> )} </View> </View> );


export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  // Destructure props (excluding modal state/creation ones)
  displayData,
  currentPage,
  totalPages,
  setPage,
  activeTab,
  setActiveTab,
  studentFilter,
  setStudentFilter,
  mockInstruments,
  // onCreateUser, // Removed
  onViewManageUser,
  onInitiateAssignTaskForStudent,
  // taskLibrary, // Removed
  // isCreateUserModalVisible, // Removed
  // setIsCreateUserModalVisible, // Removed
  // allTeachers, // Removed
}) => {

  const renderUserItem = ({ item }: { item: User | SimplifiedStudent }) => { /* ... as before ... */ const role = (item as User).role || activeTab.slice(0, -1) as UserRole; if (role === 'student') { return ( <AdminStudentItem student={item as SimplifiedStudent} mockInstruments={mockInstruments} onViewManage={onViewManageUser} onInitiateAssignTask={onInitiateAssignTaskForStudent} /> ); } else { return ( <AdminUserItem user={item as User} onViewManage={onViewManageUser} /> ); } };

  return (
    <View>
        {/* Removed sectionHeader and Create User Button */}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
            {/* Tab Buttons */}
            <Button title={`Students`} onPress={() => setActiveTab('students')} color={activeTab === 'students' ? colors.primary : colors.secondary}/>
            <Button title={`Teachers`} onPress={() => setActiveTab('teachers')} color={activeTab === 'teachers' ? colors.primary : colors.secondary}/>
            <Button title={`Parents`} onPress={() => setActiveTab('parents')} color={activeTab === 'parents' ? colors.primary : colors.secondary}/>
        </View>

        {/* Student Filter (Conditional) */}
        {activeTab === 'students' && studentFilter && setStudentFilter && (
            <View style={styles.filterContainer}>
                {/* Filter buttons */}
                <Text style={styles.filterLabel}>Show:</Text>
                <Button title="Active" onPress={() => setStudentFilter('active')} color={studentFilter === 'active' ? colors.success : colors.secondary}/>
                <Button title="Inactive" onPress={() => setStudentFilter('inactive')} color={studentFilter === 'inactive' ? colors.warning : colors.secondary}/>
                <Button title="All" onPress={() => setStudentFilter('all')} color={studentFilter === 'all' ? colors.info : colors.secondary}/>
            </View>
        )}

        {/* List Area */}
        <View style={styles.listArea}>
            <FlatList
                data={displayData}
                keyExtractor={item => item.id}
                renderItem={renderUserItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}> {activeTab === 'students' ? 'No students match the filter.' : activeTab === 'teachers' ? 'No teachers found.' : 'No parents found.'} </Text> )}
                ListFooterComponent={ totalPages > 1 ? ( <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} /> ) : null }
                contentContainerStyle={{ paddingBottom: 10 }}
            />
        </View>

        {/* Removed Create User Modal Rendering */}
        {/* <CreateUserModal ... /> */}
    </View>
  );
};

// Remove unused style
const styles = StyleSheet.create({
    // sectionHeader: { ... }, // Removed
    tabContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 15, gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary, },
    filterContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginBottom: 15, gap: 8, paddingVertical: 5, },
    filterLabel: { marginRight: 10, fontSize: 14, fontWeight: 'bold', color: colors.textSecondary, },
    listArea: { marginTop: 10, },
    inactiveItem: { borderColor: colors.secondary, opacity: 0.7 }
});