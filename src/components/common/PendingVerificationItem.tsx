import { Button, Text, View } from 'react-native';
import { AssignedTask } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const PendingVerificationItem = ({
  task,
  studentName,
  onInitiateVerification,
}: {
  task: AssignedTask;
  studentName: string;
  onInitiateVerification: (task: AssignedTask) => void;
}) => (
  <View style={commonSharedStyles.pendingItem}>
    <Text style={commonSharedStyles.pendingTitle}>Task: {task.taskTitle}</Text>
    <Text style={commonSharedStyles.pendingDetail}>Student: {studentName}</Text>
    <Text style={commonSharedStyles.pendingDetail}>Potential Tickets: {task.taskBasePoints}</Text>
    <Text style={commonSharedStyles.pendingDetail}>
      Completed: {task.completedDate ? new Date(task.completedDate).toLocaleString() : 'N/A'}
    </Text>
    <View style={{ marginTop: 10 }}>
      <Button title="Verify Task" onPress={() => onInitiateVerification(task)} />
    </View>
  </View>
);
