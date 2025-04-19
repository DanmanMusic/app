// src/components/admin/AdminHistorySection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList } from 'react-native';

// Import types
import { TicketTransaction } from '../../mocks/mockTickets';

// Reuse TicketHistoryItem component from PupilView (ensure it doesn't depend on PupilView's local styles)
import { TicketHistoryItem } from '../../views/PupilView';

// Import shared styles
import { adminSharedStyles } from './adminSharedStyles';


interface AdminHistorySectionProps {
    allTicketHistory: TicketTransaction[];
}

export const AdminHistorySection: React.FC<AdminHistorySectionProps> = ({
    allTicketHistory,
}) => {
    return (
        <View>
            {/* Use shared sectionTitle style */}
            <Text style={adminSharedStyles.sectionTitle}>Full Ticket History ({allTicketHistory.length})</Text>
            <FlatList
                data={allTicketHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TicketHistoryItem item={item} />} // Reuse TicketHistoryItem
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => <Text style={adminSharedStyles.emptyListText}>No history entries found.</Text>}
            />
        </View>
    );
};
