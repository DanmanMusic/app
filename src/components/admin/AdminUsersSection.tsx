import React from 'react';
import { View, Text, Button, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { AdminUsersSectionProps } from '../../types/componentProps';
import { SimplifiedStudent, User, UserStatus } from '../../types/dataTypes';
import { AdminUserItem } from '../common/AdminUserItem';
import { AdminStudentItem } from '../common/AdminStudentItem';
import PaginationControls from './PaginationControls';
import { usePaginatedStudents } from '../../hooks/usePaginatedStudents';
import { usePaginatedTeachers } from '../../hooks/usePaginatedTeachers';
import { usePaginatedParents } from '../../hooks/usePaginatedParents';
import { usePaginatedAdmins } from '../../hooks/usePaginatedAdmins';

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  activeTab,
  studentFilter,
  setStudentFilter,
  studentSearchTerm,
  setStudentSearchTerm,
  instruments,
  onViewManageUser,
  onInitiateAssignTaskForStudent,
}) => {
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
  } = usePaginatedStudents();

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

  const renderUserItem = ({ item }: { item: User | SimplifiedStudent }) => {
    if (activeTab === 'students') {
      return (
        <AdminStudentItem
          student={item as SimplifiedStudent}
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
    if (setStudentFilter) {
      setStudentFilter(filter);
    } else {
      console.warn('setStudentFilter handler not provided to AdminUsersSection');
    }
  };

  const handleSearchTermChange = (term: string) => {
    if (setStudentSearchTerm) {
      setStudentSearchTerm(term);
    } else {
      console.warn('setStudentSearchTerm handler not provided to AdminUsersSection');
    }
  };

  return (
    <View style={commonSharedStyles.baseMargin}>
      {activeTab === 'students' &&
        studentFilter !== undefined &&
        setStudentFilter &&
        setStudentSearchTerm && (
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
            <TextInput
              style={[commonSharedStyles.input, commonSharedStyles.baseMarginTopBottom]}
              placeholder="Search Students by Name..."
              placeholderTextColor={colors.textLight}
              value={studentSearchTerm}
              onChangeText={handleSearchTermChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

      {activeTab !== 'students' && <View style={{ height: 5 }} />}

      <View style={appSharedStyles.listArea}>
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
