import React from 'react'; // Removed useState if goal setting logic doesn't need local state
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator, // Added for loading state
} from 'react-native';
import { useQuery } from '@tanstack/react-query'; // Added useQuery

import { fetchRewards } from '../../../api/rewards'; // Import API function
import { RewardItem } from '../../../mocks/mockRewards';
import { colors } from '../../../styles/colors';
import { appSharedStyles } from '../../../styles/appSharedStyles';
// Import Prop Type - This interface defines the props expected *from the parent*
import { SetGoalModalProps as ExternalSetGoalModalProps, SetGoalModalProps } from '../../../types/componentProps'; // Adjust path if needed

// Sub-component to render each reward item in the list
const RewardGoalItem = ({
  item,
  isCurrentGoal,
  canAfford, // Determined based on currentBalance prop passed to parent modal
  onSelect,
}: {
  item: RewardItem;
  isCurrentGoal: boolean;
  canAfford: boolean;
  onSelect: (id: string) => void; // Callback when this item is pressed
}) => (
  // Make the whole item touchable
  <TouchableOpacity onPress={() => onSelect(item.id)}>
    <View
      style={[
        // Base container style
        appSharedStyles.itemContainer,
        styles.goalSelectItem,
        // Apply highlight style if this is the current goal
        isCurrentGoal ? styles.currentGoalItem : {},
      ]}
    >
      <View style={styles.goalSelectItemContent}>
        {/* Reward Image */}
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.goalSelectImage}
          resizeMode="contain"
        />
        {/* Reward Details */}
        <View style={styles.goalSelectDetails}>
          <Text style={styles.goalSelectName}>{item.name}</Text>
          <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>
            {item.cost} Tickets
          </Text>
          {/* Show affordability note */}
          {!canAfford && <Text style={styles.cannotAffordText}>(Need more tickets)</Text>}
        </View>
        {/* Show checkmark if this is the current goal */}
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
      data: rewardsCatalog = [], // Fetch the catalog internally, default to []
      isLoading,                // Loading state for the query
      isError,                  // Error state for the query
      error,                    // Error object if fetching failed
  } = useQuery<RewardItem[], Error>({
      queryKey: ['rewards'],      // Use the standard query key for rewards
      queryFn: fetchRewards,      // Use the API function to fetch data
      staleTime: 10 * 60 * 1000,  // Cache data for 10 minutes
      enabled: visible,           // Crucially, only run the query when the modal is visible
  });
  // --- End Fetch ---

  // --- Event Handlers ---
  // Called when a reward item is pressed in the list
  const handleSelectGoal = (id: string) => {
    onSetGoal(id); // Call the callback passed from the parent (StudentView)
    onClose();     // Close the modal after selection
  };

  // Called when the "Clear Current Goal" button is pressed
  const handleClearGoal = () => {
    onSetGoal(null); // Call the callback with null to clear the goal
    onClose();       // Close the modal after clearing
  };

  return (
    // Standard Modal setup
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      {/* Centering view for the modal content */}
      <View style={styles.centeredView}>
        {/* Main modal container with styling */}
        <View style={styles.modalView}>
          {/* Modal Title */}
          <Text style={styles.modalTitle}>
            {currentGoalId ? 'Change Your Goal' : 'Set Your Goal'}
          </Text>

          {/* --- Content Area --- */}
          {/* Show loading indicator while fetching rewards */}
          {isLoading && <ActivityIndicator color={colors.primary} style={{marginVertical: 20}} size="large"/>}

          {/* Show error message if fetching failed */}
          {isError && <Text style={[appSharedStyles.textDanger, {marginVertical: 10}]}>Error loading rewards: {error?.message}</Text>}

          {/* Render the list only if not loading and no error */}
          {!isLoading && !isError && (
              <FlatList
                style={styles.listContainer}
                // Use the rewardsCatalog fetched by useQuery
                data={rewardsCatalog.sort((a, b) => a.cost - b.cost)} // Sort by cost ascending
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  // Render each item using the sub-component
                  <RewardGoalItem
                    item={item}
                    // Check if this item is the currently selected goal
                    isCurrentGoal={item.id === currentGoalId}
                    // Determine if affordable based on balance passed from parent
                    canAfford={currentBalance >= item.cost}
                    // Pass selection handler
                    onSelect={handleSelectGoal}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />} // Space between items
                ListEmptyComponent={ <Text style={appSharedStyles.emptyListText}>No rewards available to set as goal.</Text> }
                ListFooterComponent={<View style={{ height: 10 }} />} // Space at the bottom
              />
          )}
          {/* --- End Content Area --- */}


          {/* --- Footer Buttons --- */}
          <View style={styles.buttonContainer}>
            {/* Conditionally show "Clear Goal" button */}
            {currentGoalId && (
              <Button title="Clear Current Goal" onPress={handleClearGoal} color={colors.warning} />
            )}
            {/* Add space if Clear button is shown */}
            {currentGoalId && <View style={{ height: 10 }} />}
            {/* Cancel button */}
            <Button title="Cancel" onPress={onClose} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles for the modal and its internal components
const styles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', },
    modalView: { margin: 20, backgroundColor: colors.backgroundPrimary, borderRadius: 10, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%', maxHeight: '85%', },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: colors.textPrimary, },
    listContainer: { width: '100%', marginBottom: 15, },
    goalSelectItem: { paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.borderSecondary, borderRadius: 6, backgroundColor: colors.backgroundPrimary }, // Added base styles
    currentGoalItem: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.backgroundHighlight, },
    goalSelectItemContent: { flexDirection: 'row', alignItems: 'center', },
    goalSelectImage: { width: 45, height: 45, marginRight: 12, borderRadius: 4, borderWidth: 1, borderColor: colors.borderSecondary, },
    goalSelectDetails: { flex: 1, justifyContent: 'center', },
    goalSelectName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2, },
    cannotAffordText: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 2, },
    checkmark: { fontSize: 24, color: colors.primary, marginLeft: 10, },
    buttonContainer: { width: '100%', marginTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSecondary, paddingTop: 15 },
});

export default SetGoalModal;