import { Button, Text, View } from 'react-native';
import { AssignedTask } from '../../mocks';
import { User } from '../../types/userTypes';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { getUserDisplayName } from '../../utils/helpers';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';

export const AssignedTaskDetailItem = ({
  item,
  allUsers,
  onInitiateVerification,
  onDelete,
  disabled,
}: {
  item: AssignedTask;
  allUsers: User[];
  onInitiateVerification?: (task: AssignedTask) => void;
  onDelete: (assignmentId: string) => void;
  disabled?: boolean;
}) => {
  const student = allUsers.find(u => u.id === item.studentId);
  const assigner = allUsers.find(u => u.id === item.assignedById);
  const verifier = item.verifiedById ? allUsers.find(u => u.id === item.verifiedById) : null;
  const allowDelete =
    (!item.isComplete || item.verificationStatus === 'pending') && student?.status === 'active';
  const allowVerify =
    item.isComplete && item.verificationStatus === 'pending' && student?.status === 'active';

  return (
    <View style={adminSharedStyles.taskItem}>
      <Text style={adminSharedStyles.taskItemTitle}>{item.taskTitle}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Student: {student ? getUserDisplayName(student) : item.studentId}
        {student && ` (${student.status})`}
      </Text>
      <Text style={adminSharedStyles.taskItemStatus}>Status: Status</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Assigned: {new Date(item.assignedDate).toLocaleDateString()} by
        {assigner ? getUserDisplayName(assigner) : item.assignedById}
      </Text>
      {item.completedDate && (
        <Text style={appSharedStyles.itemDetailText}>
          Completed: {new Date(item.completedDate).toLocaleDateString()}
        </Text>
      )}
      {item.verifiedDate && item.verificationStatus !== 'pending' && (
        <Text style={appSharedStyles.itemDetailText}>
          Verified: {new Date(item.verifiedDate).toLocaleDateString()} by
          {verifier ? getUserDisplayName(verifier) : item.verifiedById}
        </Text>
      )}
      {item.actualPointsAwarded !== undefined && item.verificationStatus !== 'pending' && (
        <Text style={adminSharedStyles.taskItemTickets}>
          Awarded: {item.actualPointsAwarded ?? 0} Tickets
        </Text>
      )}
      {item.isComplete && item.verificationStatus === 'pending' && (
        <Text style={commonSharedStyles.pendingNote}>Awaiting verification...</Text>
      )}
      <View style={adminSharedStyles.assignedTaskActions}>
        {allowVerify && onInitiateVerification && (
          <Button title="Verify" onPress={() => onInitiateVerification(item)} disabled={disabled} />
        )}
        {allowDelete && (
          <Button
            title="Remove"
            onPress={() => onDelete(item.id)}
            color={colors.danger}
            disabled={!allowDelete || disabled}
          />
        )}
      </View>
    </View>
  );
};
