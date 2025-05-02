import { Button, Text, View } from 'react-native';
import { colors } from '../../styles/colors';
import { AdminTaskLibraryItemProps } from '../../types/componentProps';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AdminTaskLibraryItem: React.FC<AdminTaskLibraryItemProps> = ({
  item,
  onEdit,
  onDelete,
  disabled,
}) => (
  <View
    style={[
      commonSharedStyles.baseRow,
      commonSharedStyles.justifySpaceBetween,
      commonSharedStyles.baseItem,
    ]}
  >
    <View>
      <Text style={commonSharedStyles.baseSubTitleText}>
        {item.title} ({item.baseTickets} pts)
      </Text>
      <Text style={commonSharedStyles.baseSecondaryText}>{item.description}</Text>
    </View>
    <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
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
