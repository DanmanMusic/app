// src/components/common/TeacherTaskLibraryItem.tsx
import React from 'react';

import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { fetchInstruments } from '../../api/instruments';
import { useAuth } from '../../contexts/AuthContext';
import { handleOpenUrl, handleViewAttachment } from '../../lib/supabaseClient';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { TaskLibraryItem, Instrument } from '../../types/dataTypes';
import { getInstrumentNames } from '../../utils/helpers';
import { fetchJourneyLocations, JourneyLocation } from '../../api/journey';
import { CustomButton } from '../common/CustomButton';
import { PencilSquareIcon, TrashIcon } from 'react-native-heroicons/solid';

interface TeacherTaskLibraryItemProps {
  item: TaskLibraryItem;
  onEdit?: (task: TaskLibraryItem) => void;
  onDelete?: (task: TaskLibraryItem) => void;
  disabled?: boolean;
}

export const TeacherTaskLibraryItem: React.FC<TeacherTaskLibraryItemProps> = ({
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

  const { data: journeyLocations = [], isLoading: isLoadingJourney } = useQuery<
    JourneyLocation[],
    Error
  >({
    queryKey: ['journeyLocations'],
    queryFn: fetchJourneyLocations,
    staleTime: 5 * 60 * 1000,
  });

  const instrumentNames = getInstrumentNames(item.instrumentIds, allInstruments);
  const journeyLocation = item.canSelfAssign
    ? journeyLocations.find(j => j.id === item.journeyLocationId)
    : undefined;

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
          {item.canSelfAssign && !isLoadingJourney && journeyLocation !== undefined && (
            <Text style={styles.detailText}>
              Journey: <Text style={styles.detailValue}>{journeyLocation.name}</Text>
            </Text>
          )}
          <Text style={styles.detailText}>
            Instruments: <Text style={styles.detailValue}>{instrumentNames}</Text>
          </Text>

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
            <CustomButton
              title="Edit"
              onPress={() => onEdit(item)}
              disabled={disabled}
              color={colors.warning}
              leftIcon={<PencilSquareIcon color={colors.textWhite} size={18} />}
            />
            <CustomButton
              title="Delete"
              onPress={() => onDelete(item)}
              disabled={disabled}
              color={colors.danger}
              leftIcon={<TrashIcon color={colors.textWhite} size={18} />}
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
