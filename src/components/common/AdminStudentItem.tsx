import { Button, Text, View } from 'react-native';
import { Instrument, SimplifiedStudent, UserRole } from '../../types/dataTypes';
import { getInstrumentNames } from '../../utils/helpers';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AdminStudentItem = ({
  student,
  instruments,
  onViewManage,
  onInitiateAssignTask,
}: {
  student: SimplifiedStudent;
  instruments: Instrument[];
  onViewManage: (studentId: string, role: UserRole) => void;
  onInitiateAssignTask: (studentId: string) => void;
}) => {
  return (
    <View
      style={[
        commonSharedStyles.baseItem,
        commonSharedStyles.baseRow,
        commonSharedStyles.justifySpaceBetween,
        !student.isActive ? commonSharedStyles.inactiveItem : {},
      ]}
    >
      <View>
        <Text style={commonSharedStyles.itemTitle}>{student.name}</Text>
        <Text style={commonSharedStyles.baseSecondaryText}>
          Instrument(s): {getInstrumentNames(student.instrumentIds, instruments)}
        </Text>
        <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textGold]}>
          Balance: {student.balance}
        </Text>
        <Text
          style={[
            commonSharedStyles.baseSecondaryText,
            { fontWeight: 'bold', color: student.isActive ? colors.success : colors.secondary },
          ]}
        >
          Status: {student.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <View
        style={[
          commonSharedStyles.baseRow,
          commonSharedStyles.baseGap,
          commonSharedStyles.baseSelfAlign,
        ]}
      >
        <Button
          title="View Details"
          onPress={() => {
            console.log(`[AdminStudentItem] Button Press - student.id: ${student?.id}`);
            onViewManage(student.id, 'student');
          }}
          color={colors.primary}
        />
        {student.isActive && (
          <Button
            title="Assign Task"
            onPress={() => onInitiateAssignTask(student.id)}
            color={colors.primary}
          />
        )}
      </View>
    </View>
  );
};
