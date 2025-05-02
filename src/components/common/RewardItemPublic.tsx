import { Image, Text, View } from 'react-native';
import { RewardItem } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const RewardItemPublic = ({ item }: { item: RewardItem }) => (
  <View style={commonSharedStyles.baseItem}>
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
      </View>
    </View>
  </View>
);
