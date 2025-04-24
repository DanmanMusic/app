// src/styles/modalSharedStyles.ts
import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const modalSharedStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Consistent background dimming
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    padding: 20, // Standard padding
    alignItems: 'stretch', // Use stretch for children to fill width easily
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%', // Consistent width constraint
    maxWidth: 500, // Max width for larger screens
    maxHeight: '90%', // Prevent overly tall modals
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: colors.textPrimary,
    width: '100%',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
  },
  modalSectionTitle: { // For sub-sections within a modal
      fontSize: 16,
      fontWeight: '600',
      marginTop: 15,
      marginBottom: 10,
      color: colors.textSecondary,
      width: '100%',
      textAlign: 'center',
  },
  // Combined button container styles
  buttonContainer: {
    width: '100%',
    marginTop: 15, // Space above buttons
    gap: 10, // Space between buttons if multiple vertically
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
    paddingTop: 15, // Space below the border
  },
   // Maybe a separate style for the final cancel/close button
   footerButton: {
     width: '100%',
     marginTop: 10, // Add slight space if primary buttons exist
   },
   // Keep loading/error styles potentially in commonSharedStyles instead? Or here? Let's put them here for now as they are often modal-related.
   loadingContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     height: 20, // Consistent height
     marginVertical: 10, // Consistent spacing
   },
   loadingText: {
     marginLeft: 10,
     fontSize: 14,
     color: colors.textSecondary,
   },
   scrollView: { width: '100%', marginBottom: 15 },
   modalSubSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
    width: '100%',
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    paddingBottom: 10,
  },
  iconPreviewContainer: {
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSecondary,
    width: '100%',
  },
  iconPreview: {
    width: 60,
    height: 60,
    marginBottom: 5,
  },
  modalContextInfo: { // New style for studentInfo
    fontSize: 15, // Standardize size? or keep 16? Let's try 15
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10, // Standard margin below context info
    width: '100%', // Ensure it takes full width for centering
  },
  modalToggleContainer: { // New style for toggleContainer
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribute space
    alignItems: 'center', // Vertically center items if they have different heights
    marginVertical: 15, // Standard vertical spacing for such controls
    width: '100%', // Take full width
    paddingHorizontal: 10, // Optional padding
  },
  previewText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 15,
  },
  modalListContainer: { // New style for lists inside modals
    flexGrow: 0, // Don't allow list to push content out infinitely
    width: '100%',
    maxHeight: '60%', // Sensible default max height (adjust if needed)
    marginBottom: 15, // Space before action buttons below
  },
  modalHeader: {
    width: '100%',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
  },
  filterSection: {
    width: '100%',
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSecondary,
    paddingBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
    gap: 8,
    alignItems: 'center',
  },
  filterLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginRight: 5 },
  footer: {
    width: '100%',
    paddingBottom: 10,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: colors.borderPrimary,
    backgroundColor: colors.backgroundPrimary,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
    color: colors.textSecondary,
    alignSelf: 'flex-start',
    width: '100%',
  },
  contentScrollView: { width: '100%', maxHeight: '65%', marginBottom: 15 },
  searchInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
    marginBottom: 10,
  },
  listItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSecondary },
  listItemText: { fontSize: 15, color: colors.textPrimary },
  taskItemText: { fontSize: 14, color: colors.textPrimary },
  taskDescription: { fontSize: 12, color: colors.textLight, marginTop: 3 },
  modeSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  confirmationText: { fontSize: 16, marginVertical: 15, textAlign: 'center', lineHeight: 22 },
  modalMessage: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  roleSpecificSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
    width: '100%',
  },
  roleSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 10,
  },
  awardedPointsText: { fontSize: 20, fontWeight: 'bold', color: colors.gold },
  slider: { width: '100%', height: 40, marginTop: 10 },
  rangeText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 5,
    marginTop: -5,
    marginBottom: 5,
    fontSize: 12,
    color: colors.textSecondary,
  },
  goalSelectItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
    borderRadius: 6,
    backgroundColor: colors.backgroundPrimary,
  },
  currentGoalItem: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.backgroundHighlight,
  },
  goalSelectItemContent: { flexDirection: 'row', alignItems: 'center' },
  goalSelectImage: {
    width: 45,
    height: 45,
    marginRight: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSecondary,
  },
  goalSelectDetails: { flex: 1, justifyContent: 'center' },
  goalSelectName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  cannotAffordText: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 2 },
  checkmark: { fontSize: 24, color: colors.primary, marginLeft: 10 },  
});