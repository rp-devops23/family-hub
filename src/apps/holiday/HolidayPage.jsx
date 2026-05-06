import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ============================================================================
// HOLIDAY CHECKLIST PAGE — Checklist d'un voyage
// Props: trip { id, name, emoji }, onBack, onHome
// ============================================================================

const FONT   = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#FF7043';

const CATEGORIES = [
  { id: 'documents',  icon: '📄', labelFr: 'Documents',  labelEn: 'Documents'  },
  { id: 'bagages',    icon: '🧳', labelFr: 'Bagages',    labelEn: 'Luggage'    },
  { id: 'provisions', icon: '🛒', labelFr: 'Provisions', labelEn: 'Provisions' },
  { id: 'maison',     icon: '🏠', labelFr: 'Maison',     labelEn: 'House'      },
  { id: 'transport',  icon: '🚗', labelFr: 'Transport',  labelEn: 'Transport'  },
  { id: 'enfants',    icon: '👶', labelFr: 'Enfants',    labelEn: 'Kids'       },
  { id: 'divers',     icon: '✅', labelFr: 'Divers',     labelEn: 'Other'      },
];

const PRIORITIES = [
  { value: 'haute',   labelFr: 'Haute',   labelEn: 'High',   color: '#E74C3C' },
  { value: 'normale', labelFr: 'Normale', labelEn: 'Normal', color: '#F39C12' },
  { value: 'basse',   labelFr: 'Basse',   labelEn: 'Low',    color: '#95A5A6' },
];

