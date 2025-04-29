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
    height: 50,
    borderColor: colors.borderPrimary,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    justifyContent: 'center',
    backgroundColor: colors.backgroundPrimary,
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'android' ? 50 : undefined,
    color: colors.textPrimary,
  },
  pickerItem: {
    height: 120,
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
