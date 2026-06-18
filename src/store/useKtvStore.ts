import { create } from 'zustand';
import dayjs from 'dayjs';
import type {
  Room,
  Booking,
  QueueItem,
  BackupItem,
  Package,
  UserInfo,
  OvercallRecord,
  BookingStatus,
  QueueStatus,
  BackupStatus
} from '@/types/ktv';
import {
  mockRooms,
  mockBookings,
  mockQueue,
  mockBackupList,
  mockPackages,
  mockUser,
  mockOvercallRecords
} from '@/data/mockData';

interface KtvState {
  rooms: Room[];
  bookings: Booking[];
  queue: QueueItem[];
  backupList: BackupItem[];
  packages: Package[];
  user: UserInfo;
  overcallRecords: OvercallRecord[];
  currentBooking: Booking | null;
  selectedPackage: Package | null;
  currentQueueItem: QueueItem | null;

  setCurrentBooking: (booking: Booking | null) => void;
  setSelectedPackage: (pkg: Package | null) => void;

  createBooking: (roomId: string, startTime: string, endTime: string, peopleCount: number, packageId?: string) => Promise<boolean>;
  cancelBooking: (bookingId: string) => boolean;
  checkTimeoutBookings: () => void;

  joinQueue: (roomType: string, peopleCount: number) => QueueItem | null;
  cancelQueue: (queueId: string) => boolean;
  callNextNumber: () => QueueItem | null;
  confirmServed: (queueId: string) => boolean;
  handleOvercall: (queueId: string) => boolean;
  requeueOvercall: (queueId: string) => boolean;

  joinBackup: (roomType: string, peopleCount: number) => BackupItem | null;
  cancelBackup: (backupId: string) => boolean;
  notifyBackup: (backupId: string) => boolean;
  confirmBackup: (backupId: string) => boolean;
  checkExpiredBackups: () => void;
  notifyNextBackupByType: (roomType: string) => void;
  processRoomRelease: (roomId: string) => void;

  getMyBookings: () => Booking[];
  getMyQueue: () => QueueItem | undefined;
  getMyBackup: () => BackupItem | undefined;
}

const roomTypeMap: Record<string, string> = {
  'mini': '迷你包',
  'small': '小包',
  'medium': '中包',
  'large': '大包',
  'vip': 'VIP'
};

const roomTypeReverseMap: Record<string, string> = {
  '迷你包': 'mini',
  '小包': 'small',
  '中包': 'medium',
  '大包': 'large',
  'VIP': 'vip'
};

