import { Button, Text, View } from "react-native";
import { appSharedStyles } from "../../styles/appSharedStyles";
import { User, UserRole } from "../../types/userTypes";
import { adminSharedStyles } from "../../styles/adminSharedStyles";
import { getUserDisplayName } from "../../utils/helpers";
import { colors } from "../../styles/colors";

export const AdminUserItem = ({
  user,
  onViewManage,
}: {
  user: User;
  onViewManage: (userId: string, role: UserRole) => void;
}) => (
  <View
    style={[appSharedStyles.itemContainer, user.status === 'inactive' ? appSharedStyles.inactiveItem : {}]}
  >
    <Text style={appSharedStyles.itemTitle}>{getUserDisplayName(user)}</Text>
    <Text
      style={[
        appSharedStyles.itemDetailText,
        { fontWeight: 'bold', color: user.status === 'active' ? colors.success : colors.secondary },
      ]}
    >
      Status: {user.status}
    </Text>
    {user.role === 'parent' && user.linkedStudentIds && (
      <Text style={appSharedStyles.itemDetailText}>
        Linked Students: {user.linkedStudentIds.length}
      </Text>
    )}
    <View style={adminSharedStyles.itemActions}>
      <Button title="View/Edit Details" onPress={() => onViewManage(user.id, user.role)} />
    </View>
  </View>
);