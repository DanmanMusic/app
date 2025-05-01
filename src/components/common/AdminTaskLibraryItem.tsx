import { Button, Text, View } from 'react-native';

import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { AdminTaskLibraryItemProps } from '../../types/componentProps';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AdminTaskLibraryItem: React.FC<AdminTaskLibraryItemProps> = ({
  item,
  onEdit,
  onDelete,
  disabled,
}) => (
  <View style={commonSharedStyles.baseItem}>
    <Text style={appSharedStyles.itemTitle}>
      {item.title} ({item.baseTickets} pts)
    </Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <View style={appSharedStyles.itemActions}>
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
