// src/components/common/SharedHeader.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, Button } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import ConfirmationModal from './ConfirmationModal';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

interface SharedHeaderProps {
  onSetLoginPress: () => void;
}

export const SharedHeader: React.FC<SharedHeaderProps> = ({ onSetLoginPress }) => {
  const { appUser, supabaseUser, session, signOut } = useAuth();
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

  const isPinSession = useMemo(() => {
    return session?.user?.app_metadata?.provider === 'custom_pin';
  }, [session]);

  const handleLogoutPress = () => {
    if (isPinSession) {
      setIsConfirmLogoutVisible(true);
    } else {
      signOut();
    }
  };

  const onConfirmLogout = () => {
    setIsConfirmLogoutVisible(false);
    signOut();
  };

  const onCancelLogout = () => {
    setIsConfirmLogoutVisible(false);
  };

  return (
    <>
      <Text style={commonSharedStyles.baseTitleText} numberOfLines={1} ellipsizeMode="tail">
        <Text style={commonSharedStyles.bold}>{appUser?.role}</Text>: {displayName}
      </Text>
      <View style={[commonSharedStyles.baseRow, commonSharedStyles.baseGap]}>
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
