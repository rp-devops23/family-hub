import { useState } from 'react';
import { useApp } from '../context/AppContext';
import AccountForm from '../components/settings/AccountForm';
import CategoryForm from '../components/settings/CategoryForm';
import SubcategoryForm from '../components/settings/SubcategoryForm';
import ImportPage from './ImportPage';

// ============================================================================
// SETTINGS PAGE - Manage accounts, categories, profile
// ============================================================================

// Map old lucide icon names to emojis
const ICON_MAP = {
  'Building': '🏠',
  'Home': '🏠',
  'ShoppingCart': '🛒',
  'Car': '🚗',
  'Tv': '📺',
  'ShoppingBag': '🛍️',
  'Users': '👨‍👩‍👧',
  'PiggyBank': '💰',
  'Gift': '🎁',
  'Heart': '❤️',
  'Gamepad': '🎮',
  'Shirt': '👕',
  'Plane': '✈️',
  'Leaf': '🌱',
  'Mail': '📬',
  'FileText': '📄',
  'HelpCircle': '❓',
  'Activity': '⚽',
};

// Get emoji from icon field (handles both old names and emojis)
const getIconEmoji = (icon) => {
  if (!icon) return '📁';
  // If it's already an emoji (starts with emoji character), return as-is
  if (icon.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u)) {
    return icon;
  }
  // Otherwise look up in map
  return ICON_MAP[icon] || '📁';
};

