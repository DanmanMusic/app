// src/components/admin/AdminDashboardSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';

// Import types
import { SimplifiedStudent } from '../../views/AdminView';
import { AssignedTask } from '../../mocks/mockAssignedTasks';

// Import shared styles
import { adminSharedStyles } from './adminSharedStyles';

interface AdminDashboardSectionProps {
  allPupils: SimplifiedStudent[];
  allTeachers: { id: string; name: string; role: string }[];
  allParents: { id: string; name: string; role: string }[];
  allAssignedTasks: AssignedTask[];
  // Add other props for dashboard data if needed
}

export const AdminDashboardSection: React.FC<AdminDashboardSectionProps> = ({
  allPupils,
  allTeachers,
  allParents,
  allAssignedTasks,
}) => {
  const pendingVerificationsCount = allAssignedTasks.filter(
    task => task.isComplete && task.verificationStatus === 'pending'
  ).length;

  return (
    <View>
      {/* Use shared sectionTitle style */}
      <Text style={adminSharedStyles.sectionTitle}>Overview</Text>
      {/* Use shared detailText style */}
      <Text style={adminSharedStyles.detailText}>Total Pupils: {allPupils.length}</Text>
      <Text style={adminSharedStyles.detailText}>Total Teachers: {allTeachers.length}</Text>
      <Text style={adminSharedStyles.detailText}>Total Parents: {allParents.length}</Text>
      <Text style={adminSharedStyles.detailText}>
        Tasks Pending Verification: {pendingVerificationsCount}
      </Text>
      {/* Add more dashboard stats */}
      <View style={{ marginTop: 20, alignItems: 'flex-start' }}>
        <Button
          title="View Pending Verifications (Mock)"
          onPress={() => {
            Alert.alert(
              'View Pending Verifications',
              'Simulating view pending verifications list for Admin.'
            );
          }}
        />
      </View>
    </View>
  );
};
