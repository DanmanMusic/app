// src/components/admin/AdminUsersSection.tsx
import React from 'react';
import { View, Text, Button, FlatList, StyleSheet, TextInput, ActivityIndicator } from 'react-native';

// Types & Mocks
import { SimplifiedStudent } from '../../types/dataTypes';
import { UserRole, User, UserStatus } from '../../types/userTypes';
import { Instrument } from '../../mocks/mockInstruments';

// Utils & Styles
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// Components
import PaginationControls from './PaginationControls';

// Types for props
type UserTab = 'students' | 'teachers' | 'parents';
type StudentFilter = UserStatus | 'all';

// Interface updated to accept isFetching, setFilter, and setSearchTerm
interface AdminUsersSectionProps {
  displayData: Array<User | SimplifiedStudent>;
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  activeTab: UserTab;
  setActiveTab: (tab: UserTab) => void;
  // Student-specific props
  studentFilter?: StudentFilter;
  setStudentFilter?: (filter: StudentFilter) => void; // Keep this name as it's used internally
  setFilter?: (filter: UserStatus | 'all') => void; // Keep for completeness, though setStudentFilter is used
  studentSearchTerm?: string;
  setStudentSearchTerm?: (term: string) => void; // ADDED setSearchTerm prop definition
  // Loading/Error states
  isLoading: boolean;
  isFetching?: boolean;
  isError: boolean;
  error: Error | null;
  // Other props
  mockInstruments: Instrument[];
  onViewManageUser: (userId: string, role: UserRole) => void;
  onInitiateAssignTaskForStudent: (studentId: string) => void;
}

// AdminUserItem Component (Unchanged)
const AdminUserItem = ({ user, onViewManage }: { user: User; onViewManage: (userId: string, role: UserRole) => void; }) => ( <View style={[appSharedStyles.itemContainer, user.status === 'inactive' ? styles.inactiveItem : {}]}> <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(user)}</Text> <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold', color: user.status === 'active' ? colors.success : colors.secondary }]}> Status: {user.status} </Text> {user.role === 'parent' && user.linkedStudentIds && ( <Text style={appSharedStyles.itemDetailText}> Linked Students: {user.linkedStudentIds.length} </Text> )} <View style={adminSharedStyles.itemActions}> <Button title="View/Edit Details" onPress={() => onViewManage(user.id, user.role)} /> </View> </View> );

// AdminStudentItem Component (Unchanged)
const AdminStudentItem = ({ student, mockInstruments, onViewManage, onInitiateAssignTask, }: { student: SimplifiedStudent; mockInstruments: Instrument[]; onViewManage: (studentId: string, role: UserRole) => void; onInitiateAssignTask: (studentId: string) => void; }) => ( <View style={[appSharedStyles.itemContainer, !student.isActive ? styles.inactiveItem : {}]}> <Text style={appSharedStyles.itemTitle}>{student.name}</Text> <Text style={appSharedStyles.itemDetailText}> Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)} </Text> <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}> Balance: {student.balance} </Text> <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold', color: student.isActive ? colors.success : colors.secondary }]}> Status: {student.isActive ? 'Active' : 'Inactive'} </Text> <View style={adminSharedStyles.itemActions}> <Button title="View Details" onPress={() => onViewManage(student.id, 'student')} /> {student.isActive && ( <Button title="Assign Task" onPress={() => onInitiateAssignTask(student.id)} /> )} </View> </View> );


