import { Platform, StyleSheet } from 'react-native';

import { appSharedStyles } from './appSharedStyles';
import { colors } from './colors';

export const adminSharedStyles = StyleSheet.create({
  adminNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  adminStudentActions: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'space-around',
    marginBottom: 20,
    marginTop: 15,
  },
  assignedTaskActions: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  instrumentIcon: {
    height: 40,
    marginRight: 15,
    width: 40,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'space-around',
    marginTop: 10,
  },
  itemTitleText: {
    flexShrink: 1,
    marginBottom: 0,
  },
  pickerContainer: {
    height: 50, // Set height for the container
    borderColor: colors.borderPrimary,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15, // Match input margin bottom
    justifyContent: 'center', // Center Picker vertically
    backgroundColor: colors.backgroundPrimary, // Match input background
  },
  picker: {
      width: '100%',
      height: Platform.OS === 'android' ? 50 : undefined, // Android needs explicit height sometimes
      color: colors.textPrimary, // Match input text color
  },
  pickerItem: {
      // iOS specific styling for items in the dropdown list
      height: 120, // Example height, adjust as needed for iOS list rows
      fontSize: 16,
  },  
  pendingDetail: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 3,
  },
  pendingTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionSubTitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
  },
  taskItem: {
    ...appSharedStyles.itemContainer,
    marginBottom: 8,
    padding: 10,
  },
  taskItemTickets: {
    color: colors.success,
    fontSize: 13,
    fontWeight: 'bold',
  },
  taskItemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 3,
  },
});
