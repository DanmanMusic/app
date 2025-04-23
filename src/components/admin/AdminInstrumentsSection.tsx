// src/components/admin/AdminInstrumentsSection.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  Image,
  ActivityIndicator, // Added
  Alert, // Added
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Added

// API & Types
import { fetchInstruments, deleteInstrument } from '../../api/instruments'; // Use API file
import { Instrument } from '../../mocks/mockInstruments';

// Components & Utils
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { getInstrumentIconSource } from '../../utils/helpers';
import CreateInstrumentModal from './modals/CreateInstrumentModal';
import EditInstrumentModal from './modals/EditInstrumentModal';
import ConfirmationModal from '../common/ConfirmationModal';

// Interface updated: Removed data/CRUD props
interface AdminInstrumentsSectionProps {
  // No props needed for data/CRUD anymore
}

// Item Component (Add disabled prop)
const AdminInstrumentItem = ({
  item,
  onEdit,
  onDelete,
  disabled, // Added disabled prop
}: {
  item: Instrument;
  onEdit: (instrument: Instrument) => void;
  onDelete: (instrument: Instrument) => void;
  disabled?: boolean; // Disable buttons during delete
}) => (
  <View style={appSharedStyles.itemContainer}>
    <View style={styles.itemContent}>
      <Image
        source={getInstrumentIconSource(item.name)}
        style={styles.instrumentIcon}
        resizeMode="contain"
      />
      <Text style={[appSharedStyles.itemTitle, styles.itemTitleText]}>{item.name}</Text>
    </View>
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit" onPress={() => onEdit(item)} disabled={disabled} />
      <Button title="Delete" onPress={() => onDelete(item)} color={colors.danger} disabled={disabled} />
    </View>
  </View>
);

export const AdminInstrumentsSection: React.FC<AdminInstrumentsSectionProps> = () => {
  // Modal States
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [instrumentToEdit, setInstrumentToEdit] = useState<Instrument | null>(null);
  const [instrumentToDelete, setInstrumentToDelete] = useState<Instrument | null>(null);

  const queryClient = useQueryClient();

  // --- TanStack Query for fetching instruments ---
  const {
    data: instruments = [], // Default to empty array
    isLoading,
    isError,
    error,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'], // Unique query key
    queryFn: fetchInstruments, // API function
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // Data is sorted by name in the API handler/fetch function
  });

  // --- TanStack Mutation for deleting instruments ---
  const deleteMutation = useMutation({
    mutationFn: deleteInstrument, // API function: expects instrumentId
    onSuccess: (_, deletedInstrumentId) => {
      console.log(`Instrument ${deletedInstrumentId} deleted successfully via mutation.`);
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      closeDeleteModal();
    },
    onError: (err, deletedInstrumentId) => {
      console.error(`Error deleting instrument ${deletedInstrumentId}:`, err);
      closeDeleteModal();
    },
  });

  // Modal Handlers
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

  // Confirmation handler calls the delete mutation
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
    <View>
      <Text style={appSharedStyles.sectionTitle}>Instruments ({instruments.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Add New Instrument" onPress={handleAddPress} />
      </View>

      {/* Loading State */}
      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorMessage()}</Text>
        </View>
      )}

      {/* Data List */}
      {!isLoading && !isError && (
        <FlatList
          data={instruments} // Use data from useQuery
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminInstrumentItem
              item={item}
              onEdit={handleEditPress}
              onDelete={handleDeletePress}
              disabled={deleteMutation.isPending} // Disable row buttons if delete is happening
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No instruments found.</Text>
          )}
        />
      )}

      {/* Modals (Create/Edit handle their own mutations) */}
      <CreateInstrumentModal visible={isCreateModalVisible} onClose={closeCreateModal} />
      <EditInstrumentModal
        visible={isEditModalVisible}
        instrumentToEdit={instrumentToEdit}
        onClose={closeEditModal}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        // TODO: Add warning about potential impact on linked students if backend doesn't handle cascade
        message={`Are you sure you want to delete the instrument "${
          instrumentToDelete?.name || ''
        }"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Instrument'}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        confirmDisabled={deleteMutation.isPending}
      />
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  itemContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  instrumentIcon: { width: 40, height: 40, marginRight: 15 },
  itemTitleText: { flexShrink: 1, marginBottom: 0 }, // Allow text to wrap if needed
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