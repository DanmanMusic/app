import { Text, View } from 'react-native';
import { TaskLibraryItem } from '../../mocks';
import { appSharedStyles } from '../../styles/appSharedStyles';

export const TaskLibraryItemTeacher = ({ item }: { item: TaskLibraryItem }) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>{item.title}</Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <Text style={[appSharedStyles.itemDetailText, appSharedStyles.taskLibraryItemTickets]}>
      {item.baseTickets} Base Tickets
    </Text>
  </View>
);