export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  displayData,
  currentPage,
  totalPages,
  setPage,
  activeTab,
  setActiveTab,
  studentFilter,
  setStudentFilter,
  // setFilter, // Not explicitly used if setStudentFilter is preferred
  studentSearchTerm,
  setStudentSearchTerm, // Destructure the correctly named prop
  isLoading,
  isFetching,
  isError,
  error,
  mockInstruments,
  onViewManageUser,
  onInitiateAssignTaskForStudent,
}) => {

  const renderUserItem = ({ item }: { item: User | SimplifiedStudent }) => { const role = activeTab === 'students' ? 'student' : activeTab === 'teachers' ? 'teacher' : 'parent'; if (role === 'student') { return ( <AdminStudentItem student={item as SimplifiedStudent} mockInstruments={mockInstruments} onViewManage={onViewManageUser} onInitiateAssignTask={onInitiateAssignTaskForStudent} /> ); } else { return ( <AdminUserItem user={item as User} onViewManage={onViewManageUser} /> ); } };
  const getErrorMessage = () => { if (!error) return 'An unknown error occurred.'; let resource = activeTab === 'students' ? 'students' : activeTab === 'teachers' ? 'teachers' : 'parents'; return `Error loading ${resource}: ${error.message}`; };

  const handleFilterChange = (filter: StudentFilter) => { if (setStudentFilter) { setStudentFilter(filter); } };

  return (
    <View>
        <View style={styles.tabContainer}>
            <Button title={`Students`} onPress={() => setActiveTab('students')} color={activeTab === 'students' ? colors.primary : colors.secondary}/>
            <Button title={`Teachers`} onPress={() => setActiveTab('teachers')} color={activeTab === 'teachers' ? colors.primary : colors.secondary}/>
            <Button title={`Parents`} onPress={() => setActiveTab('parents')} color={activeTab === 'parents' ? colors.primary : colors.secondary}/>
        </View>

        {activeTab === 'students' && studentFilter && setStudentFilter && setStudentSearchTerm && ( // Check setStudentSearchTerm exists
             <View style={styles.filterAndSearchContainer}>
                <View style={styles.filterContainer}>
                    <Text style={styles.filterLabel}>Show:</Text>
                    <Button title="Active" onPress={() => handleFilterChange('active')} color={studentFilter === 'active' ? colors.success : colors.secondary}/>
                    <Button title="Inactive" onPress={() => handleFilterChange('inactive')} color={studentFilter === 'inactive' ? colors.warning : colors.secondary}/>
                    <Button title="All" onPress={() => handleFilterChange('all')} color={studentFilter === 'all' ? colors.info : colors.secondary}/>
                </View>
                 <TextInput
                    style={styles.searchInput}
                    placeholder="Search Students by Name..."
                    placeholderTextColor={colors.textLight}
                    value={studentSearchTerm}
                    onChangeText={setStudentSearchTerm} // Use the prop directly
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
            </View>
        )}

        {activeTab !== 'students' && ( <View style={{height: 5}}/> )}

        <View style={styles.listArea}>
             {(isLoading || (isFetching && displayData.length > 0)) && ( <ActivityIndicator size="large" color={colors.primary} style={{marginVertical: 20}}/> )}
             {isError && !isLoading && ( <View style={styles.errorContainer}> <Text style={styles.errorText}>{getErrorMessage()}</Text> </View> )}
             {!isLoading && !isError && (
                 <FlatList
                    data={displayData}
                    keyExtractor={item => item.id}
                    renderItem={renderUserItem}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                    ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>{activeTab === 'students' ? 'No students match filters/search.' : activeTab === 'teachers' ? 'No teachers found.' : 'No parents found.'}</Text> )}
                    ListFooterComponent={ totalPages > 1 ? ( <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} /> ) : null }
                    contentContainerStyle={{ paddingBottom: 10 }}
                 />
             )}
        </View>
    </View>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
    tabContainer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 5, gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary, },
    filterAndSearchContainer: { paddingVertical: 5, marginBottom: 10, },
    filterContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10, },
    filterLabel: { marginRight: 10, fontSize: 14, fontWeight: 'bold', color: colors.textSecondary, },
    searchInput: { height: 40, borderColor: colors.borderPrimary, borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, fontSize: 15, backgroundColor: colors.backgroundPrimary, color: colors.textPrimary, },
    listArea: { marginTop: 10, },
    inactiveItem: { borderColor: colors.secondary, opacity: 0.7 },
    errorContainer: { marginVertical: 20, padding: 15, alignItems: 'center', backgroundColor: '#ffebee', borderColor: colors.danger, borderWidth: 1, borderRadius: 5, },
    errorText: { color: colors.danger, fontSize: 14, textAlign: 'center', },
});