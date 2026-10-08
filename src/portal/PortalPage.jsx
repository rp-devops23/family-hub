import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { APPS, ASSISTANT, GROUPS, getApp, getRecentApps, getHomePrefs, saveHomePrefs } from './apps';

// ============================================================================
// PORTAL PAGE - Family hub home screen
// Mobile-first : un assistant en vedette, une reprise rapide des dernières
// applications, puis des cartes lisibles (nom + description) groupées par domaine.
// ============================================================================

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const INK = '#1C1B2E';
const MUTED = '#64647C';
const LINE = '#E8E8F3';
const BG = '#F3F3FA';

const CSS = `
.portal * { box-sizing: border-box; }
.portal button { font-family: inherit; -webkit-tap-highlight-color: transparent;
  transition: transform .18s cubic-bezier(.22,1,.36,1), box-shadow .2s ease, background-color .2s ease; }
.portal button:active { transform: scale(.975); }
.portal button:focus-visible { outline: 3px solid rgba(91,91,214,.4); outline-offset: 2px; }
@media (hover: hover) {
  .portal .p-card:hover { box-shadow: 0 8px 24px rgba(91,91,214,.14); transform: translateY(-1px); }
}
@keyframes p-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.portal .p-in { animation: p-in .45s cubic-bezier(.22,1,.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .portal *, .portal *::before, .portal *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
`;

function greeting(t) {
  const h = new Date().getHours();
  if (h < 5) return t('Bonne nuit', 'Good night');
  if (h < 12) return t('Bonjour', 'Good morning');
  if (h < 18) return t('Bon après-midi', 'Good afternoon');
  return t('Bonsoir', 'Good evening');
}

function Switch({ on, onChange, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      style={{ ...styles.switchTrack, backgroundColor: on ? '#5B5BD6' : '#CFCFE2' }}
    >
      <span style={{ ...styles.switchThumb, transform: on ? 'translateX(20px)' : 'none' }} />
    </button>
  );
}

