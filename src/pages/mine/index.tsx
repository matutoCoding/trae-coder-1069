import React, { useCallback } from 'react';
import { View, Text, Button, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
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
          console.log('[Mine] 取消预订', { bookingId });
        }
      }
    });
  }, [cancelBooking]);

  const handleViewPackages = () => {
    Taro.navigateTo({ url: '/pages/package/index' });
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

  const handleSetting = () => {
    Taro.showToast({ title: '设置功能开发中', icon: 'none' });
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

  const menuItems = [
    { icon: '📋', name: '我的预订', desc: `${myBookings.length}条预订记录`, onClick: () => {} },
    { icon: '🎫', name: '我的排队', desc: myQueue ? `号码: ${myQueue.queueNumber}` : '暂无排队', onClick: handleViewQueue },
    { icon: '🔔', name: '我的候补', desc: myBackup ? '等待补位中' : '暂无候补', onClick: handleViewBackup },
    { icon: '⚠️', name: '过号记录', desc: `${overcallRecords.length}条记录`, onClick: handleViewOvercall, badge: overcallRecords.length > 0 ? overcallRecords.length : null },
    { icon: '🍺', name: '酒水套餐', desc: '查看优惠套餐', onClick: handleViewPackages },
    { icon: '📞', name: '联系客服', desc: '400-123-4567', onClick: handleContact },
    { icon: '⚙️', name: '设置', desc: '个性化设置', onClick: handleSetting }
  ];

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
        <Text className={styles.sectionTitle}>我的预订</Text>
        {myBookings.length > 0 ? (
          <View className={styles.bookingList}>
            {myBookings.map(booking => (
              <View key={booking.id} className={styles.bookingItem}>
                <View className={styles.bookingHeader}>
                  <View>
                    <Text className={styles.bookingRoom}>{booking.roomName}</Text>
                    <Text className={styles.bookingTime}>
                      {booking.startTime} - {booking.endTime} · {booking.peopleCount}人
                    </Text>
                    {booking.packageName && (
                      <Text className={styles.bookingPackage}>套餐：{booking.packageName}</Text>
                    )}
                  </View>
                  <View style={{ textAlign: 'right' }}>
                    <StatusBadge status={booking.status} />
                    <Text className={styles.bookingPrice}>¥{booking.totalPrice}</Text>
                  </View>
                </View>
                {(booking.status === 'confirmed' || booking.status === 'pending') && (
                  <View className={styles.bookingActions}>
                    <Button className={classnames(styles.actionBtn, styles.secondaryBtn)}>
                      查看详情
                    </Button>
                    <Button
                      className={classnames(styles.actionBtn, styles.dangerBtn)}
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      取消预订
                    </Button>
                  </View>
                )}
                {booking.status === 'using' && (
                  <View className={styles.bookingActions}>
                    <Button className={classnames(styles.actionBtn, styles.primaryBtn)}>
                      加时/续单
                    </Button>
                    <Button className={classnames(styles.actionBtn, styles.secondaryBtn)}>
                      服务呼叫
                    </Button>
                  </View>
                )}
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
        <Text className={styles.sectionTitle}>功能菜单</Text>
        <View className={styles.menuList}>
          {menuItems.map((item, index) => (
            <View key={index} className={styles.menuItem} onClick={item.onClick}>
              <View className={styles.menuIcon}>{item.icon}</View>
              <View className={styles.menuContent}>
                <Text className={styles.menuName}>{item.name}</Text>
                <Text className={styles.menuDesc}>{item.desc}</Text>
              </View>
              {item.badge && (
                <View className={styles.menuBadge}>{item.badge}</View>
              )}
              <Text className={styles.menuArrow}>›</Text>
            </View>
          ))}
        </View>
      </View>

      <Button className={styles.logoutBtn} onClick={handleLogout}>
        退出登录
      </Button>
    </ScrollView>
  );
};

export default MinePage;
