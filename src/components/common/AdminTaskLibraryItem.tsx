// src/components/common/AdminTaskLibraryItem.tsx
import React from 'react';
import { Button, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchInstruments } from '../../api/instruments';
import { handleOpenUrl, handleViewAttachment } from '../../lib/supabaseClient';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { AdminTaskLibraryItemProps } from '../../types/componentProps';
import { Instrument } from '../../types/dataTypes';
import { getInstrumentNames } from '../../utils/helpers';

export const AdminTaskLibraryItem: React.FC<AdminTaskLibraryItemProps> = ({
  item,
  onEdit,
  onDelete,
  disabled,
}) => {
  const { data: allInstruments = [] } = useQuery<Instrument[]>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  const instrumentNames = getInstrumentNames(item.instrumentIds, allInstruments);

  return (
    <View
      style={[
        commonSharedStyles.baseRow,
        commonSharedStyles.justifySpaceBetween,
        commonSharedStyles.baseItem,
      ]}
    >
      <View style={styles.infoContainer}>
        <Text style={commonSharedStyles.itemTitle}>
          {item.title} ({item.baseTickets} pts)
        </Text>
        {item.description ? (
          <Text style={commonSharedStyles.baseSecondaryText}>{item.description}</Text>
        ) : (
          <Text style={commonSharedStyles.baseEmptyText}>(No description)</Text>
        )}

        <Text style={styles.detailText}>
          Instruments: <Text style={styles.detailValue}>{instrumentNames}</Text>
        </Text>
        
        {/* --- MODIFICATION START --- */}

        {/* Render URLs */}
        {item.urls && item.urls.length > 0 ? (
          item.urls.map(url => (
            <TouchableOpacity key={url.id} onPress={() => handleOpenUrl(url.url)}>
              <Text style={styles.detailText}>
                URL ({url.label || 'Link'}): <Text style={commonSharedStyles.linkText}>{url.url}</Text>
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.detailText}>
            Reference URLs: <Text style={styles.detailValue}>None</Text>
          </Text>
        )}

        {/* Render Attachments */}
        {item.attachments && item.attachments.length > 0 ? (
          item.attachments.map(att => (
            <TouchableOpacity key={att.id} onPress={() => handleViewAttachment(att.file_path)}>
              <Text style={styles.detailText}>
                Attachment: <Text style={commonSharedStyles.linkText}>{att.file_name}</Text>
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.detailText}>
            Attachments: <Text style={styles.detailValue}>None</Text>
          </Text>
        )}

        {/* --- MODIFICATION END --- */}

      </View>

      <View
        style={[commonSharedStyles.baseColumn, commonSharedStyles.baseGap, styles.actionsContainer]}
      >
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
};

const styles = StyleSheet.create({
  infoContainer: {
    flex: 1,
    marginRight: 10,
    flexDirection: 'column',
    gap: 4,
  },
  actionsContainer: {
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
});