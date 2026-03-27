import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

// ============================================================================
// FINANCE APP CONTEXT - Finance data & operations
// ============================================================================

const AppContext = createContext({});

const DEFAULT_ACCOUNTS = [
  { name: 'Ricky', bank: 'CBC', color: '#00A3E0', is_default: true, sort_order: 1 },
  { name: 'Commun', bank: 'CBC', color: '#E67E22', is_default: false, sort_order: 2 },
];

const DEFAULT_CATEGORIES = [
  { name_fr: 'Logement', name_en: 'Housing', icon: 'Building', color: '#003D5B', sort_order: 1,
    subcategories: [
      { name_fr: 'Loyer/Charges', name_en: 'Rent/Charges', sort_order: 1 },
      { name_fr: 'Énergie', name_en: 'Energy', sort_order: 2 },
      { name_fr: 'Assurance habitation', name_en: 'Home Insurance', sort_order: 3 },
      { name_fr: 'Meubles', name_en: 'Furniture', sort_order: 4 },
      { name_fr: 'Électroménager', name_en: 'Appliances', sort_order: 5 },
      { name_fr: 'Décoration', name_en: 'Decoration', sort_order: 6 },
      { name_fr: 'Outils & matériaux', name_en: 'Tools & Materials', sort_order: 7 },
    ]
  },
  { name_fr: 'Alimentation', name_en: 'Food', icon: 'ShoppingCart', color: '#00A3E0', sort_order: 2,
    subcategories: [
      { name_fr: 'Courses', name_en: 'Groceries', sort_order: 1 },
      { name_fr: 'Restaurant', name_en: 'Restaurant', sort_order: 2 },
      { name_fr: 'Boulangerie/Snacks', name_en: 'Bakery/Snacks', sort_order: 3 },
    ]
  },
  { name_fr: 'Transport', name_en: 'Transport', icon: 'Car', color: '#E67E22', sort_order: 3,
    subcategories: [
      { name_fr: 'Carburant/Électricité voiture', name_en: 'Fuel/Car Electricity', sort_order: 1 },
      { name_fr: 'Assurance auto', name_en: 'Car Insurance', sort_order: 2 },
      { name_fr: 'Entretien & Parking', name_en: 'Maintenance & Parking', sort_order: 3 },
      { name_fr: 'Location véhicule', name_en: 'Vehicle Rental', sort_order: 4 },
      { name_fr: 'Transport en commun', name_en: 'Public Transport', sort_order: 5 },
    ]
  },
  { name_fr: 'Abonnements & Services', name_en: 'Subscriptions & Services', icon: 'Tv', color: '#00B894', sort_order: 4,
    subcategories: [
      { name_fr: 'Streaming', name_en: 'Streaming', sort_order: 1 },
      { name_fr: 'Stockage en ligne', name_en: 'Cloud Storage', sort_order: 2 },
      { name_fr: 'Internet & Mobile', name_en: 'Internet & Mobile', sort_order: 3 },
      { name_fr: 'Sécurité', name_en: 'Security', sort_order: 4 },
      { name_fr: 'Logiciels', name_en: 'Software', sort_order: 5 },
      { name_fr: 'Autres abonnements', name_en: 'Other Subscriptions', sort_order: 6 },
    ]
  },
  { name_fr: 'Shopping & Commerces', name_en: 'Shopping & Retail', icon: 'ShoppingBag', color: '#9B59B6', sort_order: 5,
    subcategories: [
      { name_fr: 'Magasins', name_en: 'Stores', sort_order: 1 },
      { name_fr: 'Électronique & High-tech', name_en: 'Electronics & Tech', sort_order: 2 },
      { name_fr: 'Divers achats', name_en: 'Misc Purchases', sort_order: 3 },
    ]
  },
  { name_fr: 'Famille & Enfants', name_en: 'Family & Kids', icon: 'Users', color: '#FD79A8', sort_order: 6,
    subcategories: [
      { name_fr: 'Bébé', name_en: 'Baby', sort_order: 1 },
      { name_fr: 'Jouets', name_en: 'Toys', sort_order: 2 },
      { name_fr: 'Activités enfants', name_en: 'Kids Activities', sort_order: 3 },
      { name_fr: 'Garde/Crèche', name_en: 'Childcare/Daycare', sort_order: 4 },
    ]
  },
  { name_fr: 'Finance & Épargne', name_en: 'Finance & Savings', icon: 'PiggyBank', color: '#1ABC9C', sort_order: 7,
    subcategories: [
      { name_fr: 'Épargne pension', name_en: 'Pension Savings', sort_order: 1 },
      { name_fr: 'Épargne Leana', name_en: 'Leana Savings', sort_order: 2 },
      { name_fr: 'Assurance vie', name_en: 'Life Insurance', sort_order: 3 },
      { name_fr: 'Frais bancaires', name_en: 'Bank Fees', sort_order: 4 },
    ]
  },
  { name_fr: 'Cadeaux & Occasions', name_en: 'Gifts & Events', icon: 'Gift', color: '#E91E63', sort_order: 8,
    subcategories: [
      { name_fr: "Cadeaux d'anniversaire", name_en: 'Birthday Gifts', sort_order: 1 },
      { name_fr: 'Cadeaux de Noël', name_en: 'Christmas Gifts', sort_order: 2 },
      { name_fr: 'Fêtes', name_en: 'Celebrations', sort_order: 3 },
      { name_fr: 'Dons', name_en: 'Donations', sort_order: 4 },
    ]
  },
  { name_fr: 'Santé & Bien-être', name_en: 'Health & Wellness', icon: 'Heart', color: '#E74C3C', sort_order: 9,
    subcategories: [
      { name_fr: 'Mutuelle/Assurance santé', name_en: 'Health Insurance', sort_order: 1 },
      { name_fr: 'Soins médicaux', name_en: 'Medical Care', sort_order: 2 },
      { name_fr: 'Pharmacie', name_en: 'Pharmacy', sort_order: 3 },
      { name_fr: 'Coiffeur', name_en: 'Hairdresser', sort_order: 4 },
    ]
  },
  { name_fr: 'Sport', name_en: 'Sports', icon: 'Dumbbell', color: '#F39C12', sort_order: 10,
    subcategories: [
      { name_fr: 'Padel', name_en: 'Padel', sort_order: 1 },
      { name_fr: 'Abonnement salle', name_en: 'Gym Membership', sort_order: 2 },
      { name_fr: 'Équipement sportif', name_en: 'Sports Equipment', sort_order: 3 },
      { name_fr: 'Activités sportives', name_en: 'Sports Activities', sort_order: 4 },
    ]
  },
  { name_fr: 'Loisirs & Culture', name_en: 'Leisure & Culture', icon: 'Gamepad2', color: '#3498DB', sort_order: 11,
    subcategories: [
      { name_fr: 'Jeux vidéo', name_en: 'Video Games', sort_order: 1 },
      { name_fr: 'Jeux de société', name_en: 'Board Games', sort_order: 2 },
      { name_fr: 'Livres', name_en: 'Books', sort_order: 3 },
      { name_fr: 'Bibliothèque', name_en: 'Library', sort_order: 4 },
      { name_fr: 'Cinéma & Spectacles', name_en: 'Cinema & Shows', sort_order: 5 },
      { name_fr: 'Réalité virtuelle', name_en: 'Virtual Reality', sort_order: 6 },
      { name_fr: 'Formations', name_en: 'Training/Courses', sort_order: 7 },
    ]
  },
  { name_fr: 'Personnel', name_en: 'Personal', icon: 'User', color: '#8E44AD', sort_order: 12,
    subcategories: [
      { name_fr: 'Vêtements', name_en: 'Clothing', sort_order: 1 },
      { name_fr: 'Accessoires', name_en: 'Accessories', sort_order: 2 },
      { name_fr: 'Beauté/Cosmétiques', name_en: 'Beauty/Cosmetics', sort_order: 3 },
    ]
  },
  { name_fr: 'Vacances & Voyages', name_en: 'Travel & Holidays', icon: 'Plane', color: '#2ECC71', sort_order: 13,
    subcategories: [
      { name_fr: 'Hébergement', name_en: 'Accommodation', sort_order: 1 },
      { name_fr: 'Transport', name_en: 'Transport', sort_order: 2 },
      { name_fr: 'Activités', name_en: 'Activities', sort_order: 3 },
      { name_fr: 'Dépenses sur place', name_en: 'On-site Expenses', sort_order: 4 },
    ]
  },
  { name_fr: 'Jardin & Extérieur', name_en: 'Garden & Outdoor', icon: 'Flower2', color: '#27AE60', sort_order: 14,
    subcategories: [
      { name_fr: 'Plantes & jardinage', name_en: 'Plants & Gardening', sort_order: 1 },
    ]
  },
  { name_fr: 'Services Postaux', name_en: 'Postal Services', icon: 'Mail', color: '#95A5A6', sort_order: 15,
    subcategories: [
      { name_fr: 'Courrier & Colis', name_en: 'Mail & Parcels', sort_order: 1 },
    ]
  },
  { name_fr: 'Administratif & Légal', name_en: 'Admin & Legal', icon: 'FileText', color: '#34495E', sort_order: 16,
    subcategories: [
      { name_fr: 'Documents officiels', name_en: 'Official Documents', sort_order: 1 },
      { name_fr: 'Assurances diverses', name_en: 'Various Insurances', sort_order: 2 },
      { name_fr: 'Frais administratifs', name_en: 'Admin Fees', sort_order: 3 },
    ]
  },
  { name_fr: 'Divers', name_en: 'Other', icon: 'MoreHorizontal', color: '#BDC3C7', sort_order: 17,
    subcategories: [
      { name_fr: 'Non catégorisé', name_en: 'Uncategorized', sort_order: 1 },
    ]
  },
];

