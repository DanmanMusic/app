
import { StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { appSharedStyles } from '../../styles/appSharedStyles';

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

  rewardItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  rewardImage: {
    width: 60,
    height: 60,
    marginRight: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
  },
  rewardDetails: {
    flex: 1,
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

  pendingNote: {
    fontSize: 12,
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: 5,
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
});