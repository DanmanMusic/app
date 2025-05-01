import { Button, Image, Text, View } from 'react-native';
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
  <View style={commonSharedStyles.baseItem}>
    <View style={appSharedStyles.containerRowCenter}>
      <Image
        source={getInstrumentIconSource(item)}
        style={appSharedStyles.instrumentIcon}
        resizeMode="contain"
      />
      <Text style={[appSharedStyles.itemTitle, appSharedStyles.itemTitleText]}>{item.name}</Text>
    </View>
    <View>
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
