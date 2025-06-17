// src/components/common/AssignedTaskItem.tsx
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
      <View
        style={[
          commonSharedStyles.baseColumn,
          commonSharedStyles.baseGap,
          { flex: 1, marginRight: 10 },
        ]}
      >
        <Text style={commonSharedStyles.itemTitle}>{task.taskTitle}</Text>
        {!!task.taskDescription && (
          <Text style={[commonSharedStyles.baseSecondaryText]}>{task.taskDescription}</Text>
        )}

        {/* --- MODIFICATION START --- */}
        {task.task_links?.map((link, index) => (
          <TouchableOpacity key={`link-${index}`} onPress={() => handleOpenUrl(link.url)}>
            <Text style={commonSharedStyles.baseSecondaryText}>
              {link.label || 'Reference'}:{' '}
              <Text style={commonSharedStyles.linkText}>{link.url}</Text>
            </Text>
          </TouchableOpacity>
        ))}
        {task.task_attachments?.map((att, index) => (
          <TouchableOpacity key={`att-${index}`} onPress={() => handleViewAttachment(att.path)}>
            <Text style={commonSharedStyles.baseSecondaryText}>
              Attachment: <Text style={commonSharedStyles.linkText}>{att.name}</Text>
            </Text>
          </TouchableOpacity>
        ))}
        {/* --- MODIFICATION END --- */}

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
        {/* ... rest of the component is the same ... */}
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
