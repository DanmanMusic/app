import { Text, View } from "react-native";
import { Announcement } from "../../mocks";
import { appSharedStyles } from "../../styles/appSharedStyles";
import { commonSharedStyles } from "../../styles/commonSharedStyles";

export const AnnouncementListItem = ({ item }: { item: Announcement }) => (
    <View style={appSharedStyles.itemContainer}>
      <Text style={commonSharedStyles.announcementTitle}>{item.title}</Text>
      <Text style={appSharedStyles.itemDetailText}>{item.message}</Text>
      <Text style={commonSharedStyles.announcementDate}>{new Date(item.date).toLocaleDateString()}</Text>
    </View>
);