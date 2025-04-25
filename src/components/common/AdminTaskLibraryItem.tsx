import { Button, Text, View } from 'react-native';

import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { AdminTaskLibraryItemProps } from '../../types/componentProps';

export const AdminTaskLibraryItem: React.FC<AdminTaskLibraryItemProps> = ({
  item,
  onEdit,
  onDelete,
  disabled,
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>
      {item.title} ({item.baseTickets} pts)
    </Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit" onPress={() => onEdit(item)} disabled={disabled} />
      <Button
        title="Delete"
        onPress={() => onDelete(item)}
        color={colors.danger}
        disabled={disabled}
      />
    </View>
  </View>
);