export const useKtvStore = create<KtvState>((set, get) => ({
  rooms: mockRooms,
  bookings: mockBookings,
  queue: mockQueue,
  backupList: mockBackupList,
  packages: mockPackages,
  user: mockUser,
  overcallRecords: mockOvercallRecords,
  currentBooking: null,
  selectedPackage: null,
  currentQueueItem: null,

  setCurrentBooking: (booking) => set({ currentBooking: booking }),
  setSelectedPackage: (pkg) => set({ selectedPackage: pkg }),

  createBooking: async (roomId, startTime, endTime, peopleCount, packageId) => {
    try {
      const { rooms, user, packages } = get();
      const room = rooms.find(r => r.id === roomId);
      if (!room || room.status !== 'available') {
        console.error('[Booking] 包厢不可用', { roomId });
        return false;
      }

      const selectedPkg = packageId ? packages.find(p => p.id === packageId) : undefined;
      const hours = dayjs(endTime, 'HH:mm').diff(dayjs(startTime, 'HH:mm'), 'hour');
      const roomPrice = room.pricePerHour * hours;
      const packagePrice = selectedPkg ? selectedPkg.price : 0;
      const totalPrice = roomPrice + packagePrice;

      const newBooking: Booking = {
        id: `booking-${Date.now()}`,
        roomId,
        roomName: room.name,
        userId: user.id,
        userName: user.name,
        phone: user.phone,
        peopleCount,
        startTime,
        endTime,
        status: 'pending',
        packageId,
        packageName: selectedPkg?.name,
        totalPrice,
        createdAt: dayjs().format(),
        timeoutAt: dayjs().add(15, 'minute').format(),
        overcallCount: 0
      };

      set(state => ({
        bookings: [...state.bookings, newBooking],
        rooms: state.rooms.map(r =>
          r.id === roomId ? { ...r, status: 'booked', currentBooking: newBooking } : r
        ),
        currentBooking: newBooking
      }));

      console.log('[Booking] 创建预订成功', { bookingId: newBooking.id, status: 'pending' });
      return true;
    } catch (error) {
      console.error('[Booking] 创建预订失败', error);
      return false;
    }
  },

  cancelBooking: (bookingId) => {
    try {
      const { bookings } = get();
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return false;

      set(state => ({
        bookings: state.bookings.map(b =>
          b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b
        ),
        rooms: state.rooms.map(r =>
          r.id === booking.roomId ? { ...r, status: 'available', currentBooking: undefined } : r
        )
      }));

      get().processRoomRelease(booking.roomId);
      console.log('[Booking] 取消预订成功', { bookingId });
      return true;
    } catch (error) {
      console.error('[Booking] 取消预订失败', error);
      return false;
    }
  },

  checkTimeoutBookings: () => {
    try {
      const { bookings } = get();
      const now = dayjs();
      const timeoutBookings = bookings.filter(
        b => b.status === 'pending' && b.timeoutAt && dayjs(b.timeoutAt).isBefore(now)
      );

      if (timeoutBookings.length === 0) return;

      set(state => ({
        bookings: state.bookings.map(b =>
          timeoutBookings.find(tb => tb.id === b.id)
            ? { ...b, status: 'timeout' as BookingStatus }
            : b
        ),
        rooms: state.rooms.map(r => {
          const timeoutBooking = timeoutBookings.find(tb => tb.roomId === r.id);
          return timeoutBooking ? { ...r, status: 'available', currentBooking: undefined } : r;
        })
      }));

      timeoutBookings.forEach(booking => {
        get().processRoomRelease(booking.roomId);
      });

      console.log('[Booking] 超时自动释放', { count: timeoutBookings.length, ids: timeoutBookings.map(b => b.id) });
    } catch (error) {
      console.error('[Booking] 超时检查失败', error);
    }
  },

  joinQueue: (roomType, peopleCount) => {
    try {
      const { queue, user } = get();
      const typePrefix = roomType === 'VIP' ? 'V' : roomType === '大包' ? 'B' : 'A';
      const maxNum = queue.filter(q => q.queueNumber.startsWith(typePrefix)).length + 1;
      const queueNumber = `${typePrefix}${String(maxNum).padStart(3, '0')}`;

      const newQueueItem: QueueItem = {
        id: `queue-${Date.now()}`,
        queueNumber,
        userId: user.id,
        userName: user.name,
        phone: user.phone,
        roomType,
        peopleCount,
        status: 'waiting',
        createdAt: dayjs().format(),
        overcallCount: 0
      };

      set(state => ({
        queue: [...state.queue, newQueueItem],
        currentQueueItem: newQueueItem
      }));

      console.log('[Queue] 加入排队成功', { queueNumber });
      return newQueueItem;
    } catch (error) {
      console.error('[Queue] 加入排队失败', error);
      return null;
    }
  },

  cancelQueue: (queueId) => {
    try {
      const { queue } = get();
      const queueItem = queue.find(q => q.id === queueId);
      if (!queueItem) return false;

      set(state => ({
        queue: state.queue.filter(q => q.id !== queueId)
      }));

      console.log('[Queue] 取消排队', { queueId, queueNumber: queueItem.queueNumber });
      return true;
    } catch (error) {
      console.error('[Queue] 取消排队失败', error);
      return false;
    }
  },

  callNextNumber: () => {
    try {
      const { queue } = get();
      const waitingItems = queue.filter(q => q.status === 'waiting').sort((a, b) =>
        dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
      );

      if (waitingItems.length === 0) {
        console.log('[Queue] 没有等待的号码');
        return null;
      }

      const nextItem = waitingItems[0];
      set(state => ({
        queue: state.queue.map(q =>
          q.id === nextItem.id ? { ...q, status: 'calling' as QueueStatus, calledAt: dayjs().format() } : q
        )
      }));

      console.log('[Queue] 叫号成功', { queueNumber: nextItem.queueNumber });
      return { ...nextItem, status: 'calling' as QueueStatus, calledAt: dayjs().format() };
    } catch (error) {
      console.error('[Queue] 叫号失败', error);
      return null;
    }
  },

  confirmServed: (queueId) => {
    try {
      const { queue } = get();
      const queueItem = queue.find(q => q.id === queueId);
      if (!queueItem) return false;

      set(state => ({
        queue: state.queue.map(q =>
          q.id === queueId ? { ...q, status: 'served' as QueueStatus } : q
        )
      }));

      console.log('[Queue] 确认入座', { queueNumber: queueItem.queueNumber });
      return true;
    } catch (error) {
      console.error('[Queue] 确认入座失败', error);
      return false;
    }
  },

  handleOvercall: (queueId) => {
    try {
      const { queue } = get();
      const queueItem = queue.find(q => q.id === queueId);
      if (!queueItem) return false;

      const newOvercallCount = queueItem.overcallCount + 1;
      const isCancelled = newOvercallCount >= 2;

      const overcallRecord: OvercallRecord = {
        id: `overcall-${Date.now()}`,
        queueId,
        queueNumber: queueItem.queueNumber,
        userName: queueItem.userName,
        roomType: queueItem.roomType,
        overcallTime: dayjs().format('HH:mm'),
        status: isCancelled ? 'cancelled' : 'requeued'
      };

      if (isCancelled) {
        set(state => ({
          queue: state.queue.map(q =>
            q.id === queueId ? { ...q, status: 'cancelled' as QueueStatus, overcallCount: newOvercallCount } : q
          ),
          overcallRecords: [overcallRecord, ...state.overcallRecords]
        }));
        console.log('[Queue] 连续过号2次，作废处理', { queueNumber: queueItem.queueNumber });
      } else {
        set(state => ({
          queue: state.queue.map(q =>
            q.id === queueId ? { ...q, status: 'overcall' as QueueStatus, overcallCount: newOvercallCount } : q
          ),
          overcallRecords: [overcallRecord, ...state.overcallRecords]
        }));
        console.log('[Queue] 过号处理', { queueNumber: queueItem.queueNumber, overcallCount: newOvercallCount });
      }

      return true;
    } catch (error) {
      console.error('[Queue] 过号处理失败', error);
      return false;
    }
  },

  requeueOvercall: (queueId) => {
    try {
      const { queue } = get();
      const queueItem = queue.find(q => q.id === queueId);
      if (!queueItem || queueItem.status !== 'overcall') return false;

      set(state => {
        const newQueue = state.queue.filter(q => q.id !== queueId);
        const requeuedItem: QueueItem = {
          ...queueItem,
          status: 'waiting',
          createdAt: dayjs().format(),
          overcallCount: queueItem.overcallCount
        };
        return {
          queue: [...newQueue, requeuedItem]
        };
      });

      console.log('[Queue] 过号重排队尾', { queueNumber: queueItem.queueNumber });
      return true;
    } catch (error) {
      console.error('[Queue] 重排失败', error);
      return false;
    }
  },

  joinBackup: (roomType, peopleCount) => {
    try {
      const { user } = get();

      const newBackup: BackupItem = {
        id: `backup-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        phone: user.phone,
        roomType,
        peopleCount,
        status: 'waiting',
        createdAt: dayjs().format()
      };

      set(state => ({
        backupList: [...state.backupList, newBackup]
      }));

      console.log('[Backup] 加入候补成功', { backupId: newBackup.id, roomType });
      return newBackup;
    } catch (error) {
      console.error('[Backup] 加入候补失败', error);
      return null;
    }
  },

  cancelBackup: (backupId) => {
    try {
      const { backupList } = get();
      const backup = backupList.find(b => b.id === backupId);
      if (!backup) return false;

      set(state => ({
        backupList: state.backupList.filter(b => b.id !== backupId)
      }));

      console.log('[Backup] 取消候补', { backupId, roomType: backup.roomType });
      return true;
    } catch (error) {
      console.error('[Backup] 取消候补失败', error);
      return false;
    }
  },

  checkExpiredBackups: () => {
    try {
      const { backupList } = get();
      const now = dayjs();
      const expiredBackups = backupList.filter(
        b => b.status === 'notified' && b.expiresAt && dayjs(b.expiresAt).isBefore(now)
      );

      if (expiredBackups.length === 0) return;

      const expiredByType: Record<string, BackupItem[]> = {};
      expiredBackups.forEach(b => {
        if (!expiredByType[b.roomType]) {
          expiredByType[b.roomType] = [];
        }
        expiredByType[b.roomType].push(b);
      });

      set(state => ({
        backupList: state.backupList.filter(b => !expiredBackups.find(eb => eb.id === b.id))
      }));

      Object.keys(expiredByType).forEach(roomType => {
        get().notifyNextBackupByType(roomType);
      });

      console.log('[Backup] 候补通知超时自动跳过', { count: expiredBackups.length });
    } catch (error) {
      console.error('[Backup] 检查超时候补失败', error);
    }
  },

  notifyBackup: (backupId) => {
    try {
      set(state => ({
        backupList: state.backupList.map(b =>
          b.id === backupId ? {
            ...b,
            status: 'notified' as BackupStatus,
            notifiedAt: dayjs().format(),
            expiresAt: dayjs().add(10, 'minute').format()
          } : b
        )
      }));

      console.log('[Backup] 通知补位', { backupId });
      return true;
    } catch (error) {
      console.error('[Backup] 通知失败', error);
      return false;
    }
  },

  confirmBackup: (backupId) => {
    try {
      const { backupList } = get();
      const backup = backupList.find(b => b.id === backupId);
      if (!backup) return false;

      set(state => ({
        backupList: state.backupList.map(b =>
          b.id === backupId ? { ...b, status: 'confirmed' as BackupStatus } : b
        )
      }));

      console.log('[Backup] 确认补位', { backupId });
      return true;
    } catch (error) {
      console.error('[Backup] 确认失败', error);
      return false;
    }
  },

  notifyNextBackupByType: (roomType) => {
    try {
      const { backupList } = get();
      const waitingBackups = backupList.filter(
        b => b.status === 'waiting' && b.roomType === roomType
      ).sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf());

      if (waitingBackups.length > 0) {
        get().notifyBackup(waitingBackups[0].id);
        console.log('[Backup] 通知下一位候补', { roomType, backupId: waitingBackups[0].id });
      } else {
        console.log('[Backup] 该类型无等待候补', { roomType });
      }
    } catch (error) {
      console.error('[Backup] 通知下一位候补失败', error);
    }
  },

  processRoomRelease: (roomId) => {
    try {
      const { rooms } = get();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      const roomTypeCN = roomTypeMap[room.type] || room.type;
      get().notifyNextBackupByType(roomTypeCN);
      console.log('[Backup] 包厢释放，通知候补', { roomId, roomType: room.type, roomTypeCN });
    } catch (error) {
      console.error('[Backup] 处理包厢释放失败', error);
    }
  },

  getMyBookings: () => {
    const { bookings, user } = get();
    return bookings.filter(b => b.userId === user.id);
  },

  getMyQueue: () => {
    const { queue, user } = get();
    return queue.find(q => q.userId === user.id && ['waiting', 'calling', 'overcall'].includes(q.status));
  },

  getMyBackup: () => {
    const { backupList, user } = get();
    return backupList.find(b => b.userId === user.id && ['waiting', 'notified'].includes(b.status));
  }
}));
