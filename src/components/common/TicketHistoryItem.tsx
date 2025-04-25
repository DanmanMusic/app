import { Text, View } from 'react-native';
import { TicketTransaction } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';

export const TicketHistoryItem = ({ item }: { item: TicketTransaction }) => (
  <View style={commonSharedStyles.historyItemContainer}>
    <Text style={commonSharedStyles.historyItemTimestamp}>
      {new Date(item.timestamp).toLocaleString()}
    </Text>
    <Text style={commonSharedStyles.historyItemDetails}>
      {item.type === 'task_award'
        ? 'Task Award'
        : item.type === 'manual_add'
          ? 'Manual Add'
          : item.type === 'manual_subtract'
            ? 'Manual Subtract'
            : item.type === 'redemption'
              ? 'Redemption'
              : item.type}
      :
      <Text
        style={[
          commonSharedStyles.historyItemAmount,
          item.amount > 0 ? { color: colors.success } : { color: colors.danger },
        ]}
      >
        {item.amount > 0 ? `+${item.amount}` : item.amount} Tickets
      </Text>
    </Text>
    {item.notes && <Text style={commonSharedStyles.historyItemNotes}>{item.notes}</Text>}
  </View>
);
