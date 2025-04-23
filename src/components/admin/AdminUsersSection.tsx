import React from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';

// Import types
import { SimplifiedStudent } from '../../types/dataTypes';
import { UserRole, User, UserStatus } from '../../types/userTypes';
import { Instrument } from '../../mocks/mockInstruments';

// Import utils and styles
import { getInstrumentNames, getUserDisplayName } from '../../utils/helpers';
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// Import common components
import PaginationControls from './PaginationControls';

// Define filter/tab types used locally
type UserTab = 'students' | 'teachers' | 'parents';
type StudentFilter = UserStatus | 'all';


// Define the props the component expects
interface AdminUsersSectionProps {
  // Data & State (passed down from AdminView's TQ hooks)
  displayData: Array<User | SimplifiedStudent>; // The actual list to render
  currentPage: number;                           // Current page from pagination hook
  totalPages: number;                            // Total pages from pagination hook
  isLoading: boolean;                            // Loading state from TQ query
  isFetching?: boolean;                           // Fetching state from TQ query (optional)
  isError: boolean;                              // Error state from TQ query
  error: Error | null;                           // Error object from TQ query
  mockInstruments: Instrument[];                 // Instrument list from TQ query in AdminView

  // UI State & Setters (managed in AdminView)
  activeTab: UserTab;                            // Which tab is selected (students/teachers/parents)
  setActiveTab: (tab: UserTab) => void;          // Function to change the active tab

  // Pagination & Filtering Setters (passed down from AdminView's TQ hooks)
  setPage: (page: number) => void;               // Function to change the page
  studentFilter?: StudentFilter;                 // Current student filter state (active/inactive/all)
  setStudentFilter?: (filter: StudentFilter) => void; // Function to set the student filter
  // setFilter?: (filter: UserStatus | 'all') => void; // <<< NOTE: This seems redundant if setStudentFilter is used
  studentSearchTerm?: string;                    // Current student search term
  setStudentSearchTerm?: (term: string) => void; // Function to set the search term

  // Action Callbacks (passed down from AdminView)
  onViewManageUser: (userId: string, role: UserRole) => void; // Callback when 'View/Edit' is pressed
  onInitiateAssignTaskForStudent: (studentId: string) => void; // Callback when 'Assign Task' is pressed
}

// Component for rendering a generic User item (Teacher/Parent/Admin)
const AdminUserItem = ({
  user,
  onViewManage,
}: {
  user: User;
  onViewManage: (userId: string, role: UserRole) => void;
}) => (
  // Apply inactive styling if needed
  <View
    style={[appSharedStyles.itemContainer, user.status === 'inactive' ? styles.inactiveItem : {}]}
  >
    <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(user)}</Text>
    <Text
      style={[
        appSharedStyles.itemDetailText,
        { fontWeight: 'bold', color: user.status === 'active' ? colors.success : colors.secondary },
      ]}
    >
      Status: {user.status}
    </Text>
    {/* Display linked student count for parents */}
    {user.role === 'parent' && user.linkedStudentIds && (
      <Text style={appSharedStyles.itemDetailText}>
        Linked Students: {user.linkedStudentIds.length}
      </Text>
    )}
    {/* Action button */}
    <View style={adminSharedStyles.itemActions}>
      <Button title="View/Edit Details" onPress={() => onViewManage(user.id, user.role)} />
    </View>
  </View>
);

// Component for rendering a Student item
const AdminStudentItem = ({
  student,
  mockInstruments,
  onViewManage,
  onInitiateAssignTask,
}: {
  student: SimplifiedStudent; // Uses the simplified type
  mockInstruments: Instrument[];
  onViewManage: (studentId: string, role: UserRole) => void;
  onInitiateAssignTask: (studentId: string) => void;
}) => {
  console.log('[AdminStudentItem] Received student prop:', JSON.stringify(student, null, 2)); // Log the received prop
  return (
  // Apply inactive styling if needed
  <View style={[appSharedStyles.itemContainer, !student.isActive ? styles.inactiveItem : {}]}>
    <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
    <Text style={appSharedStyles.itemDetailText}>
      Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}
    </Text>
    <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
      Balance: {student.balance}
    </Text>
    <Text
      style={[
        appSharedStyles.itemDetailText,
        { fontWeight: 'bold', color: student.isActive ? colors.success : colors.secondary },
      ]}
    >
      Status: {student.isActive ? 'Active' : 'Inactive'}
    </Text>
    {/* Action buttons */}
    <View style={adminSharedStyles.itemActions}>
      <Button title="View Details" onPress={() => { 
        console.log(`[AdminStudentItem] Button Press - student.id: ${student?.id}`);
        onViewManage(student.id, 'student')}}/>
      {/* Only show Assign Task button for active students */}
      {student.isActive && (
        <Button title="Assign Task" onPress={() => onInitiateAssignTask(student.id)} />
      )}
    </View>
  </View>
)};

