import { Text, View } from 'react-native';
import { Announcement } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AnnouncementListItem = ({ item }: { item: Announcement }) => (
  <View style={commonSharedStyles.baseItem}>
    <Text style={commonSharedStyles.baseSubTitleText}>{item.title}</Text>
    <Text style={commonSharedStyles.baseSecondaryText}>{item.message}</Text>
    <Text style={commonSharedStyles.baseVeryLightText}>
      {new Date(item.date).toLocaleDateString()}
    </Text>
  </View>
);
