// src/components/admin/AdminUsersSection.tsx
import React from 'react'; // Removed useEffect as data fetching is in hooks
import { View, Text, Button, FlatList, TextInput, ActivityIndicator } from 'react-native';

// Import shared styles
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';

// Import prop types and data types
import { AdminUsersSectionProps } from '../../types/componentProps';
import { SimplifiedStudent, User, UserRole, UserStatus } from '../../types/dataTypes'; // Import relevant types

// Import common list item components
import { AdminUserItem } from '../common/AdminUserItem';
import { AdminStudentItem } from '../common/AdminStudentItem';

// Import pagination controls
import PaginationControls from './PaginationControls';
import { usePaginatedStudents } from '../../hooks/usePaginatedStudents';
import { usePaginatedTeachers } from '../../hooks/usePaginatedTeachers';
import { usePaginatedParents } from '../../hooks/usePaginatedParents';

// Note: This component NO LONGER takes paginated data/state as props.
// It will call the specific hooks internally based on the activeTab.
// It still needs handlers passed down from AdminView for actions.

// Update Props: Remove data/pagination props, keep handlers and tab state
// Instruments are still needed for AdminStudentItem
export const AdminUsersSection: React.FC<Omit<AdminUsersSectionProps,
    'displayData' | 'currentPage' | 'totalPages' | 'setPage' |
    'isLoading' | 'isFetching' | 'isError' | 'error'
