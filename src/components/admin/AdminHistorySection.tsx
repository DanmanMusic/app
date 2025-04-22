// src/components/admin/AdminHistorySection.tsx
import React from 'react'; // Removed useState, useMemo, etc. if they were there
import { View, Text, FlatList } from 'react-native';

// Hooks
import { usePaginatedTicketHistory } from '../../hooks/usePaginatedTicketHistory'; // <-- Import hook

// Components
import PaginationControls from './PaginationControls'; // <-- Import pagination controls
import { TicketHistoryItem } from '../../views/StudentView'; // Assuming this item component is suitable

// Types (TicketTransaction implicitly used via hook return)
// import { TicketTransaction } from '../../mocks/mockTickets'; // No longer needed directly

// Styles
import { appSharedStyles } from '../../styles/appSharedStyles';

// Removed props: component now fetches its own data via hook
interface AdminHistorySectionProps {
    // Removed: allTicketHistory: TicketTransaction[];
}

export const AdminHistorySection: React.FC<AdminHistorySectionProps> = (/* Removed props */) => {
    // Use the hook to get paginated data and controls
    const {
        history, // This is the paginated list for the current page
        currentPage,
        totalPages,
        setPage,
        // isLoading, // Use later
        // error, // Use later
    } = usePaginatedTicketHistory();

    // Removed internal sorting/memoization if any existed

    return (
        <View>
            {/* TODO: Update title count if hook provides totalItems later */}
            <Text style={appSharedStyles.sectionTitle}>
                Full Ticket History
            </Text>
            <FlatList
                data={history} // Use paginated data from hook
                keyExtractor={item => item.id}
                renderItem={({ item }) => <TicketHistoryItem item={item} />}
                scrollEnabled={false} // Keep false if parent ScrollView handles scroll
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => (
                    <Text style={appSharedStyles.emptyListText}>No history entries found.</Text>
                )}
                // Add Pagination Controls as Footer
                ListFooterComponent={
                    totalPages > 1 ? (
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    ) : null
                }
                contentContainerStyle={{ paddingBottom: 10 }} // Ensure space for controls
            />
        </View>
    );
};