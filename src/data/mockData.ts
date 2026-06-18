import dayjs from 'dayjs';
import type { Room, Booking, QueueItem, BackupItem, Package, UserInfo, OvercallRecord, TimeSlot } from '@/types/ktv';

const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const now = dayjs();
  for (let i = 0; i < 8; i++) {
    const start = now.add(i * 2, 'hour');
    slots.push({
      id: `slot-${i}`,
      startTime: start.format('HH:mm'),
      endTime: start.add(2, 'hour').format('HH:mm'),
      status: i % 3 === 0 ? 'booked' : i === 2 ? 'using' : 'available'
    });
  }
  return slots;
};

export const mockRooms: Room[] = [
  {
    id: 'room-1',
    name: '迷你包A1',
    type: 'mini',
    capacity: 4,
    pricePerHour: 68,
    status: 'available',
    facilities: ['WiFi', '点歌系统', '麦克风×2'],
    timeSlots: generateTimeSlots()
  },
  {
    id: 'room-2',
    name: '小包B2',
    type: 'small',
    capacity: 6,
    pricePerHour: 98,
    status: 'booked',
    facilities: ['WiFi', '点歌系统', '麦克风×2', '沙发'],
    currentBooking: {
      id: 'booking-1',
      roomId: 'room-2',
      roomName: '小包B2',
      userId: 'user-1',
      userName: '张先生',
      phone: '138****1234',
      peopleCount: 5,
      startTime: dayjs().add(1, 'hour').format('HH:mm'),
      endTime: dayjs().add(3, 'hour').format('HH:mm'),
      status: 'pending',
      totalPrice: 196,
      createdAt: dayjs().subtract(10, 'minute').format(),
      timeoutAt: dayjs().add(5, 'minute').format(),
      overcallCount: 0
    },
    timeSlots: generateTimeSlots()
  },
  {
    id: 'room-3',
    name: '中包C3',
    type: 'medium',
    capacity: 10,
    pricePerHour: 158,
    status: 'using',
    facilities: ['WiFi', '点歌系统', '麦克风×4', '沙发', '茶几', '独立卫生间'],
    timeSlots: generateTimeSlots()
  },
  {
    id: 'room-4',
    name: '大包D5',
    type: 'large',
    capacity: 15,
    pricePerHour: 258,
    status: 'available',
    facilities: ['WiFi', '点歌系统', '麦克风×4', '沙发', '茶几', '独立卫生间', '舞池灯光'],
    timeSlots: generateTimeSlots()
  },
  {
    id: 'room-5',
    name: 'VIP至尊V8',
    type: 'vip',
    capacity: 20,
    pricePerHour: 398,
    status: 'available',
    facilities: ['WiFi', '专业点歌系统', '麦克风×6', '真皮沙发', '茶几', '独立卫生间', '舞池灯光', 'DJ台', '专属服务'],
    timeSlots: generateTimeSlots()
  },
  {
    id: 'room-6',
    name: '迷你包A2',
    type: 'mini',
    capacity: 4,
    pricePerHour: 68,
    status: 'maintenance',
    facilities: ['WiFi', '点歌系统', '麦克风×2'],
    timeSlots: generateTimeSlots()
  }
];

export const mockBookings: Booking[] = [
  {
    id: 'booking-1',
    roomId: 'room-2',
    roomName: '小包B2',
    userId: 'user-current',
    userName: '李女士',
    phone: '139****5678',
    peopleCount: 4,
    startTime: dayjs().add(1, 'hour').format('HH:mm'),
    endTime: dayjs().add(3, 'hour').format('HH:mm'),
    status: 'confirmed',
    packageId: 'pkg-2',
    packageName: '欢唱套餐B',
    totalPrice: 388,
    createdAt: dayjs().subtract(30, 'minute').format(),
    overcallCount: 0
  },
  {
    id: 'booking-2',
    roomId: 'room-3',
    roomName: '中包C3',
    userId: 'user-current',
    userName: '李女士',
    phone: '139****5678',
    peopleCount: 8,
    startTime: dayjs().subtract(1, 'hour').format('HH:mm'),
    endTime: dayjs().add(1, 'hour').format('HH:mm'),
    status: 'using',
    packageId: 'pkg-3',
    packageName: '豪华套餐C',
    totalPrice: 688,
    createdAt: dayjs().subtract(2, 'hour').format(),
    overcallCount: 0
  }
];

