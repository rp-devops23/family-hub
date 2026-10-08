import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ============================================================================
// HOLIDAY LIST PAGE — Liste de tous les voyages
// ============================================================================

const FONT   = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#FF7043';
const EMOJIS = ['✈️', '🏖️', '🏔️', '🚗', '🚢', '🏕️', '🌍', '🏠', '⛺', '🎿', '🤿', '🌴'];

function progressColor(pct) {
  if (pct >= 100) return '#27AE60';
  if (pct >= 60)  return '#F39C12';
  return ACCENT;
}

export default function HolidayListPage({ onSelectTrip, onHome }) {
  const { user, language, toggleLanguage, signOut, t } = useAuth();

  const [trips,       setTrips]       = useState([]);
  const [progress,    setProgress]    = useState({}); // { tripId: { total, done } }
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [formName,    setFormName]    = useState('');
  const [formEmoji,   setFormEmoji]   = useState('✈️');
  const [saving,      setSaving]      = useState(false);
  const [orphanCount, setOrphanCount] = useState(0);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: tripsData }, { data: itemsData }] = await Promise.all([
      supabase.from('holiday_trips').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('holiday_items').select('id, trip_id, checked').eq('user_id', user.id),
    ]);
    setTrips(tripsData ?? []);

    const prog = {};
    let orphans = 0;
    (itemsData ?? []).forEach(item => {
      if (!item.trip_id) { orphans++; return; }
      if (!prog[item.trip_id]) prog[item.trip_id] = { total: 0, done: 0 };
      prog[item.trip_id].total++;
      if (item.checked) prog[item.trip_id].done++;
    });
    setProgress(prog);
    setOrphanCount(orphans);
    setLoading(false);
  }

  async function createTrip() {
    if (!formName.trim()) return;
    setSaving(true);
    const { data: trip, error } = await supabase
      .from('holiday_trips')
      .insert({ user_id: user.id, name: formName.trim(), emoji: formEmoji })
      .select().single();

    if (!error && trip) {
      // Migrate orphaned items to this first trip
      if (orphanCount > 0 && trips.length === 0) {
        await supabase.from('holiday_items')
          .update({ trip_id: trip.id })
          .eq('user_id', user.id)
          .is('trip_id', null);
        setOrphanCount(0);
        // Reload progress after migration
        const { data: itemsData } = await supabase
          .from('holiday_items').select('id, trip_id, checked').eq('user_id', user.id);
        const prog = {};
        (itemsData ?? []).forEach(item => {
          if (!item.trip_id) return;
          if (!prog[item.trip_id]) prog[item.trip_id] = { total: 0, done: 0 };
          prog[item.trip_id].total++;
          if (item.checked) prog[item.trip_id].done++;
        });
        setProgress(prog);
      }
      setTrips(prev => [trip, ...prev]);
      setShowForm(false);
      setFormName('');
      setFormEmoji('✈️');
    }
    setSaving(false);
  }

  async function deleteTrip(e, tripId) {
    e.stopPropagation();
    if (!window.confirm(t('Supprimer ce voyage et tous ses articles ?', 'Delete this trip and all its items?'))) return;
    await supabase.from('holiday_trips').delete().eq('id', tripId);
    setTrips(prev => prev.filter(tr => tr.id !== tripId));
    setProgress(prev => { const next = { ...prev }; delete next[tripId]; return next; });
  }

  function openForm() {
    setFormName('');
    setFormEmoji('✈️');
    setShowForm(true);
  }

  return (
    <div style={s.wrapper}>
      {/* ---- HEADER ---- */}
      <header style={s.header}>
        <button onClick={onHome} style={s.iconBtn} title={t('Accueil', 'Home')}>🏠</button>
        <div style={s.headerTitle}>
          <span style={s.headerIcon}>✈️</span>
          <span style={s.headerText}>{t('Vacances', 'Holidays')}</span>
        </div>
        <div style={s.headerActions}>
          <button onClick={toggleLanguage} style={s.iconBtn}>{language === 'fr' ? '🇬🇧' : '🇫🇷'}</button>
          <button onClick={signOut} style={s.iconBtn}>🚪</button>
        </div>
      </header>

      {/* ---- BODY ---- */}
      <div style={s.container}>

        {/* Migration notice */}
        {orphanCount > 0 && trips.length === 0 && (
          <div style={s.orphanBanner}>
            <p style={s.orphanText}>
              {t(
                `Vous avez ${orphanCount} article(s) existant(s). Créez votre premier voyage pour les y intégrer automatiquement.`,
                `You have ${orphanCount} existing item(s). Create your first trip to automatically include them.`
              )}
            </p>
          </div>
        )}

        {loading ? (
          <div style={s.loading}>{t('Chargement…', 'Loading…')}</div>
        ) : trips.length === 0 ? (
          <div style={s.empty}>
            <span style={s.emptyEmoji}>✈️</span>
            <p style={s.emptyTitle}>{t('Aucun voyage créé', 'No trips yet')}</p>
            <p style={s.emptySubtitle}>{t('Créez votre première liste de vacances', 'Create your first holiday checklist')}</p>
            <button onClick={openForm} style={s.createBtn}>
              + {t('Créer un voyage', 'Create a trip')}
            </button>
          </div>
        ) : (
          <div style={s.list}>
            {trips.map(trip => {
              const prog = progress[trip.id] ?? { total: 0, done: 0 };
              const pct  = prog.total === 0 ? 0 : Math.round((prog.done / prog.total) * 100);
              const color = progressColor(pct);
              return (
                <div key={trip.id} style={s.tripCard} onClick={() => onSelectTrip(trip)}>
                  <span style={s.tripEmoji}>{trip.emoji}</span>
                  <div style={s.tripInfo}>
                    <span style={s.tripName}>{trip.name}</span>
                    {prog.total > 0 ? (
                      <>
                        <div style={s.miniTrack}>
                          <div style={{ ...s.miniBar, width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <span style={{ ...s.tripStat, color }}>
                          {prog.done}/{prog.total} · {pct}%
                          {pct >= 100 && ' 🎉'}
                        </span>
                      </>
                    ) : (
                      <span style={s.tripEmpty}>{t('Aucun article', 'No items yet')}</span>
                    )}
                  </div>
                  <div style={s.tripActions}>
                    <button onClick={e => deleteTrip(e, trip.id)} style={s.deleteBtn}>🗑️</button>
                    <span style={s.chevron}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- FAB ---- */}
      {!showForm && (
        <button onClick={openForm} style={s.fab}>+</button>
      )}

      {/* ---- CREATE FORM ---- */}
      {showForm && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{t('Nouveau voyage', 'New trip')}</h2>
              <button onClick={() => setShowForm(false)} style={s.modalClose}>✕</button>
            </div>

            <label style={s.label}>{t('Nom du voyage *', 'Trip name *')}</label>
            <input
              autoFocus
              value={formName}
              onChange={e => setFormName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && formName.trim()) createTrip(); if (e.key === 'Escape') setShowForm(false); }}
              placeholder={t('Ex: Vacances à la mer, Ski Alpes…', 'E.g. Beach holiday, Alps skiing…')}
              style={s.input}
            />

            <label style={s.label}>{t('Icône', 'Icon')}</label>
            <div style={s.emojiGrid}>
              {EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => setFormEmoji(em)}
                  style={{
                    ...s.emojiBtn,
                    backgroundColor: formEmoji === em ? ACCENT + '22' : 'transparent',
                    border: `2px solid ${formEmoji === em ? ACCENT : 'transparent'}`,
                  }}
                >
                  {em}
                </button>
              ))}
            </div>

            {orphanCount > 0 && trips.length === 0 && (
              <p style={s.migrateHint}>
                ✓ {t(
                  `Les ${orphanCount} articles existants seront ajoutés à ce voyage.`,
                  `The ${orphanCount} existing items will be added to this trip.`
                )}
              </p>
            )}

            <div style={s.modalFooter}>
              <button onClick={() => setShowForm(false)} style={s.cancelBtn}>{t('Annuler', 'Cancel')}</button>
              <button
                onClick={createTrip}
                disabled={!formName.trim() || saving}
                style={{ ...s.saveBtn, opacity: !formName.trim() || saving ? 0.5 : 1 }}
              >
                {saving ? '…' : t('Créer', 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const s = {
  wrapper: { width: '100%', minHeight: '100vh', backgroundColor: '#FFF8F5', fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  header: { width: '100%', maxWidth: '640px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: 'white', borderBottom: `3px solid ${ACCENT}`, position: 'sticky', top: 0, zIndex: 20, boxSizing: 'border-box' },
  headerTitle: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px' },
  headerIcon: { fontSize: '22px' },
  headerText: { fontSize: '18px', fontWeight: '700', color: '#2D3436' },
  headerActions: { display: 'flex', gap: '6px' },
  iconBtn: { background: 'none', border: '1px solid #E1E8ED', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', padding: '6px 8px', lineHeight: 1 },

  container: { width: '100%', maxWidth: '640px', padding: '16px', boxSizing: 'border-box' },

  orphanBanner: { backgroundColor: '#FFF3E0', border: '1px solid #FFE0B2', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' },
  orphanText: { margin: 0, fontSize: '13px', color: '#E65100', lineHeight: '1.5' },

  loading: { textAlign: 'center', padding: '48px', color: '#636E72', fontSize: '15px' },

  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '60px 20px', textAlign: 'center' },
  emptyEmoji: { fontSize: '64px' },
  emptyTitle: { fontSize: '18px', fontWeight: '700', color: '#2D3436', margin: 0 },
  emptySubtitle: { fontSize: '14px', color: '#636E72', margin: 0 },
  createBtn: { marginTop: '8px', padding: '12px 28px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', fontFamily: FONT },

  list: { display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '96px' },
  tripCard: { display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', cursor: 'pointer', border: '1px solid #F0E6DF', transition: 'transform 0.1s' },
  tripEmoji: { fontSize: '36px', flexShrink: 0 },
  tripInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  tripName: { fontSize: '16px', fontWeight: '700', color: '#2D3436', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  miniTrack: { width: '100%', height: '4px', backgroundColor: '#F0E6DF', borderRadius: '2px', overflow: 'hidden' },
  miniBar: { height: '100%', borderRadius: '2px', transition: 'width 0.3s ease' },
  tripStat: { fontSize: '12px', fontWeight: '600' },
  tripEmpty: { fontSize: '12px', color: '#B2BEC3', fontStyle: 'italic' },
  tripActions: { display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', opacity: 0.35, padding: '4px', lineHeight: 1 },
  chevron: { fontSize: '24px', color: '#BDC3C7', fontWeight: '300', lineHeight: 1 },

  fab: { position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: ACCENT, color: 'white', fontSize: '28px', lineHeight: 1, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,112,67,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 },

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 40 },
  modal: { width: '100%', maxWidth: '640px', backgroundColor: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#2D3436' },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#636E72', padding: '4px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#636E72', marginBottom: '6px', marginTop: '14px' },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E1E8ED', borderRadius: '10px', fontSize: '15px', color: '#2D3436', outline: 'none', boxSizing: 'border-box', fontFamily: FONT },
  emojiGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  emojiBtn: { fontSize: '24px', padding: '8px', borderRadius: '8px', cursor: 'pointer', lineHeight: 1, transition: 'all 0.1s' },
  migrateHint: { margin: '14px 0 0', fontSize: '13px', color: '#27AE60', fontWeight: '600' },
  modalFooter: { display: 'flex', gap: '10px', marginTop: '24px' },
  cancelBtn: { flex: 1, padding: '12px', backgroundColor: '#F5F7FA', color: '#636E72', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', fontFamily: FONT },
  saveBtn: { flex: 2, padding: '12px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', fontFamily: FONT, transition: 'opacity 0.15s' },
};
