import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { TicketTransaction } from '../../mocks/mockTickets';
import { TicketHistoryItem } from '../../views/StudentView';
import { appSharedStyles } from '../../styles/appSharedStyles';

interface AdminHistorySectionProps {
  allTicketHistory: TicketTransaction[];
}

export const AdminHistorySection: React.FC<AdminHistorySectionProps> = ({ allTicketHistory }) => {
  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>
        Full Ticket History ({allTicketHistory.length})
      </Text>
      <FlatList
        data={allTicketHistory.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TicketHistoryItem item={item} />}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No history entries found.</Text>
        )}
      />
    </View>
  );
};
