import React from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';

import { fetchRewards } from '../../../api/rewards';
import { RewardItem } from '../../../mocks/mockRewards';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import {
  SetGoalModalProps as ExternalSetGoalModalProps,
  SetGoalModalProps,
} from '../../../types/componentProps';

const RewardGoalItem = ({
  item,
  isCurrentGoal,
  canAfford,
  onSelect,
}: {
  item: RewardItem;
  isCurrentGoal: boolean;
  canAfford: boolean;
  onSelect: (id: string) => void;
}) => (
  <TouchableOpacity onPress={() => onSelect(item.id)}>
    <View
      style={[
        appSharedStyles.itemContainer,
        styles.goalSelectItem,

        isCurrentGoal ? styles.currentGoalItem : {},
      ]}
    >
      <View style={styles.goalSelectItemContent}>
        {}
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.goalSelectImage}
          resizeMode="contain"
        />
        {}
        <View style={styles.goalSelectDetails}>
          <Text style={styles.goalSelectName}>{item.name}</Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
            {item.cost} Tickets
          </Text>
          {}
          {!canAfford && <Text style={styles.cannotAffordText}>(Need more tickets)</Text>}
        </View>
        {}
        {isCurrentGoal && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </View>
  </TouchableOpacity>
);

export const SetGoalModal: React.FC<SetGoalModalProps> = ({
  visible,
  onClose,
  currentBalance,
  currentGoalId,
  onSetGoal,
}) => {
  const {
    data: rewardsCatalog = [],
    isLoading,
    isError,
    error,
  } = useQuery<RewardItem[], Error>({
    queryKey: ['rewards'],
    queryFn: fetchRewards,
    staleTime: 10 * 60 * 1000,
    enabled: visible,
  });

  const handleSelectGoal = (id: string) => {
    onSetGoal(id);
    onClose();
  };

  const handleClearGoal = () => {
    onSetGoal(null);
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      {}
      <View style={styles.centeredView}>
        {}
        <View style={styles.modalView}>
          {}
          <Text style={styles.modalTitle}>
            {currentGoalId ? 'Change Your Goal' : 'Set Your Goal'}
          </Text>

          {}
          {}
          {isLoading && (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} size="large" />
          )}

          {}
          {isError && (
            <Text style={[appSharedStyles.textDanger, { marginVertical: 10 }]}>
              Error loading rewards: {error?.message}
            </Text>
          )}

          {}
          {!isLoading && !isError && (
            <FlatList
              style={styles.listContainer}
              data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <RewardGoalItem
                  item={item}
                  isCurrentGoal={item.id === currentGoalId}
                  canAfford={currentBalance >= item.cost}
                  onSelect={handleSelectGoal}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <Text style={appSharedStyles.emptyListText}>
                  No rewards available to set as goal.
                </Text>
              }
              ListFooterComponent={<View style={{ height: 10 }} />}
            />
          )}
          {}

          {}
          <View style={styles.buttonContainer}>
            {}
            {currentGoalId && (
              <Button title="Clear Current Goal" onPress={handleClearGoal} color={colors.warning} />
            )}
            {}
            {currentGoalId && <View style={{ height: 10 }} />}
            {}
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  listContainer: { width: '100%', marginBottom: 15 },
  goalSelectItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    borderRadius: 6,
    backgroundColor: colors.backgroundPrimary,
  },
  currentGoalItem: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.backgroundHighlight,
  },
  goalSelectItemContent: { flexDirection: 'row', alignItems: 'center' },
  goalSelectImage: {
    width: 45,
    height: 45,
    marginRight: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  goalSelectDetails: { flex: 1, justifyContent: 'center' },
  goalSelectName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  cannotAffordText: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 2 },
  checkmark: { fontSize: 24, color: colors.primary, marginLeft: 10 },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
    paddingTop: 15,
  },
});

export default SetGoalModal;
