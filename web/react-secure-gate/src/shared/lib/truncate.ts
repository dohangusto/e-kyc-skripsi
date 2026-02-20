export const truncate = (text: string, maxLen: number) => {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
};
