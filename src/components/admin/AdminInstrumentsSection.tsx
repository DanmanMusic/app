// src/components/admin/AdminInstrumentsSection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList, Image } from 'react-native';

import { Instrument } from '../../mocks/mockInstruments'; // Type
import { adminSharedStyles } from './adminSharedStyles'; // Shared admin styles
import { appSharedStyles } from '../../styles/appSharedStyles'; // App-wide shared styles
import { colors } from '../../styles/colors'; // Color palette

// Import Modals
import CreateInstrumentModal from './modals/CreateInstrumentModal';
import EditInstrumentModal from './modals/EditInstrumentModal';
import ConfirmationModal from '../common/ConfirmationModal'; // Reusable confirmation modal

// Icon loading helper (same as EditInstrumentModal)
const getInstrumentIconSource = (instrumentName: string | undefined) => {
  if (!instrumentName) return require('../../../assets/instruments/icon.jpg');
  const imageName = instrumentName.toLowerCase();
  try {
    switch (imageName) {
      case 'piano': return require('../../../assets/instruments/piano.jpg');
      case 'guitar': return require('../../../assets/instruments/guitar.jpg');
      case 'drums': return require('../../../assets/instruments/drums.jpg');
      case 'violin': return require('../../../assets/instruments/violin.jpg');
      case 'voice': return require('../../../assets/instruments/voice.jpg');
      case 'flute': return require('../../../assets/instruments/flute.jpg');
      case 'bass': case 'bass guitar': return require('../../../assets/instruments/bass.jpg');
      default: console.warn(`Icon not found for instrument: ${imageName}.jpg`); return require('../../../assets/instruments/icon.jpg');
    }
  } catch (error) { console.warn(`Error loading icon for instrument: ${imageName}.jpg`, error); return require('../../../assets/instruments/icon.jpg'); }
};

interface AdminInstrumentsSectionProps {
  mockInstruments: Instrument[];
  onCreateInstrument: (instrumentData: Omit<Instrument, 'id'>) => void;
  onEditInstrument: (instrumentId: string, instrumentData: Partial<Omit<Instrument, 'id'>>) => void;
  onDeleteInstrument: (instrumentId: string) => void;
}

// Item component
const AdminInstrumentItem = ({
  item,
  onEdit,
  onDelete,
}: {
  item: Instrument;
  onEdit: (instrument: Instrument) => void;
  onDelete: (instrument: Instrument) => void;
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
      <Button title="Edit" onPress={() => onEdit(item)} />
      <Button title="Delete" onPress={() => onDelete(item)} color={colors.danger} />
    </View>
  </View>
);

// Main Section Component
export const AdminInstrumentsSection: React.FC<AdminInstrumentsSectionProps> = ({
  mockInstruments,
  onCreateInstrument,
  onEditInstrument,
  onDeleteInstrument,
}) => {
  // State for modals
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [instrumentToEdit, setInstrumentToEdit] = useState<Instrument | null>(null);
  const [instrumentToDelete, setInstrumentToDelete] = useState<Instrument | null>(null);

  // --- Modal Open Handlers ---
  const handleAddPress = () => { setIsCreateModalVisible(true); };
  const handleEditPress = (instrument: Instrument) => { setInstrumentToEdit(instrument); setIsEditModalVisible(true); };
  const handleDeletePress = (instrument: Instrument) => { setInstrumentToDelete(instrument); setIsDeleteModalVisible(true); };

  // --- Modal Close Handlers ---
  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => { setIsEditModalVisible(false); setInstrumentToEdit(null); };
  const closeDeleteModal = () => { setIsDeleteModalVisible(false); setInstrumentToDelete(null); };

  // --- Modal Confirmation Handlers ---
  const handleCreateConfirm = (instrumentData: Omit<Instrument, 'id'>) => { onCreateInstrument(instrumentData); closeCreateModal(); };
  const handleEditConfirm = (instrumentId: string, instrumentData: Partial<Omit<Instrument, 'id'>>) => { onEditInstrument(instrumentId, instrumentData); closeEditModal(); };
  const handleDeleteConfirm = () => { if (instrumentToDelete) { onDeleteInstrument(instrumentToDelete.id); } closeDeleteModal(); };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Instruments ({mockInstruments.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Add New Instrument" onPress={handleAddPress} />
      </View>
      <FlatList
        data={mockInstruments.sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AdminInstrumentItem
            item={item}
            onEdit={handleEditPress}
            onDelete={handleDeletePress}
          />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => ( <Text style={appSharedStyles.emptyListText}>No instruments found.</Text> )}
      />

      {/* Render Modals */}
      <CreateInstrumentModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
        onCreateConfirm={handleCreateConfirm}
      />
      <EditInstrumentModal
        visible={isEditModalVisible}
        instrumentToEdit={instrumentToEdit}
        onClose={closeEditModal}
        onEditConfirm={handleEditConfirm}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the instrument "${instrumentToDelete?.name || ''}"? This cannot be undone.`}
        confirmText="Delete Instrument"
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      />
    </View>
  );
};

// Local styles
const styles = StyleSheet.create({
  itemContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, },
  instrumentIcon: { width: 40, height: 40, marginRight: 15, },
  itemTitleText: { flexShrink: 1, marginBottom: 0, },
});