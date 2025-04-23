import React from 'react';

import { View, Text, Button, FlatList, ActivityIndicator, StyleSheet } from 'react-native';

import { TaskLibraryItem } from '../../mocks/mockTaskLibrary';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminTasksSectionProps } from '../../types/componentProps';

import { adminSharedStyles } from './adminSharedStyles';

const AdminTaskLibraryItem = ({ item }: { item: TaskLibraryItem }) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>
      {' '}
      {item.title} ({item.baseTickets} pts){' '}
    </Text>
    <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
    <View style={adminSharedStyles.itemActions}>
      {}
      <Button title="Edit (TODO)" onPress={() => alert(`TODO: Edit ${item.id}`)} />
      <Button
        title="Delete (TODO)"
        onPress={() => alert(`TODO: Delete ${item.id}`)}
        color={colors.danger}
      />
    </View>
  </View>
);

export const AdminTasksSection: React.FC<AdminTasksSectionProps> = ({
  taskLibrary,
  isLoading,
  isError,
  onInitiateAssignTask,
  onInitiateVerification,
}) => {
  const getErrorMessage = () => {
    return 'Error loading task library.';
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Task Management</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 20, gap: 5 }}>
        <Button title="Assign Task to Student" onPress={onInitiateAssignTask} />
      </View>
      <Text style={adminSharedStyles.sectionSubTitle}>Task Library ({taskLibrary.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        {}
        {}
        <Button
          title="Create New Task Library Item (TODO)"
          onPress={() => alert('TODO: Open Create Task Modal')}
        />
      </View>
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={taskLibrary}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <AdminTaskLibraryItem item={item} />}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No task library items found.</Text>
          )}
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
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
