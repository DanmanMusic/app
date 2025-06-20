import { Image, Text, View } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { RewardItem } from '../../types/dataTypes';
import { CustomButton } from './CustomButton';
import { TrashIcon } from 'react-native-heroicons/solid';

export const AdminRewardItem = ({
  item,
  onEdit,
  onDelete,
  disabled,
}: {
  item: RewardItem;
  onEdit: (reward: RewardItem) => void;
  onDelete: (reward: RewardItem) => void;
  disabled?: boolean;
}) => (
  <View
    style={[
      commonSharedStyles.baseRow,
      commonSharedStyles.justifySpaceBetween,
      commonSharedStyles.baseItem,
    ]}
  >
    <View>
      <Image
        source={{ uri: item.imageUrl }}
        style={commonSharedStyles.baseIcon}
        resizeMode="contain"
      />
      <View>
        <Text style={[commonSharedStyles.baseSubTitleText]}>{item.name}</Text>
        <Text style={[commonSharedStyles.baseSecondaryText]}>{item.cost} Tickets</Text>
        {item.description && (
          <Text style={commonSharedStyles.baseSecondaryText}>{item.description}</Text>
        )}
      </View>
    </View>
    <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
      <CustomButton
        title="Edit"
        onPress={() => onEdit(item)}
        disabled={disabled}
        color={colors.primary}
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
