import React from 'react';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { AdminTasksSectionProps } from '../../types/componentProps';
import { adminSharedStyles } from '../../styles/adminSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminTaskLibraryItem } from '../common/AdminTaskLibraryItem';

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
        <Button
          title="Create New Task Library Item (TODO)"
          onPress={() => alert('TODO: Open Create Task Modal')}
        />
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