import { Button, Text, View } from 'react-native';
import { Instrument, SimplifiedStudent } from '../../types/dataTypes';
import { getInstrumentNames } from '../../utils/helpers';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const StudentListItem = ({
  student,
  instruments,
  onViewProfile,
  onAssignTask,
}: {
  student: SimplifiedStudent;
  instruments: Instrument[];
  onViewProfile: (studentId: string) => void;
  onAssignTask: (studentId: string) => void;
}) => (
  <View
    style={[
      commonSharedStyles.baseRow,
      commonSharedStyles.justifySpaceBetween,
      commonSharedStyles.baseItem,
      !student.isActive ? commonSharedStyles.inactiveItem : {},
    ]}
  >
    <View style={commonSharedStyles.flex1}>
      <Text style={commonSharedStyles.itemTitle}>{student.name}</Text>
      <Text style={commonSharedStyles.baseSecondaryText}>
        Instrument(s): {getInstrumentNames(student.instrumentIds, instruments)}
      </Text>
      <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textGold]}>
        Balance: {student.balance} Tickets
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
    <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
      <Button title="View Profile" onPress={() => onViewProfile(student.id)} />
      {student.isActive && <Button title="Assign Task" onPress={() => onAssignTask(student.id)} />}
    </View>
  </View>
);
