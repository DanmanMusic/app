import { Text, View } from 'react-native';
import { Announcement } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AnnouncementListItem = ({ item }: { item: Announcement }) => (
  <View>
    <Text style={commonSharedStyles.itemTitle}>{item.title}</Text>
    <Text style={commonSharedStyles.baseSecondaryText}>{item.message}</Text>
    <Text style={commonSharedStyles.baseVeryLightText}>
      {new Date(item.date).toLocaleDateString()}
    </Text>
  </View>
);
