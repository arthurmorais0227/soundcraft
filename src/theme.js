export const colors = {
  bg: '#0E0A1A',
  surface: '#181128',
  surfaceAlt: '#221838',
  border: '#33264F',
  text: '#F5F1FF',
  muted: '#9D92BD',
  violet: '#8B5CF6',
  violetLight: '#B69CFF',
  violetDark: '#5B34C9',
  coral: '#FF4D6D',
  amber: '#FFB84D',
  mint: '#2EE6A6',
};

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 };

export const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 18,
};

export const fmt = (ms = 0) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
