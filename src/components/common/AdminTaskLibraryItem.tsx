import { Button, Text, View } from "react-native";
import { TaskLibraryItem } from "../../mocks";
import { colors } from "../../styles/colors";
import { appSharedStyles } from "../../styles/appSharedStyles";
import { adminSharedStyles } from "../../styles/adminSharedStyles";

export const AdminTaskLibraryItem = ({ item }: { item: TaskLibraryItem }) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>
      {item.title} ({item.baseTickets} pts)
    </Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit (TODO)" onPress={() => alert(`TODO: Edit ${item.id}`)} />
      <Button
        title="Delete (TODO)"
        onPress={() => alert(`TODO: Delete ${item.id}`)}
        color={colors.danger}
      />
    </View>
  </View>
);