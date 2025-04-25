import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Modal,
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';

import { fetchRewards } from '../../../api/rewards';
import { RewardItem } from '../../../types/dataTypes';
import { appSharedStyles } from '../../../styles/appSharedStyles';
import { colors } from '../../../styles/colors';
import {
  SetGoalModalProps as ExternalSetGoalModalProps,
  SetGoalModalProps,
} from '../../../types/componentProps';
import { modalSharedStyles } from '../../../styles/modalSharedStyles';
import { RewardGoalItem } from '../../common/RewardGoalItem';

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
      <View style={modalSharedStyles.centeredView}>
        <View style={modalSharedStyles.modalView}>
          <Text style={modalSharedStyles.modalTitle}>
            {currentGoalId ? 'Change Your Goal' : 'Set Your Goal'}
          </Text>
          {isLoading && (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} size="large" />
          )}
          {isError && (
            <Text style={[appSharedStyles.textDanger, { marginVertical: 10 }]}>
              Error loading rewards: {error?.message}
            </Text>
          )}
          {!isLoading && !isError && (
            <FlatList
              style={modalSharedStyles.modalListContainer}
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
          <View style={modalSharedStyles.buttonContainer}>
            {currentGoalId && (
              <Button title="Clear Current Goal" onPress={handleClearGoal} color={colors.warning} />
            )}
            {currentGoalId && <View style={{ height: 10 }} />}
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SetGoalModal;
