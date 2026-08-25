export const getStayTimeMinutes = (stayTime: string) => {
  const days = Number(stayTime.match(/(\d+)\s*일/)?.[1] ?? 0);
  const hours = Number(stayTime.match(/(\d+)\s*시간/)?.[1] ?? 0);
  const minutes = Number(stayTime.match(/(\d+)\s*분/)?.[1] ?? 0);

  return days * 24 * 60 + hours * 60 + minutes;
};

export const sortByLongestStayTime = <T extends { STAYTIME: string }>(items: T[]) => {
  return [...items].sort(
    (a, b) => getStayTimeMinutes(b.STAYTIME) - getStayTimeMinutes(a.STAYTIME)
  );
};

const hasStayTimeValue = (stayTime: string) => /\d+\s*(?:일|시간|분)/.test(stayTime);

export const getAverageStayTimeMinutes = <T extends { STAYTIME: string }>(items: T[]) => {
  const stayTimes = items
    .filter(item => hasStayTimeValue(item.STAYTIME))
    .map(item => getStayTimeMinutes(item.STAYTIME));

  if (stayTimes.length === 0) return null;

  return Math.round(
    stayTimes.reduce((totalMinutes, stayTime) => totalMinutes + stayTime, 0) / stayTimes.length
  );
};

export const formatStayTimeMinutes = (totalMinutes: number | null) => {
  if (totalMinutes === null || !Number.isFinite(totalMinutes)) return '-';

  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const days = Math.floor(safeMinutes / (24 * 60));
  const hours = Math.floor((safeMinutes % (24 * 60)) / 60);
  const minutes = safeMinutes % 60;
  const formattedMinutes = `${minutes.toLocaleString('ko-KR')}분`;

  if (days > 0) {
    return `${days.toLocaleString('ko-KR')}일 ${hours.toLocaleString('ko-KR')}시간 ${formattedMinutes}`;
  }

  if (hours > 0) {
    return `${hours.toLocaleString('ko-KR')}시간 ${formattedMinutes}`;
  }

  return formattedMinutes;
};
