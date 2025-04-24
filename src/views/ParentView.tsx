import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { appSharedStyles } from '../styles/appSharedStyles';
import { colors } from '../styles/colors';
import { ParentViewProps } from '../types/componentProps';
import { User } from '../types/userTypes';
import { getUserDisplayName } from '../utils/helpers';
import { StudentView } from './StudentView';
import { ParentStudentListItem } from '../components/common/ParentStudentListItem';

export const ParentView: React.FC<ParentViewProps> = () => {
  const { currentUserId } = useAuth();
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const {
    data: parentUser,
    isLoading: isLoadingParent,
    isError: isErrorParent,
    error: errorParent,
  } = useQuery<User, Error>({
    queryKey: ['user', currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error('No logged in parent user ID');

      const response = await fetch(`/api/users/${currentUserId}`);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error fetching parent:', errorBody);
        throw new Error(`Failed to fetch parent data (status ${response.status})`);
      }
      const userData = await response.json();
      if (userData.role !== 'parent') throw new Error('Logged in user is not a parent');
      return userData;
    },
    enabled: !!currentUserId,
    staleTime: 15 * 60 * 1000,
  });

  const linkedStudentIds = useMemo(() => parentUser?.linkedStudentIds || [], [parentUser]);

  const linkedStudentsQueriesResults = useQueries({
    queries: linkedStudentIds.map(id => ({
      queryKey: ['user', id],
      queryFn: async () => {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) {
          console.error(`Failed to fetch linked student ${id}, status: ${response.status}`);

          return null;
        }
        const studentData = await response.json();

        return studentData?.role === 'student' ? (studentData as User) : null;
      },
      enabled: !!parentUser,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const linkedStudents: User[] = useMemo(
    () =>
      linkedStudentsQueriesResults
        .map(result => result.data)
        .filter((student): student is User => !!student),
    [linkedStudentsQueriesResults]
  );

  const isLoadingStudents = useMemo(
    () => linkedStudentsQueriesResults.some(result => result.isLoading),
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

  if (isLoadingParent || (linkedStudentIds.length > 0 && isLoadingStudents)) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isErrorParent || !parentUser) {
    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.container}>
          <Text style={appSharedStyles.textDanger}>
            Error: Could not load parent data. {errorParent?.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (viewingStudentId) {
    const studentToView = linkedStudents.find(s => s.id === viewingStudentId);

    if (!studentToView) {
      return (
        <SafeAreaView style={appSharedStyles.safeArea}>
          <View style={appSharedStyles.container}>
            <Text style={appSharedStyles.textDanger}>
              Error: Selected student data could not be loaded or is no longer linked.
            </Text>
            <Button title="Back to Students" onPress={() => setViewingStudentId(null)} />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={appSharedStyles.safeArea}>
        <View style={appSharedStyles.parentHeader}>
          <Text style={appSharedStyles.parentHeaderText}>
            Viewing: {getUserDisplayName(studentToView)}
          </Text>
          {hasMultipleStudents && (
            <Button title="Select Student" onPress={() => setViewingStudentId(null)} />
          )}
        </View>
        <StudentView studentIdToView={viewingStudentId} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.container}>
        <Text style={appSharedStyles.header}>Parent Dashboard</Text>
        <Text style={appSharedStyles.sectionTitle}>Your Students</Text>

        {isErrorStudents && (
          <Text style={appSharedStyles.textDanger}>Error loading some student details.</Text>
        )}

        {!isErrorStudents && linkedStudents.length > 0 ? (
          <FlatList
            data={linkedStudents.sort((a, b) =>
              getUserDisplayName(a).localeCompare(getUserDisplayName(b))
            )}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ParentStudentListItem student={item} onSelectStudent={setViewingStudentId} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        ) : !isErrorStudents && linkedStudents.length === 0 ? (
          <Text style={appSharedStyles.emptyListText}>No students linked to your account.</Text>
        ) : null}

        <View style={{ marginTop: 20 }}>
          <Button
            title="Link Another Student (Mock QR)"
            onPress={() => alert('Simulate scanning QR code...')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};
