import React, { useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useKtvStore } from '@/store/useKtvStore';

import dayjs from 'dayjs';
import styles from './index.module.scss';

const OvercallPage: React.FC = () => {
  const { queue, overcallRecords, requeueOvercall, handleOvercall } = useKtvStore();

  const pendingOvercalls = useMemo(() => {
    return queue.filter(q => q.status === 'overcall');
  }, [queue]);

  const stats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const todayRecords = overcallRecords.filter(r =>
      dayjs(r.overcallTime, 'HH:mm').format('YYYY-MM-DD') === today
    );
    return {
      total: overcallRecords.length,
      today: todayRecords.length,
      requeued: overcallRecords.filter(r => r.status === 'requeued').length,
      cancelled: overcallRecords.filter(r => r.status === 'cancelled').length
    };
  }, [overcallRecords]);

  const handleRequeue = (queueId: string) => {
    Taro.showModal({
      title: '确认重排',
      content: '确定将该号码重新排到队尾吗？',
      success: (res) => {
        if (res.confirm) {
          const success = requeueOvercall(queueId);
          if (success) {
            Taro.showToast({ title: '已重排队尾', icon: 'success' });
          }
        }
      }
    });
  };

  const handleCancel = (queueId: string) => {
    Taro.showModal({
      title: '确认作废',
      content: '该顾客已连续过号2次，确定作废吗？',
      confirmColor: '#FF4757',
      success: (res) => {
        if (res.confirm) {
          const success = handleOvercall(queueId);
          if (success) {
            Taro.showToast({ title: '已作废', icon: 'success' });
          }
        }
      }
    });
  };

  const goBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.container}>
      <View className={styles.statsRow}>
        <View className={styles.statCard}>
          <Text className={`${styles.statNumber} ${styles.warning}`}>{stats.today}</Text>
          <Text className={styles.statLabel}>今日过号</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={`${styles.statNumber} ${styles.info}`}>{stats.requeued}</Text>
          <Text className={styles.statLabel}>已重排</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={`${styles.statNumber} ${styles.danger}`}>{stats.cancelled}</Text>
          <Text className={styles.statLabel}>已作废</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>
          <Text className={styles.icon}>⚠️</Text>
          待处理过号
        </Text>
        {pendingOvercalls.length > 0 ? (
          pendingOvercalls.map(item => (
            <View key={item.id} className={styles.pendingOvercall}>
              <Text className={styles.queueNumber}>{item.queueNumber}</Text>
              <View className={styles.userInfo}>
                <Text className={styles.name}>{item.userName}</Text>
                <Text className={styles.roomType}>{item.roomType} · {item.peopleCount}人</Text>
              </View>
              <View className={styles.overcallInfo}>
                <Text>过号时间：{dayjs(item.calledAt).format('HH:mm')}</Text>
                <Text>过号次数：<Text className={styles.count}>{item.overcallCount}/2</Text></Text>
              </View>
              <View className={styles.actionButtons}>
                <Button
                  className={`${styles.btn} ${styles.requeue}`}
                  onClick={() => handleRequeue(item.id)}
                >
                  重排队尾
                </Button>
                <Button
                  className={`${styles.btn} ${styles.cancel}`}
                  onClick={() => handleCancel(item.id)}
                >
                  作废处理
                </Button>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.icon}>✅</Text>
            <Text className={styles.text}>暂无待处理过号</Text>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>
          <Text className={styles.icon}>📋</Text>
          过号记录
        </Text>
        <View className={styles.recordList}>
          {overcallRecords.length > 0 ? (
            overcallRecords.map(record => (
              <View key={record.id} className={styles.recordItem}>
                <View className={`${styles.queueBadge} ${styles[record.status]}`}>
                  {record.queueNumber.slice(-3)}
                </View>
                <View className={styles.recordInfo}>
                  <Text className={styles.name}>{record.userName}</Text>
                  <View className={styles.meta}>
                    <Text>{record.roomType}</Text>
                    <Text>{record.overcallTime}</Text>
                  </View>
                </View>
                <Text className={`${styles.statusTag} ${styles[record.status]}`}>
                  {record.status === 'requeued' ? '已重排' : '已作废'}
                </Text>
              </View>
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.icon}>📭</Text>
              <Text className={styles.text}>暂无过号记录</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.rulesBox}>
          <Text className={styles.rulesTitle}>
            <Text>📌</Text>
            过号规则说明
          </Text>
          <View className={styles.rulesList}>
            <Text className={styles.ruleItem}>叫号后超过5分钟未到店，视为过号</Text>
            <Text className={styles.ruleItem}>首次过号可申请重新排到队尾</Text>
            <Text className={styles.ruleItem}>连续过号2次，该号码自动作废</Text>
            <Text className={styles.ruleItem}>号码作废后需重新取号排队</Text>
            <Text className={styles.ruleItem}>过号记录保留7天，逾期自动清除</Text>
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <Button className={styles.backBtn} onClick={goBack}>
          返回排队叫位
        </Button>
      </View>
    </View>
  );
};

export default OvercallPage;
