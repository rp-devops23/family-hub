const systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

export const colors = {
  forest: '#2D5A3D', forestLight: '#3D7A52', forestDark: '#1D4A2D',
  terracotta: '#C17A5E', terracottaLight: '#D4917A',
  gold: '#D4A853', goldLight: '#E5C17A',
  cream: '#F5F7FA', warmGray: '#E1E8ED', warmGrayDark: '#BDC3C7',
  textPrimary: '#2D3436', textSecondary: '#636E72', textMuted: '#8A92A0',
  white: '#FFFFFF', error: '#C75050', errorLight: '#FEF2F2',
  success: '#2D5A3D', successLight: '#F0F7F2',
  accent: '#00A3E0', accentLight: '#F0F9FF'
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
  sm: '6px', md: '8px', lg: '10px', xl: '12px', full: '9999px'
}

export const shadows = {
  sm: '0 2px 8px rgba(0,0,0,0.04)',
  md: '0 4px 6px rgba(0,0,0,0.07)',
  lg: '0 10px 15px rgba(0,0,0,0.1)'
}

export const commonStyles = {
  buttonBase: {
    fontFamily: systemFont, fontSize: '15px', fontWeight: 600,
    padding: '8px 16px', borderRadius: '8px',
    border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  },
  buttonPrimary: { backgroundColor: colors.forest, color: colors.white },
  buttonSecondary: { backgroundColor: '#F5F7FA', color: colors.textPrimary },
  buttonDanger: { backgroundColor: colors.error, color: colors.white },
  input: {
    fontFamily: systemFont, fontSize: '15px', padding: '10px 14px',
    borderRadius: '8px', border: `1px solid ${colors.warmGrayDark}`,
    backgroundColor: colors.white, color: colors.textPrimary,
    width: '100%', outline: 'none'
  },
  card: { backgroundColor: colors.white, borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  label: {
    fontFamily: systemFont, fontSize: '12px', fontWeight: 600,
    color: colors.textSecondary, marginBottom: '6px', display: 'block',
    textTransform: 'uppercase', letterSpacing: '0.4px'
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
