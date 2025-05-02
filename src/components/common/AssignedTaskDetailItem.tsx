// src/components/common/AssignedTaskDetailItem.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { AssignedTask, UserStatus } from '../../types/dataTypes'; // Added UserStatus
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';

interface AssignedTaskDetailItemProps {
  item: AssignedTask;
  studentName: string;
  assignerName: string;
  verifierName?: string | null;
  studentStatus: UserStatus | 'unknown'; // Use UserStatus type
  onInitiateVerification?: (task: AssignedTask) => void;
  // --- Updated Delete Props ---
  canDelete?: boolean; // Simple flag calculated by parent
  onDelete?: (taskId: string) => void; // Simple callback with ID
  // --- End Updated Delete Props ---
  disabled?: boolean; // Kept for potentially disabling verify button during delete confirm
}

export const AssignedTaskDetailItem: React.FC<AssignedTaskDetailItemProps> = ({
  item,
  studentName,
  assignerName,
  verifierName,
  studentStatus,
  onInitiateVerification,
  // --- Use Updated Delete Props ---
  canDelete,
  onDelete,
  // --- End Use Updated Delete Props ---
  disabled, // Still used for potentially disabling verify button
}) => {
  // Simplify verify button logic
  const allowVerify =
    onInitiateVerification &&
    item.isComplete &&
    item.verificationStatus === 'pending' &&
    studentStatus === 'active'; // Student must be active to verify

  // Delete button logic now simply uses the canDelete prop
  const allowDelete = canDelete && onDelete;

  // Status text logic remains the same
  const taskStatus = item.isComplete
    ? item.verificationStatus === 'pending'
      ? 'Complete (Pending Verification)'
      : `Verified (${item.verificationStatus || 'status unknown'})`
    : 'Assigned';

  return (
    <View style={[commonSharedStyles.baseItem, commonSharedStyles.baseColumn, { gap: 3 }]}>
      <Text style={commonSharedStyles.itemTitle}>{item.taskTitle}</Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        {/* Display student status clearly */}
        Student: {studentName} ({studentStatus === 'unknown' ? 'Status Unknown' : studentStatus})
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
          {verifierName || item.verifiedById?.substring(0, 6) || 'Unknown'}
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

      {/* Actions Container */}
      <View style={commonSharedStyles.assignedTaskActions}>
        {allowVerify && (
          <Button
            title="Verify"
            onPress={() => onInitiateVerification!(item)} // Non-null assertion ok due to allowVerify check
            disabled={disabled} // Disable if parent indicates (e.g., during delete confirm)
          />
        )}
        {/* Use the simplified allowDelete check */}
        {allowDelete && (
          <Button
            title="Remove"
            onPress={() => onDelete!(item.id)} // Non-null assertion ok due to allowDelete check
            color={colors.danger}
            // disabled prop here is likely redundant if parent handles modal state, but kept for safety
            disabled={disabled}
          />
        )}
      </View>
    </View>
  );
};
