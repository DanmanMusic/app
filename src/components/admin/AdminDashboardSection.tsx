import React from 'react';

import { View, Text, ActivityIndicator } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { fetchUserCounts, fetchPendingTaskCount, UserCounts, TaskStats } from '../../api/stats';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminDashboardSectionProps, UserTab } from '../../types/componentProps';
import { CustomButton } from '../common/CustomButton';
import {
  ListBulletIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QueueListIcon,
} from 'react-native-heroicons/solid';

export const AdminDashboardSection: React.FC<AdminDashboardSectionProps> = ({
  onViewVerifications,
  setActiveTab,
  setViewingSection,
  onInitiateCreateUser,
}) => {
  const {
    data: userCounts,
    isLoading: isLoadingCounts,
    isError: isErrorCounts,
    error: errorCounts,
  } = useQuery<UserCounts, Error>({
    queryKey: ['userCounts'],
    queryFn: fetchUserCounts,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: taskStats,
    isLoading: isLoadingTaskStats,
    isError: isErrorTaskStats,
    error: errorTaskStats,
  } = useQuery<TaskStats, Error>({
    queryKey: ['taskStats', 'pendingCount'],
    queryFn: fetchPendingTaskCount,
    staleTime: 1 * 60 * 1000,
  });

  const studentCount = userCounts?.studentCount ?? 0;
  const teacherCount = userCounts?.teacherCount ?? 0;
  const parentCount = userCounts?.parentCount ?? 0;
  const adminCount = userCounts?.adminCount ?? 0;
  const studentButtonTitle = `Students: ${studentCount}`;
  const teacherButtonTitle = `Teachers: ${teacherCount}`;
  const parentButtonTitle = `Parents: ${parentCount}`;
  const adminButtonTitle = `Admins: ${adminCount}`;
  const pendingVerificationsCount = taskStats?.pendingVerificationCount ?? 0;

  const isLoading = isLoadingCounts || isLoadingTaskStats;

  const handleUserSelection = (userTab: UserTab) => {
    setActiveTab(userTab);
    setViewingSection('users');
  };

  return (
    <View style={[commonSharedStyles.baseMargin]}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
        <Text
          style={[
            commonSharedStyles.baseTitleText,
            commonSharedStyles.baseMarginTopBottom,
            commonSharedStyles.bold,
          ]}
        >
          Dashboard Overview
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 15 }} />
      ) : (
        <>
          {isErrorCounts ? (
            <Text style={commonSharedStyles.errorText}>
              Failed to load user counts: {errorCounts?.message}
            </Text>
          ) : (
            <>
              <View
                style={[
                  commonSharedStyles.baseColumn,
                  commonSharedStyles.baseGap,
                  commonSharedStyles.baseMarginTopBottom,
                ]}
              >
                <Text style={commonSharedStyles.baseSubTitleText}>
                  <Text style={{ fontWeight: 'bold' }}>Users</Text>:{' '}
                  {studentCount + teacherCount + parentCount + adminCount}
                </Text>
                <View
                  style={[
                    commonSharedStyles.baseRow,
                    commonSharedStyles.baseGap,
                    commonSharedStyles.baseMarginTopBottom,
                  ]}
                >
                  <CustomButton
                    title="User"
                    onPress={onInitiateCreateUser}
                    color={colors.warning}
                    leftIcon={<PlusIcon color={colors.textWhite} size={18} />}
                  />
                  <CustomButton
                    title={studentButtonTitle}
                    onPress={() => {
                      handleUserSelection('students');
                    }}
                    color={colors.primary}
                  />
                  <CustomButton
                    title={teacherButtonTitle}
                    onPress={() => {
                      handleUserSelection('teachers');
                    }}
                    color={colors.primary}
                  />
                  <CustomButton
                    title={parentButtonTitle}
                    onPress={() => {
                      handleUserSelection('parents');
                    }}
                    color={colors.primary}
                  />
                  <CustomButton
                    title={adminButtonTitle}
                    onPress={() => {
                      handleUserSelection('admins');
                    }}
                    color={colors.primary}
                  />
                </View>
              </View>
            </>
          )}
          {isErrorTaskStats ? (
            <Text style={commonSharedStyles.errorText}>
              Failed to load task stats: {errorTaskStats?.message}
            </Text>
          ) : (
            <View
              style={[
                commonSharedStyles.baseColumn,
                commonSharedStyles.baseGap,
                commonSharedStyles.baseMarginTopBottom,
              ]}
            >
              <Text style={[commonSharedStyles.baseSubTitleText, commonSharedStyles.bold]}>
                Tasks
              </Text>
              <View
                style={[
                  commonSharedStyles.baseRow,
                  commonSharedStyles.baseGap,
                  commonSharedStyles.baseMarginTopBottom,
                ]}
              >
                {!isErrorTaskStats && pendingVerificationsCount > 0 && (
                  <CustomButton
                    title={`View Pending Verifications (${isErrorTaskStats ? '!' : pendingVerificationsCount})`}
                    onPress={() => onViewVerifications(true)}
                    color={colors.warning}
                    disabled={isErrorTaskStats}
                    leftIcon={
                      <MagnifyingGlassIcon
                        color={isErrorTaskStats ? colors.disabledText : colors.textWhite}
                        size={18}
                      />
                    }
                  />
                )}
                <CustomButton
                  title="Tasks"
                  onPress={() => setViewingSection('tasks')}
                  color={colors.primary}
                  leftIcon={<QueueListIcon color={colors.textWhite} size={18} />}
                />
                <CustomButton
                  title="History"
                  onPress={() => setViewingSection('history')}
                  color={colors.primary}
                  leftIcon={<ListBulletIcon color={colors.textWhite} size={18} />}
                />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
};
