import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { QueueItem } from '@/types/ktv';
import StatusBadge from '@/components/StatusBadge';
import { getWaitTime, getQueuePosition } from '@/utils';

interface QueueItemProps {
  item: QueueItem;
  allQueue: QueueItem[];
  showActions?: boolean;
  onConfirm?: () => void;
  onRequeue?: () => void;
  onCancel?: () => void;
}

const QueueItemComponent: React.FC<QueueItemProps> = ({
  item,
  allQueue,
  showActions = true,
  onConfirm,
  onRequeue,
  onCancel
}) => {
  const waitTime = getWaitTime(item.createdAt);
  const position = getQueuePosition(item.id, allQueue);

  return (
    <View className={classnames(styles.item, styles[item.status])}>
      <View className={styles.itemHeader}>
        <View>
          <Text className={classnames(styles.queueNumber, item.status === 'calling' && styles.calling)}>
            {item.queueNumber}
          </Text>
        </View>
        <View className={styles.queueInfo}>
          <StatusBadge status={item.status} />
          <Text className={styles.roomType}>{item.roomType}</Text>
          <Text className={styles.peopleCount}>{item.peopleCount}人</Text>
        </View>
      </View>

      <View className={styles.waitTime}>
        <Text className={styles.waitTimeLabel}>等待时间</Text>
        <Text className={styles.waitTimeValue}>{waitTime}</Text>
        <Text className={styles.position}>前方{position - 1}位</Text>
      </View>

      {item.overcallCount > 0 && (
        <View className={styles.overcallInfo}>
          <Text className={styles.overcallText}>
            ⚠️ 已过号 <Text className={styles.overcallCount}>{item.overcallCount}</Text> 次，
            {item.overcallCount >= 2 ? '已作废' : '请尽快到现场，再次过号将作废'}
          </Text>
        </View>
      )}

      {showActions && item.status === 'calling' && (
        <View className={styles.actions}>
          <Button className={classnames(styles.actionBtn, styles.primaryBtn)} onClick={onConfirm}>
            我已到店
          </Button>
          <Button className={classnames(styles.actionBtn, styles.dangerBtn)} onClick={onCancel}>
            取消排队
          </Button>
        </View>
      )}

      {showActions && item.status === 'overcall' && item.overcallCount < 2 && (
        <View className={styles.actions}>
          <Button className={classnames(styles.actionBtn, styles.primaryBtn)} onClick={onRequeue}>
            重排队尾
          </Button>
          <Button className={classnames(styles.actionBtn, styles.dangerBtn)} onClick={onCancel}>
            取消排队
          </Button>
        </View>
      )}

      {showActions && item.status === 'waiting' && (
        <View className={styles.actions}>
          <Button className={classnames(styles.actionBtn, styles.secondaryBtn)} onClick={onCancel}>
            取消排队
          </Button>
        </View>
      )}
    </View>
  );
};

export default QueueItemComponent;
