// src/components/admin/adminSharedStyles.ts
import { StyleSheet } from 'react-native';
// Import the color palette and general styles
import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';

export const adminSharedStyles = StyleSheet.create({
  // --- Layout and Structural Styles (Admin Specific) ---
  // safeArea and container styles moved to appSharedStyles
  // headerContainer and header styles moved to appSharedStyles

  adminNav: {
    // Styles for the top navigation buttons in main Admin view
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8, // Use gap for spacing
  },
  // sectionTitle moved to appSharedStyles
  sectionSubTitle: {
    // Used for sub-sections like Pupil/Teacher lists in Users
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: colors.textSecondary, // Use color from palette
  },
  // detailText moved to appSharedStyles
  // emptyListText moved to appSharedStyles
  adminStudentActions: {
    // Container for action buttons in student detail view
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    marginBottom: 20,
    gap: 5,
  },

  // --- List Item Styles (Admin Specific or Variations) ---
  // item (generic item container) - REMOVED, use appSharedStyles.itemContainer
  // itemTitle - REMOVED, use appSharedStyles.itemTitle
  itemActions: {
    // Container for action buttons within a list item
    flexDirection: 'row',
    justifyContent: 'space-around', // Default to space-around, sections can override if needed
    marginTop: 10,
    gap: 5, // Use gap for button spacing
  },

  // --- Specific Item Styles (Used in multiple places or with variations) ---
  rewardItemContent: {
    // Container for image+details in RewardItem - Keep as it's specific layout
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // Space above action buttons
  },
  rewardImage: {
    // Image style for RewardItem - Keep as it's specific element styling
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderPrimary, // Use color from palette
  },
  rewardDetails: {
    // Text details container next to image - Keep
    flex: 1,
  },

  // --- Reused styles for Assigned Tasks (in student detail view) ---
  taskItem: {
    // Specific task item style - based on itemContainer but with slight variations
    ...appSharedStyles.itemContainer, // Inherit base properties
    padding: 10, // Override padding slightly
    marginBottom: 8, // Less space when in a list
    // borderRadius, borderWidth, borderColor are the same as base, no need to override unless changing
  },
  taskItemTitle: {
    // Specific task item title - Keep local as it might differ slightly in size/weight
    fontSize: 15, // Slightly smaller when in a list
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  taskItemStatus: {
    // Task status line - Keep local
    fontSize: 13,
    color: colors.textSecondary, // Use color from palette
    marginBottom: 3,
  },
  // taskItemDetail - REMOVED, use appSharedStyles.itemDetailText
  taskItemTickets: { // Keep local as it has specific color/weight
    fontSize: 13, // Matches itemDetailText size
    fontWeight: 'bold',
    color: colors.success, // Use success color
 },
  pendingNote: {
    // Style for "Awaiting verification..." text - Keep local
    fontSize: 12,
    color: colors.warning, // Use warning color
    fontStyle: 'italic',
    marginTop: 5,
  },
  assignedTaskActions: {
    // Actions within an assigned task item (e.g., Delete) - Keep local
    flexDirection: 'row',
    justifyContent: 'flex-end', // Actions to the right
    marginTop: 8,
    gap: 5,
  },
   // Styles for the Admin/Teacher pending verification list items
   pendingItem: {
     ...appSharedStyles.itemContainer, // Inherit base properties
     borderColor: colors.borderWarning, // Override border color for warning state
     // padding, marginBottom, borderRadius, borderWidth are same as base, no need to override
   },
   pendingTitle: { // Keep local
     fontSize: 16,
     fontWeight: 'bold',
     marginBottom: 5,
     color: colors.textPrimary,
   },
   pendingDetail: { // Keep local
     fontSize: 14, // Slightly larger detail text for clarity
     color: colors.textSecondary,
     marginBottom: 3,
   },
});