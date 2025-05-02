import { Text, View } from 'react-native';
import { TaskLibraryItem } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const TaskLibraryItemTeacher = ({ item }: { item: TaskLibraryItem }) => (
  <View style={commonSharedStyles.baseItem}>
    <Text style={commonSharedStyles.itemTitle}>{item.title}</Text>
    <Text style={commonSharedStyles.baseSecondaryText}>{item.description}</Text>
    <Text style={[commonSharedStyles.baseSecondaryText, commonSharedStyles.taskLibraryItemTickets]}>
      {item.baseTickets} Base Tickets
    </Text>
  </View>
);
