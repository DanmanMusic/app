// src/components/student/modals/SetGoalModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';

import { RewardItem } from '../../../mocks/mockRewards';
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';

// Props for the modal
interface SetGoalModalProps {
  visible: boolean;
  onClose: () => void;
  rewardsCatalog: RewardItem[];
  currentBalance: number;
  currentGoalId: string | null;
  onSetGoal: (goalId: string | null) => void; // Pass null to clear goal
}

// Component to render each reward item within the modal list
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
        isCurrentGoal ? styles.currentGoalItem : {}, // Highlight current goal
      ]}
    >
      <View style={styles.goalSelectItemContent}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.goalSelectImage}
          resizeMode="contain"
        />
        <View style={styles.goalSelectDetails}>
          <Text style={styles.goalSelectName}>{item.name}</Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
            {item.cost} Tickets
          </Text>
          {/* Affordability indicator (optional) */}
          {!canAfford && (
             <Text style={styles.cannotAffordText}>(Need more tickets)</Text>
          )}
        </View>
         {/* Simple checkmark indicator for current goal */}
         {isCurrentGoal && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </View>
  </TouchableOpacity>
);

// Main Modal Component
const SetGoalModal: React.FC<SetGoalModalProps> = ({
  visible,
  onClose,
  rewardsCatalog,
  currentBalance,
  currentGoalId,
  onSetGoal,
}) => {

  const handleSelectGoal = (id: string) => {
    onSetGoal(id); // Call the callback passed from StudentView
  };

  const handleClearGoal = () => {
    onSetGoal(null); // Call the callback with null to clear
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            {currentGoalId ? 'Change Your Goal' : 'Set Your Goal'}
          </Text>

          <FlatList
            style={styles.listContainer}
            data={rewardsCatalog.sort((a, b) => a.cost - b.cost)} // Sort by cost
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
              <Text style={appSharedStyles.emptyListText}>No rewards available.</Text>
            }
            // Add some padding at the bottom inside the list
            ListFooterComponent={<View style={{ height: 10 }} />}
          />

          <View style={styles.buttonContainer}>
            {/* Add Clear Goal button only if a goal is currently set */}
            {currentGoalId && (
               <Button
                  title="Clear Current Goal"
                  onPress={handleClearGoal}
                  color={colors.warning}
               />
            )}
             <View style={{ height: 10 }} /> {/* Spacer */}
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles for the modal
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
    maxHeight: '85%', // Limit height
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  listContainer: {
      width: '100%',
      marginBottom: 15,
  },
  goalSelectItem: {
     // Use itemContainer base, add specific padding/margin if needed
     paddingVertical: 8, // Adjust vertical padding
     paddingHorizontal: 10,
     // Remove default marginBottom from appSharedStyles if needed
     marginBottom: 0,
  },
  currentGoalItem: {
    borderColor: colors.primary, // Highlight border
    borderWidth: 2,
    backgroundColor: colors.backgroundHighlight, // Highlight background
  },
  goalSelectItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalSelectImage: {
    width: 45, // Slightly smaller image for list
    height: 45,
    marginRight: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  goalSelectDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  goalSelectName: {
    fontSize: 15, // Adjust font size
    fontWeight: '600', // Medium weight
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cannotAffordText: {
      fontSize: 12,
      color: colors.textLight,
      fontStyle: 'italic',
      marginTop: 2,
  },
  checkmark: {
      fontSize: 24,
      color: colors.primary,
      marginLeft: 10, // Space before checkmark
  },
  buttonContainer: {
    width: '100%',
    marginTop: 10,
  },
});

export default SetGoalModal;