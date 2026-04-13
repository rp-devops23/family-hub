import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// ============================================================================
// SHOPPING PAGE — Courses & Cadeaux
// ============================================================================

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#E74C3C';

const AISLES_FR = ['Alimentation', 'Boissons', 'Maison', 'Pharmacie', 'Beauté', 'Animaux', 'Autre'];
const AISLES_EN = ['Food', 'Drinks', 'Home', 'Pharmacy', 'Beauty', 'Pets', 'Other'];

function fmtEur(n) {
  if (n == null) return '';
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date(new Date().toDateString())) / 86400000);
}

export default function ShoppingPage({ onHome }) {
  const { user, language, toggleLanguage, signOut, t } = useAuth();
  const [tab, setTab] = useState('groceries'); // 'groceries' | 'gift'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Groceries form
  const [formName, setFormName]         = useState('');
  const [formQty, setFormQty]           = useState('');
  const [formAisle, setFormAisle]       = useState('');
  // Gift form
  const [formForWhom, setFormForWhom]   = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formBudget, setFormBudget]     = useState('');
  const [formLink, setFormLink]         = useState('');
  const [formSaving, setFormSaving]     = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('user_id', user.id)
      .order('checked', { ascending: true })
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  async function toggleChecked(item) {
    const { data } = await supabase
      .from('shopping_items')
      .update({ checked: !item.checked, updated_at: new Date().toISOString() })
      .eq('id', item.id).select().single();
    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i));
  }

  async function save() {
    if (!formName.trim()) return;
    setFormSaving(true);
    const base = {
      name: formName.trim(),
      category: tab,
      updated_at: new Date().toISOString(),
    };
    const payload = tab === 'groceries'
      ? { ...base, aisle: formAisle || null, quantity: formQty.trim() || null, for_whom: null, deadline: null, budget: null, link: null }
      : { ...base, for_whom: formForWhom.trim() || null, deadline: formDeadline || null, budget: formBudget !== '' ? parseFloat(formBudget) : null, link: formLink.trim() || null, aisle: null, quantity: null };

    if (editingItem) {
      const { data } = await supabase.from('shopping_items').update(payload).eq('id', editingItem.id).select().single();
      if (data) setItems(prev => prev.map(i => i.id === editingItem.id ? data : i));
    } else {
      const { data } = await supabase.from('shopping_items').insert({ ...payload, user_id: user.id }).select().single();
      if (data) setItems(prev => [data, ...prev]);
    }
    setFormSaving(false);
    closeForm();
  }

  async function del(id) {
    await supabase.from('shopping_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function clearChecked() {
    const ids = items.filter(i => i.category === 'groceries' && i.checked).map(i => i.id);
    if (!ids.length) return;
    await supabase.from('shopping_items').delete().in('id', ids);
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
  }

  function openForm(item = null) {
    setEditingItem(item);
    setFormName(item?.name ?? '');
    setFormQty(item?.quantity ?? '');
    setFormAisle(item?.aisle ?? '');
    setFormForWhom(item?.for_whom ?? '');
    setFormDeadline(item?.deadline ?? '');
    setFormBudget(item?.budget != null ? String(item.budget) : '');
    setFormLink(item?.link ?? '');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setFormName(''); setFormQty(''); setFormAisle('');
    setFormForWhom(''); setFormDeadline(''); setFormBudget(''); setFormLink('');
  }

  function fmtDeadline(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const tabItems = useMemo(() => items.filter(i => i.category === tab), [items, tab]);
  const groceriesCheckedCount = useMemo(() => items.filter(i => i.category === 'groceries' && i.checked).length, [items]);
  const giftsTotal = useMemo(() => items.filter(i => i.category === 'gift' && !i.checked && i.budget).reduce((s, i) => s + i.budget, 0), [items]);

  // Group groceries by aisle
  const groupedGroceries = useMemo(() => {
    if (tab !== 'groceries') return null;
    const pending = tabItems.filter(i => !i.checked);
    const checked = tabItems.filter(i => i.checked);
    const groups = {};
    pending.forEach(item => {
      const key = item.aisle || (language === 'fr' ? 'Autre' : 'Other');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return { groups, checked };
  }, [tabItems, tab, language]);

  const pendingGifts = tabItems.filter(i => !i.checked).length;
  const pendingGroceries = tabItems.filter(i => !i.checked).length;

  const aisles = language === 'fr' ? AISLES_FR : AISLES_EN;

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.hLeft}>
            <button onClick={onHome} style={s.iconBtn}>🏠</button>
            <span style={s.hIcon}>🛍️</span>
            <span style={s.hTitle}>{t('Shopping', 'Shopping')}</span>
          </div>
          <div style={s.hRight}>
            <button onClick={toggleLanguage} style={s.iconBtn}>{language === 'fr' ? 'EN 🇬🇧' : 'FR 🇫🇷'}</button>
            <button onClick={signOut} style={s.iconBtn}>🚪</button>
          </div>
        </header>

        {/* Tabs */}
        <div style={s.tabs}>
          <button onClick={() => setTab('groceries')} style={{ ...s.tab, ...(tab === 'groceries' ? s.tabActive : {}) }}>
            🛒 {t('Courses', 'Grocery')}
            {pendingGroceries > 0 && <span style={s.tabBadge}>{pendingGroceries}</span>}
          </button>
          <button onClick={() => setTab('gift')} style={{ ...s.tab, ...(tab === 'gift' ? s.tabActive : {}) }}>
            🎁 {t('Cadeaux', 'Gifts')}
            {pendingGifts > 0 && <span style={s.tabBadge}>{pendingGifts}</span>}
          </button>
        </div>

        {/* Summary bars */}
        {tab === 'groceries' && groceriesCheckedCount > 0 && (
          <div style={s.summaryBar}>
            <span style={s.summaryText}>
              ✅ {groceriesCheckedCount} {t('article(s) coché(s)', 'item(s) checked')}
            </span>
            <button onClick={clearChecked} style={s.clearBtn}>
              🗑️ {t('Effacer', 'Clear')}
            </button>
          </div>
        )}
        {tab === 'gift' && giftsTotal > 0 && (
          <div style={s.summaryBar}>
            <span style={s.summaryText}>{t('Budget cadeaux estimé', 'Estimated gift budget')}</span>
            <span style={{ ...s.summaryText, fontWeight: '700', color: ACCENT }}>{fmtEur(giftsTotal)}</span>
          </div>
        )}

        {/* List */}
        <div style={s.list}>
          {loading ? (
            <p style={s.empty}>{t('Chargement…', 'Loading…')}</p>
          ) : tabItems.length === 0 ? (
            <div style={s.emptyCard}>
              <p style={s.emptyIcon}>{tab === 'groceries' ? '🛒' : '🎁'}</p>
              <p style={s.emptyText}>
                {tab === 'groceries'
                  ? t('Liste vide — ajoutez des articles', 'Empty list — add items')
                  : t('Aucun cadeau prévu', 'No gifts planned')}
              </p>
            </div>
          ) : tab === 'groceries' ? (
            // Grouped by aisle
            <>
              {Object.entries(groupedGroceries.groups).map(([aisle, aisleItems]) => (
                <div key={aisle}>
                  <p style={s.aisleHeader}>{aisle}</p>
                  {aisleItems.map(item => (
                    <GroceryRow key={item.id} item={item} onToggle={toggleChecked} onEdit={openForm} onDel={del} />
                  ))}
                </div>
              ))}
              {groupedGroceries.checked.length > 0 && (
                <div>
                  <p style={{ ...s.aisleHeader, color: '#B2BEC3' }}>✅ {t('Achetés', 'Bought')}</p>
                  {groupedGroceries.checked.map(item => (
                    <GroceryRow key={item.id} item={item} onToggle={toggleChecked} onEdit={openForm} onDel={del} />
                  ))}
                </div>
              )}
            </>
          ) : (
            // Gift list
            tabItems.map(item => {
              const days = daysUntil(item.deadline);
              const urgency = days === null ? 'none' : days < 0 ? 'overdue' : days <= 7 ? 'soon' : 'ok';
              return (
                <div key={item.id} style={{ ...s.giftRow, opacity: item.checked ? 0.55 : 1 }}>
                  <button onClick={() => toggleChecked(item)} style={s.check}>
                    {item.checked ? '✅' : '🎁'}
                  </button>
                  <div style={s.giftContent}>
                    <div style={s.giftNameRow}>
                      <span style={{ ...s.name, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
                      {item.for_whom && <span style={s.forWhomBadge}>👤 {item.for_whom}</span>}
                    </div>
                    <div style={s.meta}>
                      {item.deadline && (
                        <span style={{ fontSize: '12px', color: urgency === 'overdue' ? '#E74C3C' : urgency === 'soon' ? '#E67E22' : '#636E72' }}>
                          {urgency === 'overdue' ? '⚠️' : urgency === 'soon' ? '⏰' : '📅'} {fmtDeadline(item.deadline)}
                          {days !== null && days >= 0 && ` (${days}j)`}
                        </span>
                      )}
                      {item.budget && (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#2D3436' }}>💶 {fmtEur(item.budget)}</span>
                      )}
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" style={s.link} onClick={e => e.stopPropagation()}>
                          🔗 {t('Lien', 'Link')}
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={s.actions}>
                    <button onClick={() => openForm(item)} style={s.btn}>✏️</button>
                    <button onClick={() => del(item.id)} style={s.btn}>🗑️</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FAB */}
        <button onClick={() => openForm()} style={s.fab}>
          <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
        </button>

        {/* Form modal */}
        {showForm && (
          <div style={s.overlay} onClick={closeForm}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <div style={s.mHeader}>
                <h2 style={s.mTitle}>
                  {editingItem
                    ? t('Modifier', 'Edit')
                    : tab === 'groceries' ? t('Ajouter un article', 'Add item') : t('Ajouter un cadeau', 'Add gift')}
                </h2>
                <button onClick={closeForm} style={s.closeBtn}>✕</button>
              </div>

              <div style={s.mForm}>
                {/* Name */}
                <div style={s.field}>
                  <label style={s.label}>{tab === 'groceries' ? t('Article', 'Item') : t('Cadeau / idée', 'Gift / idea')} *</label>
                  <input autoFocus type="text" value={formName} onChange={e => setFormName(e.target.value)}
                    placeholder={tab === 'groceries' ? t('Ex: Lait, pain…', 'Ex: Milk, bread…') : t('Ex: AirPods, livre…', 'Ex: AirPods, book…')}
                    style={s.input} />
                </div>

                {tab === 'groceries' ? (
                  <>
                    <div style={s.row2}>
                      <div style={{ ...s.field, flex: 1 }}>
                        <label style={s.label}>{t('Quantité (optionnel)', 'Quantity (optional)')}</label>
                        <input type="text" value={formQty} onChange={e => setFormQty(e.target.value)}
                          placeholder="Ex: 2, 500g…" style={s.input} />
                      </div>
                      <div style={{ ...s.field, flex: 1 }}>
                        <label style={s.label}>{t('Rayon (optionnel)', 'Aisle (optional)')}</label>
                        <select value={formAisle} onChange={e => setFormAisle(e.target.value)} style={s.input}>
                          <option value="">—</option>
                          {aisles.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={s.field}>
                      <label style={s.label}>{t('Pour qui (optionnel)', 'For whom (optional)')}</label>
                      <input type="text" value={formForWhom} onChange={e => setFormForWhom(e.target.value)}
                        placeholder={t('Ex: Ricky, Emma…', 'Ex: Ricky, Emma…')} style={s.input} />
                    </div>
                    <div style={s.row2}>
                      <div style={{ ...s.field, flex: 1 }}>
                        <label style={s.label}>{t('Date limite (optionnel)', 'Deadline (optional)')}</label>
                        <input type="date" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} style={s.input} />
                      </div>
                      <div style={{ ...s.field, flex: 1 }}>
                        <label style={s.label}>{t('Budget max (optionnel)', 'Max budget (optional)')}</label>
                        <input type="number" min="0" step="5" value={formBudget}
                          onChange={e => setFormBudget(e.target.value)} placeholder="€" style={s.input} />
                      </div>
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>{t('Lien produit (optionnel)', 'Product link (optional)')}</label>
                      <input type="url" value={formLink} onChange={e => setFormLink(e.target.value)}
                        placeholder="https://amazon.fr/…" style={s.input} />
                    </div>
                  </>
                )}
              </div>

              <div style={s.mBtns}>
                <button onClick={closeForm} style={s.cancelBtn}>{t('Annuler', 'Cancel')}</button>
                <button onClick={save} disabled={formSaving || !formName.trim()}
                  style={{ ...s.saveBtn, opacity: formSaving || !formName.trim() ? 0.5 : 1 }}>
                  {formSaving ? '...' : t('Enregistrer', 'Save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroceryRow({ item, onToggle, onEdit, onDel }) {
  return (
    <div style={{ ...s.groceryRow, opacity: item.checked ? 0.5 : 1 }}>
      <button onClick={() => onToggle(item)} style={s.check}>
        {item.checked ? '☑️' : '⬜'}
      </button>
      <div style={s.groceryContent}>
        <span style={{ ...s.name, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
        {item.quantity && <span style={s.qty}>{item.quantity}</span>}
      </div>
      <div style={s.actions}>
        <button onClick={() => onEdit(item)} style={s.btn}>✏️</button>
        <button onClick={() => onDel(item.id)} style={s.btn}>🗑️</button>
      </div>
    </div>
  );
}

const s = {
  wrapper: { width: '100%', minHeight: '100vh', backgroundColor: '#FFF5F5', display: 'flex', justifyContent: 'center', fontFamily: FONT },
  container: { width: '100%', maxWidth: '600px', minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FFF5F5' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'white', borderBottom: '1px solid #FADADD', position: 'sticky', top: 0, zIndex: 10 },
  hLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  hRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  hIcon: { fontSize: '22px' },
  hTitle: { fontSize: '18px', fontWeight: '700', color: '#2D3436' },
  iconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', border: '1px solid #E1E8ED', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: FONT },
  tabs: { display: 'flex', backgroundColor: 'white', borderBottom: '1px solid #FADADD' },
  tab: { flex: 1, padding: '14px 8px', border: 'none', background: 'none', fontSize: '14px', fontWeight: '600', color: '#636E72', cursor: 'pointer', borderBottom: '3px solid transparent', fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  tabActive: { color: ACCENT, borderBottomColor: ACCENT },
  tabBadge: { backgroundColor: ACCENT, color: 'white', fontSize: '11px', fontWeight: '700', minWidth: '18px', height: '18px', borderRadius: '9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' },
  summaryBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FDECEA', padding: '10px 16px', borderBottom: '1px solid #FADADD' },
  summaryText: { fontSize: '13px', color: '#922B21' },
  clearBtn: { fontSize: '13px', padding: '4px 12px', borderRadius: '8px', border: '1px solid #E74C3C', backgroundColor: 'white', color: '#E74C3C', cursor: 'pointer', fontFamily: FONT },
  list: { flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', paddingBottom: '100px' },
  emptyCard: { backgroundColor: 'white', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', marginTop: '8px' },
  emptyIcon: { fontSize: '48px', margin: '0 0 12px' },
  emptyText: { color: '#636E72', fontSize: '15px', margin: 0 },
  empty: { textAlign: 'center', color: '#636E72', padding: '40px 0' },
  aisleHeader: { fontSize: '11px', fontWeight: '700', color: '#B2BEC3', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '12px 0 4px 4px' },
  groceryRow: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', borderRadius: '10px', padding: '10px 12px', marginBottom: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  groceryContent: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
  giftRow: { display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: 'white', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
  giftContent: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  giftNameRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  forWhomBadge: { fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#FFF0F0', color: ACCENT, whiteSpace: 'nowrap' },
  meta: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
  check: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', flexShrink: 0, padding: 0, lineHeight: 1, paddingTop: '1px' },
  name: { fontSize: '15px', fontWeight: '500', color: '#2D3436' },
  qty: { fontSize: '12px', color: '#636E72', backgroundColor: '#F5F7FA', padding: '1px 6px', borderRadius: '6px' },
  link: { fontSize: '12px', color: '#3498DB', textDecoration: 'none', fontWeight: '500' },
  actions: { display: 'flex', gap: '4px', flexShrink: 0 },
  btn: { width: '30px', height: '30px', border: '1px solid #E1E8ED', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'fixed', bottom: '24px', right: 'max(20px, calc(50% - 280px))', width: '56px', height: '56px', borderRadius: '28px', backgroundColor: ACCENT, color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(231,76,60,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 200 },
  modal: { backgroundColor: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '500px', paddingBottom: '24px', maxHeight: '90vh', overflowY: 'auto' },
  mHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' },
  mTitle: { margin: 0, fontSize: '18px', fontWeight: '600', color: '#2D3436' },
  closeBtn: { width: '32px', height: '32px', border: 'none', backgroundColor: '#F5F7FA', borderRadius: '16px', cursor: 'pointer', color: '#636E72', fontSize: '14px' },
  mForm: { padding: '16px 20px 0' },
  field: { marginBottom: '14px' },
  row2: { display: 'flex', gap: '12px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '500', color: '#636E72', marginBottom: '6px' },
  input: { width: '100%', padding: '12px 14px', border: '1px solid #E1E8ED', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: FONT },
  mBtns: { display: 'flex', gap: '12px', padding: '8px 20px 0' },
  cancelBtn: { flex: 1, padding: '14px', border: '1px solid #E1E8ED', backgroundColor: 'white', borderRadius: '10px', fontSize: '15px', cursor: 'pointer', color: '#636E72', fontFamily: FONT },
  saveBtn: { flex: 1, padding: '14px', border: 'none', backgroundColor: ACCENT, borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', color: 'white', fontFamily: FONT },
};
