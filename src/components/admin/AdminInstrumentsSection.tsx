// src/components/admin/AdminInstrumentsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList } from 'react-native';

// Import types
import { Instrument } from '../../mocks/mockInstruments';

// Import shared styles
import { adminSharedStyles } from './adminSharedStyles';


interface AdminInstrumentsSectionProps {
    mockInstruments: Instrument[];
    onCreateInstrument: (instrumentData: any) => void;
    onEditInstrument: (instrumentId: string, instrumentData: any) => void;
    onDeleteInstrument: (instrumentId: string) => void;
}

// Render item for Instrument list in Admin view - Use shared styles
// Keep (Mock) for Edit/Delete
const AdminInstrumentItem = ({ item, onEditDelete }: { item: Instrument; onEditDelete: (instrumentId: string, action: 'edit' | 'delete') => void }) => (
    <View style={adminSharedStyles.item}>
         <Text style={adminSharedStyles.itemTitle}>{item.name}</Text>
         <View style={adminSharedStyles.itemActions}>
             {/* Keep (Mock) as it only alerts */}
             <Button title="Edit (Mock)" onPress={() => onEditDelete(item.id, 'edit')} />
             {/* Keep (Mock) as it only alerts */}
             <Button title="Delete (Mock)" onPress={() => onEditDelete(item.id, 'delete')} color="red" />
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
            <Text style={adminSharedStyles.sectionTitle}>Instruments ({mockInstruments.length})</Text>
            <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
                 {/* Keep (Mock) as it only alerts */}
                <Button title="Add New Instrument (Mock)" onPress={() => onCreateInstrument({})} />
            </View>
            <FlatList
                data={mockInstruments.sort((a, b) => a.name.localeCompare(b.name))}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AdminInstrumentItem item={item} onEditDelete={handleEditDeleteInstrumentItem} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
                ListEmptyComponent={() => <Text style={adminSharedStyles.emptyListText}>No instruments found.</Text>}
            />
        </View>
    );
};