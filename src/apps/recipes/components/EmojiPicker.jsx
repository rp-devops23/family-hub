import { useState } from 'react'
import { colors, fonts, fontSizes, spacing, borderRadius } from '../lib/theme'
import { EMOJI_GROUPS } from '../lib/emojis'

// Premier emoji (cluster de graphèmes) d'une saisie libre
function firstEmoji(text) {
  const value = text.trim()
  if (!value) return ''
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const [first] = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)
    return first ? first.segment : ''
  }
  return Array.from(value)[0]
}

export default function EmojiPicker({ value, onChange, placeholder = 'Emoji' }) {
  const [groupId, setGroupId] = useState(
    () => EMOJI_GROUPS.find(g => g.emojis.includes(value))?.id || EMOJI_GROUPS[0].id
  )
  const group = EMOJI_GROUPS.find(g => g.id === groupId) || EMOJI_GROUPS[0]

  return (
    <div style={styles.wrapper}>
      <div style={styles.topRow}>
        <div style={styles.preview} aria-label="Emoji sélectionné">{value || '＋'}</div>
        <input
          type="text"
          value=""
          onChange={e => {
            const emoji = firstEmoji(e.target.value)
            if (emoji) onChange(emoji)
          }}
          placeholder={placeholder}
          style={styles.customInput}
          aria-label={placeholder}
        />
        {value && (
          <button type="button" onClick={() => onChange('')} style={styles.clearBtn} aria-label="Retirer l'emoji">✕</button>
        )}
      </div>

      <div style={styles.tabs} role="tablist">
        {EMOJI_GROUPS.map(g => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === groupId}
            onClick={() => setGroupId(g.id)}
            style={{ ...styles.tab, ...(g.id === groupId ? styles.tabActive : {}) }}
          >
            {g.icon}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {group.emojis.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            style={{ ...styles.emojiBtn, ...(emoji === value ? styles.emojiBtnActive : {}) }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: spacing.sm },
  topRow: { display: 'flex', alignItems: 'center', gap: spacing.sm },
  preview: {
    width: '48px', height: '48px', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '28px', backgroundColor: colors.cream,
    border: `2px solid ${colors.forest}`, borderRadius: borderRadius.lg
  },
  customInput: {
    flex: 1, minWidth: 0, padding: '10px 12px', fontSize: fontSizes.md,
    fontFamily: fonts.body, border: `1px solid ${colors.warmGray}`,
    borderRadius: borderRadius.md, outline: 'none', backgroundColor: colors.white
  },
  clearBtn: {
    width: '32px', height: '32px', flexShrink: 0, border: 'none',
    backgroundColor: colors.warmGray, borderRadius: borderRadius.full,
    cursor: 'pointer', color: colors.textSecondary, fontSize: fontSizes.sm
  },
  tabs: { display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' },
  tab: {
    flex: '1 0 auto', minWidth: '40px', height: '36px', border: 'none',
    backgroundColor: colors.cream, borderRadius: borderRadius.md,
    cursor: 'pointer', fontSize: '18px', opacity: 0.6
  },
  tabActive: { backgroundColor: colors.forest + '1F', opacity: 1, boxShadow: `inset 0 -2px 0 ${colors.forest}` },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '4px',
    maxHeight: '168px', overflowY: 'auto', padding: '2px'
  },
  emojiBtn: {
    height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid transparent', borderRadius: borderRadius.md,
    backgroundColor: 'transparent', cursor: 'pointer', fontSize: '22px'
  },
  emojiBtnActive: { backgroundColor: colors.forest + '20', borderColor: colors.forest }
}