>> = ({
  activeTab,
  setActiveTab,
  studentFilter,
  setStudentFilter,
  studentSearchTerm,
  setStudentSearchTerm,
  instruments, // Keep instruments prop
  onViewManageUser,
  onInitiateAssignTaskForStudent,
  onInitiateCreateUser,
  // We'll get loading/error/data from the specific hooks below
}) => {

  // Conditionally use the appropriate hook based on the active tab
  // Note: Hooks must be called unconditionally at the top level.
  // We will use the data from the relevant hook based on activeTab later.
  const {
      students,
      currentPage: studentCurrentPage,
      totalPages: studentTotalPages,
      totalItems: studentTotalItems,
      setPage: setStudentPage,
      // Filter/Search setters are passed via props now
      isLoading: isStudentLoading,
      isFetching: isStudentFetching,
      isError: isStudentError,
      error: studentError,
  } = usePaginatedStudents(); // Always call the hook

   const {
      teachers,
      currentPage: teacherCurrentPage,
      totalPages: teacherTotalPages,
      totalItems: teacherTotalItems,
      setPage: setTeacherPage,
      isLoading: isTeacherLoading,
      isFetching: isTeacherFetching,
      isError: isTeacherError,
      error: teacherError,
  } = usePaginatedTeachers(); // Always call the hook

  const {
      parents,
      currentPage: parentCurrentPage,
      totalPages: parentTotalPages,
      totalItems: parentTotalItems,
      setPage: setParentPage,
      isLoading: isParentLoading,
      isFetching: isParentFetching,
      isError: isParentError,
      error: parentError,
  } = usePaginatedParents(); // Always call the hook


  // Determine which data and pagination state to use based on the activeTab
  let displayData: Array<User | SimplifiedStudent>;
  let currentPage: number;
  let totalPages: number;
  let totalItems: number;
  let setPage: (page: number) => void;
  let isLoading: boolean;
  let isFetching: boolean;
  let isError: boolean;
  let error: Error | null;

  switch (activeTab) {
    case 'students':
      displayData = students;
      currentPage = studentCurrentPage;
      totalPages = studentTotalPages;
      totalItems = studentTotalItems;
      setPage = setStudentPage;
      isLoading = isStudentLoading;
      isFetching = isStudentFetching;
      isError = isStudentError;
      error = studentError;
      break;
    case 'teachers':
      displayData = teachers;
      currentPage = teacherCurrentPage;
      totalPages = teacherTotalPages;
      totalItems = teacherTotalItems;
      setPage = setTeacherPage;
      isLoading = isTeacherLoading;
      isFetching = isTeacherFetching;
      isError = isTeacherError;
      error = teacherError;
      break;
    case 'parents':
      displayData = parents;
      currentPage = parentCurrentPage;
      totalPages = parentTotalPages;
      totalItems = parentTotalItems;
      setPage = setParentPage;
      isLoading = isParentLoading;
      isFetching = isParentFetching;
      isError = isParentError;
      error = parentError;
      break;
    default: // Should not happen
      displayData = [];
      currentPage = 1;
      totalPages = 1;
      totalItems = 0;
      setPage = () => {};
      isLoading = false;
      isFetching = false;
      isError = false;
      error = null;
  }


  // Render function for FlatList items
  const renderUserItem = ({ item }: { item: User | SimplifiedStudent }) => {
    // Determine role based on activeTab for rendering correct item component
    if (activeTab === 'students') {
      return (
        <AdminStudentItem
          student={item as SimplifiedStudent}
          instruments={instruments} // Pass instruments down
          onViewManage={onViewManageUser} // Pass handler down
          onInitiateAssignTask={onInitiateAssignTaskForStudent} // Pass handler down
        />
      );
    } else {
      // Teachers and Parents use AdminUserItem
      return (
         <AdminUserItem
            user={item as User}
            onViewManage={onViewManageUser} // Pass handler down
         />
      );
    }
  };

  // Error message helper
  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    const resource = activeTab; // students, teachers, parents
    return `Error loading ${resource}: ${error.message}`;
  };

  // Handler for student filter change (passed down from AdminView)
  const handleFilterChange = (filter: UserStatus | 'all') => {
    if (setStudentFilter) {
      setStudentFilter(filter);
    }
  };

  // Handler for student search term change (passed down from AdminView)
  const handleSearchTermChange = (term: string) => {
      if (setStudentSearchTerm) {
          setStudentSearchTerm(term);
      }
  };


  return (
    <View>
      {/* Tab Buttons */}
      <View style={appSharedStyles.tabContainer}>
        {/* Simplified Tab Buttons */}
        <Button
          title={`Students (${studentTotalItems})`} // Show count
          onPress={() => setActiveTab('students')}
          color={activeTab === 'students' ? colors.primary : colors.secondary}
        />
        <Button
          title={`Teachers (${teacherTotalItems})`} // Show count
          onPress={() => setActiveTab('teachers')}
          color={activeTab === 'teachers' ? colors.primary : colors.secondary}
        />
        <Button
          title={`Parents (${parentTotalItems})`} // Show count
          onPress={() => setActiveTab('parents')}
          color={activeTab === 'parents' ? colors.primary : colors.secondary}
        />
        {/* Create User button remains */}
        <Button
            title="Create User"
            onPress={onInitiateCreateUser}
            // Disable while any list is initially loading? Optional.
            // disabled={isStudentLoading || isTeacherLoading || isParentLoading}
         />
      </View>

      {/* Student Filters & Search (Conditional) */}
      {activeTab === 'students' && studentFilter !== undefined && setStudentFilter && setStudentSearchTerm && (
        <View style={appSharedStyles.filterAndSearchContainer}>
          {/* Filter Buttons */}
          <View style={appSharedStyles.filterContainer}>
            <Text style={appSharedStyles.filterLabel}>Show:</Text>
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
            style={commonSharedStyles.searchInput}
            placeholder="Search Students by Name..."
            placeholderTextColor={colors.textLight}
            value={studentSearchTerm}
            onChangeText={handleSearchTermChange} // Use handler
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}
      {/* Spacer if not showing student filters */}
      {activeTab !== 'students' && <View style={{ height: 5 }} />}

      {/* List Area */}
      <View style={appSharedStyles.listArea}>
        {/* Loading Indicator: Show if initial load OR fetching subsequent pages */}
        {(isLoading || isFetching) && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        )}

        {/* Error Display */}
        {isError && !isLoading && ( // Show error only if not also loading initially
          <View style={commonSharedStyles.errorContainer}>
            <Text style={commonSharedStyles.errorText}>{getErrorMessage()}</Text>
          </View>
        )}

        {/* User List */}
        {!isLoading && !isError && (
          <FlatList
            data={displayData}
            keyExtractor={item => item.id} // Use item ID as key
            renderItem={renderUserItem} // Use the conditional render function
            scrollEnabled={false} // Assuming parent ScrollView
            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
            ListEmptyComponent={() => (
              <Text style={appSharedStyles.emptyListText}>
                {activeTab === 'students'
                  ? 'No students match filters/search.'
                  : activeTab === 'teachers'
                    ? 'No teachers found.'
                    : 'No parents found.'}
              </Text>
            )}
            // Conditional Pagination Controls
            ListFooterComponent={
              totalPages > 1 ? (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage} // Use the correct setter for the active tab
                />
              ) : null // No controls if only one page
            }
            contentContainerStyle={{ paddingBottom: 10 }} // Padding at list bottom
          />
        )}
      </View>
    </View>
  );
};