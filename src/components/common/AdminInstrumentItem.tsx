import { Button, Image, Text, View } from 'react-native';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { getInstrumentIconSource } from '../../utils/helpers';
import { AdminInstrumentItemProps } from '../../types/componentProps';

export const AdminInstrumentItem: React.FC<AdminInstrumentItemProps> = ({
  item,
  onEdit,
  onDelete,
  disabled,
}) => (
  <View style={appSharedStyles.itemContainer}>
    <View style={commonSharedStyles.itemContentRow}>
      <Image
        source={getInstrumentIconSource(item)}
        style={adminSharedStyles.instrumentIcon}
        resizeMode="contain"
      />
      <Text style={[appSharedStyles.itemTitle, adminSharedStyles.itemTitleText]}>{item.name}</Text>
    </View>
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
