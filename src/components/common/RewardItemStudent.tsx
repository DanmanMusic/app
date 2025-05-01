import { Image, Text, View } from 'react-native';
import { RewardItem } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';

export const RewardItemStudent = ({
  item,
  currentBalance,
  isGoal,
}: {
  item: RewardItem;
  currentBalance: number;
  isGoal: boolean;
}) => {
  const canEarn = currentBalance >= item.cost;
  const ticketsNeeded = item.cost - currentBalance;

  return (
    <View
      style={[
        commonSharedStyles.baseItem,
        canEarn ? appSharedStyles.rewardItemAffordable : {},
        isGoal ? appSharedStyles.rewardItemGoal : {},
      ]}
    >
      <View style={commonSharedStyles.itemContentRow}>
        <Image
          source={{ uri: item.imageUrl }}
          style={commonSharedStyles.itemImageMedium}
          resizeMode="contain"
        />
        <View style={commonSharedStyles.itemDetailsContainer}>
          <Text style={commonSharedStyles.rewardName}>{item.name}</Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
            {item.cost} Tickets
          </Text>
          {item.description && (
            <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
          )}
          {canEarn ? (
            <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textSuccess]}>
              Available Now!
            </Text>
          ) : (
            <Text style={[appSharedStyles.itemDetailText, { color: colors.textPrimary }]}>
              Need {ticketsNeeded} more tickets
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};
