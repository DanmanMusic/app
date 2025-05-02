import { Image, Text, View } from 'react-native';
import { RewardItem } from '../../types/dataTypes';
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
        canEarn ? commonSharedStyles.rewardItemAffordable : {},
        isGoal ? commonSharedStyles.rewardItemGoal : {},
      ]}
    >
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseAlignCenter]}>
        <Image
          source={{ uri: item.imageUrl }}
          style={commonSharedStyles.itemImageMedium}
          resizeMode="contain"
        />
        <View style={commonSharedStyles.flex1}>
          <Text style={commonSharedStyles.rewardName}>{item.name}</Text>
          <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textGold]}>
            {item.cost} Tickets
          </Text>
          {item.description && (
            <Text style={commonSharedStyles.baseSecondaryText}>{item.description}</Text>
          )}
          {canEarn ? (
            <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.textSuccess]}>
              Available Now!
            </Text>
          ) : (
            <Text style={[commonSharedStyles.baseSecondaryText, { color: colors.textPrimary }]}>
              Need {ticketsNeeded} more tickets
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};
