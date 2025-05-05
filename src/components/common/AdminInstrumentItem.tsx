import { Button, Image, Text, View } from 'react-native';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { getInstrumentIconSource } from '../../utils/helpers';
import { AdminInstrumentItemProps } from '../../types/componentProps';

export const AdminInstrumentItem: React.FC<AdminInstrumentItemProps> = ({
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
    <View style={[commonSharedStyles.baseRowCentered, commonSharedStyles.baseAlignCenter]}>
      <Image
        source={getInstrumentIconSource(item)}
        style={commonSharedStyles.baseIcon}
        resizeMode="contain"
      />
      <Text style={[commonSharedStyles.baseSubTitleText]}>{item.name}</Text>
    </View>
    <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
      <Button
        title="Edit"
        onPress={() => onEdit(item)}
        disabled={disabled}
        color={colors.primary}
      />
      <Button
        title="Delete"
        onPress={() => onDelete(item)}
        color={colors.danger}
        disabled={disabled}
      />
    </View>
  </View>
);
