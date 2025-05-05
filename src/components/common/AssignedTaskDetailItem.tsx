// src/components/common/AssignedTaskDetailItem.tsx
import React from 'react';
import { View, Text, Button, TouchableOpacity } from 'react-native';
import { AssignedTask } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { handleOpenUrl, handleViewAttachment } from '../../lib/supabaseClient';
import { timestampDisplay } from '../../utils/helpers';

interface AssignedTaskDetailItemProps {
  item: AssignedTask;
  studentName: string;
  showStudentName: boolean;
  onInitiateVerification?: (task: AssignedTask) => void;
  canDelete?: boolean;
  onDelete?: (task: AssignedTask) => void;
  disabled?: boolean;
}

export const AssignedTaskDetailItem: React.FC<AssignedTaskDetailItemProps> = ({
  item,
  studentName,
  showStudentName,
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
    <View
      style={[
        commonSharedStyles.baseItem,
        commonSharedStyles.baseRow,
        commonSharedStyles.baseGap,
        commonSharedStyles.justifySpaceBetween,
      ]}
    >
      <View style={[commonSharedStyles.baseColumn, commonSharedStyles.baseGap]}>
        <Text style={commonSharedStyles.itemTitle}>{item.taskTitle}</Text>
        {!!item.taskDescription && (
          <Text style={commonSharedStyles.baseSecondaryText}>{item.taskDescription}</Text>
        )}
        {showStudentName && (
          <Text style={commonSharedStyles.baseSecondaryText}>
            Student: {studentName} (
            {studentStatusDisplay === 'unknown' ? 'Status Unknown' : studentStatusDisplay})
          </Text>
        )}
        <Text style={commonSharedStyles.baseSecondaryText}>Status: {taskStatus}</Text>
        {item.taskLinkUrl && (
          <TouchableOpacity onPress={() => handleOpenUrl(item.taskLinkUrl)}>
            <Text style={commonSharedStyles.baseSecondaryText}>
              Reference: <Text style={commonSharedStyles.linkText}>{item.taskLinkUrl}</Text>
            </Text>
          </TouchableOpacity>
        )}
        {item.taskAttachmentPath && (
          <TouchableOpacity onPress={() => handleViewAttachment(item.taskAttachmentPath)}>
            <Text style={commonSharedStyles.baseSecondaryText}>
              Attachment: <Text style={commonSharedStyles.linkText}>View/Download</Text>
            </Text>
          </TouchableOpacity>
        )}
        <Text style={commonSharedStyles.baseSecondaryText}>
          Assigned: {timestampDisplay(item.assignedDate)} by {assignerNameDisplay}
        </Text>
        {item.completedDate && (
          <Text style={commonSharedStyles.baseSecondaryText}>
            Completed: {timestampDisplay(item.completedDate)}
          </Text>
        )}
        {item.verifiedDate && item.verificationStatus !== 'pending' && (
          <Text style={commonSharedStyles.baseSecondaryText}>
            Verified: {timestampDisplay(item.verifiedDate)} by {verifierNameDisplay}
          </Text>
        )}
        {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && (
          <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textSuccess]}>
            Awarded: {item.actualPointsAwarded ?? 0} Tickets
          </Text>
        )}
        {item.verificationStatus !== 'verified' && (
          <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textWarning]}>
            Base Points: {item.taskBasePoints ?? 0} Tickets
          </Text>
        )}
        {item.isComplete && item.verificationStatus === 'pending' && (
          <Text style={commonSharedStyles.pendingNote}>Awaiting verification...</Text>
        )}
      </View>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
        {allowVerify && (
          <Button
            title="Verify"
            onPress={() => onInitiateVerification!(item)}
            color={colors.primary}
            disabled={disabled}
          />
        )}
        {allowDelete && (
          <Button
            title="Remove"
            onPress={() => onDelete!(item)}
            color={colors.danger}
            disabled={disabled}
          />
        )}
      </View>
    </View>
  );
};
