// src/components/admin/AdminTeacherDetailView.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

// Import Supabase-backed API functions
import { fetchStudents, fetchUserProfile } from '../../api/users';

// Import Types and Props
import { User, SimplifiedStudent } from '../../types/dataTypes';

// Import Styles and Helpers
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';
import { getUserDisplayName } from '../../utils/helpers';
import { AdminTeacherDetailViewProps } from '../../types/componentProps';

export const AdminTeacherDetailView: React.FC<AdminTeacherDetailViewProps> = ({
  viewingUserId,
  onInitiateEditUser,
  onInitiateStatusUser,
  onViewStudentProfile,
  onInitiatePinGeneration, // Receive PIN handler
}) => {

  // --- Data Fetching ---
  const {
    data: teacher,
    isLoading: teacherLoading,
    isError: teacherError,
    error: teacherErrorMsg,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', viewingUserId],
    queryFn: () => fetchUserProfile(viewingUserId),
    enabled: !!viewingUserId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: linkedStudentsResult,
    isLoading: isLoadingLinkedStudents,
    isError: isErrorLinkedStudents,
    error: errorLinkedStudents,
  } = useQuery({
    queryKey: ['students', { teacherId: viewingUserId, filter: 'all', context: 'teacherDetailView' }],
    queryFn: () => fetchStudents({
        teacherId: viewingUserId,
        filter: 'all',
        limit: 9999,
        page: 1,
      }),
    enabled: !!teacher,
    staleTime: 5 * 60 * 1000,
  });

  const linkedStudents: SimplifiedStudent[] = useMemo(() => {
      return linkedStudentsResult?.students ?? [];
  }, [linkedStudentsResult]);


  // --- Memos ---
  const teacherDisplayName = useMemo(() => teacher ? getUserDisplayName(teacher) : 'Loading...', [teacher]);
  const isTeacherActive = useMemo(() => teacher?.status === 'active', [teacher]);


  // --- Event Handlers ---
  const handleEdit = () => {
    if (teacher) onInitiateEditUser(teacher);
  };
  const handleStatus = () => {
    if (teacher) onInitiateStatusUser(teacher);
  };
  const handlePinGenerationClick = () => { // Handler for the new button
      if (teacher && onInitiatePinGeneration) {
          onInitiatePinGeneration(teacher);
      }
  };


  // --- Loading & Error States ---
  if (teacherLoading) {
    return (
      <View style={[styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading Teacher Details...</Text>
      </View>
    );
  }

  if (teacherError || !teacher) {
    return (
      <View style={appSharedStyles.container}>
        <Text style={commonSharedStyles.errorText}>
          Error loading teacher details: {teacherErrorMsg?.message || 'Teacher not found.'}
        </Text>
      </View>
    );
  }
   if (teacher.role !== 'teacher') {
       return (
          <View style={appSharedStyles.container}>
             <Text style={commonSharedStyles.errorText}>Error: User found but is not a teacher.</Text>
          </View>
        );
   }


  // --- Render Logic ---
  return (
    <ScrollView style={appSharedStyles.container}>
      {/* Teacher Details Section */}
      <Text style={appSharedStyles.sectionTitle}>Teacher Details</Text>
      <Text style={appSharedStyles.itemDetailText}>Name: {teacherDisplayName}</Text>
      <Text style={appSharedStyles.itemDetailText}>ID: {teacher.id}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Status:{' '}
        <Text style={isTeacherActive ? styles.activeStatus : styles.inactiveStatus}>
          {teacher.status}
        </Text>
      </Text>

      {/* Action Buttons */}
      <View style={[adminSharedStyles.adminStudentActions, commonSharedStyles.actionButtonsContainer]}>
        <Button title="Edit Info" onPress={handleEdit} color={colors.warning} />
        <Button title="Manage Status" onPress={handleStatus} color={colors.secondary} />
        {/* Add PIN generation button */}
        {onInitiatePinGeneration && (
            <Button
                title="Login (PIN)"
                onPress={handlePinGenerationClick}
                color={colors.info}
                disabled={!isTeacherActive} // Only for active teachers
            />
        )}
      </View>

      {/* Linked Students Section */}
      <Text style={appSharedStyles.sectionTitle}>Linked Students ({linkedStudents.length})</Text>
      {isLoadingLinkedStudents && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
      )}
      {isErrorLinkedStudents && (
        <Text style={commonSharedStyles.errorText}>
          Error loading linked students: {errorLinkedStudents?.message}
        </Text>
      )}
      {!isLoadingLinkedStudents && !isErrorLinkedStudents && (
        <FlatList
          data={linkedStudents.sort((a, b) => a.name.localeCompare(b.name))}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[appSharedStyles.itemContainer, styles.linkedStudentItem]}>
              <Text style={appSharedStyles.itemTitle}>{item.name}</Text>
              <Text style={appSharedStyles.itemDetailText}>
                Status: <Text style={item.isActive ? styles.activeStatus : styles.inactiveStatus}>{item.isActive ? 'Active' : 'Inactive'}</Text>
              </Text>
              <View style={styles.linkedStudentActions}>
                <Button title="View Profile" onPress={() => onViewStudentProfile(item.id)} />
              </View>
            </View>
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={() => (
             <Text style={appSharedStyles.emptyListText}>No students currently linked to this teacher.</Text>
          )}
        />
      )}
       <View style={{ height: 30 }} />
    </ScrollView>
  );
};

// Local Styles
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20, // Add padding if used as top-level view in error/loading
  },
   activeStatus: {
        fontWeight: 'bold',
        color: colors.success,
    },
    inactiveStatus: {
         fontWeight: 'bold',
         color: colors.secondary,
    },
  linkedStudentItem: {
    backgroundColor: colors.backgroundSecondary,
  },
  linkedStudentActions: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
});