// src/components/admin/AdminRewardsSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Button, Alert, FlatList, Image } from 'react-native';

import { RewardItem } from '../../mocks/mockRewards';

import { adminSharedStyles } from './adminSharedStyles';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { colors } from '../../styles/colors';


interface AdminRewardsSectionProps {
  rewardsCatalog: RewardItem[];
  onCreateReward: (rewardData: any) => void;
  onEditReward: (rewardId: string, rewardData: any) => void;
  onDeleteReward: (rewardId: string) => void;
}

const AdminRewardItem = ({
  item,
  onEditDelete,
}: {
  item: RewardItem;
  onEditDelete: (rewardId: string, action: 'edit' | 'delete') => void;
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
      <Button title="Edit (Mock)" onPress={() => onEditDelete(item.id, 'edit')} />
      <Button title="Delete (Mock)" onPress={() => onEditDelete(item.id, 'delete')} color={colors.danger} />
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
      <Text style={appSharedStyles.sectionTitle}>Rewards Catalog</Text>
      <View style={{ alignItems: 'flex-start', marginBottom: 10 }}>
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
          <Text style={appSharedStyles.emptyListText}>No rewards found.</Text>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // These styles were kept local from the original file as they define specific layouts or elements unique to rewards
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