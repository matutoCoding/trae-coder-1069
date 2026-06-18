import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useKtvStore } from '@/store/useKtvStore';
import StatusBadge from '@/components/StatusBadge';
import { getWaitTime, getCountdown } from '@/utils';

const BackupPage: React.FC = () => {
  const { backupList, getMyBackup, joinBackup, cancelBackup, confirmBackup, checkExpiredBackups } = useKtvStore();
  const [selectedType, setSelectedType] = useState('中包');
  const [peopleCount, setPeopleCount] = useState(6);
  const [countdown, setCountdown] = useState({ minutes: 0, seconds: 0, expired: false });

  const myBackup = getMyBackup();
  const waitingBackups = backupList.filter(b => b.status === 'waiting');

  const roomTypes = ['迷你包', '小包', '中包', '大包', 'VIP'];

  const getListPosition = (backupId: string, roomType: string) => {
    const sameTypeList = backupList.filter(
      b => b.status === 'waiting' && b.roomType === roomType
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const index = sameTypeList.findIndex(b => b.id === backupId);
    return index >= 0 ? index + 1 : 0;
  };

  useEffect(() => {
    const checkTimer = setInterval(() => {
      checkExpiredBackups();
    }, 10000);
    return () => clearInterval(checkTimer);
  }, [checkExpiredBackups]);

  useDidShow(() => {
    checkExpiredBackups();
  });

  useEffect(() => {
    if (myBackup?.status === 'notified' && myBackup.expiresAt) {
      const timer = setInterval(() => {
        const cd = getCountdown(myBackup.expiresAt!);
        setCountdown(cd);
        if (cd.expired) {
          clearInterval(timer);
          checkExpiredBackups();
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [myBackup, checkExpiredBackups]);

  const handleJoinBackup = useCallback(() => {
    if (myBackup) {
      Taro.showToast({ title: '您已在候补队列中', icon: 'none' });
      return;
    }
    const result = joinBackup(selectedType, peopleCount);
    if (result) {
      Taro.showToast({ title: '候补登记成功', icon: 'success' });
      console.log('[Backup] 候补登记成功', { backupId: result.id });
    } else {
      Taro.showToast({ title: '登记失败，请重试', icon: 'none' });
    }
  }, [myBackup, selectedType, peopleCount, joinBackup]);

  const handleConfirm = useCallback(() => {
    if (!myBackup) return;
    Taro.showModal({
      title: '确认补位',
      content: '确认接受补位并前往包厢？',
      success: (res) => {
        if (res.confirm) {
          confirmBackup(myBackup.id);
          Taro.showToast({ title: '已确认，请尽快到店', icon: 'success' });
          console.log('[Backup] 确认补位', { backupId: myBackup.id });
          Taro.switchTab({ url: '/pages/queue/index' });
        }
      }
    });
  }, [myBackup, confirmBackup]);

  const handleCancel = useCallback(() => {
    if (!myBackup) return;
    Taro.showModal({
      title: '取消候补',
      content: '确定要取消候补登记吗？',
      success: (res) => {
        if (res.confirm) {
          const success = cancelBackup(myBackup.id);
          if (success) {
            Taro.showToast({ title: '已取消', icon: 'success' });
          }
        }
      }
    });
  }, [myBackup, cancelBackup]);

  const getPosition = (backupId: string) => {
    const backupItem = backupList.find(b => b.id === backupId);
    if (!backupItem) return 0;
    const sameTypeList = backupList.filter(
      b => b.status === 'waiting' && b.roomType === backupItem.roomType
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const index = sameTypeList.findIndex(b => b.id === backupId);
    return index >= 0 ? index + 1 : sameTypeList.length + 1;
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>🌟 候补补位</Text>
        <Text className={styles.subtitle}>
          包厢满员时，加入候补队列。一旦有包厢释放，将第一时间通知您！
        </Text>
      </View>

      <View className={styles.tips}>
        <Text className={styles.tipsTitle}>候补须知</Text>
        <View className={styles.tipsContent}>
          <Text className={styles.tipsItem}>• 候补登记后请保持手机畅通</Text>
          <Text className={styles.tipsItem}>• 包厢释放后将按候补顺序通知</Text>
          <Text className={styles.tipsItem}>• 收到通知后10分钟内确认有效</Text>
          <Text className={styles.tipsItem}>• 超时未确认将自动顺延至下一位</Text>
        </View>
      </View>

      {myBackup ? (
        <View className={styles.myBackup}>
          <Text className={styles.sectionTitle}>我的候补</Text>
          <View className={classnames(styles.backupCard, myBackup.status === 'notified' && styles.notified)}>
            <View className={styles.cardHeader}>
              <View className={styles.backupInfo}>
                <Text className={styles.roomType}>{myBackup.roomType}</Text>
                <Text className={styles.peopleCount}>{myBackup.peopleCount}人</Text>
              </View>
              <StatusBadge status={myBackup.status} />
            </View>

            <View className={styles.waitTimeSection}>
              <Text className={styles.waitLabel}>等待时间</Text>
              <Text className={styles.waitValue}>{getWaitTime(myBackup.createdAt)}</Text>
              <Text className={styles.position}>队列第{getPosition(myBackup.id)}位</Text>
            </View>

            {myBackup.status === 'notified' && !countdown.expired && (
              <View className={styles.countdownSection}>
                <Text className={styles.countdownTitle}>🎉 有包厢释放！请在以下时间内确认</Text>
                <Text className={styles.countdownTime}>
                  {countdown.minutes}分{String(countdown.seconds).padStart(2, '0')}秒
                </Text>
              </View>
            )}

            <View className={styles.actions}>
              {myBackup.status === 'notified' && !countdown.expired && (
                <Button className={classnames(styles.actionBtn, styles.primaryBtn)} onClick={handleConfirm}>
                  立即确认
                </Button>
              )}
              <Button className={classnames(styles.actionBtn, styles.dangerBtn)} onClick={handleCancel}>
                取消候补
              </Button>
            </View>
          </View>
        </View>
      ) : (
        <View className={styles.joinForm}>
          <Text className={styles.sectionTitle}>候补登记</Text>
          <View className={styles.formCard}>
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
            <Button className={styles.joinBtn} onClick={handleJoinBackup}>
              加入候补队列
            </Button>
          </View>
        </View>
      )}

      <View className={styles.backupList}>
        <View className={styles.listHeader}>
          <Text className={styles.listTitle}>候补队列</Text>
          <Text className={styles.listCount}>共{waitingBackups.length}人</Text>
        </View>

        {waitingBackups.length > 0 ? (
          waitingBackups.map((item, index) => (
            <View key={item.id} className={classnames(styles.backupItem, item.status === 'notified' && styles.notified)}>
              <View className={styles.itemHeader}>
                <Text className={styles.itemRoom}>{item.roomType}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text className={styles.itemInfo}>
                {item.userName} · {item.peopleCount}人
              </Text>
              <View className={styles.itemMeta}>
                <Text className={styles.metaText}>等待 {getWaitTime(item.createdAt)}</Text>
                <Text className={styles.metaText}>第{index + 1}位</Text>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>✨</Text>
            <Text className={styles.emptyText}>暂无候补，快来登记吧！</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default BackupPage;
