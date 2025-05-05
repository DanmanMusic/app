// src/components/common/TaskLibraryItemTeacher.tsx
import React from 'react';
import { Text, View, Linking, StyleSheet, TouchableOpacity, Button } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { TaskLibraryItem, Instrument } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';
import { fetchInstruments } from '../../api/instruments';
import { getInstrumentNames } from '../../utils/helpers';
import {
  getSupabase,
  handleOpenUrl,
  handleViewAttachment,
  TASK_ATTACHMENT_BUCKET,
} from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

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
            <TouchableOpacity onPress={() => handleViewAttachment(item.attachmentPath)}>
              <Text style={styles.detailText}>
                Attachment: <Text style={styles.linkText}>View/Download</Text>
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.detailText}>
              Attachment: <Text style={styles.detailValue}>None</Text>
            </Text>
          )}
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
