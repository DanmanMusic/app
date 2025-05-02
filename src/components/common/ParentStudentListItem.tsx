import { Button, Text, View } from 'react-native';
import { ParentStudentListItemProps } from '../../types/componentProps';
import { getUserDisplayName } from '../../utils/helpers';
import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const ParentStudentListItem: React.FC<ParentStudentListItemProps> = ({
  student,
  onSelectStudent,
}) => (
  <View style={commonSharedStyles.baseItem}>
    <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(student)}</Text>
    <Text
      style={[
        commonSharedStyles.baseSecondaryText,
        {
          fontWeight: 'bold',
          color: student.status === 'active' ? colors.success : colors.secondary,
        },
      ]}
    >
      Status: {student.status}
    </Text>
    <Button title="View Dashboard" onPress={() => onSelectStudent(student.id)} />
  </View>
);
