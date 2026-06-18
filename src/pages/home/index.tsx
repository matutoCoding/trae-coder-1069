import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { useKtvStore } from '@/store/useKtvStore';
import RoomCard from '@/components/RoomCard';
import StatusBadge from '@/components/StatusBadge';
import type { Room } from '@/types/ktv';
import { getRoomTypeText } from '@/data/mockData';
import { getCountdown } from '@/utils';

type StatusFilter = 'all' | 'available' | 'using';
type TypeFilter = 'all' | 'mini' | 'small' | 'medium' | 'large' | 'vip';
type OverviewPanel = 'available' | 'using' | 'pending' | 'notified' | 'calling' | null;

const HomePage: React.FC = () => {
  const { rooms, bookings, backupList, queue, checkTimeoutBookings, checkExpiredBackups, setCurrentBooking, getTodayStats, checkinBooking } = useKtvStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [filteredRooms, setFilteredRooms] = useState<Room[]>(rooms);
  const [activePanel, setActivePanel] = useState<OverviewPanel>(null);

  const stats = getTodayStats();
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      checkTimeoutBookings();
      checkExpiredBackups();
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, [checkTimeoutBookings, checkExpiredBackups]);

  useDidShow(() => {
    checkTimeoutBookings();
    checkExpiredBackups();
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

  const pendingList = useMemo(() => {
    return bookings
      .filter(b => b.status === 'pending')
      .sort((a, b) => dayjs(a.timeoutAt || '').valueOf() - dayjs(b.timeoutAt || '').valueOf());
  }, [bookings]);

  const availableRooms = useMemo(() => rooms.filter(r => r.status === 'available'), [rooms]);
  const usingRooms = useMemo(() => rooms.filter(r => r.status === 'using'), [rooms]);
  const notifiedBackups = useMemo(() => backupList.filter(b => b.status === 'notified'), [backupList]);
  const callingQueue = useMemo(() => queue.filter(q => q.status === 'calling'), [queue]);

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
    checkExpiredBackups();
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

  const handleStatClick = (type: OverviewPanel) => {
    setActivePanel(activePanel === type ? null : type);
    if (type === 'available') setStatusFilter('available');
    if (type === 'using') setStatusFilter('using');
  };

  const handleCheckin = (bookingId: string, userName: string, roomName: string) => {
    Taro.showModal({
      title: '到店核销',
      content: `确认${userName}已到店，开始使用${roomName}？`,
      success: (res) => {
        if (res.confirm) {
          const ok = checkinBooking(bookingId);
          if (ok) Taro.showToast({ title: '核销成功', icon: 'success' });
        }
      }
    });
  };

  const typeOptions: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'mini', label: '迷你包' },
    { key: 'small', label: '小包' },
    { key: 'medium', label: '中包' },
    { key: 'large', label: '大包' },
    { key: 'vip', label: 'VIP' }
  ];

  const panelTitleMap: Record<string, string> = {
    available: '空闲包厢',
    using: '使用中包厢',
    pending: '待到店预订',
    notified: '候补通知中',
    calling: '排队叫号中'
  };

  return (
    <ScrollView scrollY className={styles.page} refresherEnabled onRefresherRefresh={handleRefresh}>
      <View className={styles.header}>
        <Text className={styles.title}>🎤 KTV包厢预订</Text>
        <Text className={styles.subtitle}>选择您心仪的包厢，开启欢乐时光</Text>
      </View>

      <View className={styles.overviewCard}>
        <Text className={styles.overviewTitle}>📊 今日运营概览</Text>
        <View className={styles.overviewGrid}>
          <View
            className={classnames(styles.overviewItem, activePanel === 'available' && styles.active)}
            onClick={() => handleStatClick('available')}
          >
            <Text className={classnames(styles.overviewValue, styles.ovAvailable)}>{stats.availableRooms}</Text>
            <Text className={styles.overviewLabel}>空闲</Text>
          </View>
          <View
            className={classnames(styles.overviewItem, activePanel === 'using' && styles.active)}
            onClick={() => handleStatClick('using')}
          >
            <Text className={classnames(styles.overviewValue, styles.ovUsing)}>{stats.usingRooms}</Text>
            <Text className={styles.overviewLabel}>使用中</Text>
          </View>
          <View
            className={classnames(styles.overviewItem, activePanel === 'pending' && styles.active)}
            onClick={() => handleStatClick('pending')}
          >
            <Text className={classnames(styles.overviewValue, styles.ovPending)}>{stats.pendingBookings}</Text>
            <Text className={styles.overviewLabel}>待到店</Text>
          </View>
          <View
            className={classnames(styles.overviewItem, activePanel === 'notified' && styles.active)}
            onClick={() => handleStatClick('notified')}
          >
            <Text className={classnames(styles.overviewValue, styles.ovNotified)}>{stats.notifiedBackups}</Text>
            <Text className={styles.overviewLabel}>候补通知</Text>
          </View>
          <View
            className={classnames(styles.overviewItem, activePanel === 'calling' && styles.active)}
            onClick={() => handleStatClick('calling')}
          >
            <Text className={classnames(styles.overviewValue, styles.ovCalling)}>{stats.callingQueue}</Text>
            <Text className={styles.overviewLabel}>叫号中</Text>
          </View>
        </View>

        {activePanel && (
          <View className={styles.detailPanel}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>{panelTitleMap[activePanel]}</Text>
              <Text className={styles.detailClose} onClick={() => setActivePanel(null)}>✕</Text>
            </View>

            {activePanel === 'available' && availableRooms.length === 0 && (
              <Text className={styles.detailEmpty}>暂无空闲包厢</Text>
            )}
            {activePanel === 'available' && availableRooms.map(room => (
              <View key={room.id} className={styles.detailItem}>
                <View className={styles.detailItemLeft}>
                  <Text className={styles.detailItemTitle}>{room.name}</Text>
                  <Text className={styles.detailItemMeta}>{getRoomTypeText(room.type)} · 容纳{room.capacity}人</Text>
                </View>
                <Text className={classnames(styles.detailItemPrice, styles.ovAvailable)}>¥{room.pricePerHour}/时</Text>
              </View>
            ))}

            {activePanel === 'using' && usingRooms.length === 0 && (
              <Text className={styles.detailEmpty}>暂无使用中包厢</Text>
            )}
            {activePanel === 'using' && usingRooms.map(room => (
              <View key={room.id} className={styles.detailItem}>
                <View className={styles.detailItemLeft}>
                  <Text className={styles.detailItemTitle}>{room.name}</Text>
                  <Text className={styles.detailItemMeta}>
                    {room.currentBooking?.userName || '-'} · {room.currentBooking?.startTime || ''}-{room.currentBooking?.endTime || ''}
                  </Text>
                </View>
                <StatusBadge status="using" />
              </View>
            ))}

            {activePanel === 'pending' && pendingList.length === 0 && (
              <Text className={styles.detailEmpty}>暂无待到店预订</Text>
            )}
            {activePanel === 'pending' && pendingList.map(booking => {
              const cd = getCountdown(booking.timeoutAt || '');
              return (
                <View key={booking.id} className={styles.detailItem}>
                  <View className={styles.detailItemLeft}>
                    <Text className={styles.detailItemTitle}>{booking.userName} · {booking.roomName}</Text>
                    <Text className={styles.detailItemMeta}>
                      {booking.startTime}-{booking.endTime} · {booking.peopleCount}人
                    </Text>
                    <Text className={classnames(styles.countdownText, cd.expired && styles.expired)}>
                      {cd.expired ? '已超时' : `剩余到店时间: ${cd.minutes}分${cd.seconds}秒`}
                    </Text>
                  </View>
                  <Button
                    className={classnames(styles.checkinMiniBtn)}
                    onClick={() => handleCheckin(booking.id, booking.userName, booking.roomName)}
                  >
                    核销
                  </Button>
                </View>
              );
            })}

            {activePanel === 'notified' && notifiedBackups.length === 0 && (
              <Text className={styles.detailEmpty}>暂无候补通知</Text>
            )}
            {activePanel === 'notified' && notifiedBackups.map(bk => {
              const cd = getCountdown(bk.expiresAt || '');
              return (
                <View key={bk.id} className={styles.detailItem} onClick={handleJoinBackup}>
                  <View className={styles.detailItemLeft}>
                    <Text className={styles.detailItemTitle}>{bk.userName} · {bk.roomType}</Text>
                    <Text className={classnames(styles.countdownText, cd.expired && styles.expired)}>
                      {cd.expired ? '已超时' : `确认剩余: ${cd.minutes}分${cd.seconds}秒`}
                    </Text>
                  </View>
                  <StatusBadge status="notified" />
                </View>
              );
            })}

            {activePanel === 'calling' && callingQueue.length === 0 && (
              <Text className={styles.detailEmpty}>暂无叫号中</Text>
            )}
            {activePanel === 'calling' && callingQueue.map(q => (
              <View key={q.id} className={styles.detailItem} onClick={handleJoinQueue}>
                <View className={styles.detailItemLeft}>
                  <Text className={styles.detailItemTitle}>号码 {q.queueNumber}</Text>
                  <Text className={styles.detailItemMeta}>{q.userName} · {q.roomType} · {q.peopleCount}人</Text>
                </View>
                <StatusBadge status="calling" />
              </View>
            ))}
          </View>
        )}
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
