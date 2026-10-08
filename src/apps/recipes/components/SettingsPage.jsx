import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, spacing, borderRadius, commonStyles } from '../lib/theme'
import TagBaseManager from './TagBaseManager'
import CategoryManager from './CategoryManager'

export default function SettingsPage() {
  const { t, signOut, language, updateLanguage, profile, shoppingCategories } = useApp()

  const [showTagManager, setShowTagManager] = useState(false)
  const [showBaseManager, setShowBaseManager] = useState(false)
  const [showIngredientManager, setShowIngredientManager] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  const handleLanguageChange = async (newLang) => {
    try {
      await updateLanguage(newLang)
    } catch (error) {
      console.error('Failed to update language:', error)
    }
  }

  const handleLogout = async () => {
    if (window.confirm(t('settings.logoutConfirm'))) {
      await signOut()
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('settings.title')}</h1>
        {profile?.display_name && (
          <p style={styles.greeting}>👋 {profile.display_name}</p>
        )}
      </header>

      <div style={styles.section}>
        {/* Language */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🌐</span>
            <span style={styles.cardTitle}>{t('settings.language')}</span>
          </div>
          <div style={styles.languageButtons}>
            <button
              onClick={() => handleLanguageChange('fr')}
              style={{
                ...styles.langButton,
                backgroundColor: language === 'fr' ? colors.forest : colors.warmGray,
                color: language === 'fr' ? colors.white : colors.textPrimary
              }}
            >
              🇫🇷 Français
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              style={{
                ...styles.langButton,
                backgroundColor: language === 'en' ? colors.forest : colors.warmGray,
                color: language === 'en' ? colors.white : colors.textPrimary
              }}
            >
              🇬🇧 English
            </button>
          </div>
        </div>

        {/* Personnalisation */}
        <h2 style={styles.sectionLabel}>{t('settings.manageSection')}</h2>
        <div style={styles.menu}>
          {[
            { icon: '🛒', title: t('settings.categories'), desc: shoppingCategories.length ? shoppingCategories.map(c => c.icon).join(' ') : t('settings.categoriesDesc'), onClick: () => setShowCategoryManager(true) },
            { icon: '🥕', title: t('settings.ingredients'), onClick: () => setShowIngredientManager(true) },
            { icon: '🏷️', title: t('settings.tags'), onClick: () => setShowTagManager(true) },
            { icon: '🍚', title: t('settings.bases'), onClick: () => setShowBaseManager(true) }
          ].map((row, i, all) => (
            <button
              key={row.title} onClick={row.onClick}
              style={{ ...styles.menuRow, borderBottom: i < all.length - 1 ? `1px solid ${colors.cream}` : 'none' }}
            >
              <span style={styles.menuIcon}>{row.icon}</span>
              <span style={styles.menuText}>
                <span style={styles.cardTitle}>{row.title}</span>
                {row.desc && <span style={styles.menuDesc}>{row.desc}</span>}
              </span>
              <span style={styles.cardArrow}>›</span>
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} style={styles.logoutButton}>
          {t('settings.logout')}
        </button>
      </div>

      {/* Category Manager Modal */}
      {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} />}

      {/* Tag Manager Modal */}
      {showTagManager && (
        <TagBaseManager
          type="tag"
          onClose={() => setShowTagManager(false)}
        />
      )}

      {/* Base Manager Modal */}
      {showBaseManager && (
        <TagBaseManager
          type="base"
          onClose={() => setShowBaseManager(false)}
        />
      )}

      {/* Ingredient Manager Modal */}
      {showIngredientManager && (
        <TagBaseManager
          type="ingredient"
          onClose={() => setShowIngredientManager(false)}
        />
      )}
    </div>
  )
}

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    padding: spacing.md,
    maxWidth: '640px',
    margin: '0 auto'
  },

  sectionLabel: {
    margin: `${spacing.sm} 0 0`,
    fontSize: fontSizes.xs,
    fontWeight: 700,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.6px'
  },

  menu: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
    marginTop: `-${spacing.xs}`
  },

  menuRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `14px ${spacing.md}`,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: fonts.body,
    textAlign: 'left'
  },

  menuIcon: {
    width: '38px',
    height: '38px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    backgroundColor: colors.cream,
    borderRadius: borderRadius.lg
  },

  menuText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  menuDesc: { fontSize: fontSizes.xs, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  header: {
    marginBottom: spacing.lg
  },

  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    color: colors.forest,
    margin: 0
  },

  greeting: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    margin: 0,
    marginTop: spacing.xs
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm
  },

  cardIcon: {
    fontSize: '20px'
  },

  cardTitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.md,
    fontWeight: 600,
    color: colors.textPrimary
  },

  cardArrow: {
    fontSize: fontSizes.lg,
    color: colors.textMuted
  },

  languageButtons: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.sm
  },

  langButton: {
    ...commonStyles.buttonBase,
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`
  },

  logoutButton: {
    ...commonStyles.buttonBase,
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.white,
    color: colors.error,
    border: `1px solid ${colors.error}`,
    marginTop: spacing.md
  }
}