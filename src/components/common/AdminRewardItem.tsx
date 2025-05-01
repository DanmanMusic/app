import { Button, Image, Text, View } from 'react-native';
import { RewardItem } from '../../types/dataTypes';
import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';
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
  <View style={commonSharedStyles.baseItem}>
    <View style={appSharedStyles.itemContentRow}>
      <Image
        source={{ uri: item.imageUrl }}
        style={appSharedStyles.itemImageMedium}
        resizeMode="contain"
      />
      <View style={appSharedStyles.itemDetailsContainer}>
        <Text style={appSharedStyles.itemTitle}>{item.name}</Text>
        <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
          {item.cost} Tickets
        </Text>
        {item.description && <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>}
      </View>
    </View>
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