const DEFAULT_ITEMS = [
  // Documents
  { name: 'Passeports',                    category: 'documents', priority: 'haute'   },
  { name: "Carte d'identité",              category: 'documents', priority: 'haute'   },
  { name: 'Billets avion / train',         category: 'documents', priority: 'haute'   },
  { name: 'Assurance voyage',              category: 'documents', priority: 'haute'   },
  { name: 'Réservations hôtel',            category: 'documents', priority: 'haute'   },
  { name: 'Permis de conduire',            category: 'documents', priority: 'normale' },
  { name: 'Carte vitale / EHIC',           category: 'documents', priority: 'normale' },
  { name: 'Cartes bancaires',              category: 'documents', priority: 'haute'   },
  // Bagages
  { name: 'Valises vérifiées',             category: 'bagages',   priority: 'haute'   },
  { name: 'Cadenas valises',               category: 'bagages',   priority: 'normale' },
  { name: 'Adaptateur prise électrique',   category: 'bagages',   priority: 'normale' },
  { name: 'Chargeurs téléphone',           category: 'bagages',   priority: 'haute'   },
  { name: 'Médicaments',                   category: 'bagages',   priority: 'haute'   },
  { name: 'Trousse de toilette',           category: 'bagages',   priority: 'haute'   },
  { name: 'Vêtements comptés',             category: 'bagages',   priority: 'haute'   },
  { name: 'Maillots de bain',              category: 'bagages',   priority: 'normale' },
  { name: 'Serviettes de bain / plage',    category: 'bagages',   priority: 'haute'   },
  { name: 'Lunettes de soleil',            category: 'bagages',   priority: 'normale' },
  { name: 'Crème solaire',                 category: 'bagages',   priority: 'normale' },
  { name: 'Livres / e-reader',             category: 'bagages',   priority: 'basse'   },
  { name: 'Draps / linge de lit',          category: 'bagages',   priority: 'normale' },
  // Maison
  { name: 'Vider le réfrigérateur',        category: 'maison',    priority: 'haute'   },
  { name: 'Jeter les poubelles',           category: 'maison',    priority: 'haute'   },
  { name: 'Activer alarme',                category: 'maison',    priority: 'haute'   },
  { name: 'Prévenir un voisin',            category: 'maison',    priority: 'normale' },
  { name: 'Arrêter le courrier',           category: 'maison',    priority: 'normale' },
  { name: 'Arroser les plantes',           category: 'maison',    priority: 'normale' },
  { name: "Couper l'eau",                  category: 'maison',    priority: 'normale' },
  { name: 'Débrancher les appareils',      category: 'maison',    priority: 'normale' },
  { name: 'Fermer les volets',             category: 'maison',    priority: 'normale' },
  // Transport
  { name: 'Check-in en ligne',             category: 'transport', priority: 'haute'   },
  { name: 'Vérifier heure vol',            category: 'transport', priority: 'haute'   },
  { name: 'Réserver parking',              category: 'transport', priority: 'normale' },
  { name: "Plein d'essence",               category: 'transport', priority: 'normale' },
  { name: 'Vignette autoroute',            category: 'transport', priority: 'normale' },
  { name: 'Itinéraire routier',            category: 'transport', priority: 'normale' },
  // Provisions
  { name: 'Eau (bouteilles)',              category: 'provisions', priority: 'haute'   },
  { name: 'Jus de fruits',                category: 'provisions', priority: 'normale' },
  { name: 'Fruits frais',                 category: 'provisions', priority: 'haute'   },
  { name: 'Légumes',                       category: 'provisions', priority: 'haute'   },
  { name: 'Pain',                          category: 'provisions', priority: 'haute'   },
  { name: 'Œufs',                          category: 'provisions', priority: 'normale' },
  { name: 'Fromage / charcuterie',         category: 'provisions', priority: 'normale' },
  { name: 'Viande / poisson',              category: 'provisions', priority: 'normale' },
  { name: 'Pâtes / riz',                   category: 'provisions', priority: 'normale' },
  { name: 'Yaourts',                       category: 'provisions', priority: 'normale' },
  { name: 'Céréales / muesli',             category: 'provisions', priority: 'normale' },
  { name: 'Biscuits',                      category: 'provisions', priority: 'normale' },
  { name: 'Chips / snacks apéro',          category: 'provisions', priority: 'normale' },
  { name: 'Chocolat / sucreries',          category: 'provisions', priority: 'basse'   },
  { name: 'Café / thé',                    category: 'provisions', priority: 'normale' },
  { name: 'Lait (adultes)',                category: 'provisions', priority: 'normale' },
  { name: 'Huile / beurre',               category: 'provisions', priority: 'normale' },
  { name: 'Sel / poivre / épices',        category: 'provisions', priority: 'normale' },
  { name: 'Lait maternisé / lait bébé',   category: 'provisions', priority: 'haute'   },
  { name: 'Petits pots / purées bébé',    category: 'provisions', priority: 'haute'   },
  { name: 'Céréales bébé',                category: 'provisions', priority: 'haute'   },
  { name: 'Compotes bébé',                category: 'provisions', priority: 'haute'   },
  { name: 'Gourdes bébé',                 category: 'provisions', priority: 'normale' },
  // Enfants
  { name: "Prévenir l'école",              category: 'enfants',   priority: 'haute'   },
  { name: 'Médicaments enfants',           category: 'enfants',   priority: 'haute'   },
  { name: 'Tétines / doudous',             category: 'enfants',   priority: 'haute'   },
  { name: 'Poussette / siège auto',        category: 'enfants',   priority: 'normale' },
  { name: 'Chauffe-biberon / chauffe-plat',category: 'enfants',   priority: 'haute'   },
  { name: 'Assiettes & couverts bébé',    category: 'enfants',   priority: 'haute'   },
  { name: 'Bavoirs',                       category: 'enfants',   priority: 'normale' },
  { name: 'Seau & pelle (plage)',          category: 'enfants',   priority: 'normale' },
  { name: 'Jouets / activités voyage',     category: 'enfants',   priority: 'normale' },
  { name: 'Snacks voyage enfants',         category: 'enfants',   priority: 'normale' },
  // Divers
  { name: 'Monnaie locale',                category: 'divers',    priority: 'normale' },
  { name: 'Assurance annulation',          category: 'divers',    priority: 'normale' },
  { name: 'Télécharger musique / podcasts',category: 'divers',    priority: 'basse'   },
  { name: 'Guide de voyage',               category: 'divers',    priority: 'basse'   },
];

function priorityInfo(value) {
  return PRIORITIES.find(p => p.value === value) ?? PRIORITIES[1];
}

