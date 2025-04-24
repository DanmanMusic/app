import React from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminUsersSectionProps } from '../../types/componentProps';
import { SimplifiedStudent } from '../../types/dataTypes';
import { User, UserStatus } from '../../types/userTypes';
import PaginationControls from './PaginationControls';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminUserItem } from '../common/AdminUserItem';
import { AdminStudentItem } from '../common/AdminStudentItem';

type StudentFilter = UserStatus | 'all';

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  displayData,
  currentPage,
  totalPages,
  setPage,
  activeTab,
  setActiveTab,
  studentFilter,
  setStudentFilter,
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
  const renderUserItem = ({ item }: { item: User | SimplifiedStudent }) => {
    const role =
      activeTab === 'students' ? 'student' : activeTab === 'teachers' ? 'teacher' : 'parent';
    if (role === 'student') {
      return (
        <AdminStudentItem
          student={item as SimplifiedStudent}
          mockInstruments={mockInstruments}
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
    const resource =
      activeTab === 'students' ? 'students' : activeTab === 'teachers' ? 'teachers' : 'parents';
    return `Error loading ${resource}: ${error.message}`;
  };

  const handleFilterChange = (filter: StudentFilter) => {
    if (setStudentFilter) {
      setStudentFilter(filter);
    }
  };

  return (
    <View>
      <View style={appSharedStyles.tabContainer}>
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

      {activeTab === 'students' && studentFilter && setStudentFilter && setStudentSearchTerm && (
        <View style={appSharedStyles.filterAndSearchContainer}>
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
          <TextInput
            style={commonSharedStyles.searchInput}
            placeholder="Search Students by Name..."
            placeholderTextColor={colors.textLight}
            value={studentSearchTerm}
            onChangeText={setStudentSearchTerm}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}
      {activeTab !== 'students' && <View style={{ height: 5 }} />}
      <View style={appSharedStyles.listArea}>
        {(isLoading || (isFetching && displayData.length > 0)) && (
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
              <Text style={appSharedStyles.emptyListText}>
                {activeTab === 'students'
                  ? 'No students match filters/search.'
                  : activeTab === 'teachers'
                    ? 'No teachers found.'
                    : 'No parents found.'}
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