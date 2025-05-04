// src/components/common/AdminTaskLibraryItem.tsx

import React from 'react';
import { Button, Text, View, Linking, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { colors } from '../../styles/colors';
import { AdminTaskLibraryItemProps } from '../../types/componentProps';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { fetchInstruments } from '../../api/instruments';
import { getInstrumentNames } from '../../utils/helpers';
import { getSupabase } from '../../lib/supabaseClient';
import { Instrument } from '../../types/dataTypes';

const TASK_ATTACHMENT_BUCKET = 'task-library-attachments';

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

  const handleOpenUrl = async (url: string | null | undefined) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: `Cannot open URL: ${url}` });
      console.error(`Don't know how to open this URL: ${url}`);
    }
  };

  const handleViewAttachment = async () => {
    if (!item.attachmentPath) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from(TASK_ATTACHMENT_BUCKET)
        .createSignedUrl(item.attachmentPath, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        handleOpenUrl(data.signedUrl);
      }
    } catch (error: any) {
      console.error('Error getting signed URL for attachment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Could not get download link: ${error.message}`,
      });
    }
  };

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

        {item.referenceUrl ? (
          <TouchableOpacity onPress={() => handleOpenUrl(item.referenceUrl)}>
            <Text style={styles.detailText}>
              Reference: <Text style={styles.linkText}>{item.referenceUrl}</Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.detailText}>
            Reference: <Text style={styles.detailValue}>N/A</Text>
          </Text>
        )}

        {item.attachmentPath ? (
          <TouchableOpacity onPress={handleViewAttachment}>
            <Text style={styles.detailText}>
              Attachment: <Text style={styles.linkText}>View/Download</Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.detailText}>
            Attachment: <Text style={styles.detailValue}>None</Text>
          </Text>
        )}
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
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
