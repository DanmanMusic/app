// src/components/common/TaskLibraryItemTeacher.tsx
import React from 'react';

import { Text, View, StyleSheet, TouchableOpacity, Button } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { fetchInstruments } from '../../api/instruments';
import { useAuth } from '../../contexts/AuthContext';
import { handleOpenUrl, handleViewAttachment } from '../../lib/supabaseClient';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { TaskLibraryItem, Instrument } from '../../types/dataTypes';
import { getInstrumentNames } from '../../utils/helpers';

interface TaskLibraryItemTeacherProps {
  item: TaskLibraryItem;
  onEdit?: (task: TaskLibraryItem) => void;
  onDelete?: (task: TaskLibraryItem) => void;
  disabled?: boolean;
}

export const TaskLibraryItemTeacher: React.FC<TaskLibraryItemTeacherProps> = ({
  item,
  onEdit,
  onDelete,
  disabled,
}) => {
  const { currentUserId } = useAuth();

  const isOwner = item.createdById === currentUserId;

  const { data: allInstruments = [] } = useQuery<Instrument[]>({
    queryKey: ['instruments'],
    queryFn: fetchInstruments,
    staleTime: Infinity,
  });

  const instrumentNames = getInstrumentNames(item.instrumentIds, allInstruments);

  return (
    <View style={[commonSharedStyles.baseItem]}>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.justifySpaceBetween]}>
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
                  URL ({url.label || 'Link'}):{' '}
                  <Text style={commonSharedStyles.linkText}>{url.url}</Text>
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
              <TouchableOpacity key={att.id} onPress={() => handleViewAttachment(att.path)}>
                <Text style={styles.detailText}>
                  Attachment: <Text style={commonSharedStyles.linkText}>{att.name}</Text>
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.detailText}>
              Attachments: <Text style={styles.detailValue}>None</Text>
            </Text>
          )}

          {/* --- MODIFICATION END --- */}

          {isOwner && <Text style={styles.privateIndicator}>(My Private Task)</Text>}
        </View>

        {isOwner && onEdit && onDelete && (
          <View
            style={[
              commonSharedStyles.baseColumn,
              commonSharedStyles.baseGap,
              styles.actionsContainer,
            ]}
          >
            <Button
              title="Edit"
              onPress={() => onEdit(item)}
              disabled={disabled}
              color={colors.warning}
            />
            <Button
              title="Delete"
              onPress={() => onDelete(item)}
              disabled={disabled}
              color={colors.danger}
            />
          </View>
        )}
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
  privateIndicator: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.info,
    marginTop: 3,
  },
});
