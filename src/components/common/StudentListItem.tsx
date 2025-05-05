import { Button, Text, View } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { Instrument, SimplifiedStudent } from '../../types/dataTypes';
import { getInstrumentNames } from '../../utils/helpers';

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
      <Button
        title="View Profile"
        onPress={() => onViewProfile(student.id)}
        color={colors.primary}
      />
      {student.isActive && (
        <Button
          title="Assign Task"
          onPress={() => onAssignTask(student.id)}
          color={colors.primary}
        />
      )}
    </View>
  </View>
);
