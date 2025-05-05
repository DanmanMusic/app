// src/components/common/SharedHeader.tsx
import React, { useState, useMemo } from 'react';

import { View, Text, Button } from 'react-native';

import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { capitalizeFirstLetter } from '../../utils/helpers';

interface SharedHeaderProps {
  onSetLoginPress: () => void;
  onEditInfoPress: () => void;
}

export const SharedHeader: React.FC<SharedHeaderProps> = ({ onSetLoginPress, onEditInfoPress }) => {
  const { appUser, supabaseUser, signOut, isPinSession } = useAuth();
  const [isConfirmLogoutVisible, setIsConfirmLogoutVisible] = useState(false);

  const displayName = useMemo(() => {
    if (!appUser) return 'Loading...';
    if (appUser.nickname && appUser.nickname.trim()) {
      return appUser.nickname.trim();
    }
    const baseName = `${appUser.firstName || ''} ${appUser.lastName || ''}`.trim();
    return baseName || 'Unnamed User';
  }, [appUser]);

  const canSetLogin = useMemo(() => {
    return !!supabaseUser?.email && supabaseUser.email.endsWith('@placeholder.app');
  }, [supabaseUser?.email]);

  const handleLogoutPress = () => {
    console.log('[SharedHeader] handleLogoutPress triggered.');
    console.log('[SharedHeader] Context isPinSession:', isPinSession);

    if (isPinSession) {
      console.log('[SharedHeader] PIN session detected. Setting confirmation modal visible.');
      setIsConfirmLogoutVisible(true);
    } else {
      console.log('[SharedHeader] Non-PIN session detected. Calling signOut directly.');
      signOut();
    }
  };

  const onConfirmLogout = () => {
    console.log('[SharedHeader] Logout Confirmed.');
    setIsConfirmLogoutVisible(false);
    signOut();
  };

  const onCancelLogout = () => {
    console.log('[SharedHeader] Logout Cancelled.');
    setIsConfirmLogoutVisible(false);
  };

  return (
    <>
      <Text style={commonSharedStyles.baseTitleText} numberOfLines={1} ellipsizeMode="tail">
        <Text style={commonSharedStyles.bold}>{capitalizeFirstLetter(appUser?.role || '')}</Text>:{' '}
        {displayName}
      </Text>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
        <Button title="Edit Info" onPress={onEditInfoPress} color={colors.warning} />
        {canSetLogin && <Button title="Set Login" onPress={onSetLoginPress} color={colors.info} />}
        <Button title="Logout" onPress={handleLogoutPress} color={colors.danger} />
      </View>
      <ConfirmationModal
        visible={isConfirmLogoutVisible}
        title="Confirm Logout"
        message="Logging out will invalidate your current PIN session. You will need to get a new PIN from an Administrator or Teacher to log back in. Continue?"
        confirmText="Yes, Logout"
        onConfirm={onConfirmLogout}
        onCancel={onCancelLogout}
      />
    </>
  );
};
