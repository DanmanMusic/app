// src/components/admin/adminSharedStyles.ts
import { StyleSheet } from 'react-native';

export const adminSharedStyles = StyleSheet.create({
  // --- Layout and Structural Styles ---
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  adminNav: {
    // Styles for the top navigation buttons in main Admin view
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20, // Keep margin top for sections within scroll view
    marginBottom: 15,
    color: '#444',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 5,
  },
  sectionSubTitle: {
    // Used for sub-sections like Pupil/Teacher lists in Users
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#555',
  },
  detailText: {
    // Generic style for detail lines like ID, instrument, balance
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 5,
  },
  adminStudentActions: {
    // Container for action buttons in student detail view
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    marginBottom: 20,
    gap: 5,
  },

  // --- List Item Styles (Common Structure) ---
  item: {
    // Generic container for list items (Users, Task Library, Rewards, Instruments)
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemTitle: {
    // Title within a list item
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemActions: {
    // Container for action buttons within a list item
    flexDirection: 'row',
    justifyContent: 'space-around', // Default to space-around, sections can override if needed
    marginTop: 10,
    gap: 5,
  },

  // --- Specific Item Styles (Used in multiple places or with variations) ---
  rewardItemContent: {
    // Container for image+details in RewardItem
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // Space above action buttons
  },
  rewardImage: {
    // Image style for RewardItem
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  rewardDetails: {
    // Text details container next to image
    flex: 1,
  },

  // --- Reused styles for Assigned Tasks (in student detail view) ---
  taskItem: {
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 8, // Less space when in a list
    borderRadius: 8, // Consistent border radius
    borderWidth: 1,
    borderColor: '#ddd', // Consistent border color
  },
  taskItemTitle: {
    fontSize: 15, // Slightly smaller when in a list
    fontWeight: 'bold',
    marginBottom: 3,
  },
  taskItemStatus: {
    // Task status line
    fontSize: 13,
    color: '#555',
    marginBottom: 3,
  },
  taskItemDetail: {
    // Style for dates, points etc.
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  pendingNote: {
    // Style for "Awaiting verification..." text
    fontSize: 12,
    color: 'orange',
    fontStyle: 'italic',
    marginTop: 5,
  },
  assignedTaskActions: {
    // Actions within an assigned task item (e.g., Delete)
    flexDirection: 'row',
    justifyContent: 'flex-end', // Actions to the right
    marginTop: 8,
    gap: 5,
  },
});
