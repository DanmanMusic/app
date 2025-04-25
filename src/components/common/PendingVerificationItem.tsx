import { Button, Text, View } from 'react-native';
import { AssignedTask } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';

export const PendingVerificationItem = ({
  task,
  studentName,
  onInitiateVerification,
}: {
  task: AssignedTask;
  studentName: string;
  onInitiateVerification: (task: AssignedTask) => void;
}) => (
  <View style={appSharedStyles.pendingItem}>
    <Text style={adminSharedStyles.pendingTitle}>Task: {task.taskTitle}</Text>
    <Text style={adminSharedStyles.pendingDetail}>Student: {studentName}</Text>
    <Text style={adminSharedStyles.pendingDetail}>Potential Tickets: {task.taskBasePoints}</Text>
    <Text style={adminSharedStyles.pendingDetail}>
      Completed: {task.completedDate ? new Date(task.completedDate).toLocaleString() : 'N/A'}
    </Text>
    <View style={{ marginTop: 10 }}>
      <Button title="Verify Task" onPress={() => onInitiateVerification(task)} />
    </View>
  </View>
);
