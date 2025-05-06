import React, { useState, useMemo, useEffect } from 'react';

import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';

import { useQuery, useQueries, UseQueryResult } from '@tanstack/react-query';

import { SafeAreaView } from 'react-native-safe-area-context';

import EditMyInfoModal from '../components/common/EditMyInfoModal';
import { ParentStudentListItem } from '../components/common/ParentStudentListItem';
import SetEmailPasswordModal from '../components/common/SetEmailPasswordModal';
import { SharedHeader } from '../components/common/SharedHeader';

import { useAuth } from '../contexts/AuthContext';

import { colors } from '../styles/colors';
import { commonSharedStyles } from '../styles/commonSharedStyles';

import { User } from '../types/dataTypes';

import { getUserDisplayName } from '../utils/helpers';

import { fetchUserProfile } from '../api/users';

import { StudentView } from './StudentView';

export const ParentView = () => {
  const { currentUserId: parentUserId } = useAuth();

  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const [isEditInfoModalVisible, setIsEditInfoModalVisible] = useState(false);
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
  const handleCloseEditInfoModal = () => setIsEditInfoModalVisible(false);

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
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.baseCentered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text>Loading Parent Data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isErrorParent || !parentUser) {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.flex1}>
          <Text style={commonSharedStyles.errorText}>
            Error loading parent data: {errorParent?.message || 'Parent not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (parentUser.role !== 'parent') {
    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View style={commonSharedStyles.flex1}>
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
          <SafeAreaView style={commonSharedStyles.flex1}>
            <View style={commonSharedStyles.baseCentered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text>Loading Student Details...</Text>
              <Button
                title="← Students"
                onPress={() => setViewingStudentId(null)}
                color={colors.primary}
              />
            </View>
          </SafeAreaView>
        );
      }

      const specificErrorMsg =
        specificQueryResult?.error instanceof Error
          ? specificQueryResult.error.message
          : 'Selected student data could not be loaded or is no longer linked.';

      return (
        <SafeAreaView style={commonSharedStyles.flex1}>
          <View style={commonSharedStyles.flex1}>
            <Text style={commonSharedStyles.errorText}>Error: {specificErrorMsg}</Text>
            <Button
              title="← Students"
              onPress={() => setViewingStudentId(null)}
              color={colors.primary}
            />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={commonSharedStyles.flex1}>
        <View
          style={[
            commonSharedStyles.baseRow,
            commonSharedStyles.baseAlignCenter,
            commonSharedStyles.justifySpaceBetween,
            commonSharedStyles.baseMargin,
          ]}
        >
          <SharedHeader
            onSetLoginPress={() => setIsSetCredentialsModalVisible(true)}
            onEditInfoPress={() => setIsEditInfoModalVisible(true)}
          />
        </View>
        <View style={[commonSharedStyles.baseMarginTopBottom, commonSharedStyles.baseMargin]}>
          {hasMultipleStudents && (
            <View style={commonSharedStyles.baseRow}>
              <Button title="← Students" onPress={() => setViewingStudentId(null)} />
            </View>
          )}
          <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
            <Text
              style={[
                commonSharedStyles.baseTitleText,
                commonSharedStyles.baseMarginTopBottom,
                commonSharedStyles.bold,
              ]}
            >
              Viewing: {getUserDisplayName(studentToView)}
            </Text>
          </View>
        </View>
        <StudentView studentIdToView={viewingStudentId} />
        <EditMyInfoModal visible={isEditInfoModalVisible} onClose={handleCloseEditInfoModal} />
        <SetEmailPasswordModal
          visible={isSetCredentialsModalVisible}
          onClose={() => setIsSetCredentialsModalVisible(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonSharedStyles.flex1}>
      <View style={commonSharedStyles.flex1}>
        <View
          style={[
            commonSharedStyles.baseRow,
            commonSharedStyles.baseAlignCenter,
            commonSharedStyles.justifySpaceBetween,
            commonSharedStyles.baseMargin,
          ]}
        >
          <SharedHeader
            onSetLoginPress={() => setIsSetCredentialsModalVisible(true)}
            onEditInfoPress={() => setIsEditInfoModalVisible(true)}
          />
        </View>
        <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
          <Text
            style={[
              commonSharedStyles.baseTitleText,
              commonSharedStyles.baseMarginTopBottom,
              commonSharedStyles.bold,
            ]}
          >
            Your Students
          </Text>
        </View>
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
          <Text style={commonSharedStyles.baseEmptyText}>No students linked to your account.</Text>
        ) : null}
      </View>
      <EditMyInfoModal visible={isEditInfoModalVisible} onClose={handleCloseEditInfoModal} />
      <SetEmailPasswordModal
        visible={isSetCredentialsModalVisible}
        onClose={() => setIsSetCredentialsModalVisible(false)}
      />
    </SafeAreaView>
  );
};
