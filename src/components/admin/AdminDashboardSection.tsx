import React from 'react';
import { View, Text, Button } from 'react-native';
import { SimplifiedStudent } from '../../types/dataTypes';
import { AssignedTask } from '../../mocks/mockAssignedTasks';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

interface AdminDashboardSectionProps {
  allStudents: SimplifiedStudent[];
  allTeachers: { id: string; name: string; role: string }[];
  allParents: { id: string; name: string; role: string }[];
  allAssignedTasks: AssignedTask[];
  onViewPendingVerifications: () => void;
}

export const AdminDashboardSection: React.FC<AdminDashboardSectionProps> = ({
  allStudents,
  allTeachers,
  allParents,
  allAssignedTasks,
  onViewPendingVerifications,
}) => {
  const pendingVerificationsCount = allAssignedTasks.filter(
    task => task.isComplete && task.verificationStatus === 'pending'
  ).length;

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Overview</Text>
      <Text style={appSharedStyles.itemDetailText}>Total Students: {allStudents.length}</Text>
      <Text style={appSharedStyles.itemDetailText}>Total Teachers: {allTeachers.length}</Text>
      <Text style={appSharedStyles.itemDetailText}>Total Parents: {allParents.length}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Tasks Pending Verification: {pendingVerificationsCount}
      </Text>
      <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
        <Button
          title={`View Pending Verifications (${pendingVerificationsCount})`}
          onPress={onViewPendingVerifications}
          color={colors.warning}
        />
      </View>
    </View>
  );
};
