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
