import { Button, Text, View } from 'react-native';
import { AssignedTask } from '../../mocks';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AssignedTaskItem = ({
  task,
  onMarkComplete,
  canMark,
  isLoading,
}: {
  task: AssignedTask;
  onMarkComplete?: (assignmentId: string) => void;
  canMark?: boolean;
  isLoading?: boolean;
}) => {
  const taskStatus = task.isComplete
    ? task.verificationStatus === 'pending'
      ? 'Complete (Pending Verification)'
      : `Verified (${task.verificationStatus || '?'})`
    : 'Assigned';
  const showMarkCompleteButton = !task.isComplete && canMark && onMarkComplete;

  return (
    <View style={appSharedStyles.itemContainer}>
      <Text style={appSharedStyles.itemTitle}>{task.taskTitle}</Text>
      <Text style={commonSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
      {task.actualPointsAwarded !== undefined && task.verificationStatus !== 'pending' && (
        <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textSuccess]}>
          Awarded: {task.actualPointsAwarded ?? 0} Tickets
        </Text>
      )}
      {task.completedDate && (
        <Text style={appSharedStyles.itemDetailText}>
          Completed: {new Date(task.completedDate).toLocaleDateString()}
        </Text>
      )}
      {task.verifiedDate && task.verificationStatus !== 'pending' && (
        <Text style={appSharedStyles.itemDetailText}>
          Verified: {new Date(task.verifiedDate).toLocaleDateString()}
        </Text>
      )}
      {showMarkCompleteButton && (
        <Button
          title={isLoading ? 'Marking...' : 'Mark Complete'}
          onPress={() => onMarkComplete(task.id)}
          disabled={isLoading}
        />
      )}
      {!task.isComplete && !canMark && <Button title="Mark Complete" disabled={true} />}
      {task.isComplete && task.verificationStatus === 'pending' && (
        <Text style={commonSharedStyles.pendingNote}>Awaiting teacher verification...</Text>
      )}
    </View>
  );
};
