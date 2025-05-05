import { Button, Text, TouchableOpacity, View } from 'react-native';
import { AssignedTask } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { handleOpenUrl, handleViewAttachment } from '../../lib/supabaseClient';
import { timestampDisplay } from '../../utils/helpers';

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
      <View style={[commonSharedStyles.baseColumn, commonSharedStyles.baseGap]}>
        <Text style={commonSharedStyles.itemTitle}>{task.taskTitle}</Text>
        {!!task.taskDescription && (
          <Text style={[commonSharedStyles.baseSecondaryText]}>{task.taskDescription}</Text>
        )}
        <Text style={commonSharedStyles.baseSecondaryText}>Status: {taskStatus}</Text>
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
            Completed: {timestampDisplay(task.completedDate)}
          </Text>
        )}
        {task.verifiedDate && task.verificationStatus !== 'pending' && (
          <Text style={commonSharedStyles.baseSecondaryText}>
            Verified: {timestampDisplay(task.verifiedDate)}
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
