import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useKtvStore } from '@/store/useKtvStore';
import RoomCard from '@/components/RoomCard';
import type { Room } from '@/types/ktv';
import { getRoomTypeText } from '@/data/mockData';

type StatusFilter = 'all' | 'available' | 'using';
type TypeFilter = 'all' | 'mini' | 'small' | 'medium' | 'large' | 'vip';

const HomePage: React.FC = () => {
  const { rooms, checkTimeoutBookings, setCurrentBooking, getTodayStats } = useKtvStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [filteredRooms, setFilteredRooms] = useState<Room[]>(rooms);

  const stats = getTodayStats();

  useEffect(() => {
    const timer = setInterval(() => {
      checkTimeoutBookings();
    }, 30000);
    return () => clearInterval(timer);
  }, [checkTimeoutBookings]);

  useDidShow(() => {
    checkTimeoutBookings();
  });

  useEffect(() => {
    let result = [...rooms];

    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(r => r.type === typeFilter);
    }

    setFilteredRooms(result);
  }, [rooms, statusFilter, typeFilter]);

  const handleBook = useCallback((roomId: string, startTime: string, endTime: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    setCurrentBooking(null);
    Taro.navigateTo({
      url: `/pages/booking/index?roomId=${roomId}&startTime=${startTime}&endTime=${endTime}`
    });
  }, [rooms, setCurrentBooking]);

  const handleRefresh = () => {
    Taro.showLoading({ title: '刷新中...' });
    checkTimeoutBookings();
    setTimeout(() => {
      Taro.hideLoading();
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 1000);
  };

  const handleJoinQueue = () => {
    Taro.switchTab({ url: '/pages/queue/index' });
  };

  const handleJoinBackup = () => {
    Taro.switchTab({ url: '/pages/backup/index' });
  };

  const handleStatClick = (type: string) => {
    switch (type) {
      case 'available':
        setStatusFilter('available');
        break;
      case 'using':
        setStatusFilter('using');
        break;
      case 'pending':
        setStatusFilter('all');
        Taro.showToast({ title: '待到店预订', icon: 'none' });
        break;
      case 'notified':
        Taro.switchTab({ url: '/pages/backup/index' });
        break;
      case 'calling':
        Taro.switchTab({ url: '/pages/queue/index' });
        break;
    }
  };

  const typeOptions: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'mini', label: '迷你包' },
    { key: 'small', label: '小包' },
    { key: 'medium', label: '中包' },
    { key: 'large', label: '大包' },
    { key: 'vip', label: 'VIP' }
  ];

  return (
    <ScrollView scrollY className={styles.page} refresherEnabled onRefresherRefresh={handleRefresh}>
      <View className={styles.header}>
        <Text className={styles.title}>🎤 KTV包厢预订</Text>
        <Text className={styles.subtitle}>选择您心仪的包厢，开启欢乐时光</Text>
      </View>

      <View className={styles.overviewCard}>
        <Text className={styles.overviewTitle}>📊 今日运营概览</Text>
        <View className={styles.overviewGrid}>
          <View className={styles.overviewItem} onClick={() => handleStatClick('available')}>
            <Text className={classnames(styles.overviewValue, styles.ovAvailable)}>{stats.availableRooms}</Text>
            <Text className={styles.overviewLabel}>空闲</Text>
          </View>
          <View className={styles.overviewItem} onClick={() => handleStatClick('using')}>
            <Text className={classnames(styles.overviewValue, styles.ovUsing)}>{stats.usingRooms}</Text>
            <Text className={styles.overviewLabel}>使用中</Text>
          </View>
          <View className={styles.overviewItem} onClick={() => handleStatClick('pending')}>
            <Text className={classnames(styles.overviewValue, styles.ovPending)}>{stats.pendingBookings}</Text>
            <Text className={styles.overviewLabel}>待到店</Text>
          </View>
          <View className={styles.overviewItem} onClick={() => handleStatClick('notified')}>
            <Text className={classnames(styles.overviewValue, styles.ovNotified)}>{stats.notifiedBackups}</Text>
            <Text className={styles.overviewLabel}>候补通知</Text>
          </View>
          <View className={styles.overviewItem} onClick={() => handleStatClick('calling')}>
            <Text className={classnames(styles.overviewValue, styles.ovCalling)}>{stats.callingQueue}</Text>
            <Text className={styles.overviewLabel}>叫号中</Text>
          </View>
        </View>
      </View>

      <View className={styles.filterSection}>
        <View className={styles.filterTabs}>
          <Button
            className={classnames(styles.filterTab, statusFilter === 'all' && styles.active)}
            onClick={() => setStatusFilter('all')}
          >
            全部
          </Button>
          <Button
            className={classnames(styles.filterTab, statusFilter === 'available' && styles.active)}
            onClick={() => setStatusFilter('available')}
          >
            空闲
          </Button>
          <Button
            className={classnames(styles.filterTab, statusFilter === 'using' && styles.active)}
            onClick={() => setStatusFilter('using')}
          >
            使用中
          </Button>
        </View>

        <View className={styles.typeFilter}>
          {typeOptions.map(option => (
            <Button
              key={option.key}
              className={classnames(styles.typeTag, typeFilter === option.key && styles.active)}
              onClick={() => setTypeFilter(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </View>
      </View>

      <View className={styles.roomList}>
        <Text className={styles.sectionTitle}>
          {typeFilter === 'all' ? '全部包厢' : getRoomTypeText(typeFilter)}
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: '24rpx', fontWeight: 'normal' }}>
            {' '}({filteredRooms.length}间)
          </Text>
        </Text>

        {filteredRooms.length > 0 ? (
          filteredRooms.map(room => (
            <RoomCard key={room.id} room={room} onBook={handleBook} />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🎵</Text>
            <Text className={styles.emptyText}>暂无符合条件的包厢</Text>
          </View>
        )}
      </View>

      <View style={{ height: 120 }} />

      <View className={styles.quickActions}>
        <Button className={classnames(styles.quickBtn, styles.secondary)} onClick={handleJoinQueue}>
          取号排队
        </Button>
        <Button className={styles.quickBtn} onClick={handleJoinBackup}>
          候补登记
        </Button>
      </View>
    </ScrollView>
  );
};

export default HomePage;
