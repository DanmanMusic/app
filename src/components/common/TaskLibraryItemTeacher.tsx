import { Text, View } from 'react-native';
import { TaskLibraryItem } from '../../types/dataTypes';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const TaskLibraryItemTeacher = ({ item }: { item: TaskLibraryItem }) => (
  <View style={commonSharedStyles.baseItem}>
    <Text style={appSharedStyles.itemTitle}>{item.title}</Text>
    <Text style={commonSharedStyles.baseSecondaryText}>{item.description}</Text>
    <Text style={[commonSharedStyles.baseSecondaryText, appSharedStyles.taskLibraryItemTickets]}>
      {item.baseTickets} Base Tickets
    </Text>
  </View>
);
