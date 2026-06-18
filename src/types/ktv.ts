export type RoomStatus = 'available' | 'booked' | 'using' | 'maintenance';
export type QueueStatus = 'waiting' | 'calling' | 'served' | 'overcall' | 'cancelled';
export type BackupStatus = 'waiting' | 'notified' | 'accepted' | 'declined' | 'timeout' | 'cancelled';
export type BookingStatus = 'pending' | 'confirmed' | 'using' | 'completed' | 'cancelled' | 'timeout';

export interface Room {
  id: string;
  name: string;
  type: 'mini' | 'small' | 'medium' | 'large' | 'vip';
  capacity: number;
  pricePerHour: number;
  status: RoomStatus;
  facilities: string[];
  currentBooking?: Booking;
  timeSlots: TimeSlot[];
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'using';
}

export type OperationType = 'checkin' | 'clear' | 'timeout_release';

export interface OperationLog {
  id: string;
  bookingId: string;
  type: OperationType;
  operatorName: string;
  operatorId: string;
  operateAt: string;
  remark?: string;
}

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  phone: string;
  peopleCount: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  packageId?: string;
  packageName?: string;
  totalPrice: number;
  createdAt: string;
  timeoutAt?: string;
  overcallCount: number;
  source?: 'normal' | 'backup';
  backupId?: string;
  operations?: OperationLog[];
  clearedAt?: string;
}

export interface QueueItem {
  id: string;
  queueNumber: string;
  userId: string;
  userName: string;
  phone: string;
  roomType: string;
  peopleCount: number;
  status: QueueStatus;
  createdAt: string;
  calledAt?: string;
  overcallCount: number;
}

export interface BackupItem {
  id: string;
  userId: string;
  userName: string;
  phone: string;
  roomType: string;
  peopleCount: number;
  status: BackupStatus;
  createdAt: string;
  notifiedAt?: string;
  expiresAt?: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  items: PackageItem[];
  image: string;
  tag?: string;
}

export interface PackageItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface UserInfo {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  vipLevel: number;
  totalSpent: number;
}

export interface OvercallRecord {
  id: string;
  queueId: string;
  queueNumber: string;
  userName: string;
  roomType: string;
  overcallTime: string;
  status: 'requeued' | 'cancelled';
}