export const mockQueue: QueueItem[] = [
  {
    id: 'queue-1',
    queueNumber: 'A001',
    userId: 'user-1',
    userName: '王先生',
    phone: '137****1111',
    roomType: '小包',
    peopleCount: 5,
    status: 'calling',
    createdAt: dayjs().subtract(15, 'minute').format(),
    calledAt: dayjs().subtract(1, 'minute').format(),
    overcallCount: 0
  },
  {
    id: 'queue-2',
    queueNumber: 'A002',
    userId: 'user-2',
    userName: '刘小姐',
    phone: '136****2222',
    roomType: '中包',
    peopleCount: 8,
    status: 'overcall',
    createdAt: dayjs().subtract(20, 'minute').format(),
    calledAt: dayjs().subtract(8, 'minute').format(),
    overcallCount: 1
  },
  {
    id: 'queue-3',
    queueNumber: 'A003',
    userId: 'user-current',
    userName: '李女士',
    phone: '139****5678',
    roomType: '大包',
    peopleCount: 12,
    status: 'waiting',
    createdAt: dayjs().subtract(8, 'minute').format(),
    overcallCount: 0
  },
  {
    id: 'queue-4',
    queueNumber: 'A004',
    userId: 'user-3',
    userName: '赵先生',
    phone: '135****3333',
    roomType: '小包',
    peopleCount: 4,
    status: 'waiting',
    createdAt: dayjs().subtract(5, 'minute').format(),
    overcallCount: 0
  },
  {
    id: 'queue-5',
    queueNumber: 'A005',
    userId: 'user-4',
    userName: '孙小姐',
    phone: '134****4444',
    roomType: '迷你包',
    peopleCount: 3,
    status: 'waiting',
    createdAt: dayjs().subtract(3, 'minute').format(),
    overcallCount: 0
  }
];

export const mockBackupList: BackupItem[] = [
  {
    id: 'backup-1',
    userId: 'user-5',
    userName: '周先生',
    phone: '133****5555',
    roomType: 'VIP',
    peopleCount: 15,
    status: 'notified',
    createdAt: dayjs().subtract(20, 'minute').format(),
    notifiedAt: dayjs().subtract(2, 'minute').format(),
    expiresAt: dayjs().add(3, 'minute').format()
  },
  {
    id: 'backup-2',
    userId: 'user-current',
    userName: '李女士',
    phone: '139****5678',
    roomType: '大包',
    peopleCount: 10,
    status: 'waiting',
    createdAt: dayjs().subtract(15, 'minute').format()
  },
  {
    id: 'backup-3',
    userId: 'user-6',
    userName: '吴小姐',
    phone: '132****6666',
    roomType: '中包',
    peopleCount: 6,
    status: 'waiting',
    createdAt: dayjs().subtract(10, 'minute').format()
  },
  {
    id: 'backup-4',
    userId: 'user-7',
    userName: '郑先生',
    phone: '131****7777',
    roomType: '小包',
    peopleCount: 4,
    status: 'waiting',
    createdAt: dayjs().subtract(5, 'minute').format()
  }
];

