import { Button, Linking, Text, TouchableOpacity, View } from 'react-native';
import { AssignedTask } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import Toast from 'react-native-toast-message';
import {
  getSupabase,
  handleOpenUrl,
  handleViewAttachment,
  TASK_ATTACHMENT_BUCKET,
} from '../../lib/supabaseClient';

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
    <View
      style={[
        commonSharedStyles.baseItem,
        commonSharedStyles.baseRow,
        commonSharedStyles.justifySpaceBetween,
      ]}
    >
      <View>
        <Text style={commonSharedStyles.itemTitle}>{task.taskTitle}</Text>
        {task.taskDescription && (
          <Text style={[commonSharedStyles.baseSecondaryText, { marginBottom: 5 }]}>
            {task.taskDescription}
          </Text>
        )}
        <Text style={commonSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
        {task.taskLinkUrl && (
          <TouchableOpacity onPress={() => handleOpenUrl(task.taskLinkUrl)}>
            <Text style={commonSharedStyles.baseSecondaryText}>
              Reference: <Text style={commonSharedStyles.linkText}>{task.taskLinkUrl}</Text>
            </Text>
          </TouchableOpacity>
        )}
        {task.taskAttachmentPath && (
          <TouchableOpacity onPress={() => handleViewAttachment(task.taskAttachmentPath)}>
            <Text style={commonSharedStyles.baseSecondaryText}>
              Attachment: <Text style={commonSharedStyles.linkText}>View/Download</Text>
            </Text>
          </TouchableOpacity>
        )}

        {task.actualPointsAwarded !== undefined && task.verificationStatus !== 'pending' && (
          <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textSuccess]}>
            Awarded: {task.actualPointsAwarded ?? 0} Tickets
          </Text>
        )}
        {task.completedDate && (
          <Text style={commonSharedStyles.baseSecondaryText}>
            Completed: {new Date(task.completedDate).toLocaleDateString()}
          </Text>
        )}
        {task.verifiedDate && task.verificationStatus !== 'pending' && (
          <Text style={commonSharedStyles.baseSecondaryText}>
            Verified: {new Date(task.verifiedDate).toLocaleDateString()}
          </Text>
        )}
        {task.isComplete && task.verificationStatus === 'pending' && (
          <Text style={commonSharedStyles.pendingNote}>Awaiting teacher verification...</Text>
        )}
      </View>
      <View>
        {showMarkCompleteButton && (
          <Button
            title={isLoading ? 'Marking...' : 'Mark Complete'}
            onPress={() => onMarkComplete(task.id)}
            disabled={isLoading}
          />
        )}
        {!task.isComplete && !canMark && <Button title="Mark Complete" disabled={true} />}
      </View>
    </View>
  );
};