export function AppProvider({ children }) {
  const auth = useAuth();
  const { user } = auth;

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [recurringTemplates, setRecurringTemplates] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  useEffect(() => {
    if (user) {
      initializeData();
    } else {
      setAccounts([]);
      setCategories([]);
      setSubcategories([]);
      setTransactions([]);
      setBudgets([]);
      setRecurringTemplates([]);
    }
  }, [user]);

  const initializeData = async () => {
    setDataLoading(true);

    const { data: existingCats } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (!existingCats || existingCats.length === 0) {
      setSetupLoading(true);
      await createDefaultData();
      setSetupLoading(false);
    }

    await fetchAllData();
    setDataLoading(false);
  };

  const createDefaultData = async () => {
    try {
      await supabase
        .from('accounts')
        .insert(DEFAULT_ACCOUNTS.map(a => ({ ...a, user_id: user.id })));

      for (const cat of DEFAULT_CATEGORIES) {
        const { subcategories: subs, ...categoryData } = cat;

        const { data: newCat } = await supabase
          .from('categories')
          .insert({ ...categoryData, user_id: user.id, is_default: true })
          .select()
          .single();

        if (newCat && subs?.length > 0) {
          await supabase
            .from('subcategories')
            .insert(subs.map(sub => ({
              ...sub,
              category_id: newCat.id,
              user_id: user.id,
              is_default: true
            })));
        }
      }
    } catch (error) {
      console.error('Error creating default data:', error);
    }
  };

  const fetchAllData = async () => {
    const [accRes, catRes, subRes, budRes, recRes] = await Promise.all([
      supabase.from('accounts').select('*').order('sort_order'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('subcategories').select('*').order('sort_order'),
      supabase.from('budgets').select('*, budget_categories(*), budget_subcategories(*)'),
      supabase.from('recurring_templates').select('*').eq('is_active', true),
    ]);

    let allTransactions = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) { console.error('Error fetching transactions:', error); break; }

      if (data && data.length > 0) {
        allTransactions = [...allTransactions, ...data];
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    setAccounts(accRes.data || []);
    setCategories(catRes.data || []);
    setSubcategories(subRes.data || []);
    setTransactions(allTransactions);
    setBudgets(budRes.data || []);
    setRecurringTemplates(recRes.data || []);
  };

  // ============================================================================
  // TRANSACTION CRUD
  // ============================================================================
  const addTransaction = async (transaction) => {
    const { data, error } = await supabase.from('transactions').insert({ ...transaction, user_id: user.id }).select().single();
    if (!error && data) setTransactions(prev => [data, ...prev]);
    return { data, error };
  };

  const updateTransaction = async (id, updates) => {
    const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select().single();
    if (!error && data) setTransactions(prev => prev.map(t => t.id === id ? data : t));
    return { data, error };
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions(prev => prev.filter(t => t.id !== id));
    return { error };
  };

  // ============================================================================
  // ACCOUNT CRUD
  // ============================================================================
  const addAccount = async (account) => {
    const { data, error } = await supabase.from('accounts').insert({ ...account, user_id: user.id }).select().single();
    if (!error && data) setAccounts(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    return { data, error };
  };

  const updateAccount = async (id, updates) => {
    const { data, error } = await supabase.from('accounts').update(updates).eq('id', id).select().single();
    if (!error && data) setAccounts(prev => prev.map(a => a.id === id ? data : a).sort((a, b) => a.sort_order - b.sort_order));
    return { data, error };
  };

  const deleteAccount = async (id) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (!error) setAccounts(prev => prev.filter(a => a.id !== id));
    return { error };
  };

  // ============================================================================
  // CATEGORY CRUD
  // ============================================================================
  const addCategory = async (category) => {
    const { data, error } = await supabase.from('categories').insert({ ...category, user_id: user.id }).select().single();
    if (!error && data) setCategories(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    return { data, error };
  };

  const updateCategory = async (id, updates) => {
    const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
    if (!error && data) setCategories(prev => prev.map(c => c.id === id ? data : c).sort((a, b) => a.sort_order - b.sort_order));
    return { data, error };
  };

  const deleteCategory = async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== id));
      setSubcategories(prev => prev.filter(s => s.category_id !== id));
    }
    return { error };
  };

  // ============================================================================
  // SUBCATEGORY CRUD
  // ============================================================================
  const addSubcategory = async (subcategory) => {
    const { data, error } = await supabase.from('subcategories').insert({ ...subcategory, user_id: user.id }).select().single();
    if (!error && data) setSubcategories(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    return { data, error };
  };

  const updateSubcategory = async (id, updates) => {
    const { data, error } = await supabase.from('subcategories').update(updates).eq('id', id).select().single();
    if (!error && data) setSubcategories(prev => prev.map(s => s.id === id ? data : s).sort((a, b) => a.sort_order - b.sort_order));
    return { data, error };
  };

  const deleteSubcategory = async (id) => {
    const { error } = await supabase.from('subcategories').delete().eq('id', id);
    if (!error) setSubcategories(prev => prev.filter(s => s.id !== id));
    return { error };
  };

  // ============================================================================
  // RECURRING TEMPLATE CRUD
  // ============================================================================
  const addRecurringTemplate = async (template) => {
    const { data, error } = await supabase.from('recurring_templates').insert({ ...template, user_id: user.id }).select().single();
    if (!error && data) setRecurringTemplates(prev => [...prev, data]);
    return { data, error };
  };

  const updateRecurringTemplate = async (id, updates) => {
    const { data, error } = await supabase.from('recurring_templates').update(updates).eq('id', id).select().single();
    if (!error && data) setRecurringTemplates(prev => prev.map(t => t.id === id ? data : t));
    return { data, error };
  };

  const deleteRecurringTemplate = async (id) => {
    const { error } = await supabase.from('recurring_templates').delete().eq('id', id);
    if (!error) setRecurringTemplates(prev => prev.filter(t => t.id !== id));
    return { error };
  };

  // ============================================================================
  // BUDGET CRUD
  // ============================================================================
  const addBudget = async (budget, categoryIds = [], subcategoryIds = []) => {
    const { data, error } = await supabase.from('budgets').insert({ ...budget, user_id: user.id }).select().single();
    if (!error && data) {
      if (categoryIds.length > 0) await supabase.from('budget_categories').insert(categoryIds.map(cid => ({ budget_id: data.id, category_id: cid })));
      if (subcategoryIds.length > 0) await supabase.from('budget_subcategories').insert(subcategoryIds.map(sid => ({ budget_id: data.id, subcategory_id: sid })));
      await fetchAllData();
    }
    return { data, error };
  };

  const updateBudget = async (id, updates, categoryIds, subcategoryIds) => {
    const { data, error } = await supabase.from('budgets').update(updates).eq('id', id).select().single();
    if (!error && data) {
      await supabase.from('budget_categories').delete().eq('budget_id', id);
      await supabase.from('budget_subcategories').delete().eq('budget_id', id);
      if (categoryIds?.length > 0) await supabase.from('budget_categories').insert(categoryIds.map(cid => ({ budget_id: id, category_id: cid })));
      if (subcategoryIds?.length > 0) await supabase.from('budget_subcategories').insert(subcategoryIds.map(sid => ({ budget_id: id, subcategory_id: sid })));
      await fetchAllData();
    }
    return { data, error };
  };

  const deleteBudget = async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) setBudgets(prev => prev.filter(b => b.id !== id));
    return { error };
  };

  // ============================================================================
  // HELPERS
  // ============================================================================
  const formatAmount = (amount) => new Intl.NumberFormat(auth.language === 'fr' ? 'fr-BE' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(amount);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(auth.language === 'fr' ? 'fr-BE' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const getSubcategory = (id) => subcategories.find(s => s.id === id);
  const getCategory = (id) => categories.find(c => c.id === id);
  const getAccount = (id) => accounts.find(a => a.id === id);
  const getCategoryForSubcategory = (subcategoryId) => { const sub = getSubcategory(subcategoryId); return sub ? getCategory(sub.category_id) : null; };

  // ============================================================================
  // CONTEXT VALUE - auth + finance data merged
  // ============================================================================
  const value = {
    ...auth,
    accounts, categories, subcategories, transactions, budgets, recurringTemplates,
    dataLoading, setupLoading,
    addTransaction, updateTransaction, deleteTransaction,
    addAccount, updateAccount, deleteAccount,
    addCategory, updateCategory, deleteCategory,
    addSubcategory, updateSubcategory, deleteSubcategory,
    addRecurringTemplate, updateRecurringTemplate, deleteRecurringTemplate,
    addBudget, updateBudget, deleteBudget,
    fetchAllData,
    formatAmount, formatDate,
    getSubcategory, getCategory, getAccount, getCategoryForSubcategory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}

export default AppContext;
