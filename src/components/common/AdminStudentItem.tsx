import { Button, Text, View } from 'react-native';
import { Instrument } from '../../mocks';
import { SimplifiedStudent, UserRole } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { getInstrumentNames } from '../../utils/helpers';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';

export const AdminStudentItem = ({
  student,
  mockInstruments,
  onViewManage,
  onInitiateAssignTask,
}: {
  student: SimplifiedStudent;
  mockInstruments: Instrument[];
  onViewManage: (studentId: string, role: UserRole) => void;
  onInitiateAssignTask: (studentId: string) => void;
}) => {
  return (
    <View
      style={[appSharedStyles.itemContainer, !student.isActive ? appSharedStyles.inactiveItem : {}]}
    >
      <Text style={appSharedStyles.itemTitle}>{student.name}</Text>
      <Text style={appSharedStyles.itemDetailText}>
        Instrument(s): {getInstrumentNames(student.instrumentIds, mockInstruments)}
      </Text>
      <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
        Balance: {student.balance}
      </Text>
      <Text
        style={[
          appSharedStyles.itemDetailText,
          { fontWeight: 'bold', color: student.isActive ? colors.success : colors.secondary },
        ]}
      >
        Status: {student.isActive ? 'Active' : 'Inactive'}
      </Text>
      <View style={adminSharedStyles.itemActions}>
        <Button
          title="View Details"
          onPress={() => {
            console.log(`[AdminStudentItem] Button Press - student.id: ${student?.id}`);
            onViewManage(student.id, 'student');
          }}
        />
        {student.isActive && (
          <Button title="Assign Task" onPress={() => onInitiateAssignTask(student.id)} />
        )}
      </View>
    </View>
  );
};
