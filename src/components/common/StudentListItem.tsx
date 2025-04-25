import { Button, Text, View } from 'react-native';
import { Instrument, SimplifiedStudent } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { getInstrumentNames } from '../../utils/helpers';
import { colors } from '../../styles/colors';

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
      appSharedStyles.itemContainer,
      !student.isActive ? appSharedStyles.inactiveItemStyle : {},
    ]}
  >
    <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
    <Text style={appSharedStyles.itemDetailText}>
      Instrument(s): {getInstrumentNames(student.instrumentIds, instruments)}
    </Text>
    <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
      Balance: {student.balance} Tickets
    </Text>
    <Text
      style={[
        appSharedStyles.itemDetailText,
        { fontWeight: 'bold', color: student.isActive ? colors.success : colors.secondary },
      ]}
    >
      Status: {student.isActive ? 'Active' : 'Inactive'}
    </Text>
    <View style={appSharedStyles.studentActions}>
      <Button title="View Profile" onPress={() => onViewProfile(student.id)} />
      {student.isActive && <Button title="Assign Task" onPress={() => onAssignTask(student.id)} />}
    </View>
  </View>
);
