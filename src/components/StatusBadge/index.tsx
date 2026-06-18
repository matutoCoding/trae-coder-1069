import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { getStatusText } from '@/data/mockData';

interface StatusBadgeProps {
  status: string;
  text?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  const displayText = text || getStatusText(status);

  return (
    <View className={classnames(styles.badge, styles[status])}>
      <Text>{displayText}</Text>
    </View>
  );
};

export default StatusBadge;
