import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows, commonStyles } from '../lib/theme'
import TagBaseManager from './TagBaseManager'

export default function SettingsPage() {
  const { t, signOut, language, updateLanguage, profile } = useApp()

  const [showTagManager, setShowTagManager] = useState(false)
  const [showBaseManager, setShowBaseManager] = useState(false)
  const [showIngredientManager, setShowIngredientManager] = useState(false)

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
                backgroundColor: language === 'fr' ? colors.forest : colors.background,
                color: language === 'fr' ? colors.white : colors.textPrimary
              }}
            >
              🇫🇷 Français
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              style={{
                ...styles.langButton,
                backgroundColor: language === 'en' ? colors.forest : colors.background,
                color: language === 'en' ? colors.white : colors.textPrimary
              }}
            >
              🇬🇧 English
            </button>
          </div>
        </div>

        {/* Tags management */}
        <button
          onClick={() => setShowTagManager(true)}
          style={styles.cardButton}
        >
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🏷️</span>
            <span style={styles.cardTitle}>{t('settings.tags')}</span>
          </div>
          <span style={styles.cardArrow}>→</span>
        </button>

        {/* Bases management */}
        <button
          onClick={() => setShowBaseManager(true)}
          style={styles.cardButton}
        >
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🍚</span>
            <span style={styles.cardTitle}>{t('settings.bases')}</span>
          </div>
          <span style={styles.cardArrow}>→</span>
        </button>

        {/* Ingredients management */}
        <button
          onClick={() => setShowIngredientManager(true)}
          style={styles.cardButton}
        >
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>🥕</span>
            <span style={styles.cardTitle}>{t('settings.ingredients')}</span>
          </div>
          <span style={styles.cardArrow}>→</span>
        </button>

        {/* Logout */}
        <button onClick={handleLogout} style={styles.logoutButton}>
          {t('settings.logout')}
        </button>
      </div>

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

const styles = {
  container: {
    padding: spacing.md
  },

  header: {
    marginBottom: spacing.lg
  },

  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    color: colors.forest,
    margin: 0,
    fontWeight: 800,
    letterSpacing: '-0.3px'
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
    gap: '10px'
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: '16px',
    padding: spacing.md,
    boxShadow: shadows.sm,
    border: '1px solid rgba(0,0,0,0.04)'
  },

  cardButton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: '16px',
    padding: spacing.md,
    boxShadow: shadows.sm,
    border: '1px solid rgba(0,0,0,0.04)',
    cursor: 'pointer',
    fontFamily: fonts.body,
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s ease'
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
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
    marginTop: '10px'
  },

  langButton: {
    ...commonStyles.buttonBase,
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: '12px'
  },

  logoutButton: {
    ...commonStyles.buttonBase,
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.white,
    color: colors.error,
    border: `1.5px solid ${colors.error}`,
    marginTop: spacing.md,
    borderRadius: '16px'
  }
}
