import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { usePaginatedTicketHistory } from '../../hooks/usePaginatedTicketHistory';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminHistorySectionProps } from '../../types/componentProps';
import { TicketHistoryItem } from '../../views/StudentView';

import PaginationControls from './PaginationControls';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

export const AdminHistorySection: React.FC<AdminHistorySectionProps> = () => {
  const {
    history,
    currentPage,
    totalPages,
    totalItems,
    setPage,
    isLoading,
    isFetching,
    isError,
    error,
  } = usePaginatedTicketHistory();

  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading ticket history: ${error.message}`;
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Full Ticket History ({totalItems})</Text>
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}
      {isError && !isLoading && (
        <View style={commonSharedStyles.errorContainer}>
          <Text style={commonSharedStyles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TicketHistoryItem item={item} />}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No history entries found.</Text>
          )}
          ListHeaderComponent={
            isFetching && !isLoading ? (
              <ActivityIndicator size="small" color={colors.secondary} />
            ) : null
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 10 }}
        />
      )}
    </View>
  );
};