export default function PortalPage({ onSelectApp }) {
  const { signOut, language, toggleLanguage, t } = useAuth();

  const [prefs, setPrefs] = useState(getHomePrefs);
  const [editing, setEditing] = useState(false);

  const updatePrefs = (next) => { setPrefs(next); saveHomePrefs(next); };
  const toggleApp = (id) => updatePrefs({
    ...prefs,
    hidden: prefs.hidden.includes(id) ? prefs.hidden.filter(x => x !== id) : [...prefs.hidden, id],
  });

  const isVisible = (app) => !prefs.hidden.includes(app.id);
  const recents = useMemo(
    () => getRecentApps().map(getApp).filter(app => app && !prefs.hidden.includes(app.id)),
    [prefs.hidden]
  );
  const title = (app) => (language === 'fr' ? app.titleFr : app.titleEn);
  const desc = (app) => (language === 'fr' ? app.descFr : app.descEn);

  const today = new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="portal" style={styles.container}>
      <style>{CSS}</style>

      <div style={styles.inner}>
        <header style={styles.header}>
          <div>
            <p style={styles.date}>{today}</p>
            <h1 style={styles.greeting}>{greeting(t)} 👋</h1>
          </div>
          <div style={styles.headerActions}>
            <button onClick={toggleLanguage} style={styles.pillBtn} aria-label={t('Changer de langue', 'Switch language')}>
              {language === 'fr' ? 'EN' : 'FR'}
            </button>
            <button onClick={signOut} style={styles.roundBtn} aria-label={t('Se déconnecter', 'Sign out')} title={t('Se déconnecter', 'Sign out')}>
              🚪
            </button>
          </div>
        </header>

        {editing ? (
          <section className="p-in" style={styles.section}>
            <h2 style={styles.sectionTitle}>{t('Applications affichées', 'Visible apps')}</h2>
            <div style={styles.list}>
              {APPS.map(app => (
                <div key={app.id} style={styles.editRow}>
                  <span style={{ ...styles.editIcon, backgroundColor: app.bg }}>{app.icon}</span>
                  <span style={styles.cardText}>
                    <span style={styles.cardTitle}>{title(app)}</span>
                  </span>
                  <Switch on={isVisible(app)} onChange={() => toggleApp(app.id)} label={title(app)} />
                </div>
              ))}
            </div>

            <h2 style={{ ...styles.sectionTitle, marginTop: '22px' }}>{t('Démarrage', 'Startup')}</h2>
            <div style={styles.editRow}>
              <span style={{ ...styles.editIcon, backgroundColor: '#EEEEFC' }}>⚡</span>
              <span style={styles.cardText}>
                <span style={styles.cardTitle}>{t('Ouvrir ma dernière app', 'Open my last app')}</span>
                <span style={styles.cardDesc}>{t("Saute l'accueil au lancement. Le bouton 🏠 y ramène.", 'Skips the home on launch. The 🏠 button brings you back.')}</span>
              </span>
              <Switch on={prefs.openLast} onChange={() => updatePrefs({ ...prefs, openLast: !prefs.openLast })} label={t('Ouvrir ma dernière app', 'Open my last app')} />
            </div>

            <button onClick={() => setEditing(false)} style={styles.doneBtn}>{t('Terminé', 'Done')}</button>
          </section>
        ) : (
          <>
        {/* Assistant en vedette */}
        <button className="p-in p-card" onClick={() => onSelectApp(ASSISTANT.id)} style={styles.hero}>
          <span style={styles.heroIcon}>{ASSISTANT.icon}</span>
          <span style={styles.heroText}>
            <span style={styles.heroTitle}>{title(ASSISTANT)}</span>
            <span style={styles.heroDesc}>{desc(ASSISTANT)}</span>
          </span>
          <span style={styles.heroArrow} aria-hidden="true">→</span>
        </button>

        {/* Reprise rapide */}
        {recents.length > 0 && (
          <section className="p-in" style={{ ...styles.section, animationDelay: '60ms' }}>
            <h2 style={styles.sectionTitle}>{t('Reprendre', 'Pick up where you left off')}</h2>
            <div style={styles.chips}>
              {recents.map(app => (
                <button key={app.id} onClick={() => onSelectApp(app.id)} style={styles.chip}>
                  <span style={{ ...styles.chipIcon, backgroundColor: app.bg }}>{app.icon}</span>
                  <span style={styles.chipLabel}>{title(app)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Applications par domaine */}
        {GROUPS.map((group, gi) => {
          const apps = APPS.filter(a => a.group === group.id && isVisible(a));
          if (apps.length === 0) return null;
          return (
            <section key={group.id} className="p-in" style={{ ...styles.section, animationDelay: `${120 + gi * 60}ms` }}>
              <h2 style={styles.sectionTitle}>{language === 'fr' ? group.titleFr : group.titleEn}</h2>
              <div style={styles.list}>
                {apps.map(app => (
                  <button key={app.id} className="p-card" onClick={() => onSelectApp(app.id)} style={styles.card}>
                    <span style={{ ...styles.cardIcon, backgroundColor: app.bg }}>{app.icon}</span>
                    <span style={styles.cardText}>
                      <span style={styles.cardTitle}>{title(app)}</span>
                      <span style={styles.cardDesc}>{desc(app)}</span>
                    </span>
                    <span style={{ ...styles.chevron, color: app.color }} aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}


            <button onClick={() => setEditing(true)} style={styles.customizeBtn}>
              ⚙️ {t("Personnaliser l'accueil", 'Customize home')}
            </button>
          </>
        )}

        <p style={styles.footer}>🏠 Family Hub</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%', minHeight: '100vh', backgroundColor: BG, fontFamily: FONT,
    display: 'flex', justifyContent: 'center', color: INK,
  },
  inner: { width: '100%', maxWidth: '600px', padding: 'max(20px, env(safe-area-inset-top)) 16px 40px' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' },
  date: { margin: 0, fontSize: '13px', fontWeight: 600, color: MUTED, textTransform: 'capitalize' },
  greeting: { margin: '2px 0 0', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' },
  headerActions: { display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '2px' },
  pillBtn: {
    height: '38px', padding: '0 14px', border: `1.5px solid ${LINE}`, borderRadius: '12px',
    background: 'white', color: MUTED, fontSize: '13px', fontWeight: 700, cursor: 'pointer',
  },
  roundBtn: {
    width: '38px', height: '38px', border: `1.5px solid ${LINE}`, borderRadius: '12px',
    background: 'white', fontSize: '17px', cursor: 'pointer', padding: 0,
  },

  hero: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '18px',
    border: 'none', borderRadius: '22px', cursor: 'pointer', textAlign: 'left', color: 'white',
    backgroundImage: 'linear-gradient(135deg, #5B5BD6 0%, #8B5CF6 100%)',
    boxShadow: '0 10px 28px rgba(91,91,214,.35)', marginBottom: '8px',
  },
  heroIcon: {
    width: '52px', height: '52px', flexShrink: 0, borderRadius: '16px', fontSize: '28px',
    backgroundColor: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heroText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' },
  heroTitle: { fontSize: '18px', fontWeight: 800 },
  heroDesc: { fontSize: '13px', opacity: 0.9, lineHeight: 1.35 },
  heroArrow: { fontSize: '22px', fontWeight: 700, opacity: 0.9 },

  section: { marginTop: '22px' },
  sectionTitle: {
    margin: '0 0 10px 4px', fontSize: '12px', fontWeight: 700, color: MUTED,
    textTransform: 'uppercase', letterSpacing: '0.7px',
  },

  chips: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', margin: '0 -16px', padding: '0 16px 4px' },
  chip: {
    flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px 8px 8px',
    border: `1.5px solid ${LINE}`, borderRadius: '16px', background: 'white', cursor: 'pointer',
  },
  chipIcon: { width: '34px', height: '34px', borderRadius: '11px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: '14px', fontWeight: 700, color: INK },

  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  card: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px',
    border: '1px solid rgba(91,91,214,.06)', borderRadius: '18px', background: 'white',
    boxShadow: '0 1px 2px rgba(28,27,46,.04), 0 2px 8px rgba(28,27,46,.04)',
    cursor: 'pointer', textAlign: 'left',
  },
  cardIcon: { width: '50px', height: '50px', flexShrink: 0, borderRadius: '15px', fontSize: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  cardTitle: { fontSize: '16px', fontWeight: 700, color: INK },
  cardDesc: { fontSize: '13px', color: MUTED, lineHeight: 1.35 },
  chevron: { fontSize: '26px', fontWeight: 300, lineHeight: 1, flexShrink: 0 },

  editRow: {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: 'white',
    borderRadius: '18px', border: '1px solid rgba(91,91,214,.06)',
    boxShadow: '0 1px 2px rgba(28,27,46,.04)',
  },
  editIcon: { width: '44px', height: '44px', flexShrink: 0, borderRadius: '13px', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  switchTrack: { width: '48px', height: '28px', flexShrink: 0, border: 'none', borderRadius: '14px', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  switchThumb: { width: '24px', height: '24px', borderRadius: '12px', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,.25)', transition: 'transform .2s cubic-bezier(.22,1,.36,1)' },
  doneBtn: {
    width: '100%', marginTop: '18px', padding: '14px', border: 'none', borderRadius: '16px', cursor: 'pointer',
    color: 'white', fontSize: '16px', fontWeight: 700, backgroundImage: 'linear-gradient(135deg, #7C7CEB, #5B5BD6)',
    boxShadow: '0 6px 18px rgba(91,91,214,.3)',
  },
  customizeBtn: {
    display: 'block', margin: '28px auto 0', padding: '10px 18px', border: `1.5px dashed ${LINE}`,
    borderRadius: '14px', background: 'transparent', color: MUTED, fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  },

  footer: { textAlign: 'center', color: '#B0B0C4', fontSize: '12px', margin: '32px 0 0' },
};
