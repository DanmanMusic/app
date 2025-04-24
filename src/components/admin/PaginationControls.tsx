import React from 'react';
import { View, Text, Button } from 'react-native';
import { colors } from '../../styles/colors';
import { PaginationControlsProps } from '../../types/componentProps';
import { commonSharedStyles } from '../../styles/commonSharedStyles';

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <View style={commonSharedStyles.paginationContainer}>
      <Button
        title="Previous"
        onPress={handlePrevious}
        disabled={currentPage <= 1}
        color={colors.primary}
      />
      <Text style={commonSharedStyles.pageInfo}>
        Page {currentPage} of {totalPages}
      </Text>
      <Button
        title="Next"
        onPress={handleNext}
        disabled={currentPage >= totalPages}
        color={colors.primary}
      />
    </View>
  );
};

export default PaginationControls;
