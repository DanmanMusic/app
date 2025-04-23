
import React from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native'; 


import { usePaginatedTicketHistory } from '../../hooks/usePaginatedTicketHistory';


import PaginationControls from './PaginationControls';
import { TicketHistoryItem } from '../../views/StudentView'; 


import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors'; 


interface AdminHistorySectionProps {}

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

      {}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
          {}
        </View>
      )}

      {}
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
            isFetching ? <ActivityIndicator size="small" color={colors.secondary} /> : null
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
