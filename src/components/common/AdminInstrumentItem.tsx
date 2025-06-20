import { Image, Text, View } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminInstrumentItemProps } from '../../types/componentProps';
import { getInstrumentIconSource } from '../../utils/helpers';
import { CustomButton } from './CustomButton';
import { PencilSquareIcon, TrashIcon } from 'react-native-heroicons/solid';

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
      <CustomButton
        title="Edit"
        onPress={() => onEdit(item)}
        disabled={disabled}
        color={colors.primary}
        leftIcon={<PencilSquareIcon color={colors.textWhite} size={18} />}
      />
      <CustomButton
        title="Delete"
        onPress={() => onDelete(item)}
        color={colors.danger}
        disabled={disabled}
        leftIcon={<TrashIcon color={colors.textWhite} size={18} />}
      />
    </View>
  </View>
);
