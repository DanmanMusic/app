// src/components/common/TicketHistoryItem.tsx
import React from 'react';

import { Text, View, StyleSheet } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { TicketTransaction } from '../../types/dataTypes';
import { capitalizeFirstLetter, timestampDisplay } from '../../utils/helpers';

const formatTransactionType = (type: TicketTransaction['type']): string => {
  switch (type) {
    case 'task_award':
      return 'Task Award';
    case 'manual_add':
      return 'Manual Add';
    case 'manual_subtract':
      return 'Manual Subtract';
    case 'redemption':
      return 'Redemption';
    default:
      return capitalizeFirstLetter(type);
  }
};

export const TicketHistoryItem = ({ item }: { item: TicketTransaction }) => {
  const typeDisplay = formatTransactionType(item.type);
  const amountDisplay = item.amount > 0 ? `+${item.amount}` : `${item.amount}`;
  const amountColor = item.amount > 0 ? colors.success : colors.danger;

  return (
    <View
      style={[commonSharedStyles.baseItem, commonSharedStyles.baseRow, commonSharedStyles.baseGap]}
    >
      <View style={styles.columnAmount}>
        <Text style={[commonSharedStyles.baseSecondaryText, { color: amountColor }]}>
          {amountDisplay}
        </Text>
      </View>
      <View style={styles.columnType}>
        <View>
          <Text style={styles.typeText}>{typeDisplay}</Text>
        </View>
        {item.notes && (
          <View>
            <Text style={styles.notesText}>Notes: {item.notes}</Text>
          </View>
        )}
      </View>
      <View style={styles.columnTimestamp}>
        <Text style={styles.timestampText}>{timestampDisplay(item.timestamp)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  columnAmount: {
    width: 40,
  },
  columnType: {
    flex: 1,
    paddingHorizontal: 4,
  },
  columnTimestamp: {
    alignItems: 'flex-end',
  },
  typeText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  timestampText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingLeft: 5,
  },
});
