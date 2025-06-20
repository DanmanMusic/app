import React from 'react';

import { View, Text } from 'react-native';

import { colors } from '../../styles/colors';
import { commonSharedStyles } from '../../styles/commonSharedStyles';
import { PaginationControlsProps } from '../../types/componentProps';
import { CustomButton } from '../common/CustomButton';
import { ArrowLeftIcon, ArrowRightIcon } from 'react-native-heroicons/solid';

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
      <CustomButton
        title="Previous"
        onPress={handlePrevious}
        disabled={currentPage <= 1}
        color={colors.primary}
        leftIcon={
          <ArrowLeftIcon
            color={currentPage >= totalPages ? colors.disabledText : colors.textWhite}
            size={18}
          />
        }
      />
      <Text style={commonSharedStyles.pageInfo}>
        Page {currentPage} of {totalPages}
      </Text>
      <CustomButton
        title="Next"
        onPress={handleNext}
        disabled={currentPage >= totalPages}
        color={colors.primary}
        leftIcon={
          <ArrowRightIcon
            color={currentPage >= totalPages ? colors.disabledText : colors.textWhite}
            size={18}
          />
        }
      />
    </View>
  );
};

export default PaginationControls;
