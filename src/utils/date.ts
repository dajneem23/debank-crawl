import { timeStamp } from 'console';
import moment from 'moment';

export const formatDate = (date: Date, format: string) => {
  return moment(date).format(format);
};
export const createArrayDates = ({
  start,
  end,
  range = 1,
  timestamp,
}: {
  start: string | Date;
  end: string | Date;
  range: number;
  timestamp: boolean;
}) => {
  const dates = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(timestamp ? currentDate.getTime() / 1000 : currentDate);
    currentDate.setDate(currentDate.getDate() + range);
  }
  return dates;
};

export const createArrayDateByHours = ({
  start,
  end,
  range = 6,
  timestamp,
}: {
  start: string | Date;
  range: number;
  end: string | Date;
  timestamp: boolean;
}): Date[] => {
  const dates = [];
  const currentDate = new Date(start);
  while (currentDate <= end) {
    currentDate.setTime(currentDate.getTime() + range * 60 * 60 * 1000);
    dates.push(timestamp ? currentDate.getTime() / 1000 : currentDate);
  }
  return dates;
};

export const daysDiff = (date1: Date, date2: Date) => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
