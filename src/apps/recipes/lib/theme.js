const systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

export const colors = {
  forest: '#1B6B3A', forestLight: '#28894D', forestDark: '#145A2E',
  terracotta: '#C17A5E', terracottaLight: '#D4917A',
  gold: '#C9982E', goldLight: '#E5C17A',
  cream: '#F8FAFB', warmGray: '#E8ECF0', warmGrayDark: '#CDD4DA',
  textPrimary: '#1A1D1F', textSecondary: '#6F767E', textMuted: '#9A9FA5',
  white: '#FFFFFF', error: '#D44333', errorLight: '#FFF4F2',
  success: '#1B6B3A', successLight: '#EEFBF3',
  accent: '#2A85FF', accentLight: '#F0F7FF',
  background: '#F4F5F6',
}

export const fonts = {
  body: systemFont,
  heading: systemFont,
}

export const fontSizes = {
  xs: '11px', sm: '13px', md: '15px',
  lg: '17px', xl: '20px', '2xl': '24px', '3xl': '30px'
}

export const spacing = {
  xs: '4px', sm: '8px', md: '16px',
  lg: '24px', xl: '32px', '2xl': '48px'
}

export const borderRadius = {
  sm: '8px', md: '12px', lg: '16px', xl: '20px', full: '9999px'
}

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
  md: '0 2px 4px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.06)',
  lg: '0 4px 8px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.08)'
}

export const commonStyles = {
  buttonBase: {
    fontFamily: systemFont, fontSize: '15px', fontWeight: 600,
    padding: '10px 20px', borderRadius: '12px',
    border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'all 0.2s ease'
  },
  buttonPrimary: { backgroundColor: colors.forest, color: colors.white },
  buttonSecondary: { backgroundColor: colors.background, color: colors.textPrimary },
  buttonDanger: { backgroundColor: colors.error, color: colors.white },
  input: {
    fontFamily: systemFont, fontSize: '15px', padding: '12px 16px',
    borderRadius: '12px', border: `1.5px solid ${colors.warmGray}`,
    backgroundColor: colors.white, color: colors.textPrimary,
    width: '100%', outline: 'none', transition: 'border-color 0.2s ease'
  },
  card: { backgroundColor: colors.white, borderRadius: '16px', padding: '16px', boxShadow: shadows.sm },
  label: {
    fontFamily: systemFont, fontSize: '12px', fontWeight: 600,
    color: colors.textSecondary, marginBottom: '6px', display: 'block',
    textTransform: 'uppercase', letterSpacing: '0.5px'
  }
}

export function getSeasonColor(season) {
  const seasonColors = { winter: '#5B8DD9', spring: '#7BC47F', summer: '#F4D03F', autumn: '#E67E22' }
  return seasonColors[season] || colors.warmGray
}

export function getDifficultyColor(difficulty) {
  const difficultyColors = { easy: '#00B894', medium: colors.gold, hard: colors.terracotta }
  return difficultyColors[difficulty] || colors.textMuted
}
