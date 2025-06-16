// src/components/admin/AdminJourneySection.tsx
import React, { useState } from 'react';
import { View, Text, Button, FlatList, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { fetchJourneyLocations, deleteJourneyLocation, JourneyLocation } from '../../api/journey';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import ConfirmationModal from '../common/ConfirmationModal';
import CreateJourneyLocationModal from './modals/CreateJourneyLocationModal';
import EditJourneyLocationModal from './modals/EditJourneyLocationModal';

export const AdminJourneySection = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<JourneyLocation | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<JourneyLocation | null>(null);

  const queryClient = useQueryClient();

  const {
    data: locations = [],
    isLoading,
    isError,
    error,
  } = useQuery<JourneyLocation[], Error>({
    queryKey: ['journeyLocations'],
    queryFn: fetchJourneyLocations,
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJourneyLocation,
    onSuccess: (_, _deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['journeyLocations'] });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Journey Location deleted.' });
      closeDeleteModal();
    },
    onError: (err: Error) => {
      Toast.show({ type: 'error', text1: 'Deletion Failed', text2: err.message });
      closeDeleteModal();
    },
  });

  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (location: JourneyLocation) => {
    setLocationToEdit(location);
    setIsEditModalVisible(true);
  };
  const handleDeletePress = (location: JourneyLocation) => {
    setLocationToDelete(location);
    setIsDeleteModalVisible(true);
  };
  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setLocationToEdit(null);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setLocationToDelete(null);
    deleteMutation.reset();
  };
  const handleDeleteConfirm = () => {
    if (locationToDelete) deleteMutation.mutate(locationToDelete.id);
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
          Journey Locations ({locations.length})
        </Text>
      </View>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Create New Location" onPress={handleAddPress} color={colors.primary} />
      </View>
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}
      {isError && (
        <Text style={commonSharedStyles.errorText}>Error loading locations: {error.message}</Text>
      )}
      {!isLoading && !isError && (
        <FlatList
          data={locations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                commonSharedStyles.baseItem,
                commonSharedStyles.baseRow,
                commonSharedStyles.justifySpaceBetween,
                { alignItems: 'center' },
              ]}
            >
              <View style={commonSharedStyles.flex1}>
                <Text style={commonSharedStyles.itemTitle}>{item.name}</Text>
                <Text style={commonSharedStyles.baseSecondaryText}>
                  {item.description || '(No description)'}
                </Text>
                {/* NEW: Display the repeatable status */}
                <Text
                  style={[
                    commonSharedStyles.infoText,
                    {
                      textAlign: 'left',
                      marginLeft: 0,
                      color: item.can_reassign_tasks ? colors.success : colors.textLight,
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  {item.can_reassign_tasks ? 'Repeatable Tasks' : 'One-Time Completion'}
                </Text>
              </View>
              <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
                <Button
                  title="Edit"
                  onPress={() => handleEditPress(item)}
                  disabled={deleteMutation.isPending}
                  color={colors.warning}
                />
                <Button
                  title="Delete"
                  onPress={() => handleDeletePress(item)}
                  disabled={deleteMutation.isPending}
                  color={colors.danger}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={commonSharedStyles.baseEmptyText}>
              No Journey Locations found. Create one to get started!
            </Text>
          }
        />
      )}
      <CreateJourneyLocationModal visible={isCreateModalVisible} onClose={closeCreateModal} />
      <EditJourneyLocationModal
        visible={isEditModalVisible}
        locationToEdit={locationToEdit}
        onClose={closeEditModal}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete "${locationToDelete?.name || ''}"? This will remove the category from any linked tasks.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Location'}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        confirmDisabled={deleteMutation.isPending}
      />
    </View>
  );
};
