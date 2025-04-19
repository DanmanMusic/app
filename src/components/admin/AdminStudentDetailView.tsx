// src/components/admin/AdminStudentDetailView.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
} from 'react-native';

// Import types
import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { Instrument } from '../../mocks/mockInstruments';
import { PupilViewProps, TicketHistoryItem } from '../../views/PupilView';

// Import helpers
import { getTaskTitle, getInstrumentNames } from '../../utils/helpers';


// Import shared styles
import { adminSharedStyles } from './adminSharedStyles';

// Props interface for the Admin Student Detail View component
interface AdminStudentDetailViewProps {
  studentData: PupilViewProps;
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[];
  adminUserName: string;

  onManualTicketAdjust: (studentId: string, amount: number, notes: string) => void;
  onRedeemReward: (studentId: string, rewardId: string) => void;
  onAssignTask: (taskId: string, studentId: string) => void;
  // onVerifyTask and onReassignTaskMock could also be passed if admin uses the same modal as teacher, but keeping simple for mock
  // onDeleteAssignedTask?: (assignedTaskId: string) => void; // Mock delete assigned task

  onBack: () => void;
}

export const AdminStudentDetailView: React.FC<AdminStudentDetailViewProps> = ({
  studentData,
  taskLibrary,
  mockInstruments,
  adminUserName,
  onManualTicketAdjust,
  onRedeemReward,
  onAssignTask,
  onBack,
}) => {
  const { user, balance, assignedTasks, history } = studentData;

  const handleAssignTaskToStudent = () => {
    Alert.prompt(
      'Assign Task',
      `Assign which task ID from library to student ${user.id}? (e.g., tasklib-1)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: taskId => {
            if (taskId && taskLibrary.some(t => t.id === taskId)) {
              onAssignTask(taskId, user.id);
            } else {
              Alert.alert('Invalid Task ID', 'Please enter a valid task library ID.');
            }
          },
        },
      ],
      Platform.OS === 'ios' ? 'default' : 'plain-text'
    );
  };

  return (
    <SafeAreaView style={adminSharedStyles.safeArea}>
      <View style={adminSharedStyles.headerContainer}>
        <Button title="← Back to Admin" onPress={onBack} />
        <Text style={adminSharedStyles.header}>Admin: {adminUserName}</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView style={adminSharedStyles.container}>
        <Text style={adminSharedStyles.sectionTitle}>Viewing Student: {user.name}</Text>
        <Text style={adminSharedStyles.detailText}>ID: {user.id}</Text>
        <Text style={adminSharedStyles.detailText}>
          Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)}
        </Text>
        <Text style={[adminSharedStyles.detailText, { fontWeight: 'bold' }]}>
          Balance: {balance} Tickets
        </Text>

        {/* Add buttons for Admin actions on this student */}
        <View style={adminSharedStyles.adminStudentActions}>
          {/* Re-added (Mock) as it lacks input UI */}
          <Button
            title="Adjust Tickets (Mock)"
            onPress={() =>
              onManualTicketAdjust(user.id, 100, `Admin adjustment by ${adminUserName}`)
            }
          />
          {/* Re-added (Mock) as it lacks selection UI */}
          <Button
            title="Redeem Reward (Mock)"
            onPress={() => onRedeemReward(user.id, 'reward-6')}
          />
          {/* Kept (Mock) as it triggers assign prompt */}
          <Button title="Assign Task (Mock)" onPress={handleAssignTaskToStudent} />
        </View>

        {/* Show student's assigned tasks - reusing item styles*/}
        <Text style={adminSharedStyles.sectionTitle}>Assigned Tasks ({assignedTasks.length})</Text>
        {assignedTasks.length > 0 ? (
          <FlatList
            data={assignedTasks.sort(
              (a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
            )}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={adminSharedStyles.taskItem}>
                <Text style={adminSharedStyles.taskItemTitle}>
                  {getTaskTitle(item.taskId, taskLibrary)}
                </Text>
                <Text style={adminSharedStyles.taskItemStatus}>
                  Status:{' '}
                  {item.isComplete
                    ? item.verificationStatus === 'pending'
                      ? 'Complete (Pending Verification)'
                      : `Verified (${item.verificationStatus})`
                    : 'Assigned'}
                </Text>
                {item.completedDate && (
                  <Text style={adminSharedStyles.taskItemDetail}>
                    Completed: {new Date(item.completedDate).toLocaleDateString()}
                  </Text>
                )}
                {item.verifiedDate && item.verificationStatus !== 'pending' && (
                  <Text style={adminSharedStyles.taskItemDetail}>
                    Verified: {new Date(item.verifiedDate).toLocaleDateString()}
                  </Text>
                )}
                {item.actualPointsAwarded !== undefined &&
                  item.verificationStatus !== 'pending' && (
                    <Text style={adminSharedStyles.taskItemDetail}>
                      Awarded: {item.actualPointsAwarded ?? 0} points
                    </Text>
                  )}
                {item.isComplete && item.verificationStatus === 'pending' && (
                  <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text>
                )}

                <View style={adminSharedStyles.assignedTaskActions}>
                  {/* Keep (Mock) as it only alerts currently */}
                  {item.isComplete && item.verificationStatus === 'pending' && (
                    <Button
                      title="Verify (Mock)"
                      onPress={() =>
                        Alert.alert(
                          'Mock Admin Verify',
                          `Simulate admin verification of task ${item.id}`
                        )
                      }
                    />
                  )}
                  {/* Keep (Mock) as it only alerts */}
                  <Button
                    title="Delete (Mock)"
                    onPress={() =>
                      Alert.alert(
                        'Mock Admin Delete Task',
                        `Simulate admin deleting assigned task ${item.id}`
                      )
                    }
                    color="red"
                  />
                </View>
              </View>
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={() => (
              <Text style={adminSharedStyles.emptyListText}>No tasks assigned.</Text>
            )}
          />
        ) : (
          <Text style={adminSharedStyles.emptyListText}>No tasks assigned.</Text>
        )}

        <Text style={adminSharedStyles.sectionTitle}>History ({history.length})</Text>
        <FlatList
          data={history.slice(0, 5)}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TicketHistoryItem item={item} />}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={adminSharedStyles.emptyListText}>No history yet.</Text>
          )}
        />
        {history.length > 5 && (
          <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
            {/* Keep (Mock) as it only alerts */}
            <Button
              title="View Full History (Mock)"
              onPress={() => alert('Navigate to full history screen')}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
