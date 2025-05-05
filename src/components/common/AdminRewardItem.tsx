import { Button, Image, Text, View } from 'react-native';
import { RewardItem } from '../../types/dataTypes';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

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
