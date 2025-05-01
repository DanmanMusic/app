// src/components/common/SharedHeader.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { getUserDisplayName } from '../../utils/helpers';
import { colors } from '../../styles/colors';
import ConfirmationModal from './ConfirmationModal';

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

  // Handlers for the confirmation modal
  const onConfirmLogout = () => {
    setIsConfirmLogoutVisible(false);
    signOut(); // Proceed with sign out after confirmation
  };

  const onCancelLogout = () => {
    setIsConfirmLogoutVisible(false);
  };

  return (
    <>
      <View style={styles.sharedHeaderContentContainer}>
        {/* Left-aligned Name/Nickname */}
        <Text style={styles.userNameText} numberOfLines={1} ellipsizeMode="tail">
          {displayName}
        </Text>

        {/* Right-aligned Buttons */}
        <View style={styles.buttonsContainer}>
          {canSetLogin && (
            <Button title="Set Login" onPress={onSetLoginPress} color={colors.info} />
          )}
          <Button title="Logout" onPress={handleLogoutPress} color={colors.danger} />
        </View>
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

// Styles specific to the header structure
const styles = StyleSheet.create({
  sharedHeaderContentContainer: {
    flex: 1, // Take remaining space in the parent's header row
    flexDirection: 'row',
    justifyContent: 'space-between', // Push name left, buttons right
    alignItems: 'center',
    marginLeft: 5, // Add some margin if a back button might appear to its left
  },
  userNameText: {
    fontSize: 18, // Adjust size
    fontWeight: 'bold',
    color: colors.textPrimary,
    flexShrink: 1, // Allow text to shrink if needed
    marginRight: 10, // Space before buttons
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // Space between buttons if both shown
  },
});
