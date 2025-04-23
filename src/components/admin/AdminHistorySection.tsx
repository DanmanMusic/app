// src/components/admin/AdminHistorySection.tsx
import React from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native'; // Added ActivityIndicator, StyleSheet

// Hooks
import { usePaginatedTicketHistory } from '../../hooks/usePaginatedTicketHistory';

// Components
import PaginationControls from './PaginationControls';
import { TicketHistoryItem } from '../../views/StudentView'; // Re-use display component

// Styles
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors'; // Import colors for error style

// Props interface remains empty as data is fetched internally
interface AdminHistorySectionProps {}

export const AdminHistorySection: React.FC<AdminHistorySectionProps> = () => {
  // Use the hook to get paginated data and controls
  const {
    history, // This is the paginated list for the current page
    currentPage,
    totalPages,
    totalItems, // Get total count
    setPage,
    isLoading, // Get loading state
    isFetching, // Get fetching state for background updates
    isError, // Get error state
    error, // Get error object
  } = usePaginatedTicketHistory(); // Call hook without arguments for global history

  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading ticket history: ${error.message}`;
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Full Ticket History ({totalItems})</Text>

      {/* Loading State */}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
          {/* Optional: Add retry button? */}
        </View>
      )}

      {/* Data List (Render only if not initial loading and no error) */}
      {!isLoading && !isError && (
        <FlatList
          data={history} // Use paginated data from hook
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TicketHistoryItem item={item} />}
          scrollEnabled={false} // Keep false if parent ScrollView handles scroll
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No history entries found.</Text>
          )}
          ListHeaderComponent={isFetching ? <ActivityIndicator size="small" color={colors.secondary}/> : null} // Show small indicator during refetch
          // Add Pagination Controls as Footer
          ListFooterComponent={
            totalPages > 1 ? (
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 10 }} // Ensure space for controls
        />
      )}
    </View>
  );
};

// Add local styles for error display
const styles = StyleSheet.create({
  errorContainer: {
    marginVertical: 20,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#ffebee', // Light red background
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