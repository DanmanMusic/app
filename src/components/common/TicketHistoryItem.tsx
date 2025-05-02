import { Text, View } from 'react-native';
import { TicketTransaction } from '../../types/dataTypes';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { colors } from '../../styles/colors';

export const TicketHistoryItem = ({ item }: { item: TicketTransaction }) => (
  <View
    style={[
      commonSharedStyles.baseItem,
      commonSharedStyles.baseRow,
      commonSharedStyles.justifySpaceBetween,
    ]}
  >
    <Text style={commonSharedStyles.baseSecondaryText}>
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
          commonSharedStyles.bold,
          item.amount > 0 ? { color: colors.success } : { color: colors.danger },
        ]}
      >
        {item.amount > 0 ? `+${item.amount}` : item.amount} Tickets
      </Text>
    </Text>
    <Text style={commonSharedStyles.baseVeryLightText}>
      {new Date(item.timestamp).toLocaleString()}
    </Text>
    {item.notes && <Text style={commonSharedStyles.baseVeryLightText}>{item.notes}</Text>}
  </View>
);
