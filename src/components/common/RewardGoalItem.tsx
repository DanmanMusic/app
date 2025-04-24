import { Image, Text, TouchableOpacity, View } from "react-native";
import { RewardItem } from "../../mocks";
import { appSharedStyles } from "../../styles/appSharedStyles";
import { modalSharedStyles } from "../../styles/modalSharedStyles";

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
          appSharedStyles.itemContainer,
          modalSharedStyles.goalSelectItem,
          isCurrentGoal ? modalSharedStyles.currentGoalItem : {},
        ]}
      >
        <View style={modalSharedStyles.goalSelectItemContent}>
          <Image
            source={{ uri: item.imageUrl }}
            style={modalSharedStyles.goalSelectImage}
            resizeMode="contain"
          />
          <View style={modalSharedStyles.goalSelectDetails}>
            <Text style={modalSharedStyles.goalSelectName}>{item.name}</Text>
            <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
              {item.cost} Tickets
            </Text>
            {!canAfford && <Text style={modalSharedStyles.cannotAffordText}>(Need more tickets)</Text>}
          </View>
          {isCurrentGoal && <Text style={modalSharedStyles.checkmark}>✓</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );