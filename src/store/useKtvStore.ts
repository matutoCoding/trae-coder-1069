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
  BackupStatus,
  RoomStatus
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

const roomTypeMap: Record<string, string> = {
  'mini': '迷你包',
  'small': '小包',
  'medium': '中包',
  'large': '大包',
  'vip': 'VIP'
};

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
  checkinBooking: (bookingId: string) => boolean;
  checkTimeoutBookings: () => void;

  updateRoomStatus: (roomId: string, status: RoomStatus) => boolean;
  clearRoom: (roomId: string) => boolean;

  joinQueue: (roomType: string, peopleCount: number) => QueueItem | null;
  cancelQueue: (queueId: string) => boolean;
  callNextNumber: () => QueueItem | null;
  confirmServed: (queueId: string) => boolean;
  handleOvercall: (queueId: string) => boolean;
  requeueOvercall: (queueId: string) => boolean;

  joinBackup: (roomType: string, peopleCount: number) => BackupItem | null;
  cancelBackup: (backupId: string) => boolean;
  acceptBackup: (backupId: string) => boolean;
  declineBackup: (backupId: string) => boolean;
  checkExpiredBackups: () => void;
  notifyNextBackupByType: (roomType: string) => void;
  processRoomRelease: (roomId: string) => void;

  getMyBookings: () => Booking[];
  getMyQueue: () => QueueItem | undefined;
  getMyBackup: () => BackupItem | undefined;
  getMyQueueHistory: () => QueueItem[];
  getMyBackupHistory: () => BackupItem[];
  getBackupPositionByType: (roomType: string, backupId: string) => number;
  getTodayStats: () => TodayStats;
}

export interface TodayStats {
  availableRooms: number;
  usingRooms: number;
  pendingBookings: number;
  notifiedBackups: number;
  callingQueue: number;
}

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
      if (!room || room.status !== 'available') return false;

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
          r.id === roomId ? { ...r, status: 'booked' as RoomStatus, currentBooking: newBooking } : r
        ),
        currentBooking: newBooking
      }));

      return true;
    } catch (error) {
      console.error('[Booking] 创建失败', error);
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
          r.id === booking.roomId ? { ...r, status: 'available' as RoomStatus, currentBooking: undefined } : r
        )
      }));

      get().processRoomRelease(booking.roomId);
      return true;
    } catch (error) {
      console.error('[Booking] 取消失败', error);
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
          return timeoutBooking ? { ...r, status: 'available' as RoomStatus, currentBooking: undefined } : r;
        })
      }));

      timeoutBookings.forEach(booking => {
        get().processRoomRelease(booking.roomId);
      });
    } catch (error) {
      console.error('[Booking] 超时检查失败', error);
    }
  },

  updateRoomStatus: (roomId, status) => {
    try {
      const { rooms, bookings } = get();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return false;

      set(state => ({
        rooms: state.rooms.map(r =>
          r.id === roomId ? { ...r, status } : r
        ),
        bookings: status === 'using'
          ? state.bookings.map(b =>
              b.roomId === roomId && b.status === 'pending'
                ? { ...b, status: 'using' as BookingStatus }
                : b
            )
          : state.bookings
      }));

      if (status === 'using') {
        const pendingBooking = bookings.find(b => b.roomId === roomId && b.status === 'pending');
        if (pendingBooking) {
          set(state => ({
            rooms: state.rooms.map(r =>
              r.id === roomId ? { ...r, currentBooking: { ...pendingBooking, status: 'using' as BookingStatus } } : r
            )
          }));
        }
      }

      if (status === 'available') {
        set(state => ({
          rooms: state.rooms.map(r =>
            r.id === roomId ? { ...r, currentBooking: undefined } : r
          )
        }));
      }

      console.log('[Room] 状态变更', { roomId, status });
      return true;
    } catch (error) {
      console.error('[Room] 状态变更失败', error);
      return false;
    }
  },

  clearRoom: (roomId) => {
    try {
      const { rooms, bookings } = get();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return false;

      const activeBooking = bookings.find(b =>
        b.roomId === roomId && ['pending', 'confirmed', 'using'].includes(b.status)
      );

      set(state => ({
        rooms: state.rooms.map(r =>
          r.id === roomId ? { ...r, status: 'available' as RoomStatus, currentBooking: undefined } : r
        ),
        bookings: activeBooking
          ? state.bookings.map(b =>
              b.id === activeBooking.id ? { ...b, status: 'completed' as BookingStatus } : b
            )
          : state.bookings
      }));

      get().processRoomRelease(roomId);
      console.log('[Room] 清台完成', { roomId });
      return true;
    } catch (error) {
      console.error('[Room] 清台失败', error);
      return false;
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

      return newQueueItem;
    } catch (error) {
      console.error('[Queue] 加入失败', error);
      return null;
    }
  },

  cancelQueue: (queueId) => {
    try {
      set(state => ({
        queue: state.queue.map(q =>
          q.id === queueId ? { ...q, status: 'cancelled' as QueueStatus } : q
        )
      }));

      return true;
    } catch (error) {
      console.error('[Queue] 取消失败', error);
      return false;
    }
  },

  callNextNumber: () => {
    try {
      const { queue } = get();
      const waitingItems = queue.filter(q => q.status === 'waiting').sort((a, b) =>
        dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf()
      );
      if (waitingItems.length === 0) return null;

      const nextItem = waitingItems[0];
      set(state => ({
        queue: state.queue.map(q =>
          q.id === nextItem.id ? { ...q, status: 'calling' as QueueStatus, calledAt: dayjs().format() } : q
        )
      }));

      return { ...nextItem, status: 'calling' as QueueStatus, calledAt: dayjs().format() };
    } catch (error) {
      console.error('[Queue] 叫号失败', error);
      return null;
    }
  },

  confirmServed: (queueId) => {
    try {
      set(state => ({
        queue: state.queue.map(q =>
          q.id === queueId ? { ...q, status: 'served' as QueueStatus } : q
        )
      }));
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

      set(state => ({
        queue: state.queue.map(q =>
          q.id === queueId
            ? { ...q, status: (isCancelled ? 'cancelled' : 'overcall') as QueueStatus, overcallCount: newOvercallCount }
            : q
        ),
        overcallRecords: [overcallRecord, ...state.overcallRecords]
      }));

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
        return { queue: [...newQueue, requeuedItem] };
      });

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

      return newBackup;
    } catch (error) {
      console.error('[Backup] 加入失败', error);
      return null;
    }
  },

  cancelBackup: (backupId) => {
    try {
      const { backupList } = get();
      const backup = backupList.find(b => b.id === backupId);
      if (!backup) return false;

      const roomType = backup.roomType;
      const wasNotified = backup.status === 'notified';

      set(state => ({
        backupList: state.backupList.map(b =>
          b.id === backupId ? { ...b, status: 'cancelled' as BackupStatus } : b
        )
      }));

      if (wasNotified) {
        get().notifyNextBackupByType(roomType);
      }

      console.log('[Backup] 取消候补', { backupId, roomType });
      return true;
    } catch (error) {
      console.error('[Backup] 取消失败', error);
      return false;
    }
  },

  acceptBackup: (backupId) => {
    try {
      const { backupList, rooms } = get();
      const backup = backupList.find(b => b.id === backupId);
      if (!backup || backup.status !== 'notified') return false;

      const roomTypeEN = Object.entries(roomTypeMap).find(([, v]) => v === backup.roomType)?.[0];
      const availableRoom = rooms.find(r => r.type === roomTypeEN && r.status === 'available');

      if (!availableRoom) {
        set(state => ({
          backupList: state.backupList.map(b =>
            b.id === backupId ? { ...b, status: 'accepted' as BackupStatus } : b
          )
        }));
        console.log('[Backup] 接受补位但无可用包厢', { backupId });
        return false;
      }

      const now = dayjs();
      const newBooking: Booking = {
        id: `booking-${Date.now()}`,
        roomId: availableRoom.id,
        roomName: availableRoom.name,
        userId: backup.userId,
        userName: backup.userName,
        phone: backup.phone,
        peopleCount: backup.peopleCount,
        startTime: now.format('HH:mm'),
        endTime: now.add(3, 'hour').format('HH:mm'),
        status: 'pending',
        totalPrice: availableRoom.pricePerHour * 3,
        createdAt: now.format(),
        timeoutAt: now.add(15, 'minute').format(),
        overcallCount: 0
      };

      set(state => ({
        backupList: state.backupList.map(b =>
          b.id === backupId ? { ...b, status: 'accepted' as BackupStatus } : b
        ),
        bookings: [...state.bookings, newBooking],
        rooms: state.rooms.map(r =>
          r.id === availableRoom.id
            ? { ...r, status: 'booked' as RoomStatus, currentBooking: newBooking }
            : r
        )
      }));

      console.log('[Backup] 接受补位，生成预订', { backupId, bookingId: newBooking.id, roomId: availableRoom.id });
      return true;
    } catch (error) {
      console.error('[Backup] 接受失败', error);
      return false;
    }
  },

  declineBackup: (backupId) => {
    try {
      const { backupList } = get();
      const backup = backupList.find(b => b.id === backupId);
      if (!backup) return false;

      const roomType = backup.roomType;

      set(state => ({
        backupList: state.backupList.map(b =>
          b.id === backupId ? { ...b, status: 'declined' as BackupStatus } : b
        )
      }));

      get().notifyNextBackupByType(roomType);
      console.log('[Backup] 放弃补位，顺延下一位', { backupId, roomType });
      return true;
    } catch (error) {
      console.error('[Backup] 放弃失败', error);
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

      const expiredByType: Record<string, string[]> = {};
      expiredBackups.forEach(b => {
        if (!expiredByType[b.roomType]) expiredByType[b.roomType] = [];
        expiredByType[b.roomType].push(b.id);
      });

      set(state => ({
        backupList: state.backupList.map(b =>
          expiredBackups.find(eb => eb.id === b.id)
            ? { ...b, status: 'timeout' as BackupStatus }
            : b
        )
      }));

      Object.keys(expiredByType).forEach(roomType => {
        get().notifyNextBackupByType(roomType);
      });

      console.log('[Backup] 候补超时自动跳过', { count: expiredBackups.length });
    } catch (error) {
      console.error('[Backup] 超时检查失败', error);
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
      return true;
    } catch (error) {
      console.error('[Backup] 通知失败', error);
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
      }
    } catch (error) {
      console.error('[Backup] 通知下一位失败', error);
    }
  },

  processRoomRelease: (roomId) => {
    try {
      const { rooms } = get();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;
      const roomTypeCN = roomTypeMap[room.type] || room.type;
      get().notifyNextBackupByType(roomTypeCN);
    } catch (error) {
      console.error('[Backup] 包厢释放处理失败', error);
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
  },

  getBackupPositionByType: (roomType, backupId) => {
    const { backupList } = get();
    const sameTypeList = backupList.filter(
      b => b.status === 'waiting' && b.roomType === roomType
    ).sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf());
    const index = sameTypeList.findIndex(b => b.id === backupId);
    return index >= 0 ? index + 1 : 0;
  },

  getMyQueueHistory: () => {
    const { queue, user } = get();
    return queue.filter(q => q.userId === user.id).sort((a, b) =>
      dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
    );
  },

  getMyBackupHistory: () => {
    const { backupList, user } = get();
    return backupList.filter(b => b.userId === user.id).sort((a, b) =>
      dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()
    );
  },

  checkinBooking: (bookingId) => {
    try {
      const { bookings, rooms } = get();
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking || booking.status !== 'pending') return false;

      set(state => ({
        bookings: state.bookings.map(b =>
          b.id === bookingId ? { ...b, status: 'using' as BookingStatus } : b
        ),
        rooms: state.rooms.map(r =>
          r.id === booking.roomId
            ? { ...r, status: 'using' as RoomStatus, currentBooking: { ...booking, status: 'using' as BookingStatus } }
            : r
        )
      }));

      console.log('[Booking] 到店核销', { bookingId, roomId: booking.roomId });
      return true;
    } catch (error) {
      console.error('[Booking] 核销失败', error);
      return false;
    }
  },

  getTodayStats: () => {
    const { rooms, bookings, backupList, queue } = get();
    return {
      availableRooms: rooms.filter(r => r.status === 'available').length,
      usingRooms: rooms.filter(r => r.status === 'using').length,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      notifiedBackups: backupList.filter(b => b.status === 'notified').length,
      callingQueue: queue.filter(q => q.status === 'calling').length
    };
  }
}));
