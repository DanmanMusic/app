import React from 'react';

import { View, Text, FlatList, ActivityIndicator } from 'react-native';

import PaginationControls from './PaginationControls';
import { usePaginatedTicketHistory } from '../../hooks/usePaginatedTicketHistory';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { TicketHistoryItem } from '../common/TicketHistoryItem';

export const AdminHistorySection = () => {
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
    <View style={commonSharedStyles.baseMargin}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifyCenter]}>
        <Text
          style={[
            commonSharedStyles.baseTitleText,
            commonSharedStyles.baseMarginTopBottom,
            commonSharedStyles.bold,
          ]}
        >
          Full Ticket History ({totalItems})
        </Text>
      </View>
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
            <Text style={commonSharedStyles.baseEmptyText}>No history entries found.</Text>
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
