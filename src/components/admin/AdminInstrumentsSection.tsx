import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  Image,
  ActivityIndicator,
  // Alert, // Keep or remove depending on feedback preference
} from 'react-native';
// Import TQ hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Import API functions
import { fetchInstruments, createInstrument, updateInstrument, deleteInstrument } from '../../api/instruments';
// Import Type
import { Instrument } from '../../mocks/mockInstruments';
// Import Prop Type
import { AdminInstrumentsSectionProps } from '../../types/componentProps'; // Adjust path

// Import Styles and Utils
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import { getInstrumentIconSource } from '../../utils/helpers'; // For displaying icons

// Import Modals used by this section
import CreateInstrumentModal from './modals/CreateInstrumentModal';
import EditInstrumentModal from './modals/EditInstrumentModal';
import ConfirmationModal from '../common/ConfirmationModal'; // For delete confirmation

// --- Sub-Component: AdminInstrumentItem ---
// Renders a single instrument item with Edit/Delete buttons
const AdminInstrumentItem = ({
  item,
  onEdit,
  onDelete,
  disabled, // To disable buttons during delete mutation
}: {
  item: Instrument;
  onEdit: (instrument: Instrument) => void;
  onDelete: (instrument: Instrument) => void;
  disabled?: boolean;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <View style={styles.itemContent}>
      <Image
        source={getInstrumentIconSource(item.name)} // Use helper to get icon
        style={styles.instrumentIcon}
        resizeMode="contain"
      />
      <Text style={[appSharedStyles.itemTitle, styles.itemTitleText]}>{item.name}</Text>
    </View>
    {/* Action Buttons */}
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit" onPress={() => onEdit(item)} disabled={disabled} />
      <Button
        title="Delete"
        onPress={() => onDelete(item)}
        color={colors.danger}
        disabled={disabled}
      />
    </View>
  </View>
);
// --- End Sub-Component ---


// --- Main Section Component ---
export const AdminInstrumentsSection: React.FC<AdminInstrumentsSectionProps> = () => { // Uses the imported prop type

  // --- State for Modals ---
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [instrumentToEdit, setInstrumentToEdit] = useState<Instrument | null>(null);
  const [instrumentToDelete, setInstrumentToDelete] = useState<Instrument | null>(null);

  const queryClient = useQueryClient();

  // --- TQ Query for fetching instruments ---
  const {
    data: instruments = [], // Default to empty array
    isLoading,
    isError,
    error,
  } = useQuery<Instrument[], Error>({
    queryKey: ['instruments'], // Unique key for instruments data
    queryFn: fetchInstruments, // API function
    staleTime: Infinity, // Instruments change infrequently, cache longer
    gcTime: Infinity,
  });

  // --- TQ Mutations for CRUD operations ---
  // Delete mutation handled here for confirmation modal trigger.
  // Create/Edit mutations handled within their respective modals.

  const deleteMutation = useMutation({
    mutationFn: deleteInstrument, // API function for deleting
    onSuccess: (_, deletedInstrumentId) => {
      console.log(`Instrument ${deletedInstrumentId} deleted successfully via mutation.`);
      // Invalidate the query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      closeDeleteModal(); // Close the confirmation modal
    },
    onError: (err, deletedInstrumentId) => {
      console.error(`Error deleting instrument ${deletedInstrumentId}:`, err);
      alert(`Failed to delete instrument: ${err instanceof Error ? err.message : 'Unknown error'}`);
      closeDeleteModal();
    },
  });

  // --- Event Handlers ---
  // Open Modals
  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (instrument: Instrument) => {
    setInstrumentToEdit(instrument);
    setIsEditModalVisible(true);
  };
  const handleDeletePress = (instrument: Instrument) => {
    setInstrumentToDelete(instrument);
    setIsDeleteModalVisible(true);
  };

  // Close Modals
  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setInstrumentToEdit(null);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setInstrumentToDelete(null);
    deleteMutation.reset(); // Reset mutation state
  };

  // Confirm Delete Action
  const handleDeleteConfirm = () => {
    if (instrumentToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(instrumentToDelete.id); // Trigger the mutation
    }
  };

  // Helper for error display
  const getErrorMessage = () => {
    if (!error) return 'An unknown error occurred.';
    return `Error loading instruments: ${error.message}`;
  };

  return (
    <View>
      {/* Section Title */}
      <Text style={appSharedStyles.sectionTitle}>Instruments ({instruments.length})</Text>
      {/* Add Button */}
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

      {/* Instruments List */}
      {!isLoading && !isError && (
        <FlatList
          data={instruments} // Use fetched data (API handler sorts it)
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AdminInstrumentItem
              item={item}
              onEdit={handleEditPress} // Trigger edit modal
              onDelete={handleDeletePress} // Trigger delete confirmation modal
              disabled={deleteMutation.isPending} // Disable buttons while deleting
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
          ListEmptyComponent={() => (
            <Text style={appSharedStyles.emptyListText}>No instruments found.</Text>
          )}
        />
      )}

      {/* Modals Rendered Here */}
      <CreateInstrumentModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
        // Handles own create mutation
      />
      <EditInstrumentModal
        visible={isEditModalVisible}
        instrumentToEdit={instrumentToEdit}
        onClose={closeEditModal}
        // Handles own update mutation
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the instrument "${instrumentToDelete?.name || ''}"? This cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Instrument'}
        onConfirm={handleDeleteConfirm} // Trigger delete mutation
        onCancel={closeDeleteModal}
        confirmDisabled={deleteMutation.isPending} // Disable confirm while deleting
      />
    </View>
  );
};


// Styles for this section
const styles = StyleSheet.create({
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  instrumentIcon: {
    width: 40,
    height: 40,
    marginRight: 15
  },
  itemTitleText: {
    flexShrink: 1, // Allow text to wrap if needed
    marginBottom: 0 // Remove bottom margin from default itemTitle style
  },
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