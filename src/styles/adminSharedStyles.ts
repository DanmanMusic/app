import { StyleSheet } from 'react-native';
import { appSharedStyles } from './appSharedStyles';
import { colors } from './colors';

export const adminSharedStyles = StyleSheet.create({
  adminNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },

  sectionSubTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: colors.textSecondary,
  },

  adminStudentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    marginBottom: 20,
    gap: 5,
  },

  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    gap: 5,
  },

  taskItem: {
    ...appSharedStyles.itemContainer,
    padding: 10,
    marginBottom: 8,
  },

  taskItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 3,
  },

  taskItemStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 3,
  },

  taskItemTickets: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.success,
  },

  assignedTaskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 5,
  },

  pendingItem: {
    ...appSharedStyles.itemContainer,
    borderColor: colors.borderWarning,
  },

  pendingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.textPrimary,
  },

  pendingDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  instrumentIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  itemTitleText: {
    flexShrink: 1,
    marginBottom: 0,
  },
});