function categoryInfo(id) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];
}

function sortItems(arr) {
  return [...arr].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    const order = { haute: 0, normale: 1, basse: 2 };
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  });
}

// ============================================================================

export default function HolidayPage({ trip, onBack, onHome }) {
  const { user, language, toggleLanguage, signOut, t } = useAuth();

  const [items,           setItems]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [activeTab,       setActiveTab]       = useState('all');
  const [showForm,        setShowForm]        = useState(false);
  const [editingItem,     setEditingItem]     = useState(null);
  const [confirmReset,    setConfirmReset]    = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [dbError,         setDbError]         = useState(null);

  // Form fields
  const [formName,     setFormName]     = useState('');
  const [formCategory, setFormCategory] = useState('documents');
  const [formPriority, setFormPriority] = useState('normale');
  const [formNotes,    setFormNotes]    = useState('');
  const [formSaving,   setFormSaving]   = useState(false);

  useEffect(() => { if (user && trip) load(); }, [user, trip]);

  async function load() {
    setLoading(true);
    setDbError(null);
    const { data, error } = await supabase
      .from('holiday_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('trip_id', trip.id)
      .order('checked',    { ascending: true })
      .order('priority',   { ascending: true })
      .order('created_at', { ascending: true });
    if (error) setDbError(error.message);
    setItems(data ?? []);
    setLoading(false);
  }

  // ---- Stats ---------------------------------------------------------------

  const stats = useMemo(() => {
    const total   = items.length;
    const checked = items.filter(i => i.checked).length;
    const pct     = total === 0 ? 0 : Math.round((checked / total) * 100);
    const byCat   = {};
    CATEGORIES.forEach(c => {
      const all  = items.filter(i => i.category === c.id);
      const done = all.filter(i => i.checked).length;
      byCat[c.id] = { total: all.length, done };
    });
    return { total, checked, pct, byCat };
  }, [items]);

  const tabItems = useMemo(
    () => activeTab === 'all' ? items : items.filter(i => i.category === activeTab),
    [items, activeTab]
  );

  // ---- CRUD ----------------------------------------------------------------

  async function toggleChecked(item) {
    const { data } = await supabase
      .from('holiday_items')
      .update({ checked: !item.checked, updated_at: new Date().toISOString() })
      .eq('id', item.id).select().single();
    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i));
  }

  function openAdd() {
    setEditingItem(null);
    setFormName('');
    setFormCategory(activeTab === 'all' ? 'documents' : activeTab);
    setFormPriority('normale');
    setFormNotes('');
    setShowForm(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPriority(item.priority);
    setFormNotes(item.notes ?? '');
    setShowForm(true);
  }

  async function save() {
    if (!formName.trim()) return;
    setFormSaving(true);
    const payload = {
      name:       formName.trim(),
      category:   formCategory,
      priority:   formPriority,
      notes:      formNotes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (editingItem) {
      const { data } = await supabase
        .from('holiday_items').update(payload).eq('id', editingItem.id).select().single();
      if (data) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? data : i));
        if (activeTab !== 'all') setActiveTab(data.category);
      }
    } else {
      const { data } = await supabase
        .from('holiday_items')
        .insert({ ...payload, user_id: user.id, trip_id: trip.id, checked: false })
        .select().single();
      if (data) {
        setItems(prev => [...prev, data]);
        if (activeTab !== 'all') setActiveTab(data.category);
      }
    }
    setFormSaving(false);
    setShowForm(false);
  }

  async function del(id) {
    await supabase.from('holiday_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function resetAll() {
    await supabase
      .from('holiday_items')
      .update({ checked: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('trip_id', trip.id);
    setItems(prev => prev.map(i => ({ ...i, checked: false })));
    setConfirmReset(false);
  }

  async function loadDefaults() {
    setLoadingDefaults(true);
    setDbError(null);
    const rows = DEFAULT_ITEMS.map(item => ({
      ...item,
      user_id:    user.id,
      trip_id:    trip.id,
      checked:    false,
      notes:      null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { data, error } = await supabase.from('holiday_items').insert(rows).select();
    if (error) {
      setDbError(error.message);
    } else if (data) {
      setItems(prev => [...prev, ...data]);
    }
    setLoadingDefaults(false);
  }

  function handleFormKey(e) {
    if (e.key === 'Escape') setShowForm(false);
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      save();
    }
  }

  function progressColor(pct) {
    if (pct >= 100) return '#27AE60';
    if (pct >= 60)  return ACCENT;
    return ACCENT;
  }

  // ---- Item row renderer ---------------------------------------------------

  function renderItem(item) {
    const prio = priorityInfo(item.priority);
    return (
      <div key={item.id} style={{ ...s.itemRow, ...(item.checked ? s.itemRowDone : {}) }}>
        <button
          onClick={() => toggleChecked(item)}
          style={{ ...s.checkbox, ...(item.checked ? s.checkboxDone : {}) }}
        >
          {item.checked && <span style={s.checkmark}>✓</span>}
        </button>
        <div style={{ ...s.prioDot, backgroundColor: prio.color }} />
        <div style={s.itemContent}>
          <span style={{ ...s.itemName, ...(item.checked ? s.itemNameDone : {}) }}>{item.name}</span>
          {item.notes && <span style={s.itemNotes}>{item.notes}</span>}
        </div>
        <div style={s.itemActions}>
          <button onClick={() => openEdit(item)} style={s.actionBtn}>✏️</button>
          <button onClick={() => del(item.id)}   style={s.actionBtn}>🗑️</button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={s.wrapper}>
      {/* ---- HEADER ---- */}
      <header style={s.header}>
        <button onClick={onBack} style={s.iconBtn} title={t('Retour', 'Back')}>‹</button>
        <div style={s.headerTitle}>
          <span style={s.headerIcon}>{trip.emoji}</span>
          <span style={s.headerText}>{trip.name}</span>
        </div>
        <div style={s.headerActions}>
          <button onClick={toggleLanguage} style={s.iconBtn}>{language === 'fr' ? '🇬🇧' : '🇫🇷'}</button>
          <button onClick={signOut} style={s.iconBtn}>🚪</button>
        </div>
      </header>

      {/* ---- BODY ---- */}
      <div style={s.container}>

        {/* ---- OVERALL PROGRESS ---- */}
        <div style={s.progressCard}>
          <div style={s.progressHeader}>
            <span style={s.progressLabel}>
              {stats.pct >= 100
                ? t('🎉 Tout prêt pour les vacances !', '🎉 All set for holidays!')
                : t('Progression globale', 'Overall progress')}
            </span>
            <span style={{ ...s.progressCount, color: progressColor(stats.pct) }}>
              {stats.checked} / {stats.total}
            </span>
          </div>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressBar, width: `${stats.pct}%`, backgroundColor: progressColor(stats.pct) }} />
          </div>
          <div style={s.progressActions}>
            {stats.total === 0 ? (
              <button onClick={loadDefaults} disabled={loadingDefaults} style={s.defaultsBtn}>
                {loadingDefaults ? t('Chargement…', 'Loading…') : t('📋 Charger les articles par défaut', '📋 Load default items')}
              </button>
            ) : confirmReset ? (
              <div style={s.confirmRow}>
                <span style={s.confirmText}>{t('Tout décocher ?', 'Uncheck all?')}</span>
                <button onClick={resetAll} style={s.confirmYes}>{t('Oui', 'Yes')}</button>
                <button onClick={() => setConfirmReset(false)} style={s.confirmNo}>{t('Non', 'No')}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmReset(true)} style={s.resetBtn}>
                🔄 {t('Nouveau voyage', 'Reset checklist')}
              </button>
            )}
          </div>
        </div>

        {/* ---- ERROR BANNER ---- */}
        {dbError && (
          <div style={s.errorBanner}>
            <strong>⚠️ Erreur Supabase :</strong> {dbError}
          </div>
        )}

        {/* ---- TABS ---- */}
        {loading ? (
          <div style={s.loading}>{t('Chargement…', 'Loading…')}</div>
        ) : (
          <>
            <div style={s.tabsRow}>
              {/* "Tous" tab */}
              <button
                onClick={() => setActiveTab('all')}
                style={{
                  ...s.tab,
                  ...(activeTab === 'all' ? s.tabActive : {}),
                }}
              >
                <span style={s.tabIcon}>📋</span>
                <span style={s.tabLabel}>{t('Tous', 'All')}</span>
                {stats.total > 0 && (
                  <span style={{
                    ...s.tabBadge,
                    backgroundColor: stats.pct >= 100 ? '#27AE60' : activeTab === 'all' ? ACCENT : '#B2BEC3',
                  }}>
                    {stats.checked}/{stats.total}
                  </span>
                )}
              </button>

              {/* Category tabs */}
              {CATEGORIES.map(cat => {
                const { total, done } = stats.byCat[cat.id] ?? { total: 0, done: 0 };
                const active  = activeTab === cat.id;
                const allDone = total > 0 && done === total;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    style={{ ...s.tab, ...(active ? s.tabActive : {}), ...(allDone ? s.tabDone : {}) }}
                  >
                    <span style={s.tabIcon}>{allDone ? '✅' : cat.icon}</span>
                    <span style={s.tabLabel}>{language === 'fr' ? cat.labelFr : cat.labelEn}</span>
                    {total > 0 && (
                      <span style={{
                        ...s.tabBadge,
                        backgroundColor: allDone ? '#27AE60' : active ? ACCENT : '#B2BEC3',
                      }}>
                        {done}/{total}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Category progress bar (hidden in "all" view) */}
            {activeTab !== 'all' && (() => {
              const { total, done } = stats.byCat[activeTab] ?? { total: 0, done: 0 };
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              if (total === 0) return null;
              return (
                <div style={s.catProgress}>
                  <div style={s.progressTrack}>
                    <div style={{ ...s.progressBar, width: `${pct}%`, backgroundColor: progressColor(pct), height: '4px', borderRadius: '2px' }} />
                  </div>
                </div>
              );
            })()}

            {/* ---- ITEM LIST ---- */}
            <div style={s.list}>
              {activeTab === 'all' ? (
                // Grouped by category
                items.length === 0 ? (
                  <div style={s.empty}>
                    <span style={s.emptyIcon}>📭</span>
                    <p style={s.emptyText}>{t('Aucun article dans cette liste.', 'No items in this checklist.')}</p>
                    <button onClick={openAdd} style={s.emptyAddBtn}>+ {t('Ajouter un article', 'Add an item')}</button>
                  </div>
                ) : (
                  CATEGORIES.map(cat => {
                    const catItems = sortItems(items.filter(i => i.category === cat.id));
                    if (catItems.length === 0) return null;
                    const catDone  = catItems.filter(i => i.checked).length;
                    const catTotal = catItems.length;
                    return (
                      <div key={cat.id} style={s.catGroup}>
                        <div style={s.catGroupHeader}>
                          <span style={s.catGroupIcon}>{cat.icon}</span>
                          <span style={s.catGroupLabel}>{language === 'fr' ? cat.labelFr : cat.labelEn}</span>
                          <span style={{ ...s.catGroupCount, color: catDone === catTotal ? '#27AE60' : '#B2BEC3' }}>
                            {catDone}/{catTotal}
                          </span>
                        </div>
                        {catItems.map(item => renderItem(item))}
                      </div>
                    );
                  })
                )
              ) : (
                // Single category
                tabItems.length === 0 ? (
                  <div style={s.empty}>
                    <span style={s.emptyIcon}>📭</span>
                    <p style={s.emptyText}>{t('Aucun article dans cette catégorie.', 'No items in this category.')}</p>
                    <button onClick={openAdd} style={s.emptyAddBtn}>+ {t('Ajouter un article', 'Add an item')}</button>
                  </div>
                ) : (
                  sortItems(tabItems).map(item => renderItem(item))
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* ---- FAB ---- */}
      {!showForm && (
        <button onClick={openAdd} style={s.fab}>+</button>
      )}

      {/* ---- MODAL FORM ---- */}
      {showForm && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={s.modal} onKeyDown={handleFormKey}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                {editingItem ? t("Modifier l'article", 'Edit item') : t('Nouvel article', 'New item')}
              </h2>
              <button onClick={() => setShowForm(false)} style={s.modalClose}>✕</button>
            </div>

            <label style={s.label}>{t('Nom *', 'Name *')}</label>
            <input autoFocus value={formName} onChange={e => setFormName(e.target.value)}
              placeholder={t('Ex: Passeports', 'E.g. Passports')} style={s.input} />

            <label style={s.label}>{t('Catégorie', 'Category')}</label>
            <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={s.select}>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {language === 'fr' ? c.labelFr : c.labelEn}</option>
              ))}
            </select>

            <label style={s.label}>{t('Priorité', 'Priority')}</label>
            <div style={s.prioRow}>
              {PRIORITIES.map(p => (
                <button key={p.value} type="button" onClick={() => setFormPriority(p.value)} style={{
                  ...s.prioBtn,
                  borderColor:       formPriority === p.value ? p.color : '#E1E8ED',
                  backgroundColor:   formPriority === p.value ? p.color + '18' : 'white',
                  color:             formPriority === p.value ? p.color : '#636E72',
                  fontWeight:        formPriority === p.value ? '700' : '400',
                }}>
                  <span style={{ ...s.prioBtnDot, backgroundColor: p.color }} />
                  {language === 'fr' ? p.labelFr : p.labelEn}
                </button>
              ))}
            </div>

            <label style={s.label}>{t('Notes (optionnel)', 'Notes (optional)')}</label>
            <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)}
              placeholder={t('Taille, quantité, rappel…', 'Size, quantity, reminder…')}
              rows={2} style={s.textarea} />

            <div style={s.modalFooter}>
              <button onClick={() => setShowForm(false)} style={s.cancelBtn}>{t('Annuler', 'Cancel')}</button>
              <button onClick={save} disabled={!formName.trim() || formSaving}
                style={{ ...s.saveBtn, opacity: !formName.trim() || formSaving ? 0.5 : 1 }}>
                {formSaving ? t('…', '…') : t('Enregistrer', 'Save')}
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
  iconBtn: { background: 'none', border: '1px solid #E1E8ED', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', padding: '4px 10px', lineHeight: 1, fontWeight: '600', color: '#2D3436' },
  headerTitle: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
  headerIcon: { fontSize: '22px', flexShrink: 0 },
  headerText: { fontSize: '17px', fontWeight: '700', color: '#2D3436', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  headerActions: { display: 'flex', gap: '6px' },

  container: { width: '100%', maxWidth: '640px', padding: '16px', boxSizing: 'border-box' },

  progressCard: { backgroundColor: 'white', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #F0E6DF' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  progressLabel: { fontSize: '14px', color: '#636E72', fontWeight: '500' },
  progressCount: { fontSize: '20px', fontWeight: '800' },
  progressTrack: { width: '100%', height: '8px', backgroundColor: '#F0E6DF', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' },
  progressBar: { height: '100%', borderRadius: '4px', transition: 'width 0.4s ease' },
  progressActions: { display: 'flex', justifyContent: 'flex-end' },
  defaultsBtn: { padding: '8px 14px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  resetBtn: { padding: '6px 12px', backgroundColor: 'white', color: '#636E72', border: '1px solid #E1E8ED', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' },
  confirmRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  confirmText: { fontSize: '13px', color: '#636E72' },
  confirmYes: { padding: '5px 12px', backgroundColor: '#E74C3C', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  confirmNo: { padding: '5px 12px', backgroundColor: 'white', color: '#636E72', border: '1px solid #E1E8ED', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },

  errorBanner: { backgroundColor: '#FFF3F3', border: '1px solid #FFBCBC', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', fontSize: '13px', color: '#C0392B', lineHeight: '1.6' },
  loading: { textAlign: 'center', padding: '48px', color: '#636E72', fontSize: '15px' },

  tabsRow: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '0', scrollbarWidth: 'none' },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '10px 12px', backgroundColor: 'white', border: '2px solid transparent', borderRadius: '12px', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '68px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'border-color 0.15s, transform 0.1s', outline: 'none' },
  tabActive: { borderColor: ACCENT, transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${ACCENT}28` },
  tabDone: { borderColor: '#27AE60', backgroundColor: '#F0FFF4' },
  tabIcon: { fontSize: '20px' },
  tabLabel: { fontSize: '11px', fontWeight: '600', color: '#2D3436' },
  tabBadge: { fontSize: '10px', fontWeight: '700', color: 'white', padding: '1px 6px', borderRadius: '10px', marginTop: '2px' },

  catProgress: { marginTop: '10px', marginBottom: '4px' },

  list: { marginTop: '12px' },

  // "Tous" grouped view
  catGroup: { marginBottom: '16px' },
  catGroupHeader: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 4px 6px', borderBottom: '1px solid #F0E6DF', marginBottom: '8px' },
  catGroupIcon: { fontSize: '18px' },
  catGroupLabel: { flex: 1, fontSize: '13px', fontWeight: '700', color: '#636E72', textTransform: 'uppercase', letterSpacing: '0.5px' },
  catGroupCount: { fontSize: '12px', fontWeight: '700' },

  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px', gap: '12px' },
  emptyIcon: { fontSize: '40px' },
  emptyText: { color: '#636E72', fontSize: '14px', margin: 0 },
  emptyAddBtn: { padding: '10px 20px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },

  itemRow: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', borderRadius: '12px', padding: '12px 10px', marginBottom: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'opacity 0.2s' },
  itemRowDone: { opacity: 0.55, backgroundColor: '#FAFAFA' },
  checkbox: { width: '26px', height: '26px', flexShrink: 0, borderRadius: '50%', border: `2px solid ${ACCENT}`, backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'background-color 0.15s' },
  checkboxDone: { backgroundColor: '#27AE60', borderColor: '#27AE60' },
  checkmark: { color: 'white', fontSize: '14px', fontWeight: '700', lineHeight: 1 },
  prioDot: { width: '8px', height: '8px', flexShrink: 0, borderRadius: '50%' },
  itemContent: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  itemName: { fontSize: '15px', fontWeight: '500', color: '#2D3436', lineHeight: '1.3' },
  itemNameDone: { textDecoration: 'line-through', color: '#B2BEC3' },
  itemNotes: { fontSize: '12px', color: '#95A5A6', lineHeight: '1.3', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  itemActions: { display: 'flex', gap: '2px', flexShrink: 0 },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', padding: '4px', borderRadius: '6px', lineHeight: 1, opacity: 0.6 },

  fab: { position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: ACCENT, color: 'white', fontSize: '28px', lineHeight: 1, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,112,67,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, transition: 'transform 0.15s' },

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 40, padding: '0' },
  modal: { width: '100%', maxWidth: '640px', backgroundColor: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#2D3436' },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#636E72', padding: '4px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#636E72', marginBottom: '6px', marginTop: '14px' },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #E1E8ED', borderRadius: '10px', fontSize: '15px', color: '#2D3436', outline: 'none', boxSizing: 'border-box', fontFamily: FONT },
  select: { width: '100%', padding: '10px 12px', border: '1.5px solid #E1E8ED', borderRadius: '10px', fontSize: '15px', color: '#2D3436', backgroundColor: 'white', outline: 'none', boxSizing: 'border-box', fontFamily: FONT },
  textarea: { width: '100%', padding: '10px 12px', border: '1.5px solid #E1E8ED', borderRadius: '10px', fontSize: '14px', color: '#2D3436', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: FONT },
  prioRow: { display: 'flex', gap: '8px' },
  prioBtn: { flex: 1, padding: '8px 4px', border: '2px solid #E1E8ED', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '400', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s', fontFamily: FONT },
  prioBtnDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  modalFooter: { display: 'flex', gap: '10px', marginTop: '24px' },
  cancelBtn: { flex: 1, padding: '12px', backgroundColor: '#F5F7FA', color: '#636E72', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', fontFamily: FONT },
  saveBtn: { flex: 2, padding: '12px', backgroundColor: ACCENT, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', fontFamily: FONT, transition: 'opacity 0.15s' },
};
