// src/components/admin/AdminRewardsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList, Image } from 'react-native';

// Import types
import { RewardItem } from '../../mocks/mockRewards';

// Import shared styles
import { adminSharedStyles } from './adminSharedStyles';

interface AdminRewardsSectionProps {
  rewardsCatalog: RewardItem[];
  onCreateReward: (rewardData: any) => void;
  onEditReward: (rewardId: string, rewardData: any) => void;
  onDeleteReward: (rewardId: string) => void;
}

// Render item for Reward Catalog list in Admin view - Use shared styles
// Keep (Mock) for Edit/Delete
const AdminRewardItem = ({
  item,
  onEditDelete,
}: {
  item: RewardItem;
  onEditDelete: (rewardId: string, action: 'edit' | 'delete') => void;
}) => (
  <View style={adminSharedStyles.item}>
    <View style={adminSharedStyles.rewardItemContent}>
      <Image
        source={{ uri: item.imageUrl }}
        style={adminSharedStyles.rewardImage}
        resizeMode="contain"
      />
      <View style={adminSharedStyles.rewardDetails}>
        <Text style={adminSharedStyles.itemTitle}>{item.name}</Text>
        <Text>{item.cost} tickets</Text>
        {item.description && (
          <Text style={{ fontSize: 13, color: '#666' }}>{item.description}</Text>
        )}
      </View>
    </View>
    <View style={adminSharedStyles.itemActions}>
      {/* Keep (Mock) as it only alerts */}
      <Button title="Edit (Mock)" onPress={() => onEditDelete(item.id, 'edit')} />
      {/* Keep (Mock) as it only alerts */}
      <Button title="Delete (Mock)" onPress={() => onEditDelete(item.id, 'delete')} color="red" />
    </View>
  </View>
);

export const AdminRewardsSection: React.FC<AdminRewardsSectionProps> = ({
  rewardsCatalog,
  onCreateReward,
  onEditReward,
  onDeleteReward,
}) => {
  const handleEditDeleteRewardItem = (rewardId: string, action: 'edit' | 'delete') => {
    if (action === 'edit') onEditReward(rewardId, {});
    else onDeleteReward(rewardId);
  };

  return (
    <View>
      <Text style={adminSharedStyles.sectionTitle}>Rewards Catalog</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        {/* Keep (Mock) as it only alerts */}
        <Button title="Add New Reward (Mock)" onPress={() => onCreateReward({})} />
      </View>
      <FlatList
        data={rewardsCatalog.sort((a, b) => a.cost - b.cost)}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AdminRewardItem item={item} onEditDelete={handleEditDeleteRewardItem} />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <Text style={adminSharedStyles.emptyListText}>No rewards found.</Text>
        )}
      />
    </View>
  );
};
