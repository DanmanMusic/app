// src/components/admin/AdminInstrumentsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList } from 'react-native';

import { Instrument } from '../../mocks/mockInstruments';

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';


interface AdminInstrumentsSectionProps {
  mockInstruments: Instrument[];
  onCreateInstrument: (instrumentData: any) => void;
  onEditInstrument: (instrumentId: string, instrumentData: any) => void;
  onDeleteInstrument: (instrumentId: string) => void;
}

const AdminInstrumentItem = ({
  item,
  onEditDelete,
}: {
  item: Instrument;
  onEditDelete: (instrumentId: string, action: 'edit' | 'delete') => void;
}) => (
  <View style={appSharedStyles.itemContainer}>
    <Text style={appSharedStyles.itemTitle}>{item.name}</Text>
    <View style={adminSharedStyles.itemActions}>
      <Button title="Edit (Mock)" onPress={() => onEditDelete(item.id, 'edit')} />
      <Button title="Delete (Mock)" onPress={() => onEditDelete(item.id, 'delete')} color={colors.danger} />
    </View>
  </View>
);

export const AdminInstrumentsSection: React.FC<AdminInstrumentsSectionProps> = ({
  mockInstruments,
  onCreateInstrument,
  onEditInstrument,
  onDeleteInstrument,
}) => {
  const handleEditDeleteInstrumentItem = (instrumentId: string, action: 'edit' | 'delete') => {
    if (action === 'edit') onEditInstrument(instrumentId, {});
    else onDeleteInstrument(instrumentId);
  };

  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Instruments ({mockInstruments.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <Button title="Add New Instrument (Mock)" onPress={() => onCreateInstrument({})} />
      </View>
      <FlatList
        data={mockInstruments.sort((a, b) => a.name.localeCompare(b.name))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AdminInstrumentItem item={item} onEditDelete={handleEditDeleteInstrumentItem} />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No instruments found.</Text>
        )}
      />
    </View>
  );
};