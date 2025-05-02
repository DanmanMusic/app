import { Image, Text, View } from 'react-native';
import { RewardItem } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const RewardItemPublic = ({ item }: { item: RewardItem }) => (
  <View style={commonSharedStyles.baseItem}>
    <View style={appSharedStyles.containerRowCenter}>
      <Image
        source={{ uri: item.imageUrl }}
        style={appSharedStyles.itemImageMedium}
        resizeMode="contain"
      />
      <View style={appSharedStyles.itemFlex}>
        <Text style={appSharedStyles.rewardName}>{item.name}</Text>
        <Text style={[commonSharedStyles.baseSecondaryText, appSharedStyles.textGold]}>
          {item.cost} Tickets
        </Text>
        {item.description && (
          <Text style={commonSharedStyles.baseSecondaryText}>{item.description}</Text>
        )}
      </View>
    </View>
  </View>
);
