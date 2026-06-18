import React, { useState, useCallback } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useKtvStore } from '@/store/useKtvStore';
import QueueItemComponent from '@/components/QueueItem';

const QueuePage: React.FC = () => {
  const {
    queue,
    getMyQueue,
    joinQueue,
    cancelQueue,
    callNextNumber,
    confirmServed,
    handleOvercall,
    requeueOvercall
  } = useKtvStore();

  const [selectedType, setSelectedType] = useState('小包');
  const [peopleCount, setPeopleCount] = useState(4);

  const myQueue = getMyQueue();
  const callingItem = queue.find(q => q.status === 'calling');
  const waitingQueue = queue.filter(q => ['waiting', 'overcall'].includes(q.status));
  const overcallQueue = queue.filter(q => q.status === 'overcall');

  const roomTypes = ['迷你包', '小包', '中包', '大包', 'VIP'];

  const handleJoinQueue = useCallback(() => {
    if (myQueue) {
      Taro.showToast({ title: '您已在排队中', icon: 'none' });
      return;
    }
    const result = joinQueue(selectedType, peopleCount);
    if (result) {
      Taro.showToast({
        title: `取号成功: ${result.queueNumber}`,
        icon: 'success'
      });
      console.log('[Queue] 取号成功', { queueNumber: result.queueNumber });
    } else {
      Taro.showToast({ title: '取号失败，请重试', icon: 'none' });
    }
  }, [myQueue, selectedType, peopleCount, joinQueue]);

  const handleCallNext = useCallback(() => {
    if (callingItem) {
      handleOvercall(callingItem.id);
    }
    const next = callNextNumber();
    if (next) {
      Taro.vibrateShort();
      console.log('[Queue] 叫号', { queueNumber: next.queueNumber });
    } else {
      Taro.showToast({ title: '暂无等待号码', icon: 'none' });
    }
  }, [callingItem, callNextNumber, handleOvercall]);

  const handleConfirmServed = useCallback((id: string) => {
    confirmServed(id);
    Taro.showToast({ title: '已确认入座', icon: 'success' });
  }, [confirmServed]);

  const handleRequeue = useCallback((id: string) => {
    requeueOvercall(id);
    Taro.showToast({ title: '已重排队尾', icon: 'success' });
  }, [requeueOvercall]);

  const handleCancel = useCallback(() => {
    if (!myQueue) return;
    Taro.showModal({
      title: '取消排队',
      content: '确定要取消排队吗？',
      success: (res) => {
        if (res.confirm) {
          const success = cancelQueue(myQueue.id);
          if (success) {
            Taro.showToast({ title: '已取消', icon: 'success' });
          }
        }
      }
    });
  }, [myQueue, cancelQueue]);

  const handleViewOvercall = () => {
    Taro.navigateTo({ url: '/pages/overcall/index' });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.currentCalling}>
        <Text className={styles.callingTitle}>📢 当前叫号</Text>
        {callingItem ? (
          <>
            <Text className={styles.callingNumber}>{callingItem.queueNumber}</Text>
            <Text className={styles.callingInfo}>
              {callingItem.userName} · {callingItem.peopleCount}人
            </Text>
            <View className={styles.callingRoom}>{callingItem.roomType}</View>
          </>
        ) : (
          <>
            <Text className={styles.callingNumber} style={{ fontSize: '80rpx' }}>--</Text>
            <Text className={styles.callingInfo}>暂无叫号</Text>
          </>
        )}
      </View>

      <View className={styles.statsRow}>
        <View className={styles.statCard}>
          <Text className={styles.statNumber}>{waitingQueue.length}</Text>
          <Text className={styles.statLabel}>等待中</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statNumber}>{overcallQueue.length}</Text>
          <Text className={styles.statLabel}>已过号</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statNumber}>
            {queue.filter(q => q.status === 'served').length}
          </Text>
          <Text className={styles.statLabel}>已入座</Text>
        </View>
      </View>

      {!myQueue ? (
        <View className={styles.myQueueSection}>
          <Text className={styles.sectionTitle}>取号排队</Text>
          <View className={styles.joinForm}>
            <View className={styles.formRow}>
              <Text className={styles.formLabel}>包厢类型</Text>
              <View className={styles.typeSelector}>
                {roomTypes.map(type => (
                  <Button
                    key={type}
                    className={classnames(styles.typeOption, selectedType === type && styles.active)}
                    onClick={() => setSelectedType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </View>
            </View>
            <View className={styles.formRow}>
              <Text className={styles.formLabel}>人数</Text>
              <View className={styles.stepper}>
                <Button
                  className={styles.stepperBtn}
                  onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                >
                  -
                </Button>
                <Text className={styles.stepperValue}>{peopleCount}</Text>
                <Button
                  className={styles.stepperBtn}
                  onClick={() => setPeopleCount(Math.min(20, peopleCount + 1))}
                >
                  +
                </Button>
              </View>
            </View>
            <Button className={styles.joinBtn} onClick={handleJoinQueue}>
              获取排队号
            </Button>
          </View>
        </View>
      ) : (
        <View className={styles.myQueueSection}>
          <Text className={styles.sectionTitle}>我的号码</Text>
          <QueueItemComponent
            item={myQueue}
            allQueue={queue}
            onConfirm={() => handleConfirmServed(myQueue.id)}
            onRequeue={() => handleRequeue(myQueue.id)}
            onCancel={handleCancel}
          />
        </View>
      )}

      <View className={styles.queueList}>
        <View className={styles.listHeader}>
          <Text className={styles.listTitle}>排队列表</Text>
          <Button className={styles.overcallBtn} onClick={handleViewOvercall}>
            过号记录
          </Button>
        </View>

        {waitingQueue.length > 0 ? (
          waitingQueue.map(item => (
            <QueueItemComponent
              key={item.id}
              item={item}
              allQueue={queue}
              showActions={false}
            />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🎉</Text>
            <Text className={styles.emptyText}>暂无排队，快来取号吧！</Text>
          </View>
        )}
      </View>

      <Button className={styles.callNextBtn} onClick={handleCallNext}>
        {callingItem ? '过号并叫下一位' : '叫下一位'}
      </Button>
    </ScrollView>
  );
};

export default QueuePage;
