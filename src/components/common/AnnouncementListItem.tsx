import { Text, View } from 'react-native';

import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { Announcement } from '../../types/dataTypes';
import { timestampDisplay } from '../../utils/helpers';

export const AnnouncementListItem = ({ item }: { item: Announcement }) => (
  <View>
    <Text style={commonSharedStyles.itemTitle}>{item.title}</Text>
    <Text style={commonSharedStyles.baseSecondaryText}>{item.message}</Text>
    <Text style={commonSharedStyles.baseVeryLightText}>{timestampDisplay(item.date)}</Text>
  </View>
);
