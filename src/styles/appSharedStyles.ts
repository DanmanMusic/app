// src/styles/appSharedStyles.ts
import { StyleSheet } from 'react-native';
import { colors } from './colors'; // Import the color palette

export const appSharedStyles = StyleSheet.create({
  // --- General Layout ---
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary, // Use backgroundSecondary as screen background
  },
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: colors.backgroundSecondary, // Apply background here too for consistency
  },
  headerContainer: {
    // Style for headers that span the top of a view (e.g., with a back button)
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10, // Adjust based on SafeArea
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary, // Header background
  },
  header: {
    // Style for main screen titles
    fontSize: 22, // Standard size
    fontWeight: 'bold',
    color: colors.textPrimary,
    flexShrink: 1, // Allow text to shrink
  },
  sectionTitle: {
    // Style for titles within a scrollable view
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 5,
  },
  emptyListText: {
    textAlign: 'center',
    color: colors.textLight,
    marginTop: 5,
    fontStyle: 'italic',
  },

  // --- List Items (General) ---
  itemContainer: {
    // Base style for most list items (tasks, rewards, users, instruments etc.)
    backgroundColor: colors.backgroundPrimary, // White card background
    padding: 12,
    marginBottom: 10, // Standard spacing between items
    borderRadius: 8, // Standard rounded corners
    borderWidth: 1, // Standard border
    borderColor: colors.borderSecondary, // Light gray border
  },
  itemTitle: {
    // Base style for titles within list items
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
  },
   itemDetailText: {
     // Generic style for detail lines in list items (dates, small info)
     fontSize: 13,
     color: colors.textSecondary,
     marginBottom: 2,
   },


  // --- Specific/Reused Item Variations ---
  // Styles like rewardImage, rewardDetails, taskItemStatus, historyItemContainer etc.
  // might live here if reused across roles, or stay in role-specific files if unique.
  // For now, let's keep them in role/component specific files and use colors from here.
  // We can migrate more later if patterns fully emerge across roles.

   // --- Text Colors (Helpers if needed, but using colors.textPrimary/Secondary directly is cleaner) ---
   textGold: { color: colors.gold },
   textSuccess: { color: colors.success },
   textDanger: { color: colors.danger },
   textWarning: { color: colors.warning },


});