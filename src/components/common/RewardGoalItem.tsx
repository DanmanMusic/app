import { Image, Text, TouchableOpacity, View } from 'react-native';
import { RewardItem } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const RewardGoalItem = ({
  item,
  isCurrentGoal,
  canAfford,
  onSelect,
}: {
  item: RewardItem;
  isCurrentGoal: boolean;
  canAfford: boolean;
  onSelect: (id: string) => void;
}) => (
  <TouchableOpacity onPress={() => onSelect(item.id)}>
    <View
      style={[
        commonSharedStyles.baseItem,
        appSharedStyles.goalSelectItem,
        isCurrentGoal ? appSharedStyles.currentGoalItem : {},
      ]}
    >
      <View style={appSharedStyles.goalSelectItemContent}>
        <Image
          source={{ uri: item.imageUrl }}
          style={appSharedStyles.goalSelectImage}
          resizeMode="contain"
        />
        <View style={appSharedStyles.goalSelectDetails}>
          <Text style={appSharedStyles.goalSelectName}>{item.name}</Text>
          <Text style={[commonSharedStyles.baseSecondaryText, appSharedStyles.textGold]}>
            {item.cost} Tickets
          </Text>
          {!canAfford && <Text style={appSharedStyles.cannotAffordText}>(Need more tickets)</Text>}
        </View>
        {isCurrentGoal && <Text style={appSharedStyles.checkmark}>✓</Text>}
      </View>
    </View>
  </TouchableOpacity>
);
