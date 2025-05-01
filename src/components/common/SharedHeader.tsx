// src/components/common/SharedHeader.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, Button } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/colors';
import ConfirmationModal from './ConfirmationModal';
import { appSharedStyles } from '../../styles/appSharedStyles';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

interface SharedHeaderProps {
  onSetLoginPress: () => void; // Callback to open the SetEmailPasswordModal
}

export const SharedHeader: React.FC<SharedHeaderProps> = ({ onSetLoginPress }) => {
  const { appUser, supabaseUser, session, signOut } = useAuth();
  const [isConfirmLogoutVisible, setIsConfirmLogoutVisible] = useState(false);

  // Determine display name: Nickname takes priority
  const displayName = useMemo(() => {
    if (!appUser) return 'Loading...';
    if (appUser.nickname && appUser.nickname.trim()) {
      return appUser.nickname.trim(); // Use nickname if available
    }
    // Fallback to first/last name (using helper but it includes nickname logic, so implement directly)
    const baseName = `${appUser.firstName || ''} ${appUser.lastName || ''}`.trim();
    return baseName || 'Unnamed User'; // Default if names are also missing
  }, [appUser]);

  // Determine if the "Set Login" button should be shown
  const canSetLogin = useMemo(() => {
    return !!supabaseUser?.email && supabaseUser.email.endsWith('@placeholder.app');
  }, [supabaseUser?.email]);

  // Check if the current session was likely initiated via PIN
  const isPinSession = useMemo(() => {
    // Best effort check based on metadata set during PIN claim
    return session?.user?.app_metadata?.provider === 'custom_pin';
  }, [session]);

  // Handler for the logout button press
  const handleLogoutPress = () => {
    if (isPinSession) {
      // If it's a PIN session, show confirmation modal
      setIsConfirmLogoutVisible(true);
    } else {
      // If it's email/password, sign out directly
      signOut();
    }
  };

  // Handlers for the confirmappSharedStyles.userNameTextation modal
  const onConfirmLogout = () => {
    setIsConfirmLogoutVisible(false);
    signOut(); // Proceed with sign out after confirmation
  };

  const onCancelLogout = () => {
    setIsConfirmLogoutVisible(false);
  };

  return (
    <>
      
        {/* Left-aligned Name/Nickname */}
        <Text style={commonSharedStyles.baseTitle} numberOfLines={1} ellipsizeMode="tail">
          <Text style={commonSharedStyles.bold}>{appUser?.role}</Text>: {displayName}
        </Text>

        {/* Right-aligned Buttons */}
        <View style={appSharedStyles.containerRowCenter}>
          {canSetLogin && (
            <Button title="Set Login" onPress={onSetLoginPress} color={colors.info} />
          )}
          <Button title="Logout" onPress={handleLogoutPress} color={colors.danger} />
        </View>

      {/* Confirmation Modal for PIN Logout */}
      <ConfirmationModal
        visible={isConfirmLogoutVisible}
        title="Confirm Logout"
        message="Logging out will invalidate your current PIN session. You will need to get a new PIN from an Administrator or Teacher to log back in. Continue?"
        confirmText="Yes, Logout"
        onConfirm={onConfirmLogout}
        onCancel={onCancelLogout}
        // No specific disabled state needed here unless signout is processing,
        // but the modal closes immediately on confirm/cancel anyway.
      />
    </>
  );
};
