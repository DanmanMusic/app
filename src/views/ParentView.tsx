import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueries, UseQueryResult } from '@tanstack/react-query';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { fetchUserProfile } from '../api/users';

import { StudentView } from './StudentView';
import { ParentStudentListItem } from '../components/common/ParentStudentListItem';
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';

import { User } from '../types/dataTypes';
import { getUserDisplayName } from '../utils/helpers';
import { appSharedStyles } from '../styles/appSharedStyles';
import { commonSharedStyles } from '../styles/commonSharedStyles';
import { colors } from '../styles/colors';

export const ParentView = () => {
  const { currentUserId: parentUserId } = useAuth();

  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const [isSetCredentialsModalVisible, setIsSetCredentialsModalVisible] = useState(false);

  const {
    data: parentUser,
    isLoading: isLoadingParent,
    isError: isErrorParent,
    error: errorParent,
  } = useQuery<User | null, Error>({
    queryKey: ['userProfile', parentUserId],
    queryFn: () => fetchUserProfile(parentUserId!),
    enabled: !!parentUserId,
    staleTime: 15 * 60 * 1000,
  });

  const linkedStudentIds = useMemo(() => parentUser?.linkedStudentIds || [], [parentUser]);

  const linkedStudentsQueriesResults: UseQueryResult<User | null, Error>[] = useQueries({
    queries: linkedStudentIds.map(id => ({
      queryKey: ['userProfile', id],
      queryFn: () => fetchUserProfile(id),
      enabled: !!parentUser,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  const linkedStudents: User[] = useMemo(
    () =>
      linkedStudentsQueriesResults

        .filter(result => result.isSuccess && result.data && result.data.role === 'student')
        .map(result => result.data as User),
    [linkedStudentsQueriesResults]
  );

  const isLoadingStudents = useMemo(
    () => linkedStudentsQueriesResults.some(result => result.isLoading || result.isFetching),
    [linkedStudentsQueriesResults]
  );
  const isErrorStudents = useMemo(
    () => linkedStudentsQueriesResults.some(result => result.isError),
    [linkedStudentsQueriesResults]
  );

  const hasMultipleStudents = linkedStudents.length > 1;

  useEffect(() => {
    if (
      !isLoadingParent &&
      !isLoadingStudents &&
      !viewingStudentId &&
      linkedStudents.length === 1
    ) {
      console.log('[ParentView] Auto-selecting single student:', linkedStudents[0].id);
      setViewingStudentId(linkedStudents[0].id);
    }

    if (
      viewingStudentId &&
      !isLoadingParent &&
      parentUser &&
      !parentUser.linkedStudentIds?.includes(viewingStudentId)
    ) {
      console.log('[ParentView] Viewed student no longer linked, resetting view.');
      setViewingStudentId(null);
    }
  }, [isLoadingParent, isLoadingStudents, viewingStudentId, linkedStudents, parentUser]);

  if (isLoadingParent) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text>Loading Parent Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isErrorParent || !parentUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.containerBase}>
          <Text style={commonSharedStyles.errorText}>
            Error loading parent data: {errorParent?.message || 'Parent not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (parentUser.role !== 'parent') {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.containerBase}>
          <Text style={commonSharedStyles.errorText}>Error: Logged in user is not a parent.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (viewingStudentId) {
    const studentToView = linkedStudents.find(s => s.id === viewingStudentId);

    let specificQueryResult: UseQueryResult<User | null, Error> | undefined;
    const studentIndex = linkedStudentIds.indexOf(viewingStudentId);
    if (studentIndex !== -1 && studentIndex < linkedStudentsQueriesResults.length) {
      specificQueryResult = linkedStudentsQueriesResults[studentIndex];
    }

    if (!studentToView) {
      if (specificQueryResult?.isLoading || specificQueryResult?.isFetching) {
        return (
          <SafeAreaView style={appSharedStyles.safeArea}>
            <View style={appSharedStyles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text>Loading Student Details...</Text>
              <Button title="Back to Students" onPress={() => setViewingStudentId(null)} />
            </View>
          </SafeAreaView>
        );
      }

      const specificErrorMsg =
        specificQueryResult?.error instanceof Error
          ? specificQueryResult.error.message
          : 'Selected student data could not be loaded or is no longer linked.';

      return (
        <SafeAreaView style={appSharedStyles.safeArea}>
          <View style={appSharedStyles.containerBase}>
            <Text style={commonSharedStyles.errorText}>Error: {specificErrorMsg}</Text>
            <Button title="Back to Students" onPress={() => setViewingStudentId(null)} />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.parentHeader}>
          <Text style={appSharedStyles.parentHeaderText} numberOfLines={1} ellipsizeMode="tail">
            Viewing: {getUserDisplayName(studentToView)}
          </Text>
          {hasMultipleStudents && (
            <Button title="Select Student" onPress={() => setViewingStudentId(null)} />
          )}
        </View>
        <StudentView studentIdToView={viewingStudentId} />
        <SetEmailPasswordModal
          visible={isSetCredentialsModalVisible}
          onClose={() => setIsSetCredentialsModalVisible(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.containerBase}>
        <View style={appSharedStyles.parentHeader}>
          <Text style={appSharedStyles.parentHeaderText} numberOfLines={1} ellipsizeMode="tail">
            Parent: {getUserDisplayName(parentUser)}
          </Text>
          <Button
            title="Set Login"
            onPress={() => setIsSetCredentialsModalVisible(true)}
            color={colors.info}
          />
        </View>

        <Text style={appSharedStyles.sectionTitle}>Your Students</Text>
        {isLoadingStudents && (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        )}
        {isErrorStudents && !isLoadingStudents && (
          <Text style={commonSharedStyles.errorText}>Error loading student details.</Text>
        )}
        {!isLoadingStudents && !isErrorStudents && linkedStudents.length > 0 ? (
          <FlatList
            data={linkedStudents.sort((a, b) =>
              getUserDisplayName(a).localeCompare(getUserDisplayName(b))
            )}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ParentStudentListItem student={item} onSelectStudent={setViewingStudentId} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        ) : !isLoadingStudents && !isErrorStudents && linkedStudents.length === 0 ? (
          <Text style={appSharedStyles.emptyListText}>No students linked to your account.</Text>
        ) : null}

        <View style={{ marginTop: 20 }}>
          <Button
            title="Link Another Student (Mock QR)"
            onPress={() => alert('Simulate scanning QR code... Needs implementation.')}
            disabled={isLoadingStudents || isLoadingParent}
          />
        </View>
      </View>
      <SetEmailPasswordModal
        visible={isSetCredentialsModalVisible}
        onClose={() => setIsSetCredentialsModalVisible(false)}
      />
    </SafeAreaView>
  );
};
