import { useState } from 'react';
import { useApp } from '../../context/AppContext';

// ============================================================================
// MONTH PICKER - Navigate through months
// ============================================================================

export default function MonthPicker({ month, year, onChange }) {
  const { t, language } = useApp();
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const months = language === 'fr' 
    ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
       'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    : ['January', 'February', 'March', 'April', 'May', 'June',
       'July', 'August', 'September', 'October', 'November', 'December'];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const goToPrevMonth = () => {
    if (month === 0) {
      onChange(11, year - 1);
    } else {
      onChange(month - 1, year);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      onChange(0, year + 1);
    } else {
      onChange(month + 1, year);
    }
  };

  const goToToday = () => {
    const now = new Date();
    onChange(now.getMonth(), now.getFullYear());
  };

  const isCurrentMonth = month === new Date().getMonth() && year === new Date().getFullYear();

  return (
    <div style={styles.container}>
      <div style={styles.picker}>
        <button onClick={goToPrevMonth} style={styles.navBtn}>◀</button>
        
        <div style={styles.display}>
          <span style={styles.month}>{months[month]}</span>
          <button 
            onClick={() => setShowYearDropdown(!showYearDropdown)}
            style={styles.yearBtn}
          >
            {year} ▼
          </button>
        </div>
        
        <button onClick={goToNextMonth} style={styles.navBtn}>▶</button>
      </div>

      {!isCurrentMonth && (
        <button onClick={goToToday} style={styles.todayBtn}>
          {t('Aujourd\'hui', 'Today')}
        </button>
      )}

      {/* Year dropdown */}
      {showYearDropdown && (
        <div style={styles.dropdown}>
          {years.map(y => (
            <button
              key={y}
              onClick={() => {
                onChange(month, y);
                setShowYearDropdown(false);
              }}
              style={{
                ...styles.dropdownItem,
                backgroundColor: y === year ? '#F0F9FF' : 'transparent',
                fontWeight: y === year ? '600' : '400',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    position: 'relative',
  },
  picker: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '8px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  navBtn: {
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: '#F5F7FA',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#2D3436',
  },
  display: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '140px',
    justifyContent: 'center',
  },
  month: {
    fontWeight: '600',
    color: '#2D3436',
    fontSize: '15px',
  },
  yearBtn: {
    border: 'none',
    backgroundColor: 'transparent',
    color: '#636E72',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  todayBtn: {
    padding: '8px 14px',
    border: '1px solid #00A3E0',
    backgroundColor: 'transparent',
    color: '#00A3E0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '4px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    padding: '8px',
    zIndex: 100,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '4px',
  },
  dropdownItem: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#2D3436',
  },
};