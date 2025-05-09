import { Button, Text, TouchableOpacity, View } from 'react-native';

import { handleOpenUrl, handleViewAttachment } from '../../lib/supabaseClient';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AssignedTask } from '../../types/dataTypes';
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
        {(taskStatus === 'Assigned' || task.verificationStatus === 'pending') && (
          <Text
            style={[
              commonSharedStyles.baseSecondaryText,
              commonSharedStyles.bold,
              { color: colors.secondary },
            ]}
          >
            Available: {task.taskBasePoints ?? 0} {task.taskBasePoints === 1 ? 'Ticket' : 'Tickets'}
          </Text>
        )}
        <Text style={commonSharedStyles.baseSecondaryText}>Status: {taskStatus}</Text>
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
            color={colors.primary}
            disabled={isLoading}
          />
        )}
        {!task.isComplete && !canMark && <Button title="Mark Complete" disabled={true} />}
      </View>
    </View>
  );
};
