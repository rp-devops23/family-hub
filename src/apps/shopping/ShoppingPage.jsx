import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import GiftPlanner from './GiftPlanner';

// ============================================================================
// SHOPPING PAGE — À acheter (vêtements/accessoires) & Cadeaux (planificateur : GiftPlanner)
// ============================================================================

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const ACCENT = '#E74C3C';

const ITEM_TYPES_FR = ['T-shirt', 'Haut', 'Pull', 'Sweat', 'Veste', 'Manteau', 'Pantalon', 'Jean', 'Short', 'Costume', 'Robe', 'Jupe', 'Chaussures', 'Baskets', 'Bottes', 'Accessoire', 'Sous-vêtements', 'Sport', 'Autre'];
const ITEM_TYPES_EN = ['T-shirt', 'Top', 'Sweater', 'Sweatshirt', 'Jacket', 'Coat', 'Pants', 'Jeans', 'Shorts', 'Suit', 'Dress', 'Skirt', 'Shoes', 'Sneakers', 'Boots', 'Accessory', 'Underwear', 'Sport', 'Other'];


export default function ShoppingPage({ onHome }) {
  const { user, language, toggleLanguage, signOut, t } = useAuth();
  const [tab, setTab] = useState('clothing');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Clothing form
  const [formName, setFormName]           = useState('');
  const [formItemType, setFormItemType]   = useState('');
  const [formForWhom, setFormForWhom]     = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSaving, setFormSaving]       = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('personal_shopping_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'clothing')
      .order('checked', { ascending: true })
      .order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  async function toggleChecked(item) {
    const { data } = await supabase
      .from('personal_shopping_items')
      .update({ checked: !item.checked, updated_at: new Date().toISOString() })
      .eq('id', item.id).select().single();
    if (data) setItems(prev => prev.map(i => i.id === item.id ? data : i));
  }

  async function save() {
    if (!formName.trim()) return;
    setFormSaving(true);
    const payload = {
      name: formName.trim(), category: 'clothing', updated_at: new Date().toISOString(),
      item_type: formItemType || null, for_whom: formForWhom.trim() || null, description: formDescription.trim() || null,
    };

    if (editingItem) {
      const { data } = await supabase.from('personal_shopping_items').update(payload).eq('id', editingItem.id).select().single();
      if (data) setItems(prev => prev.map(i => i.id === editingItem.id ? data : i));
    } else {
      const { data } = await supabase.from('personal_shopping_items').insert({ ...payload, user_id: user.id }).select().single();
      if (data) setItems(prev => [data, ...prev]);
    }
    setFormSaving(false);
    closeForm();
  }

  async function del(id) {
    await supabase.from('personal_shopping_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function openForm(item = null) {
    setEditingItem(item);
    setFormName(item?.name ?? '');
    setFormItemType(item?.item_type ?? '');
    setFormForWhom(item?.for_whom ?? '');
    setFormDescription(item?.description ?? '');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setFormName(''); setFormItemType(''); setFormForWhom(''); setFormDescription('');
  }

  const pendingCount = items.filter(i => !i.checked).length;

  // Group clothing by item_type
  const groupedClothing = useMemo(() => {
    const pending = items.filter(i => !i.checked);
    const checked = items.filter(i => i.checked);
    const groups = {};
    pending.forEach(item => {
      const key = item.item_type || (language === 'fr' ? 'Autre' : 'Other');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return { groups, checked };
  }, [items, language]);

  const itemTypes = language === 'fr' ? ITEM_TYPES_FR : ITEM_TYPES_EN;

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
          <button onClick={() => setTab('clothing')} style={{ ...s.tab, ...(tab === 'clothing' ? s.tabActive : {}) }}>
            👕 {t('À acheter', 'To buy')}
            {pendingCount > 0 && <span style={s.tabBadge}>{pendingCount}</span>}
          </button>
          <button onClick={() => setTab('gift')} style={{ ...s.tab, ...(tab === 'gift' ? s.tabActive : {}) }}>
            🎁 {t('Cadeaux', 'Gifts')}
          </button>
        </div>

        {tab === 'gift' ? (
          <GiftPlanner user={user} t={t} language={language} />
        ) : (
          <>
            {/* List */}
            <div style={s.list}>
              {loading ? (
                <p style={s.empty}>{t('Chargement…', 'Loading…')}</p>
              ) : items.length === 0 ? (
                <div style={s.emptyCard}>
                  <p style={s.emptyIcon}>👕</p>
                  <p style={s.emptyText}>{t('Aucun article à acheter', 'Nothing to buy')}</p>
                </div>
              ) : (
                <>
                  {Object.entries(groupedClothing.groups).map(([type, typeItems]) => (
                    <div key={type}>
                      <p style={s.groupHeader}>{type}</p>
                      {typeItems.map(item => <ClothingRow key={item.id} item={item} onToggle={toggleChecked} onEdit={openForm} onDel={del} />)}
                    </div>
                  ))}
                  {groupedClothing.checked.length > 0 && (
                    <div>
                      <p style={{ ...s.groupHeader, color: '#B2BEC3' }}>✅ {t('Achetés', 'Bought')}</p>
                      {groupedClothing.checked.map(item => <ClothingRow key={item.id} item={item} onToggle={toggleChecked} onEdit={openForm} onDel={del} />)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* FAB */}
            <button onClick={() => openForm()} style={s.fab}>
              <span style={{ fontSize: '24px', lineHeight: 1 }}>+</span>
            </button>
          </>
        )}

        {/* Form modal */}
        {tab === 'clothing' && showForm && (
          <div style={s.overlay} onClick={closeForm}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <div style={s.mHeader}>
                <h2 style={s.mTitle}>
                  {editingItem ? t('Modifier', 'Edit') : t('Ajouter un article', 'Add item')}
                </h2>
                <button onClick={closeForm} style={s.closeBtn}>✕</button>
              </div>

              <div style={s.mForm}>
                <div style={s.field}>
                  <label style={s.label}>{t('Nom', 'Name')} *</label>
                  <input autoFocus type="text" value={formName} onChange={e => setFormName(e.target.value)}
                    placeholder={t('Ex: Pull beige, Veste en cuir…', 'Ex: Beige sweater, Leather jacket…')}
                    style={s.input} />
                </div>

                  <>
                    <div style={s.row2}>
                      <div style={{ ...s.field, flex: 1 }}>
                        <label style={s.label}>{t('Type', 'Type')}</label>
                        <select value={formItemType} onChange={e => setFormItemType(e.target.value)} style={s.input}>
                          <option value="">—</option>
                          {itemTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                        </select>
                      </div>
                      <div style={{ ...s.field, flex: 1 }}>
                        <label style={s.label}>{t('Pour qui', 'For whom')}</label>
                        <input type="text" value={formForWhom} onChange={e => setFormForWhom(e.target.value)}
                          placeholder={t('Ex: Ricky, Emma…', 'Ex: Ricky, Emma…')} style={s.input} />
                      </div>
                    </div>
                    <div style={s.field}>
                      <label style={s.label}>{t('Description — pointure, couleur, marque… (optionnel)', 'Description — size, color, brand… (optional)')}</label>
                      <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)}
                        placeholder={t('Ex: Taille M, bleu marine, Nike', 'Ex: Size M, navy blue, Nike')} style={s.input} />
                    </div>
                  </>
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

function ClothingRow({ item, onToggle, onEdit, onDel }) {
  return (
    <div style={{ ...s.clothingRow, opacity: item.checked ? 0.5 : 1 }}>
      <button onClick={() => onToggle(item)} style={s.check}>
        {item.checked ? '✅' : '⬜'}
      </button>
      <div style={s.clothingContent}>
        <div style={s.nameRow}>
          <span style={{ ...s.name, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
          {item.for_whom && <span style={s.forWhomBadge}>👤 {item.for_whom}</span>}
        </div>
        {item.description && <span style={{ fontSize: '12px', color: '#636E72', fontStyle: 'italic' }}>{item.description}</span>}
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
  list: { flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', paddingBottom: '100px' },
  emptyCard: { backgroundColor: 'white', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', marginTop: '8px' },
  emptyIcon: { fontSize: '48px', margin: '0 0 12px' },
  emptyText: { color: '#636E72', fontSize: '15px', margin: 0 },
  empty: { textAlign: 'center', color: '#636E72', padding: '40px 0' },
  groupHeader: { fontSize: '11px', fontWeight: '700', color: '#636E72', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '14px 0 4px 2px' },
  clothingRow: { display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: 'white', borderRadius: '10px', padding: '11px 12px', marginBottom: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  clothingContent: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  name: { fontSize: '15px', fontWeight: '500', color: '#2D3436' },
  forWhomBadge: { fontSize: '11px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px', backgroundColor: '#FFF0F0', color: ACCENT, whiteSpace: 'nowrap' },
  check: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', flexShrink: 0, padding: 0, lineHeight: 1, paddingTop: '2px' },
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
