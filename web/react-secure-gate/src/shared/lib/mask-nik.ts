export const maskNik = (nik: string) => {
  if (nik.length <= 8) return nik;
  const start = nik.slice(0, 4);
  const end = nik.slice(-4);
  return `${start}****${end}`;
};
