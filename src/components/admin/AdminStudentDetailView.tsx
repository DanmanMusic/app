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

import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { Instrument } from '../../mocks/mockInstruments';
import { PupilViewProps, TicketHistoryItem } from '../../views/PupilView';

import { getTaskTitle, getInstrumentNames } from '../../utils/helpers';

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';


interface AdminStudentDetailViewProps {
  studentData: PupilViewProps;
  taskLibrary: TaskLibraryItem[];
  mockInstruments: Instrument[];
  adminUserName: string;

  onManualTicketAdjust: (studentId: string, amount: number, notes: string) => void;
  onRedeemReward: (studentId: string, rewardId: string) => void;
  onAssignTask: (taskId: string, studentId: string) => void;

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
    <SafeAreaView style={appSharedStyles.safeArea}>
      <View style={appSharedStyles.headerContainer}>
        <Button title="← Back to Admin" onPress={onBack} />
        <Text style={appSharedStyles.header}>Admin: {adminUserName}</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView style={appSharedStyles.container}>
        <Text style={appSharedStyles.sectionTitle}>Viewing Student: {user.name}</Text>
        <Text style={appSharedStyles.itemDetailText}>ID: {user.id}</Text>
        <Text style={appSharedStyles.itemDetailText}>
          Instrument(s): {getInstrumentNames(user.instrumentIds, mockInstruments)}
        </Text>
        <Text style={[appSharedStyles.itemDetailText, { fontWeight: 'bold' }]}>
          Balance: {balance} Tickets
        </Text>

        <View style={adminSharedStyles.adminStudentActions}>
          <Button
            title="Adjust Tickets (Mock)"
            onPress={() =>
              onManualTicketAdjust(user.id, 100, `Admin adjustment by ${adminUserName}`)
            }
          />
          <Button
            title="Redeem Reward (Mock)"
            onPress={() => onRedeemReward(user.id, 'reward-6')}
          />
          <Button title="Assign Task (Mock)" onPress={handleAssignTaskToStudent} />
        </View>

        <Text style={appSharedStyles.sectionTitle}>Assigned Tasks ({assignedTasks.length})</Text>
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
                  <Text style={appSharedStyles.itemDetailText}>
                    Completed: {new Date(item.completedDate).toLocaleDateString()}
                  </Text>
                )}
                {item.verifiedDate && item.verificationStatus !== 'pending' && (
                  <Text style={appSharedStyles.itemDetailText}>
                    Verified: {new Date(item.verifiedDate).toLocaleDateString()}
                  </Text>
                )}
                {item.actualPointsAwarded !== undefined &&
                  item.verificationStatus !== 'pending' && (
                    <Text style={adminSharedStyles.taskItemTickets}>
                      Awarded: {item.actualPointsAwarded ?? 0} Tickets
                    </Text>
                  )}
                {item.isComplete && item.verificationStatus === 'pending' && (
                  <Text style={adminSharedStyles.pendingNote}>Awaiting verification...</Text>
                )}

                <View style={adminSharedStyles.assignedTaskActions}>
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
                  <Button
                    title="Delete (Mock)"
                    onPress={() =>
                      Alert.alert(
                        'Mock Admin Delete Task',
                        `Simulate admin deleting assigned task ${item.id}`
                      )
                    }
                    color={colors.danger}
                  />
                </View>
              </View>
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={() => (
              <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
            )}
          />
        ) : (
          <Text style={appSharedStyles.emptyListText}>No tasks assigned.</Text>
        )}

        <Text style={appSharedStyles.sectionTitle}>History ({history.length})</Text>
        <FlatList
          data={history.slice(0, 5)}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TicketHistoryItem item={item} />}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No history yet.</Text>
          )}
        />
        {history.length > 5 && (
          <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
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