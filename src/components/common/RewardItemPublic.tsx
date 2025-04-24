import { Image, Text, View } from 'react-native';
import { RewardItem } from '../../mocks';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const RewardItemPublic = ({ item }: { item: RewardItem }) => (
  <View style={appSharedStyles.itemContainer}>
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
        {item.description && <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>}
      </View>
    </View>
  </View>
);