// The main AdminUsersSection component
export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  // Destructure all expected props
  displayData,
  currentPage,
  totalPages,
  setPage,
  activeTab,
  setActiveTab,
  studentFilter,
  setStudentFilter,
  // setFilter, // Commented out the seemingly redundant prop
  studentSearchTerm,
  setStudentSearchTerm,
  isLoading,
  isFetching,
  isError,
  error,
  mockInstruments,
  onViewManageUser,
  onInitiateAssignTaskForStudent,
}) => {

  // Function to render the correct item component based on the active tab
  const renderUserItem = ({ item }: { item: User | SimplifiedStudent }) => {
    console.log('[AdminUsersSection] Rendering item:', JSON.stringify(item)); // Log the whole item
    const role =
      activeTab === 'students' ? 'student' : activeTab === 'teachers' ? 'teacher' : 'parent';
    if (role === 'student') {
      // Render student item, passing necessary props/callbacks
      return (
        <AdminStudentItem
          student={item as SimplifiedStudent}
          mockInstruments={mockInstruments}
          onViewManage={onViewManageUser}
          onInitiateAssignTask={onInitiateAssignTaskForStudent}
        />
      );
    } else {
      // Render generic user item (teacher/parent), passing necessary props/callbacks
      return <AdminUserItem user={item as User} onViewManage={onViewManageUser} />;
    }
  };

  // Helper function to format error messages
  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    let resource =
      activeTab === 'students' ? 'students' : activeTab === 'teachers' ? 'teachers' : 'parents';
    return `Error loading ${resource}: ${error.message}`;
  };

  // Handler for filter change (ensures the correct setter is called)
  const handleFilterChange = (filter: StudentFilter) => {
    if (setStudentFilter) {
      setStudentFilter(filter);
    }
  };

  return (
    <View>
      {/* Tab Navigation Buttons */}
      <View style={styles.tabContainer}>
        <Button
          title={`Students`}
          onPress={() => setActiveTab('students')}
          color={activeTab === 'students' ? colors.primary : colors.secondary}
        />
        <Button
          title={`Teachers`}
          onPress={() => setActiveTab('teachers')}
          color={activeTab === 'teachers' ? colors.primary : colors.secondary}
        />
        <Button
          title={`Parents`}
          onPress={() => setActiveTab('parents')}
          color={activeTab === 'parents' ? colors.primary : colors.secondary}
        />
      </View>

      {/* Student Filter and Search Section (only shown for 'students' tab) */}
      {activeTab === 'students' &&
        studentFilter &&
        setStudentFilter &&
        setStudentSearchTerm && (
          <View style={styles.filterAndSearchContainer}>
            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Show:</Text>
              <Button
                title="Active"
                onPress={() => handleFilterChange('active')}
                color={studentFilter === 'active' ? colors.success : colors.secondary}
              />
              <Button
                title="Inactive"
                onPress={() => handleFilterChange('inactive')}
                color={studentFilter === 'inactive' ? colors.warning : colors.secondary}
              />
              <Button
                title="All"
                onPress={() => handleFilterChange('all')}
                color={studentFilter === 'all' ? colors.info : colors.secondary}
              />
            </View>
            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search Students by Name..."
              placeholderTextColor={colors.textLight}
              value={studentSearchTerm}
              onChangeText={setStudentSearchTerm} // Use the setter prop
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

      {/* Spacer for non-student tabs */}
      {activeTab !== 'students' && <View style={{ height: 5 }} />}

      {/* Main List Area */}
      <View style={styles.listArea}>
        {/* Loading Indicator: Show if isLoading OR if fetching subsequent pages */}
        {(isLoading || (isFetching && displayData.length > 0)) && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        )}
        {/* Error Display */}
        {isError && !isLoading && ( // Only show error if not initially loading
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{getErrorMessage()}</Text>
          </View>
        )}
        {/* List Display: Show only if NOT initially loading and NO error */}
        {!isLoading && !isError && (
          <FlatList
            data={displayData} // Use the data passed via props
            keyExtractor={item => item.id}
            renderItem={renderUserItem} // Use the item renderer function
            scrollEnabled={false} // Typically disable scroll if parent is ScrollView
            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
            ListEmptyComponent={() => ( // Message for empty list/filters
              <Text style={appSharedStyles.emptyListText}>
                {activeTab === 'students'
                  ? 'No students match filters/search.'
                  : activeTab === 'teachers'
                    ? 'No teachers found.'
                    : 'No parents found.'}
              </Text>
            )}
            // Pagination controls shown only if needed
            ListFooterComponent={
              totalPages > 1 ? (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage} // Use the page change handler prop
                />
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        )}
      </View>
    </View>
  );
};

// Styles for the component
const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 5,
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSecondary,
  },
  filterAndSearchContainer: { paddingVertical: 5, marginBottom: 10 },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  filterLabel: { marginRight: 10, fontSize: 14, fontWeight: 'bold', color: colors.textSecondary },
  searchInput: {
    height: 40,
    borderColor: colors.borderPrimary,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 15,
    backgroundColor: colors.backgroundPrimary,
    color: colors.textPrimary,
  },
  listArea: { marginTop: 10 },
  inactiveItem: { borderColor: colors.secondary, opacity: 0.7 }, // Style for inactive users
  errorContainer: {
    marginVertical: 20,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 5,
  },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});