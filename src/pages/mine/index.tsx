import React, { useCallback, useMemo } from 'react';
import { View, Text, Button, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { useKtvStore } from '@/store/useKtvStore';
import StatusBadge from '@/components/StatusBadge';
import type { OperationLog } from '@/types/ktv';
import { getCountdown } from '@/utils';

interface TimelineItem {
  id: string;
  type: 'booking' | 'queue' | 'backup';
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
  timeoutAt?: string;
  expiresAt?: string;
  price?: number;
  bookingId?: string;
  source?: 'normal' | 'backup';
  operations?: OperationLog[];
  clearedAt?: string;
}

const opTypeMap: Record<string, { label: string; icon: string }> = {
  checkin: { label: '到店核销', icon: '✅' },
  clear: { label: '清台完成', icon: '🧹' },
  timeout_release: { label: '超时释放', icon: '⏰' }
};

const MinePage: React.FC = () => {
  const {
    user,
    getMyBookings,
    getMyQueueHistory,
    getMyBackupHistory,
    cancelBooking,
    checkinBooking,
    overcallRecords,
    checkTimeoutBookings,
    checkExpiredBackups
  } = useKtvStore();

  const myBookings = getMyBookings();
  const myQueueHistory = getMyQueueHistory();
  const myBackupHistory = getMyBackupHistory();

  const [, setTick] = React.useState(0);

  useDidShow(() => {
    checkTimeoutBookings();
    checkExpiredBackups();
    setTick(t => t + 1);
  });

  React.useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    myBookings.forEach(b => {
      items.push({
        id: `booking-${b.id}`,
        type: 'booking',
        title: b.roomName,
        subtitle: `${b.startTime} - ${b.endTime} · ${b.peopleCount}人${b.packageName ? ' · ' + b.packageName : ''}`,
        status: b.status,
        createdAt: b.createdAt,
        timeoutAt: b.timeoutAt,
        price: b.totalPrice,
        bookingId: b.id,
        source: b.source,
        operations: b.operations,
        clearedAt: b.clearedAt
      });
    });

    myQueueHistory.forEach(q => {
      items.push({
        id: `queue-${q.id}`,
        type: 'queue',
        title: `号码 ${q.queueNumber}`,
        subtitle: `${q.roomType} · ${q.peopleCount}人${q.overcallCount > 0 ? ' · 过号' + q.overcallCount + '次' : ''}`,
        status: q.status,
        createdAt: q.createdAt
      });
    });

    myBackupHistory.forEach(bk => {
      items.push({
        id: `backup-${bk.id}`,
        type: 'backup',
        title: `${bk.roomType}候补`,
        subtitle: `${bk.peopleCount}人`,
        status: bk.status,
        createdAt: bk.createdAt,
        expiresAt: bk.expiresAt
      });
    });

    return items.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
  }, [myBookings, myQueueHistory, myBackupHistory]);

  const activeCount = useMemo(() => {
    return timeline.filter(t =>
      (t.type === 'booking' && ['pending', 'confirmed', 'using'].includes(t.status)) ||
      (t.type === 'queue' && ['waiting', 'calling', 'overcall'].includes(t.status)) ||
      (t.type === 'backup' && ['waiting', 'notified'].includes(t.status))
    ).length;
  }, [timeline]);

  const handleCancelBooking = useCallback((bookingId: string) => {
    Taro.showModal({
      title: '取消预订',
      content: '确定要取消该预订吗？',
      success: (res) => {
        if (res.confirm) {
          cancelBooking(bookingId);
          Taro.showToast({ title: '已取消', icon: 'success' });
        }
      }
    });
  }, [cancelBooking]);

  const handleCheckin = useCallback((bookingId: string) => {
    Taro.showModal({
      title: '到店核销',
      content: '确认用户已到店，开始使用包厢？',
      success: (res) => {
        if (res.confirm) {
          const success = checkinBooking(bookingId);
          if (success) {
            Taro.showToast({ title: '核销成功', icon: 'success' });
          }
        }
      }
    });
  }, [checkinBooking]);

  const formatTime = (time: string) => {
    return dayjs(time).format('MM-DD HH:mm');
  };

  const getTypeIcon = (type: string) => {
    const map: Record<string, string> = {
      booking: '🎤',
      queue: '🎫',
      backup: '🔔'
    };
    return map[type] || '📋';
  };

  const getTypeLabel = (type: string, source?: 'normal' | 'backup') => {
    if (type === 'booking' && source === 'backup') return '候补补位';
    const map: Record<string, string> = {
      booking: '预订',
      queue: '排队',
      backup: '候补'
    };
    return map[type] || '';
  };

  const handleViewOvercall = () => {
    Taro.navigateTo({ url: '/pages/overcall/index' });
  };

  const handleViewQueue = () => {
    Taro.switchTab({ url: '/pages/queue/index' });
  };

  const handleViewBackup = () => {
    Taro.switchTab({ url: '/pages/backup/index' });
  };

  const handleContact = () => {
    Taro.makePhoneCall({ phoneNumber: '400-123-4567' });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.userHeader}>
        <View className={styles.userInfo}>
          <Image className={styles.avatar} src={user.avatar} mode="aspectFill" />
          <View className={styles.userDetail}>
            <Text className={styles.userName}>{user.name}</Text>
            <View>
              <View className={styles.vipBadge}>VIP {user.vipLevel} 会员</View>
            </View>
            <Text className={styles.phone}>{user.phone}</Text>
          </View>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{activeCount}</Text>
            <Text className={styles.statLabel}>进行中</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>¥{user.totalSpent}</Text>
            <Text className={styles.statLabel}>累计消费</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{overcallRecords.length}</Text>
            <Text className={styles.statLabel}>过号</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>📋 我的时间线</Text>
        {timeline.length > 0 ? (
          <View className={styles.timeline}>
            {timeline.map(item => {
              const showPendingHighlight = item.type === 'booking' && item.status === 'pending';
              const cd = showPendingHighlight ? getCountdown(item.timeoutAt || '') : null;
              const urgent = cd && !cd.expired && cd.minutes <= 5;
              return (
                <View
                  key={item.id}
                  className={classnames(
                    styles.timelineItem,
                    showPendingHighlight && urgent && styles.timelineUrgent
                  )}
                >
                  <View className={styles.timelineIcon}>{getTypeIcon(item.type)}</View>
                  <View className={styles.timelineContent}>
                    <View className={styles.timelineHeader}>
                      <View className={styles.timelineTitleRow}>
                        <Text className={classnames(
                          styles.timelineTypeTag,
                          item.source === 'backup' && styles.backupTag
                        )}>{getTypeLabel(item.type, item.source)}</Text>
                        <Text className={styles.timelineTitle}>{item.title}</Text>
                      </View>
                      <StatusBadge status={item.status} />
                    </View>
                    <Text className={styles.timelineSubtitle}>{item.subtitle}</Text>

                    {showPendingHighlight && cd && (
                      <View className={classnames(styles.countdownBanner, cd.expired && styles.expired, urgent && styles.urgent)}>
                        <Text className={styles.countdownBannerIcon}>⏰</Text>
                        <Text className={styles.countdownBannerText}>
                          {cd.expired
                            ? '到店时间已过，包厢已释放'
                            : `距离到店截止还有 ${cd.minutes}分${cd.seconds}秒`
                          }
                        </Text>
                      </View>
                    )}

                    <View className={styles.timelineTimeRow}>
                      <View className={styles.timeBlock}>
                        <Text className={styles.timeLabel}>创建</Text>
                        <Text className={styles.timeValue}>{formatTime(item.createdAt)}</Text>
                      </View>

                      {item.timeoutAt && item.type === 'booking' && (
                        <View className={styles.timeBlock}>
                          <Text className={styles.timeLabel}>到店截止</Text>
                          <Text className={classnames(styles.timeValue, item.status === 'timeout' && styles.timeExpired)}>
                            {formatTime(item.timeoutAt)}
                          </Text>
                        </View>
                      )}

                      {item.expiresAt && item.type === 'backup' && item.status === 'notified' && (
                        <View className={styles.timeBlock}>
                          <Text className={styles.timeLabel}>确认截止</Text>
                          <Text className={styles.timeValue}>{formatTime(item.expiresAt)}</Text>
                        </View>
                      )}

                      {item.clearedAt && (
                        <View className={styles.timeBlock}>
                          <Text className={styles.timeLabel}>清台</Text>
                          <Text className={styles.timeValue}>{formatTime(item.clearedAt)}</Text>
                        </View>
                      )}

                      {item.price !== undefined && (
                        <View className={styles.timeBlock}>
                          <Text className={styles.timeLabel}>金额</Text>
                          <Text className={classnames(styles.timeValue, styles.priceValue)}>¥{item.price}</Text>
                        </View>
                      )}
                    </View>

                    {item.operations && item.operations.length > 0 && (
                      <View className={styles.opLogs}>
                        {item.operations.map(op => (
                          <View key={op.id} className={styles.opLogItem}>
                            <Text className={styles.opLogIcon}>{opTypeMap[op.type]?.icon || '📝'}</Text>
                            <View className={styles.opLogContent}>
                              <Text className={styles.opLogLabel}>
                                {opTypeMap[op.type]?.label || op.type}
                              </Text>
                              <Text className={styles.opLogMeta}>
                                {op.operatorName} · {formatTime(op.operateAt)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {item.type === 'booking' && item.status === 'pending' && item.bookingId && (
                      <View className={styles.timelineActions}>
                        <Button
                          className={classnames(styles.actionBtn, styles.primaryBtn)}
                          onClick={() => handleCheckin(item.bookingId!)}
                        >
                          到店核销
                        </Button>
                        <Button
                          className={classnames(styles.actionBtn, styles.dangerBtn)}
                          onClick={() => handleCancelBooking(item.bookingId!)}
                        >
                          取消预订
                        </Button>
                      </View>
                    )}

                    {item.type === 'booking' && item.status === 'confirmed' && item.bookingId && (
                      <View className={styles.timelineActions}>
                        <Button
                          className={classnames(styles.actionBtn, styles.dangerBtn)}
                          onClick={() => handleCancelBooking(item.bookingId!)}
                        >
                          取消预订
                        </Button>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无记录</Text>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>功能菜单</Text>
        <View className={styles.menuList}>
          <View className={styles.menuItem} onClick={handleViewQueue}>
            <View className={styles.menuIcon}>🎫</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuName}>排队叫号</Text>
              <Text className={styles.menuDesc}>取号、叫号、过号处理</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.menuItem} onClick={handleViewBackup}>
            <View className={styles.menuIcon}>🔔</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuName}>候补补位</Text>
              <Text className={styles.menuDesc}>包厢满员时登记候补</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.menuItem} onClick={handleViewOvercall}>
            <View className={styles.menuIcon}>⚠️</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuName}>过号记录</Text>
              <Text className={styles.menuDesc}>{overcallRecords.length}条记录</Text>
            </View>
            {overcallRecords.length > 0 && (
              <View className={styles.menuBadge}>{overcallRecords.length}</View>
            )}
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.menuItem} onClick={handleContact}>
            <View className={styles.menuIcon}>📞</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuName}>联系客服</Text>
              <Text className={styles.menuDesc}>400-123-4567</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>
      </View>

      <Button className={styles.logoutBtn} onClick={handleLogout}>
        退出登录
      </Button>
    </ScrollView>
  );
};

export default MinePage;
