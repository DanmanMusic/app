import { Text, View } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { ParentStudentListItemProps } from '../../types/componentProps';
import { getUserDisplayName } from '../../utils/helpers';
import { CustomButton } from './CustomButton';
import { GlobeAltIcon } from 'react-native-heroicons/solid';

export const ParentStudentListItem: React.FC<ParentStudentListItemProps> = ({
  student,
  onSelectStudent,
}) => (
  <View
    style={[
      commonSharedStyles.baseItem,
      commonSharedStyles.baseRow,
      commonSharedStyles.justifySpaceBetween,
    ]}
  >
    <View>
      <Text style={commonSharedStyles.itemTitle}>{getUserDisplayName(student)}</Text>
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
    </View>
    <View>
      {student.status === 'active' && (
        <CustomButton
          title="Dashboard"
          onPress={() => onSelectStudent(student.id)}
          color={colors.primary}
          leftIcon={<GlobeAltIcon color={colors.textWhite} size={18} />}
        />
      )}
    </View>
  </View>
);
