import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { Room, TimeSlot } from '@/types/ktv';
import StatusBadge from '@/components/StatusBadge';
import { getRoomTypeText } from '@/data/mockData';
import { getCountdown } from '@/utils';
import { useKtvStore } from '@/store/useKtvStore';

interface RoomCardProps {
  room: Room;
  onBook: (roomId: string, startTime: string, endTime: string) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onBook }) => {
  const { updateRoomStatus, clearRoom } = useKtvStore();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ minutes: 0, seconds: 0, expired: false });
  const [staffMenuOpen, setStaffMenuOpen] = useState(false);

  useEffect(() => {
    if (room.currentBooking?.timeoutAt && room.status === 'booked') {
      const timer = setInterval(() => {
        const cd = getCountdown(room.currentBooking!.timeoutAt!);
        setCountdown(cd);
        if (cd.expired) clearInterval(timer);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [room.currentBooking, room.status]);

  const handleSlotSelect = (slot: TimeSlot) => {
    if (slot.status !== 'available') return;
    setSelectedSlot(selectedSlot === slot.id ? null : slot.id);
  };

  const handleBook = () => {
    if (!selectedSlot) {
      Taro.showToast({ title: '请先选择时段', icon: 'none' });
      return;
    }
    const slot = room.timeSlots.find(s => s.id === selectedSlot);
    if (slot) onBook(room.id, slot.startTime, slot.endTime);
  };

  const handleStaffAction = (action: string) => {
    setStaffMenuOpen(false);
    switch (action) {
      case 'using':
        Taro.showModal({
          title: '确认操作',
          content: `确定将${room.name}标记为使用中？`,
          success: (res) => {
            if (res.confirm) {
              updateRoomStatus(room.id, 'using');
              Taro.showToast({ title: '已标记使用中', icon: 'success' });
            }
          }
        });
        break;
      case 'clear':
        Taro.showModal({
          title: '清台确认',
          content: `确定清台${room.name}？将释放包厢并通知候补`,
          success: (res) => {
            if (res.confirm) {
              clearRoom(room.id);
              Taro.showToast({ title: '清台完成，已通知候补', icon: 'success' });
            }
          }
        });
        break;
      case 'maintenance':
        Taro.showModal({
          title: '维护确认',
          content: `确定将${room.name}标记为维护中？`,
          success: (res) => {
            if (res.confirm) {
              updateRoomStatus(room.id, 'maintenance');
              Taro.showToast({ title: '已标记维护中', icon: 'success' });
            }
          }
        });
        break;
      case 'restore':
        Taro.showModal({
          title: '恢复确认',
          content: `确定将${room.name}恢复为空闲？`,
          success: (res) => {
            if (res.confirm) {
              updateRoomStatus(room.id, 'available');
              Taro.showToast({ title: '已恢复空闲', icon: 'success' });
            }
          }
        });
        break;
    }
  };

  const isDisabled = room.status !== 'available' || !selectedSlot;

  return (
    <View className={styles.card}>
      <View className={styles.cardHeader}>
        <View className={styles.roomInfo}>
          <Text className={styles.roomName}>{room.name}</Text>
          <View>
            <Text className={styles.roomType}>{getRoomTypeText(room.type)}</Text>
            <Text className={styles.capacity}>容纳{room.capacity}人</Text>
          </View>
        </View>
        <View className={styles.priceSection}>
          <StatusBadge status={room.status} />
          <Text className={styles.price}>¥{room.pricePerHour}</Text>
          <Text className={styles.priceUnit}>/小时</Text>
        </View>
      </View>

      {room.currentBooking && (room.status === 'booked' || room.status === 'using') && (
        <View className={styles.currentBooking}>
          <Text className={styles.bookingTitle}>
            ⏰ {room.currentBooking.userName} {room.status === 'using' ? '使用中' : '预订中'}
          </Text>
          <Text className={styles.bookingInfo}>
            {room.currentBooking.startTime} - {room.currentBooking.endTime}
            {room.status === 'booked' && !countdown.expired && (
              <Text className={styles.countdown}>
                {' '}超时倒计时: {countdown.minutes}分{countdown.seconds}秒
              </Text>
            )}
            {room.status === 'booked' && countdown.expired && (
              <Text className={styles.countdown}> 已超时，即将释放</Text>
            )}
          </Text>
        </View>
      )}

      <ScrollView scrollX className={styles.timeSlots}>
        {room.timeSlots.map(slot => (
          <View
            key={slot.id}
            className={classnames(
              styles.timeSlot,
              styles[slot.status],
              selectedSlot === slot.id && styles.selected
            )}
            onClick={() => handleSlotSelect(slot)}
          >
            <Text className={styles.timeText}>{slot.startTime}</Text>
            <Text className={styles.timeStatus}>
              {slot.status === 'available' ? '可预订' : slot.status === 'booked' ? '已预订' : '使用中'}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className={styles.facilities}>
        {room.facilities.slice(0, 4).map((facility, index) => (
          <Text key={index} className={styles.facilityTag}>{facility}</Text>
        ))}
        {room.facilities.length > 4 && (
          <Text className={styles.facilityTag}>+{room.facilities.length - 4}</Text>
        )}
      </View>

      <View className={styles.actionRow}>
        <Button
          className={classnames(styles.actionBtn, isDisabled && styles.disabled)}
          disabled={isDisabled}
          onClick={handleBook}
        >
          {room.status === 'available' ? '立即预订' : room.status === 'booked' ? '已被预订' : room.status === 'using' ? '使用中' : '维护中'}
        </Button>
        <Button
          className={styles.staffToggle}
          onClick={() => setStaffMenuOpen(!staffMenuOpen)}
        >
          🛠️
        </Button>
      </View>

      {staffMenuOpen && (
        <View className={styles.staffMenu}>
          <Text className={styles.staffMenuTitle}>店员操作</Text>
          <View className={styles.staffMenuGrid}>
            {room.status !== 'using' && (
              <Button className={classnames(styles.staffBtn, styles.usingBtn)} onClick={() => handleStaffAction('using')}>
                标记使用中
              </Button>
            )}
            {(room.status === 'using' || room.status === 'booked') && (
              <Button className={classnames(styles.staffBtn, styles.clearBtn)} onClick={() => handleStaffAction('clear')}>
                清台完成
              </Button>
            )}
            {room.status !== 'maintenance' && (
              <Button className={classnames(styles.staffBtn, styles.maintBtn)} onClick={() => handleStaffAction('maintenance')}>
                标记维护中
              </Button>
            )}
            {room.status === 'maintenance' && (
              <Button className={classnames(styles.staffBtn, styles.restoreBtn)} onClick={() => handleStaffAction('restore')}>
                恢复空闲
              </Button>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default RoomCard;
