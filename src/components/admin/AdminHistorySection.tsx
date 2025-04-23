import React from 'react'; // Removed useState if no local state needed
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';

// Import the TQ hook for paginated GLOBAL history
import { usePaginatedTicketHistory } from '../../hooks/usePaginatedTicketHistory';

// Import common components
import PaginationControls from './PaginationControls';
// Import the display component for a history item (or define locally)
import { TicketHistoryItem } from '../../views/StudentView'; // Assuming it's exported from StudentView or moved to common

// Import Prop Type
import { AdminHistorySectionProps } from '../../types/componentProps'; // Adjust path

// Import Styles
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';

// --- Main Section Component ---
// Use the imported prop type (currently empty)
export const AdminHistorySection: React.FC<AdminHistorySectionProps> = () => {

  // --- Use the TQ hook for paginated global history ---
  // This hook encapsulates useQuery and pagination logic
  const {
    history,          // The fetched list of transactions for the current page
    currentPage,
    totalPages,
    totalItems,       // Total count of all history items
    setPage,          // Function to change the page
    isLoading,        // Initial loading state
    isFetching,       // Fetching state (for background refresh/pagination)
    isError,          // Error state
    error,            // Error object
    // isPlaceholderData // Available if needed
  } = usePaginatedTicketHistory(); // Call without studentId for global history

  // Helper for error display
  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading ticket history: ${error.message}`;
  };

  return (
    <View>
      {/* Section Title - Use totalItems from the hook */}
      <Text style={appSharedStyles.sectionTitle}>Full Ticket History ({totalItems})</Text>

      {/* Loading State (Show indicator on initial load) */}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {/* Error State (Show error only if not loading initially) */}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
          {/* Optionally add a retry button here */}
        </View>
      )}

      {/* History List (Show if not initial loading and no error) */}
      {!isLoading && !isError && (
        <FlatList
          data={history} // Use the history array from the hook
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TicketHistoryItem item={item} />} // Use the history item component
          scrollEnabled={false} // Disable scroll within parent ScrollView
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            // Show appropriate message based on whether there was an error or just no data
            <Text style={appSharedStyles.emptyListText}>No history entries found.</Text>
          )}
          // Show fetching indicator at top when refetching/paginating
          ListHeaderComponent={
            isFetching && !isLoading ? <ActivityIndicator size="small" color={colors.secondary} /> : null
          }
          // Show pagination controls if more than one page exists
          ListFooterComponent={
            totalPages > 1 ? (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage} // Use the setPage function from the hook
              />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 10 }}
        />
      )}
    </View>
  );
};


// Styles for this section
const styles = StyleSheet.create({
  errorContainer: {
    marginVertical: 20,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 5,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});