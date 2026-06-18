import React, { useState, useMemo } from 'react';
import { View, Text, Button, Input, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useKtvStore } from '@/store/useKtvStore';
import { getRoomTypeText } from '@/data/mockData';
import dayjs from 'dayjs';

const BookingPage: React.FC = () => {
  const router = useRouter();
  const { rooms, packages, selectedPackage, setSelectedPackage, createBooking } = useKtvStore();

  const roomId = router.params.roomId as string;
  const startTime = router.params.startTime as string;
  const endTime = router.params.endTime as string;

  const room = rooms.find(r => r.id === roomId);
  const [peopleCount, setPeopleCount] = useState(room?.capacity ? Math.min(4, room.capacity) : 4);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [name, setName] = useState('李女士');
  const [phone, setPhone] = useState('139****5678');

  const hours = useMemo(() => {
    return dayjs(endTime, 'HH:mm').diff(dayjs(startTime, 'HH:mm'), 'hour');
  }, [startTime, endTime]);

  const roomPrice = useMemo(() => {
    return room ? room.pricePerHour * hours : 0;
  }, [room, hours]);

  const totalPrice = useMemo(() => {
    const pkgPrice = selectedPackage ? selectedPackage.price : 0;
    return roomPrice + pkgPrice;
  }, [roomPrice, selectedPackage]);

  const handleSelectPackage = () => {
    setShowPackageModal(true);
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setShowPackageModal(false);
  };

  const handleClearPackage = () => {
    setSelectedPackage(null);
  };

  const handleSubmit = async () => {
    if (!room) return;

    Taro.showLoading({ title: '提交中...' });

    const success = await createBooking(
      roomId,
      startTime,
      endTime,
      peopleCount,
      selectedPackage?.id
    );

    Taro.hideLoading();

    if (success) {
      Taro.showModal({
        title: '预订成功',
        content: `您已成功预订${room.name}，请在${startTime}前到店`,
        showCancel: false,
        success: () => {
          Taro.switchTab({ url: '/pages/mine/index' });
        }
      });
      console.log('[Booking] 提交预订', { roomId, startTime, endTime, peopleCount, packageId: selectedPackage?.id });
    } else {
      Taro.showToast({ title: '预订失败，请重试', icon: 'none' });
    }
  };

  if (!room) {
    return (
      <View className={styles.page}>
        <View style={{ padding: 100, textAlign: 'center' }}>
          <Text>未找到包厢信息</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.roomSection}>
        <View className={styles.roomCard}>
          <View className={styles.roomHeader}>
            <View>
              <Text className={styles.roomName}>{room.name}</Text>
              <View style={{ marginTop: 8 }}>
                <Text className={styles.roomType}>{getRoomTypeText(room.type)}</Text>
                <Text className={styles.roomInfo}>容纳{room.capacity}人</Text>
              </View>
            </View>
            <View>
              <Text className={styles.price}>¥{room.pricePerHour}</Text>
              <Text className={styles.priceUnit}>/小时</Text>
            </View>
          </View>

          <View className={styles.timeSection}>
            <View className={styles.timeItem}>
              <Text className={styles.timeLabel}>开始时间</Text>
              <Text className={styles.timeValue}>{startTime}</Text>
            </View>
            <Text className={styles.timeArrow}>→</Text>
            <View className={styles.timeItem}>
              <Text className={styles.timeLabel}>结束时间</Text>
              <Text className={styles.timeValue}>{endTime}</Text>
            </View>
            <View className={styles.timeItem}>
              <Text className={styles.timeLabel}>时长</Text>
              <Text className={styles.timeValue}>{hours}小时</Text>
            </View>
          </View>

          <View className={styles.facilities}>
            <Text className={styles.facilitiesTitle}>包厢设施</Text>
            <View className={styles.facilityList}>
              {room.facilities.map((f, i) => (
                <Text key={i} className={styles.facilityTag}>{f}</Text>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>预订信息</Text>
        <View className={styles.formCard}>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>姓名</Text>
            <Input
              className={styles.formInput}
              value={name}
              onInput={(e) => setName(e.detail.value)}
              placeholder="请输入姓名"
              placeholderStyle="color: rgba(255,255,255,0.3)"
            />
          </View>
          <View className={styles.formRow}>
            <Text className={styles.formLabel}>手机号</Text>
            <Input
              className={styles.formInput}
              value={phone}
              onInput={(e) => setPhone(e.detail.value)}
              placeholder="请输入手机号"
              placeholderStyle="color: rgba(255,255,255,0.3)"
            />
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
                onClick={() => setPeopleCount(Math.min(room.capacity, peopleCount + 1))}
              >
                +
              </Button>
            </View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <Text>酒水套餐</Text>
          <Text className={styles.changeBtn} onClick={handleSelectPackage}>
            {selectedPackage ? '更换' : '选择'}
          </Text>
        </View>
        {selectedPackage ? (
          <View className={styles.packageSelector}>
            <View style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text className={styles.packageName}>{selectedPackage.name}</Text>
              <Text className={styles.packagePrice}>¥{selectedPackage.price}</Text>
            </View>
            <Text style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
              {selectedPackage.description}
            </Text>
            <Button
              style={{ marginTop: 16, padding: '8rpx 24rpx', fontSize: 24, background: 'transparent', color: '#FF4757', border: 'none' }}
              onClick={handleClearPackage}
            >
              不选择套餐
            </Button>
          </View>
        ) : (
          <View className={styles.packageSelector} onClick={handleSelectPackage}>
            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>点击选择酒水套餐，享更多优惠</Text>
          </View>
        )}
      </View>

      <View className={styles.summary}>
        <View className={styles.summaryCard}>
          <View className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>包厢费用</Text>
            <Text className={styles.summaryValue}>¥{room.pricePerHour} × {hours}小时</Text>
          </View>
          <View className={styles.summaryRow}>
            <Text className={styles.summaryLabel}>包厢小计</Text>
            <Text className={styles.summaryValue}>¥{roomPrice}</Text>
          </View>
          {selectedPackage && (
            <View className={styles.summaryRow}>
              <Text className={styles.summaryLabel}>{selectedPackage.name}</Text>
              <Text className={styles.summaryValue}>¥{selectedPackage.price}</Text>
            </View>
          )}
          <View className={classnames(styles.summaryRow, styles.totalRow)}>
            <Text className={styles.summaryLabel}>合计</Text>
            <Text className={styles.summaryValue}>¥{totalPrice}</Text>
          </View>
        </View>
      </View>

      <View className={styles.notice}>
        <Text className={styles.noticeTitle}>⚠️ 预订须知</Text>
        <View className={styles.noticeContent}>
          <Text>• 请在预订开始时间前15分钟到店</Text>
          <Text>• 超时15分钟未到店，预订将自动取消</Text>
          <Text>• 取消预订需提前2小时</Text>
          <Text>• 高峰期可能需要等待，请谅解</Text>
        </View>
      </View>

      <View style={{ height: 180 }} />

      <View className={styles.footerBar}>
        <View className={styles.totalPrice}>
          <Text className={styles.totalLabel}>应付总额</Text>
          <Text className={styles.totalAmount}>¥{totalPrice}</Text>
        </View>
        <Button className={styles.submitBtn} onClick={handleSubmit}>
          确认预订
        </Button>
      </View>

      {showPackageModal && (
        <View className={styles.packageModal} onClick={() => setShowPackageModal(false)}>
          <View className={styles.packageContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>选择酒水套餐</Text>
              <Text className={styles.closeBtn} onClick={() => setShowPackageModal(false)}>×</Text>
            </View>
            <ScrollView scrollY style={{ maxHeight: 600 }}>
              {packages.map(pkg => (
                <View
                  key={pkg.id}
                  style={{
                    padding: 24,
                    marginBottom: 16,
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    border: selectedPackage?.id === pkg.id ? '1rpx solid #9D4EDD' : '1rpx solid rgba(255,255,255,0.1)',
                  }}
                  onClick={() => handlePackageSelect(pkg)}
                >
                  <View style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 30, fontWeight: 600, color: '#fff' }}>{pkg.name}</Text>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#FF6B9D' }}>¥{pkg.price}</Text>
                  </View>
                  <Text style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
                    {pkg.description}
                  </Text>
                  <Text style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)', textDecoration: 'line-through', marginLeft: 8 }}>
                    ¥{pkg.originalPrice}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default BookingPage;
