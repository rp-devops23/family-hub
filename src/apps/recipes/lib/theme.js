const systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// Palette « indigo » : `forest` reste le nom de la couleur principale (utilisé partout),
// mais sa valeur est désormais indigo. Les neutres sont légèrement teintés de violet.
export const colors = {
  forest: '#5B5BD6', forestLight: '#7C7CEB', forestDark: '#4343B5',
  terracotta: '#F2766B', terracottaLight: '#F7978E',
  gold: '#F5A524', goldLight: '#FFC857',
  cream: '#F6F6FC', warmGray: '#E8E8F3', warmGrayDark: '#CFCFE2',
  textPrimary: '#1C1B2E', textSecondary: '#64647C', textMuted: '#9696AE',
  white: '#FFFFFF', error: '#E5484D', errorLight: '#FFF1F1',
  success: '#12A150', successLight: '#E8F8EF',
  accent: '#3B82F6', accentLight: '#EEF4FF',
  background: '#F3F3FA',
}

// Couleur principale en RGB, pour les ombres colorées
export const primaryRgb = '91,91,214'

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
  buttonPrimary: {
    backgroundColor: colors.forest,
    backgroundImage: `linear-gradient(135deg, ${colors.forestLight}, ${colors.forest})`,
    color: colors.white,
    boxShadow: `0 4px 12px rgba(${primaryRgb},0.28)`
  },
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
  const seasonColors = { winter: '#5B9DF0', spring: '#34C98B', summer: '#F5B82E', autumn: '#F2803D' }
  return seasonColors[season] || colors.warmGray
}

export function getDifficultyColor(difficulty) {
  const difficultyColors = { easy: '#12B886', medium: colors.gold, hard: colors.terracotta }
  return difficultyColors[difficulty] || colors.textMuted
}
