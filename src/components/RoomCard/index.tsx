import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import type { Room, TimeSlot } from '@/types/ktv';
import StatusBadge from '@/components/StatusBadge';
import { getRoomTypeText } from '@/data/mockData';
import { getCountdown } from '@/utils';

interface RoomCardProps {
  room: Room;
  onBook: (roomId: string, startTime: string, endTime: string) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onBook }) => {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (room.currentBooking?.timeoutAt && room.status === 'booked') {
      const timer = setInterval(() => {
        const cd = getCountdown(room.currentBooking!.timeoutAt!);
        setCountdown(cd);
        if (cd.expired) {
          clearInterval(timer);
        }
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
    if (slot) {
      onBook(room.id, slot.startTime, slot.endTime);
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

      {room.currentBooking && room.status === 'booked' && (
        <View className={styles.currentBooking}>
          <Text className={styles.bookingTitle}>
            ⏰ {room.currentBooking.userName} 预订中
          </Text>
          <Text className={styles.bookingInfo}>
            {room.currentBooking.startTime} - {room.currentBooking.endTime}
            {!countdown.expired && (
              <Text className={styles.countdown}>
                {' '}超时倒计时: {countdown.minutes}分{countdown.seconds}秒
              </Text>
            )}
            {countdown.expired && (
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

      <Button
        className={classnames(styles.actionBtn, isDisabled && styles.disabled)}
        disabled={isDisabled}
        onClick={handleBook}
      >
        {room.status === 'available' ? '立即预订' : room.status === 'booked' ? '已被预订' : room.status === 'using' ? '使用中' : '维护中'}
      </Button>
    </View>
  );
};

export default RoomCard;
