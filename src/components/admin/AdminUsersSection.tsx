// src/components/admin/AdminUsersSection.tsx
import React from 'react';
import { View, Text, Button, FlatList, TextInput, ActivityIndicator } from 'react-native';

import { usePaginatedStudentsWithStats } from '../../hooks/usePaginatedStudentsWithStats'; // NEW
import { usePaginatedAdmins } from '../../hooks/usePaginatedAdmins';
import { usePaginatedParents } from '../../hooks/usePaginatedParents';
import { usePaginatedTeachers } from '../../hooks/usePaginatedTeachers';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminUsersSectionProps } from '../../types/componentProps';
import { User, UserStatus } from '../../types/dataTypes';
import { capitalizeFirstLetter } from '../../utils/helpers';
import { AdminStudentItem } from '../common/AdminStudentItem';
import { AdminUserItem } from '../common/AdminUserItem';
import PaginationControls from './PaginationControls';

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  activeTab,
  instruments,
  onViewManageUser,
  onInitiateAssignTaskForStudent,
}) => {
  // Use the new hook for the 'students' tab
  const {
    students,
    currentPage: studentCurrentPage,
    totalPages: studentTotalPages,
    setPage: setStudentPage,
    isLoading: isStudentLoading,
    isFetching: isStudentFetching,
    isError: isStudentError,
    error: studentError,
    currentFilter: studentFilterState,
    setFilter: setStudentFilterState,
    searchTerm: studentSearchTermState,
    setSearchTerm: setStudentSearchTermState,
  } = usePaginatedStudentsWithStats({});

  // Keep the old hooks for other user types
  const {
    teachers,
    currentPage: teacherCurrentPage,
    totalPages: teacherTotalPages,
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
    setPage: setAdminPage,
    isLoading: isAdminLoading,
    isFetching: isAdminFetching,
    isError: isAdminError,
    error: adminError,
  } = usePaginatedAdmins();

  // The logic to switch between data sources remains largely the same
  let displayData: any[];
  let currentPage: number;
  let totalPages: number;
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
      setPage = () => {};
      isLoading = false;
      isFetching = false;
      isError = false;
      error = null;
  }

  const renderUserItem = ({ item }: { item: any }) => {
    if (activeTab === 'students') {
      return (
        <AdminStudentItem
          student={item} // Pass the item with stats directly
          instruments={instruments}
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
