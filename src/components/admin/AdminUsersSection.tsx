// src/components/admin/AdminUsersSection.tsx
import React from 'react'; // No longer needs { useState }
import { View, Text, Button, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { AdminUsersSectionProps } from '../../types/componentProps'; // Assumes type is updated
import { SimplifiedStudent, User, UserStatus } from '../../types/dataTypes';
import { AdminUserItem } from '../common/AdminUserItem';
import { AdminStudentItem } from '../common/AdminStudentItem';
import PaginationControls from './PaginationControls';
import { usePaginatedStudents } from '../../hooks/usePaginatedStudents';
import { usePaginatedTeachers } from '../../hooks/usePaginatedTeachers';
import { usePaginatedParents } from '../../hooks/usePaginatedParents';
import { usePaginatedAdmins } from '../../hooks/usePaginatedAdmins';
import { capitalizeFirstLetter } from '../../utils/helpers';

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  activeTab,
  instruments, // Keep instruments prop
  onViewManageUser,
  onInitiateAssignTaskForStudent,
  // REMOVED filter/search props
}) => {
  // Get ALL state and setters needed for students from the hook
  const {
    students,
    currentPage: studentCurrentPage,
    totalPages: studentTotalPages,
    totalItems: studentTotalItems,
    setPage: setStudentPage,
    isLoading: isStudentLoading,
    isFetching: isStudentFetching,
    isError: isStudentError,
    error: studentError,
    currentFilter: studentFilterState, // State for filter
    setFilter: setStudentFilterState, // Setter for filter
    searchTerm: studentSearchTermState, // State for search
    setSearchTerm: setStudentSearchTermState, // Setter for search
  } = usePaginatedStudents();

  // Other hooks remain the same
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
  } = usePaginatedTeachers();

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
  } = usePaginatedParents();

  const {
    admins,
    currentPage: adminCurrentPage,
    totalPages: adminTotalPages,
    totalItems: adminTotalItems,
    setPage: setAdminPage,
    isLoading: isAdminLoading,
    isFetching: isAdminFetching,
    isError: isAdminError,
    error: adminError,
  } = usePaginatedAdmins();

  // Switch logic remains the same
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
    case 'admins':
      displayData = admins;
      currentPage = adminCurrentPage;
      totalPages = adminTotalPages;
      totalItems = adminTotalItems;
      setPage = setAdminPage;
      isLoading = isAdminLoading;
      isFetching = isAdminFetching;
      isError = isAdminError;
      error = adminError;
      break;
    default:
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

  // renderUserItem remains the same
  const renderUserItem = ({ item }: { item: User | SimplifiedStudent }) => {
    if (activeTab === 'students') {
      return (
        <AdminStudentItem
          student={item as SimplifiedStudent}
          instruments={instruments} // Pass instruments prop down
          onViewManage={onViewManageUser}
          onInitiateAssignTask={onInitiateAssignTaskForStudent}
        />
      );
    } else {
      return <AdminUserItem user={item as User} onViewManage={onViewManageUser} />;
    }
  };

  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    const resource = activeTab;
    return `Error loading ${resource}: ${error.message}`;
  };

  // Handlers now use setters directly from the student hook
  const handleFilterChange = (filter: UserStatus | 'all') => {
    setStudentFilterState(filter);
  };

  const handleSearchTermChange = (term: string) => {
    setStudentSearchTermState(term);
  };

  return (
    <View style={commonSharedStyles.baseMargin}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
        <Text
          style={[
            commonSharedStyles.baseTitleText,
            commonSharedStyles.baseMarginTopBottom,
            commonSharedStyles.bold,
          ]}
        >
          {capitalizeFirstLetter(activeTab)}
        </Text>
      </View>
      {activeTab === 'students' && (
        <View>
          <View
            style={[
              commonSharedStyles.baseRow,
              commonSharedStyles.justifyCenter,
              commonSharedStyles.baseGap,
            ]}
          >
            <Text
              style={[
                commonSharedStyles.baseSecondaryText,
                commonSharedStyles.bold,
                commonSharedStyles.baseSelfAlignCenter,
              ]}
            >
              Show:
            </Text>
            {/* Buttons use state from hook and call internal handler */}
            <Button
              title="Active"
              onPress={() => handleFilterChange('active')}
              color={studentFilterState === 'active' ? colors.success : colors.secondary}
            />
            <Button
              title="Inactive"
              onPress={() => handleFilterChange('inactive')}
              color={studentFilterState === 'inactive' ? colors.warning : colors.secondary}
            />
            <Button
              title="All"
              onPress={() => handleFilterChange('all')}
              color={studentFilterState === 'all' ? colors.info : colors.secondary}
            />
          </View>
          {/* Input uses state from hook and calls internal handler */}
          <TextInput
            style={[commonSharedStyles.input, commonSharedStyles.baseMarginTopBottom]}
            placeholder="Search Students by Name..."
            placeholderTextColor={colors.textLight}
            value={studentSearchTermState}
            onChangeText={handleSearchTermChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {activeTab !== 'students' && <View style={{ height: 5 }} />}

      {/* List rendering area remains the same */}
      <View style={commonSharedStyles.listArea}>
        {(isLoading || isFetching) && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        )}
        {isError && !isLoading && (
          <View style={commonSharedStyles.errorContainer}>
            <Text style={commonSharedStyles.errorText}>{getErrorMessage()}</Text>
          </View>
        )}
        {!isLoading && !isError && (
          <FlatList
            data={displayData}
            keyExtractor={item => item.id}
            renderItem={renderUserItem}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
            ListEmptyComponent={() => (
              <Text style={commonSharedStyles.baseEmptyText}>
                {activeTab === 'students'
                  ? 'No students match filters/search.'
                  : activeTab === 'teachers'
                    ? 'No teachers found.'
                    : activeTab === 'parents'
                      ? 'No parents found.'
                      : 'No admins found.'}
              </Text>
            )}
            ListFooterComponent={
              totalPages > 1 ? (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
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
