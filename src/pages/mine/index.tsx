import React, { useCallback } from 'react';
import { View, Text, Button, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { useKtvStore } from '@/store/useKtvStore';
import StatusBadge from '@/components/StatusBadge';

const MinePage: React.FC = () => {
  const { user, getMyBookings, getMyQueue, getMyBackup, cancelBooking, overcallRecords, checkTimeoutBookings, checkExpiredBackups } = useKtvStore();

  const myBookings = getMyBookings();
  const myQueue = getMyQueue();
  const myBackup = getMyBackup();

  useDidShow(() => {
    checkTimeoutBookings();
    checkExpiredBackups();
  });

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

  const formatTime = (time: string) => {
    return dayjs(time).format('MM-DD HH:mm');
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: '#FF7D00',
      confirmed: '#9D4EDD',
      using: '#00FF88',
      completed: '#00B42A',
      cancelled: '#86909C',
      timeout: '#FF4757',
      waiting: '#FFD700',
      calling: '#FF6B9D',
      overcall: '#FF4757',
      notified: '#FF6B9D'
    };
    return map[status] || '#86909C';
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
            <Text className={styles.statValue}>{myBookings.length}</Text>
            <Text className={styles.statLabel}>预订</Text>
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
        <Text className={styles.sectionTitle}>📋 预订时间线</Text>
        {myBookings.length > 0 ? (
          <View className={styles.timeline}>
            {myBookings.map(booking => (
              <View key={booking.id} className={styles.timelineItem}>
                <View className={styles.timelineDot} style={{ background: getStatusColor(booking.status) }} />
                <View className={styles.timelineContent}>
                  <View className={styles.timelineHeader}>
                    <Text className={styles.timelineTitle}>{booking.roomName}</Text>
                    <StatusBadge status={booking.status} />
                  </View>
                  <View className={styles.timelineMeta}>
                    <Text className={styles.timelineMetaItem}>
                      📅 {booking.startTime} - {booking.endTime} · {booking.peopleCount}人
                    </Text>
                  </View>
                  {booking.packageName && (
                    <Text className={styles.timelineMetaItem}>🍺 {booking.packageName}</Text>
                  )}
                  <View className={styles.timelineTime}>
                    <Text className={styles.timeLabel}>创建</Text>
                    <Text className={styles.timeValue}>{formatTime(booking.createdAt)}</Text>
                    {booking.timeoutAt && ['pending', 'timeout'].includes(booking.status) && (
                      <>
                        <Text className={styles.timeSeparator}>→</Text>
                        <Text className={styles.timeLabel}>到店截止</Text>
                        <Text className={classnames(styles.timeValue, booking.status === 'timeout' && styles.timeExpired)}>
                          {formatTime(booking.timeoutAt)}
                        </Text>
                      </>
                    )}
                    <Text className={styles.timeSeparator}>→</Text>
                    <Text className={styles.timeLabel}>金额</Text>
                    <Text className={styles.timeValue}>¥{booking.totalPrice}</Text>
                  </View>
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <View className={styles.timelineActions}>
                      <Button
                        className={classnames(styles.actionBtn, styles.dangerBtn)}
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        取消预订
                      </Button>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🎤</Text>
            <Text className={styles.emptyText}>暂无预订记录</Text>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>🎫 排队状态</Text>
        {myQueue ? (
          <View className={styles.timeline}>
            <View className={styles.timelineItem}>
              <View className={styles.timelineDot} style={{ background: getStatusColor(myQueue.status) }} />
              <View className={styles.timelineContent}>
                <View className={styles.timelineHeader}>
                  <Text className={styles.timelineTitle}>号码 {myQueue.queueNumber}</Text>
                  <StatusBadge status={myQueue.status} />
                </View>
                <Text className={styles.timelineMetaItem}>
                  {myQueue.roomType} · {myQueue.peopleCount}人
                </Text>
                {myQueue.overcallCount > 0 && (
                  <Text className={classnames(styles.timelineMetaItem, styles.warningText)}>
                    ⚠️ 已过号{myQueue.overcallCount}次
                  </Text>
                )}
                <View className={styles.timelineTime}>
                  <Text className={styles.timeLabel}>取号</Text>
                  <Text className={styles.timeValue}>{formatTime(myQueue.createdAt)}</Text>
                  {myQueue.calledAt && (
                    <>
                      <Text className={styles.timeSeparator}>→</Text>
                      <Text className={styles.timeLabel}>叫号</Text>
                      <Text className={styles.timeValue}>{formatTime(myQueue.calledAt)}</Text>
                    </>
                  )}
                </View>
                <View className={styles.timelineActions}>
                  <Button className={classnames(styles.actionBtn, styles.primaryBtn)} onClick={handleViewQueue}>
                    查看排队
                  </Button>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🎫</Text>
            <Text className={styles.emptyText}>暂无排队</Text>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>🔔 候补状态</Text>
        {myBackup ? (
          <View className={styles.timeline}>
            <View className={styles.timelineItem}>
              <View className={styles.timelineDot} style={{ background: getStatusColor(myBackup.status) }} />
              <View className={styles.timelineContent}>
                <View className={styles.timelineHeader}>
                  <Text className={styles.timelineTitle}>{myBackup.roomType}候补</Text>
                  <StatusBadge status={myBackup.status} />
                </View>
                <Text className={styles.timelineMetaItem}>
                  {myBackup.peopleCount}人
                </Text>
                <View className={styles.timelineTime}>
                  <Text className={styles.timeLabel}>登记</Text>
                  <Text className={styles.timeValue}>{formatTime(myBackup.createdAt)}</Text>
                  {myBackup.notifiedAt && (
                    <>
                      <Text className={styles.timeSeparator}>→</Text>
                      <Text className={styles.timeLabel}>通知</Text>
                      <Text className={styles.timeValue}>{formatTime(myBackup.notifiedAt)}</Text>
                    </>
                  )}
                  {myBackup.expiresAt && myBackup.status === 'notified' && (
                    <>
                      <Text className={styles.timeSeparator}>→</Text>
                      <Text className={styles.timeLabel}>确认截止</Text>
                      <Text className={styles.timeValue}>{formatTime(myBackup.expiresAt)}</Text>
                    </>
                  )}
                </View>
                <View className={styles.timelineActions}>
                  <Button className={classnames(styles.actionBtn, styles.primaryBtn)} onClick={handleViewBackup}>
                    查看候补
                  </Button>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🔔</Text>
            <Text className={styles.emptyText}>暂无候补</Text>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>功能菜单</Text>
        <View className={styles.menuList}>
          <View className={styles.menuItem} onClick={handleViewQueue}>
            <View className={styles.menuIcon}>🎫</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuName}>我的排队</Text>
              <Text className={styles.menuDesc}>{myQueue ? `号码: ${myQueue.queueNumber}` : '暂无排队'}</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.menuItem} onClick={handleViewBackup}>
            <View className={styles.menuIcon}>🔔</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuName}>我的候补</Text>
              <Text className={styles.menuDesc}>{myBackup ? '等待补位中' : '暂无候补'}</Text>
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
