import React from 'react';
import { View, Text, Button } from 'react-native';
import { AssignedTask } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';

interface AssignedTaskDetailItemProps {
  item: AssignedTask;
  studentName: string;
  assignerName: string;
  verifierName?: string | null;
  studentStatus: 'active' | 'inactive' | 'unknown';
  onInitiateVerification?: (task: AssignedTask) => void;
  onDelete?: (assignmentId: string) => void;
  disabled?: boolean;
}

export const AssignedTaskDetailItem: React.FC<AssignedTaskDetailItemProps> = ({
  item,
  studentName,
  assignerName,
  verifierName,
  studentStatus,
  onInitiateVerification,
  onDelete,
  disabled,
}) => {
  const allowVerify =
    onInitiateVerification &&
    item.isComplete &&
    item.verificationStatus === 'pending' &&
    studentStatus === 'active';

  const allowDelete =
    onDelete &&
    (!item.isComplete || item.verificationStatus === 'pending') &&
    studentStatus === 'active';

  const taskStatus = item.isComplete
    ? item.verificationStatus === 'pending'
      ? 'Complete (Pending Verification)'
      : `Verified (${item.verificationStatus || 'status unknown'})`
    : 'Assigned';

  return (
    <View style={[commonSharedStyles.baseItem, commonSharedStyles.baseColumn, { gap: 3 }]}>
      <Text style={commonSharedStyles.taskItemTitle}>{item.taskTitle}</Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        Student: {studentName} ({studentStatus})
      </Text>
      <Text style={commonSharedStyles.taskItemStatus}>Status: {taskStatus}</Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        Assigned: {new Date(item.assignedDate).toLocaleDateString()} by {assignerName}
      </Text>
      {item.completedDate && (
        <Text style={commonSharedStyles.baseSecondaryText}>
          Completed: {new Date(item.completedDate).toLocaleDateString()}
        </Text>
      )}
      {item.verifiedDate && item.verificationStatus !== 'pending' && (
        <Text style={commonSharedStyles.baseSecondaryText}>
          Verified: {new Date(item.verifiedDate).toLocaleDateString()} by{' '}
          {verifierName || item.verifiedById || 'Unknown'}
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
            onPress={() => onDelete!(item.id)}
            color={colors.danger}
            disabled={disabled}
          />
        )}
      </View>
    </View>
  );
};
