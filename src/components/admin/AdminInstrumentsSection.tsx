import React, { useState } from 'react';

import { View, Text, FlatList, ActivityIndicator } from 'react-native';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Toast from 'react-native-toast-message';

import { fetchInstruments, deleteInstrument } from '../../api/instruments';
import { colors } from '../../styles/colors';
import { Instrument } from '../../types/dataTypes';
import ConfirmationModal from '../common/ConfirmationModal';
import CreateInstrumentModal from './modals/CreateInstrumentModal';
import EditInstrumentModal from './modals/EditInstrumentModal';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminInstrumentItem } from '../common/AdminInstrumentItem';
import { CustomButton } from '../common/CustomButton';
import { PlusIcon } from 'react-native-heroicons/solid';

export const AdminInstrumentsSection = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [instrumentToEdit, setInstrumentToEdit] = useState<Instrument | null>(null);
  const [instrumentToDelete, setInstrumentToDelete] = useState<Instrument | null>(null);

  const queryClient = useQueryClient();

  const {
    data: instruments = [],
    isLoading,
    isError,
    error,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInstrument,
    onSuccess: (_, deletedInstrumentId) => {
      console.log(`Instrument ${deletedInstrumentId} deleted successfully via mutation.`);

      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      closeDeleteModal();
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Instrument deleted.',
        position: 'bottom',
      });
    },
    onError: (err, deletedInstrumentId) => {
      console.error(`Error deleting instrument ${deletedInstrumentId}:`, err);
      closeDeleteModal();
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: err instanceof Error ? err.message : 'Could not delete instrument.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    },
  });

  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (instrument: Instrument) => {
    setInstrumentToEdit(instrument);
    setIsEditModalVisible(true);
  };
  const handleDeletePress = (instrument: Instrument) => {
    setInstrumentToDelete(instrument);
    setIsDeleteModalVisible(true);
  };

  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setInstrumentToEdit(null);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setInstrumentToDelete(null);
    deleteMutation.reset();
  };

  const handleDeleteConfirm = () => {
    if (instrumentToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(instrumentToDelete.id);
    }
  };

  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading instruments: ${error.message}`;
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
          Instruments ({instruments.length})
        </Text>
      </View>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <CustomButton
          title="Add New Instrument"
          onPress={handleAddPress}
          color={colors.primary}
          leftIcon={<PlusIcon color={colors.textWhite} size={18} />}
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
          data={instruments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminInstrumentItem
              item={item}
              onEdit={handleEditPress}
              onDelete={handleDeletePress}
              disabled={deleteMutation.isPending}
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={commonSharedStyles.baseEmptyText}>No instruments found.</Text>
          )}
        />
      )}
      <CreateInstrumentModal visible={isCreateModalVisible} onClose={closeCreateModal} />
      <EditInstrumentModal
        visible={isEditModalVisible}
        instrumentToEdit={instrumentToEdit}
        onClose={closeEditModal}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the instrument "${instrumentToDelete?.name || ''}"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Instrument'}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        confirmDisabled={deleteMutation.isPending}
      />
    </View>
  );
};
