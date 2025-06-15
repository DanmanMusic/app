// src/components/common/RewardGoalItem.tsx
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { RewardItem } from '../../types/dataTypes';

export const RewardGoalItem = ({
  item,
  isCurrentGoal,
  canAfford,
  onSelect,
  othersSavingText,
}: {
  item: RewardItem;
  isCurrentGoal: boolean;
  canAfford: boolean;
  onSelect: (id: string) => void;
  othersSavingText: string | null;
}) => (
  <TouchableOpacity onPress={() => onSelect(item.id)}>
    <View
      style={[
        commonSharedStyles.baseItem,
        commonSharedStyles.goalSelectItem,
        isCurrentGoal ? commonSharedStyles.currentGoalItem : {},
      ]}
    >
      <View style={commonSharedStyles.goalSelectItemContent}>
        <Image
          source={{ uri: item.imageUrl }}
          style={commonSharedStyles.goalSelectImage}
          resizeMode="contain"
        />
        <View style={commonSharedStyles.goalSelectDetails}>
          <Text style={commonSharedStyles.goalSelectName}>{item.name}</Text>
          <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textGold]}>
            {item.cost} Tickets
          </Text>
          {!canAfford && !isCurrentGoal && (
            <Text style={commonSharedStyles.cannotAffordText}>(Need more tickets)</Text>
          )}
          {othersSavingText && <Text style={commonSharedStyles.infoText}>{othersSavingText}</Text>}
        </View>
        {isCurrentGoal && <Text style={commonSharedStyles.checkmark}>✓</Text>}
      </View>
    </View>
  </TouchableOpacity>
);
