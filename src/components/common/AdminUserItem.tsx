import { Button, Text, View } from 'react-native';

import { User, UserRole } from '../../types/dataTypes';
import { getUserDisplayName } from '../../utils/helpers';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AdminUserItem = ({
  user,
  onViewManage,
}: {
  user: User;
  onViewManage: (userId: string, role: UserRole) => void;
}) => (
  <View
    style={[
      commonSharedStyles.baseRow,
      commonSharedStyles.justifySpaceBetween,
      commonSharedStyles.baseItem,
      user.status === 'inactive' ? commonSharedStyles.inactiveItem : {},
    ]}
  >
    <View>
      <Text style={[commonSharedStyles.baseSubTitleText, commonSharedStyles.bold]}>
        {getUserDisplayName(user)}
      </Text>
      <Text
        style={[
          commonSharedStyles.baseSecondaryText,
          {
            fontWeight: 'bold',
            color: user.status === 'active' ? colors.success : colors.secondary,
          },
        ]}
      >
        Status: {user.status}
      </Text>
      {user.role === 'parent' && user.linkedStudentIds && (
        <Text style={commonSharedStyles.baseSecondaryText}>
          Linked Students: {user.linkedStudentIds.length}
        </Text>
      )}
    </View>
    <View>
      <Button title="View Details" onPress={() => onViewManage(user.id, user.role)} />
    </View>
  </View>
);