export const mockPackages: Package[] = [
  {
    id: 'pkg-1',
    name: '畅享套餐A',
    description: '适合2-4人小聚，包含2小时欢唱+饮品',
    price: 198,
    originalPrice: 268,
    tag: '热销',
    items: [
      { name: '欢唱时长', quantity: 2, unit: '小时' },
      { name: '啤酒', quantity: 4, unit: '瓶' },
      { name: '爆米花', quantity: 1, unit: '份' },
      { name: '果盘', quantity: 1, unit: '份' }
    ],
    image: 'https://picsum.photos/id/292/750/500'
  },
  {
    id: 'pkg-2',
    name: '欢唱套餐B',
    description: '适合4-6人聚会，包含3小时欢唱+酒水',
    price: 388,
    originalPrice: 498,
    tag: '推荐',
    items: [
      { name: '欢唱时长', quantity: 3, unit: '小时' },
      { name: '啤酒', quantity: 12, unit: '瓶' },
      { name: '爆米花', quantity: 2, unit: '份' },
      { name: '果盘', quantity: 2, unit: '份' },
      { name: '小吃', quantity: 3, unit: '份' }
    ],
    image: 'https://picsum.photos/id/312/750/500'
  },
  {
    id: 'pkg-3',
    name: '豪华套餐C',
    description: '适合8-12人狂欢，包含4小时欢唱+豪华酒水',
    price: 688,
    originalPrice: 888,
    tag: '超值',
    items: [
      { name: '欢唱时长', quantity: 4, unit: '小时' },
      { name: '啤酒', quantity: 24, unit: '瓶' },
      { name: '洋酒', quantity: 1, unit: '瓶' },
      { name: '爆米花', quantity: 3, unit: '份' },
      { name: '豪华果盘', quantity: 2, unit: '份' },
      { name: '小吃', quantity: 5, unit: '份' }
    ],
    image: 'https://picsum.photos/id/431/750/500'
  },
  {
    id: 'pkg-4',
    name: 'VIP至尊套餐',
    description: 'VIP专享，包含全场畅饮+专属服务',
    price: 1288,
    originalPrice: 1688,
    tag: 'VIP',
    items: [
      { name: '欢唱时长', quantity: 6, unit: '小时' },
      { name: '啤酒', quantity: 99, unit: '瓶' },
      { name: '洋酒', quantity: 3, unit: '瓶' },
      { name: '香槟', quantity: 1, unit: '瓶' },
      { name: '豪华果盘', quantity: 4, unit: '份' },
      { name: '专属小吃', quantity: 8, unit: '份' },
      { name: '专属DJ', quantity: 1, unit: '位' }
    ],
    image: 'https://picsum.photos/id/580/750/500'
  }
];

export const mockUser: UserInfo = {
  id: 'user-current',
  name: '李女士',
  phone: '139****5678',
  avatar: 'https://picsum.photos/id/64/200/200',
  vipLevel: 3,
  totalSpent: 5680
};

export const mockOvercallRecords: OvercallRecord[] = [
  {
    id: 'overcall-1',
    queueId: 'queue-old-1',
    queueNumber: 'A086',
    userName: '陈先生',
    roomType: '中包',
    overcallTime: dayjs().subtract(30, 'minute').format('HH:mm'),
    status: 'requeued'
  },
  {
    id: 'overcall-2',
    queueId: 'queue-old-2',
    queueNumber: 'B023',
    userName: '林小姐',
    roomType: '小包',
    overcallTime: dayjs().subtract(45, 'minute').format('HH:mm'),
    status: 'cancelled'
  }
];

export const getRoomTypeText = (type: string): string => {
  const map: Record<string, string> = {
    mini: '迷你包',
    small: '小包',
    medium: '中包',
    large: '大包',
    vip: 'VIP'
  };
  return map[type] || type;
};

export const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    available: '空闲',
    booked: '已预订',
    using: '使用中',
    maintenance: '维护中',
    waiting: '等待中',
    calling: '叫号中',
    served: '已入座',
    overcall: '已过号',
    cancelled: '已取消',
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    timeout: '已超时',
    notified: '已通知'
  };
  return map[status] || status;
};
