export const maskNik = (value: string) => {
  if (value.length <= 8) return value;
  const start = value.slice(0, 4);
  const end = value.slice(-4);
  return `${start}****${end}`;
};
