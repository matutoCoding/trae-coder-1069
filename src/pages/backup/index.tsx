import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useKtvStore } from '@/store/useKtvStore';
import StatusBadge from '@/components/StatusBadge';
import { getWaitTime, getCountdown } from '@/utils';

const ROOM_TYPES = ['迷你包', '小包', '中包', '大包', 'VIP'] as const;

const BackupPage: React.FC = () => {
  const { backupList, getMyBackup, joinBackup, cancelBackup, acceptBackup, declineBackup, checkExpiredBackups, getBackupPositionByType } = useKtvStore();
  const [selectedType, setSelectedType] = useState<string>('中包');
  const [peopleCount, setPeopleCount] = useState(6);
  const [countdown, setCountdown] = useState({ minutes: 0, seconds: 0, expired: false });
  const [activeTypeTab, setActiveTypeTab] = useState<string>('全部');

  const myBackup = getMyBackup();

  const backupsByType = useMemo(() => {
    const grouped: Record<string, typeof backupList> = {};
    ROOM_TYPES.forEach(t => { grouped[t] = []; });
    backupList.filter(b => ['waiting', 'notified'].includes(b.status)).forEach(b => {
      if (grouped[b.roomType]) grouped[b.roomType].push(b);
    });
    return grouped;
  }, [backupList]);

  const displayedBackups = useMemo(() => {
    if (activeTypeTab === '全部') {
      return backupList.filter(b => ['waiting', 'notified'].includes(b.status));
    }
    return backupsByType[activeTypeTab] || [];
  }, [backupList, backupsByType, activeTypeTab]);

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
    } else {
      Taro.showToast({ title: '登记失败，请重试', icon: 'none' });
    }
  }, [myBackup, selectedType, peopleCount, joinBackup]);

  const handleAccept = useCallback(() => {
    if (!myBackup) return;
    Taro.showModal({
      title: '接受补位',
      content: '确认接受补位？将为您生成待到店预订，请在15分钟内到店',
      success: (res) => {
        if (res.confirm) {
          const success = acceptBackup(myBackup.id);
          if (success) {
            Taro.showToast({ title: '已接受，请尽快到店', icon: 'success' });
          } else {
            Taro.showToast({ title: '抱歉，该类型暂无可用包厢', icon: 'none' });
          }
        }
      }
    });
  }, [myBackup, acceptBackup]);

  const handleDecline = useCallback(() => {
    if (!myBackup) return;
    Taro.showModal({
      title: '放弃补位',
      content: '确定放弃本次补位机会？将顺延给下一位候补',
      success: (res) => {
        if (res.confirm) {
          declineBackup(myBackup.id);
          Taro.showToast({ title: '已放弃', icon: 'success' });
        }
      }
    });
  }, [myBackup, declineBackup]);

  const handleCancel = useCallback(() => {
    if (!myBackup) return;
    Taro.showModal({
      title: '取消候补',
      content: '确定要取消候补登记吗？',
      success: (res) => {
        if (res.confirm) {
          cancelBackup(myBackup.id);
          Taro.showToast({ title: '已取消', icon: 'success' });
        }
      }
    });
  }, [myBackup, cancelBackup]);

  const myPosition = myBackup ? getBackupPositionByType(myBackup.roomType, myBackup.id) : 0;

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
          <Text className={styles.tipsItem}>• 候补按包厢类型各自排队，互不影响</Text>
          <Text className={styles.tipsItem}>• 包厢释放后将按候补顺序通知</Text>
          <Text className={styles.tipsItem}>• 收到通知后10分钟内接受或放弃</Text>
          <Text className={styles.tipsItem}>• 接受后生成待到店预订，15分钟内需到店</Text>
          <Text className={styles.tipsItem}>• 放弃或超时自动顺延给同类型下一位</Text>
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
              <Text className={styles.position}>{myBackup.roomType}第{myPosition}位</Text>
            </View>

            {myBackup.status === 'notified' && !countdown.expired && (
              <View className={styles.countdownSection}>
                <Text className={styles.countdownTitle}>🎉 有包厢释放！请在以下时间内确认</Text>
                <Text className={styles.countdownTime}>
                  {countdown.minutes}分{String(countdown.seconds).padStart(2, '0')}秒
                </Text>
              </View>
            )}

            {myBackup.status === 'notified' && countdown.expired && (
              <View className={styles.countdownSection}>
                <Text className={styles.countdownTitle}>⏰ 确认时间已过</Text>
                <Text className={styles.countdownTime}>已超时</Text>
              </View>
            )}

            <View className={styles.actions}>
              {myBackup.status === 'notified' && !countdown.expired && (
                <Button className={classnames(styles.actionBtn, styles.primaryBtn)} onClick={handleAccept}>
                  接受补位
                </Button>
              )}
              {myBackup.status === 'notified' && !countdown.expired && (
                <Button className={classnames(styles.actionBtn, styles.warningBtn)} onClick={handleDecline}>
                  放弃
                </Button>
              )}
              {myBackup.status === 'waiting' && (
                <Button className={classnames(styles.actionBtn, styles.dangerBtn)} onClick={handleCancel}>
                  取消候补
                </Button>
              )}
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
                {ROOM_TYPES.map(type => (
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
          <Text className={styles.listCount}>共{displayedBackups.length}人</Text>
        </View>

        <View className={styles.typeTabs}>
          <Button
            className={classnames(styles.typeTab, activeTypeTab === '全部' && styles.active)}
            onClick={() => setActiveTypeTab('全部')}
          >
            全部
          </Button>
          {ROOM_TYPES.map(type => {
            const count = (backupsByType[type] || []).length;
            return (
              <Button
                key={type}
                className={classnames(styles.typeTab, activeTypeTab === type && styles.active)}
                onClick={() => setActiveTypeTab(type)}
              >
                {type}({count})
              </Button>
            );
          })}
        </View>

        {displayedBackups.length > 0 ? (
          displayedBackups.map((item) => {
            const pos = getBackupPositionByType(item.roomType, item.id);
            return (
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
                  <Text className={styles.metaText}>{item.roomType}第{pos}位</Text>
                </View>
              </View>
            );
          })
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
