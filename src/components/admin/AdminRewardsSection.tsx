
import React, { useState } from 'react'; 
import { View, Text, StyleSheet, Button, FlatList, Image } from 'react-native'; 
import { RewardItem } from '../../mocks/mockRewards';
import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';
import CreateRewardModal from './modals/CreateRewardModal';
import EditRewardModal from './modals/EditRewardModal';
import ConfirmationModal from '../common/ConfirmationModal'; 

interface AdminRewardsSectionProps {
  rewardsCatalog: RewardItem[];
  onCreateReward: (rewardData: Omit<RewardItem, 'id'>) => void;
  onEditReward: (rewardId: string, rewardData: Partial<Omit<RewardItem, 'id'>>) => void;
  onDeleteReward: (rewardId: string) => void;
}

const AdminRewardItem = ({
  item,
  onEdit,
  onDelete,
}: {
  item: RewardItem;  
  onEdit: (reward: RewardItem) => void;
  onDelete: (reward: RewardItem) => void;  
}) => (
  <View style={appSharedStyles.itemContainer}>
    <View style={styles.rewardItemContent}>
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.rewardImage}
        resizeMode="contain"
      />
      <View style={styles.rewardDetails}>
        <Text style={appSharedStyles.itemTitle}>{item.name}</Text>
        <Text style={[appSharedStyles.itemDetailText, appSharedStyles.textGold]}>{item.cost} Tickets</Text>
        {item.description && (
          <Text style={appSharedStyles.itemDetailText}>{item.description}</Text>
        )}
      </View>
    </View>
    <View style={adminSharedStyles.itemActions}>
      {}
      <Button title="Edit" onPress={() => onEdit(item)} />
      <Button title="Delete" onPress={() => onDelete(item)} color={colors.danger} />
      {}
    </View>
  </View>
);

export const AdminRewardsSection: React.FC<AdminRewardsSectionProps> = ({
  rewardsCatalog,
  onCreateReward,
  onEditReward,
  onDeleteReward,
}) => {
  
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [rewardToEdit, setRewardToEdit] = useState<RewardItem | null>(null);
  const [rewardToDelete, setRewardToDelete] = useState<RewardItem | null>(null);
  const handleAddPress = () => setIsCreateModalVisible(true);
  const handleEditPress = (reward: RewardItem) => {
    setRewardToEdit(reward);
    setIsEditModalVisible(true);
  };
  const handleDeletePress = (reward: RewardItem) => {
    setRewardToDelete(reward);
    setIsDeleteModalVisible(true);
  };
  const closeCreateModal = () => setIsCreateModalVisible(false);
  const closeEditModal = () => { setIsEditModalVisible(false); setRewardToEdit(null); };
  const closeDeleteModal = () => { setIsDeleteModalVisible(false); setRewardToDelete(null); };
  const handleCreateConfirm = (rewardData: Omit<RewardItem, 'id'>) => {
    onCreateReward(rewardData);
    closeCreateModal();
  };
  const handleEditConfirm = (
    rewardId: string,
    rewardData: Partial<Omit<RewardItem, 'id'>>
  ) => {
    onEditReward(rewardId, rewardData);
    closeEditModal();
  };
  const handleDeleteConfirm = () => {
    if (rewardToDelete) {
      onDeleteReward(rewardToDelete.id);
    }
    closeDeleteModal();
  };
  return (
    <View>
      <Text style={appSharedStyles.sectionTitle}>Rewards Catalog ({rewardsCatalog.length})</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        {}
        <Button title="Add New Reward" onPress={handleAddPress} />
      </View>
      <FlatList
        data={rewardsCatalog} 
        keyExtractor={item => item.id}
        renderItem={({ item }) => (          
          <AdminRewardItem
             item={item}
             onEdit={handleEditPress}
             onDelete={handleDeletePress}
          />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <Text style={appSharedStyles.emptyListText}>No rewards found.</Text>
        )}
      />

      {}
      <CreateRewardModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
        onCreateConfirm={handleCreateConfirm}
      />
      <EditRewardModal
        visible={isEditModalVisible}
        rewardToEdit={rewardToEdit}
        onClose={closeEditModal}
        onEditConfirm={handleEditConfirm}
      />
      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Confirm Delete"
        message={`Are you sure you want to delete the reward "${rewardToDelete?.name || ''}"? This cannot be undone.`}
        confirmText="Delete Reward"
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      />
      {}
    </View>
  );
};

const styles = StyleSheet.create({
   rewardItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardImage: {
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  rewardDetails: {
    flex: 1,
  },
});