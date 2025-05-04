// src/components/common/AssignedTaskDetailItem.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { AssignedTask } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';

interface AssignedTaskDetailItemProps {
  item: AssignedTask;
  studentName: string;
  onInitiateVerification?: (task: AssignedTask) => void;
  canDelete?: boolean;
  onDelete?: (taskId: string) => void;
  disabled?: boolean;
}

export const AssignedTaskDetailItem: React.FC<AssignedTaskDetailItemProps> = ({
  item,
  studentName,
  onInitiateVerification,
  canDelete,
  onDelete,
  disabled,
}) => {
  const assignerNameDisplay = item.assignerName || `ID: ${item.assignedById}`;
  const verifierNameDisplay =
    item.verifierName || (item.verifiedById ? `ID: ${item.verifiedById}` : 'Unknown');
  const studentStatusDisplay = item.studentStatus || 'unknown';

  const allowVerify =
    onInitiateVerification &&
    item.isComplete &&
    item.verificationStatus === 'pending' &&
    studentStatusDisplay === 'active';

  const allowDelete = canDelete && onDelete;

  const taskStatus = item.isComplete
    ? item.verificationStatus === 'pending'
      ? 'Complete (Pending Verification)'
      : `Verified (${item.verificationStatus || 'status unknown'})`
    : 'Assigned';

  return (
    <View style={[commonSharedStyles.baseItem, commonSharedStyles.baseColumn, { gap: 3 }]}>
      <Text style={commonSharedStyles.itemTitle}>{item.taskTitle}</Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        Student: {studentName} (
        {studentStatusDisplay === 'unknown' ? 'Status Unknown' : studentStatusDisplay})
      </Text>
      <Text style={commonSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        Assigned: {new Date(item.assignedDate).toLocaleDateString()} by {assignerNameDisplay}
      </Text>
      {item.completedDate && (
        <Text style={commonSharedStyles.baseSecondaryText}>
          Completed: {new Date(item.completedDate).toLocaleDateString()}
        </Text>
      )}
      {item.verifiedDate && item.verificationStatus !== 'pending' && (
        <Text style={commonSharedStyles.baseSecondaryText}>
          Verified: {new Date(item.verifiedDate).toLocaleDateString()} by {verifierNameDisplay}
        </Text>
      )}
      {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && (
        <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textSuccess]}>
          Awarded: {item.actualPointsAwarded ?? 0} Tickets
        </Text>
      )}
      {item.isComplete && item.verificationStatus === 'pending' && (
        <Text style={commonSharedStyles.pendingNote}>Awaiting verification...</Text>
      )}
      <View style={commonSharedStyles.assignedTaskActions}>
        {allowVerify && (
          <Button
            title="Verify"
            onPress={() => onInitiateVerification!(item)}
            disabled={disabled}
          />
        )}
        {allowDelete && (
          <Button
            title="Remove"
            onPress={() => onDelete!(item.id)} // Pass only ID to the parent handler
            color={colors.danger}
            disabled={disabled}
          />
        )}
      </View>
    </View>
  );
};
