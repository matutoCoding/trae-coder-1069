import dayjs from 'dayjs';

export const formatTime = (date: string | Date, format = 'HH:mm'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

export const getWaitTime = (createdAt: string): string => {
  const diff = dayjs().diff(dayjs(createdAt), 'minute');
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${diff}分钟`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
};

export const getCountdown = (targetTime: string): { minutes: number; seconds: number; expired: boolean } => {
  const now = dayjs();
  const target = dayjs(targetTime);
  const diff = target.diff(now, 'second');

  if (diff <= 0) {
    return { minutes: 0, seconds: 0, expired: true };
  }

  return {
    minutes: Math.floor(diff / 60),
    seconds: diff % 60,
    expired: false
  };
};

export const getQueuePosition = (queueId: string, allQueue: { id: string }[]): number => {
  const waitingList = allQueue.filter(q => q.id !== queueId);
  return waitingList.length + 1;
};

export const generateQueueNumber = (prefix: string, currentLength: number): string => {
  return `${prefix}${String(currentLength + 1).padStart(3, '0')}`;
};

export const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    available: '#00D4FF',
    booked: '#9D4EDD',
    using: '#00FF88',
    maintenance: '#86909C',
    waiting: '#FFD700',
    calling: '#FF6B9D',
    served: '#00FF88',
    overcall: '#FF4757',
    cancelled: '#86909C',
    pending: '#FFD700',
    confirmed: '#9D4EDD',
    completed: '#00B42A',
    timeout: '#FF4757',
    notified: '#FF6B9D'
  };
  return colorMap[status] || '#86909C';
};

export const validatePhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

export const validatePeopleCount = (count: number, maxCapacity: number): boolean => {
  return count > 0 && count <= maxCapacity;
};

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastTime = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn(...args);
    }
  };
};