export default function SettingsPage() {
  const { 
    t, language, user, accounts, categories, subcategories,
    deleteAccount, deleteCategory, deleteSubcategory
  } = useApp();

  // Form modals
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  
  // Editing items
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [subcategoryParentId, setSubcategoryParentId] = useState(null);
  
  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Expanded categories
  const [expandedCategories, setExpandedCategories] = useState({});

  // Toggle category expansion
  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Get subcategories for a category
  const getSubcategoriesForCategory = (catId) => {
    return subcategories
      .filter(s => s.category_id === catId)
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  // Handle edit
  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setShowAccountForm(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleEditSubcategory = (subcategory) => {
    setEditingSubcategory(subcategory);
    setShowSubcategoryForm(true);
  };

  const handleAddSubcategory = (categoryId) => {
    setSubcategoryParentId(categoryId);
    setEditingSubcategory(null);
    setShowSubcategoryForm(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirmDelete) return;
    
    const { type, id } = confirmDelete;
    
    if (type === 'account') {
      await deleteAccount(id);
    } else if (type === 'category') {
      await deleteCategory(id);
    } else if (type === 'subcategory') {
      await deleteSubcategory(id);
    }
    
    setConfirmDelete(null);
  };

  // Close modals
  const closeAccountForm = () => {
    setShowAccountForm(false);
    setEditingAccount(null);
  };

  const closeCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  const closeSubcategoryForm = () => {
    setShowSubcategoryForm(false);
    setEditingSubcategory(null);
    setSubcategoryParentId(null);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t('Paramètres', 'Settings')}</h1>

      {/* Profile Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>👤 {t('Profil', 'Profile')}</h2>
        <div style={styles.card}>
          <div style={styles.profileRow}>
            <span style={styles.profileLabel}>Email</span>
            <span style={styles.profileValue}>{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Accounts Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>🏦 {t('Comptes', 'Accounts')}</h2>
          <button 
            onClick={() => setShowAccountForm(true)} 
            style={styles.addBtn}
          >
            + {t('Ajouter', 'Add')}
          </button>
        </div>
        
        <div style={styles.list}>
          {accounts.length === 0 ? (
            <p style={styles.emptyText}>{t('Aucun compte', 'No accounts')}</p>
          ) : (
            accounts.map(account => (
              <div key={account.id} style={styles.listItem}>
                <div style={styles.listItemLeft}>
                  <span style={{
                    ...styles.accountDot,
                    backgroundColor: account.color || '#00A3E0'
                  }} />
                  <div>
                    <span style={styles.listItemName}>{account.name}</span>
                    {account.bank && (
                      <span style={styles.listItemMeta}>{account.bank}</span>
                    )}
                  </div>
                  {account.is_default && (
                    <span style={styles.defaultBadge}>{t('Défaut', 'Default')}</span>
                  )}
                </div>
                <div style={styles.listItemActions}>
                  <button 
                    onClick={() => handleEditAccount(account)}
                    style={styles.actionBtn}
                  >
                    ✎
                  </button>
                  <button 
                    onClick={() => setConfirmDelete({ type: 'account', id: account.id, name: account.name })}
                    style={{...styles.actionBtn, color: '#E74C3C'}}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Categories Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>🏷️ {t('Catégories', 'Categories')}</h2>
          <button 
            onClick={() => setShowCategoryForm(true)} 
            style={styles.addBtn}
          >
            + {t('Ajouter', 'Add')}
          </button>
        </div>
        
        <div style={styles.list}>
          {categories.length === 0 ? (
            <p style={styles.emptyText}>{t('Aucune catégorie', 'No categories')}</p>
          ) : (
            categories.map(category => {
              const subs = getSubcategoriesForCategory(category.id);
              const isExpanded = expandedCategories[category.id];
              
              return (
                <div key={category.id} style={styles.categoryGroup}>
                  <div style={styles.listItem}>
                    <div 
                      style={styles.listItemLeft}
                      onClick={() => toggleCategory(category.id)}
                    >
                      <span style={{
                        ...styles.categoryIcon,
                        backgroundColor: category.color || '#00A3E0'
                      }}>
                        {getIconEmoji(category.icon)}
                      </span>
                      <div style={styles.categoryInfo}>
                        <span style={styles.listItemName}>
                          {language === 'fr' ? category.name_fr : category.name_en}
                        </span>
                        <span style={styles.listItemMeta}>
                          {subs.length} {t('sous-catégories', 'subcategories')}
                        </span>
                      </div>
                      <span style={styles.expandIcon}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                    <div style={styles.listItemActions}>
                      <button 
                        onClick={() => handleAddSubcategory(category.id)}
                        style={styles.actionBtn}
                        title={t('Ajouter sous-catégorie', 'Add subcategory')}
                      >
                        +
                      </button>
                      <button 
                        onClick={() => handleEditCategory(category)}
                        style={styles.actionBtn}
                      >
                        ✎
                      </button>
                      <button 
                        onClick={() => setConfirmDelete({ 
                          type: 'category', 
                          id: category.id, 
                          name: language === 'fr' ? category.name_fr : category.name_en 
                        })}
                        style={{...styles.actionBtn, color: '#E74C3C'}}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  {/* Subcategories */}
                  {isExpanded && subs.length > 0 && (
                    <div style={styles.subcategoryList}>
                      {subs.map(sub => (
                        <div key={sub.id} style={styles.subcategoryItem}>
                          <span style={styles.subcategoryName}>
                            {language === 'fr' ? sub.name_fr : sub.name_en}
                          </span>
                          <div style={styles.listItemActions}>
                            <button 
                              onClick={() => handleEditSubcategory(sub)}
                              style={styles.actionBtnSmall}
                            >
                              ✎
                            </button>
                            <button 
                              onClick={() => setConfirmDelete({ 
                                type: 'subcategory', 
                                id: sub.id, 
                                name: language === 'fr' ? sub.name_fr : sub.name_en 
                              })}
                              style={{...styles.actionBtnSmall, color: '#E74C3C'}}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Import Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📥 {t('Importer', 'Import')}</h2>
        <div style={styles.card}>
          <p style={styles.importText}>
            {t('Importez vos transactions depuis un fichier CSV ou Excel', 
               'Import your transactions from a CSV or Excel file')}
          </p>
          <button onClick={() => setShowImport(true)} style={styles.importBtn}>
            📂 {t('Importer des transactions', 'Import transactions')}
          </button>
        </div>
      </div>

      {/* App Info */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>ℹ️ {t('À propos', 'About')}</h2>
        <div style={styles.card}>
          <div style={styles.aboutRow}>
            <span style={styles.aboutLabel}>MyFinance</span>
            <span style={styles.aboutValue}>v1.0</span>
          </div>
          <p style={styles.aboutText}>
            {t(
              'Application de gestion des finances personnelles',
              'Personal finance management app'
            )}
          </p>
        </div>
      </div>

      {/* Account Form Modal */}
      {showAccountForm && (
        <AccountForm
          account={editingAccount}
          onClose={closeAccountForm}
          onSave={() => {}}
        />
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onClose={closeCategoryForm}
          onSave={() => {}}
        />
      )}

      {/* Subcategory Form Modal */}
      {showSubcategoryForm && (
        <SubcategoryForm
          subcategory={editingSubcategory}
          categoryId={subcategoryParentId}
          onClose={closeSubcategoryForm}
          onSave={() => {}}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <p style={styles.confirmText}>
              {t('Supprimer', 'Delete')} "{confirmDelete.name}"?
            </p>
            {confirmDelete.type === 'category' && (
              <p style={styles.confirmWarning}>
                ⚠️ {t(
                  'Toutes les sous-catégories seront aussi supprimées',
                  'All subcategories will also be deleted'
                )}
              </p>
            )}
            <div style={styles.confirmButtons}>
              <button 
                onClick={() => setConfirmDelete(null)} 
                style={styles.confirmCancel}
              >
                {t('Annuler', 'Cancel')}
              </button>
              <button 
                onClick={handleDelete} 
                style={styles.confirmDelete}
              >
                {t('Supprimer', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Page Modal */}
      {showImport && (
        <ImportPage onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px 16px 100px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: '20px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3436',
    margin: 0,
  },
  addBtn: {
    padding: '6px 14px',
    backgroundColor: '#00A3E0',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  profileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLabel: {
    fontSize: '14px',
    color: '#636E72',
  },
  profileValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#2D3436',
  },
  list: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #F0F0F0',
  },
  listItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    cursor: 'pointer',
    minWidth: 0,
  },
  accountDot: {
    width: '12px',
    height: '12px',
    borderRadius: '4px',
    flexShrink: 0,
  },
  categoryIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  categoryInfo: {
    flex: 1,
    minWidth: 0,
  },
  listItemName: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '500',
    color: '#2D3436',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listItemMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#636E72',
    marginTop: '2px',
  },
  defaultBadge: {
    padding: '2px 8px',
    backgroundColor: '#E8F7FC',
    color: '#00A3E0',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
    flexShrink: 0,
  },
  expandIcon: {
    fontSize: '10px',
    color: '#636E72',
    flexShrink: 0,
  },
  listItemActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  actionBtn: {
    width: '32px',
    height: '32px',
    border: '1px solid #E1E8ED',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    color: '#636E72',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSmall: {
    width: '28px',
    height: '28px',
    border: '1px solid #E1E8ED',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#636E72',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGroup: {
    borderBottom: '1px solid #F0F0F0',
  },
  subcategoryList: {
    backgroundColor: '#F9FAFB',
    padding: '8px 16px 8px 60px',
  },
  subcategoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #E1E8ED',
  },
  subcategoryName: {
    fontSize: '14px',
    color: '#2D3436',
  },
  emptyText: {
    color: '#636E72',
    textAlign: 'center',
    padding: '20px',
    fontStyle: 'italic',
  },
  aboutRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  aboutLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3436',
  },
  aboutValue: {
    fontSize: '14px',
    color: '#636E72',
  },
  aboutText: {
    fontSize: '13px',
    color: '#636E72',
    margin: 0,
  },
  importText: {
    fontSize: '14px',
    color: '#636E72',
    marginBottom: '16px',
  },
  importBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    backgroundColor: '#00A3E0',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    width: '300px',
    textAlign: 'center',
  },
  confirmText: {
    fontSize: '16px',
    color: '#2D3436',
    marginBottom: '12px',
  },
  confirmWarning: {
    fontSize: '13px',
    color: '#E74C3C',
    backgroundColor: '#FFF5F5',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
  },
  confirmCancel: {
    flex: 1,
    padding: '12px',
    border: '1px solid #E1E8ED',
    backgroundColor: 'white',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#636E72',
  },
  confirmDelete: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: '#E74C3C',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
  },
};