import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/RecipeContext'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameDay } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { colors, fontSizes, borderRadius, shadows } from '../lib/theme'
import MealPicker from './MealPicker'
import FullPage from './FullPage'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// Un seul écran : tous les jours du mois à la suite, défilement vertical.
export default function CalendarPage() {
  const { t, language, mealPlans, loadMealPlans, deleteMealPlan } = useApp()
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [pickerDate, setPickerDate] = useState(null)
  const todayRef = useRef(null)

  const locale = language === 'fr' ? fr : enUS
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })
  const isCurrentMonth = isSameDay(month, startOfMonth(new Date()))

  useEffect(() => {
    loadMealPlans(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, loadMealPlans])

  // En arrivant sur le mois en cours, on amène aujourd'hui à l'écran
  const hasMeals = mealPlans.length > 0
  useEffect(() => {
    if (isCurrentMonth) todayRef.current?.scrollIntoView({ block: 'center' })
  }, [isCurrentMonth, hasMeals])

  const mealsFor = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return mealPlans.filter(mp => mp.planned_date === dayStr)
  }

  const handleDelete = async (mealId) => {
    if (!window.confirm(t('calendar.deleteConfirm'))) return
    try { await deleteMealPlan(mealId) } catch (error) { console.error('Delete error:', error) }
  }

  const closePicker = () => {
    loadMealPlans(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
    setPickerDate(null)
  }

  return (
    <div style={{ padding: '12px 12px 40px', fontFamily: FONT }}>
      <div style={styles.header}>
        <button onClick={() => setMonth(subMonths(month, 1))} style={styles.navBtn} aria-label="‹">←</button>
        <div style={styles.navCenter}>
          <span style={styles.rangeText}>{format(month, 'MMMM yyyy', { locale })}</span>
          {!isCurrentMonth && (
            <button onClick={() => setMonth(startOfMonth(new Date()))} style={styles.todayBtn}>{t('calendar.today')}</button>
          )}
        </div>
        <button onClick={() => setMonth(addMonths(month, 1))} style={styles.navBtn} aria-label="›">→</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const meals = mealsFor(day)
          const isToday = isSameDay(day, new Date())
          return (
            <div key={dayStr} ref={isToday ? todayRef : null} style={{
              ...styles.dayCard,
              borderLeft: `3px solid ${isToday ? colors.forest : colors.warmGray}`,
              backgroundColor: isToday ? colors.forest + '08' : colors.white,
            }}>
              <div style={styles.dayCardHeader} onClick={() => setPickerDate(day)}>
                <div>
                  <span style={{ ...styles.dayName, color: isToday ? colors.forest : colors.textPrimary, fontWeight: isToday ? 700 : 600 }}>
                    {format(day, 'EEEE', { locale })}
                  </span>
                  <span style={styles.dayDate}> · {format(day, 'd MMMM', { locale })}</span>
                </div>
                <button style={styles.addBtn} aria-label={t('calendar.addMeal')} onClick={(e) => { e.stopPropagation(); setPickerDate(day) }}>+</button>
              </div>
              {meals.length > 0 && (
                <div style={styles.dayCardMeals}>
                  {meals.map(meal => (
                    <div key={meal.id} style={styles.mealRow}>
                      <span style={styles.mealName}>🍽 {meal.recipe?.name}</span>
                      <button onClick={() => handleDelete(meal.id)} style={styles.deleteBtn} aria-label="×">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {pickerDate && <FullPage><MealPicker date={pickerDate} onClose={closePicker} /></FullPage>}
    </div>
  )
}

const styles = {
  header: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', backgroundColor: 'white', borderRadius: '16px', padding: '12px 14px', boxShadow: shadows.sm, border: '1px solid rgba(0,0,0,0.04)', position: 'sticky', top: '60px', zIndex: 5 },
  navBtn: { width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${colors.warmGray}`, backgroundColor: colors.white, borderRadius: '12px', cursor: 'pointer', fontSize: '16px', flexShrink: 0 },
  navCenter: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' },
  rangeText: { fontSize: fontSizes.md, fontWeight: 700, color: colors.textPrimary, textTransform: 'capitalize', textAlign: 'center', letterSpacing: '-0.1px' },
  todayBtn: { padding: '4px 12px', backgroundColor: colors.forest, color: 'white', border: 'none', borderRadius: borderRadius.full, fontSize: fontSizes.xs, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap', fontWeight: 600 },
  dayCard: { borderRadius: '14px', overflow: 'hidden', boxShadow: shadows.sm, border: '1px solid rgba(0,0,0,0.04)', scrollMarginTop: '140px' },
  dayCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', cursor: 'pointer' },
  dayCardMeals: { padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: '4px' },
  dayName: { fontSize: fontSizes.sm, textTransform: 'capitalize', fontFamily: FONT },
  dayDate: { fontSize: fontSizes.xs, color: colors.textMuted, fontFamily: FONT },
  mealRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: colors.background, borderRadius: '10px' },
  mealName: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary, fontWeight: 500 },
  deleteBtn: { border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: colors.textMuted, fontSize: '18px', padding: '0 4px', lineHeight: 1 },
  addBtn: { width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${colors.warmGray}`, backgroundColor: 'white', borderRadius: '8px', cursor: 'pointer', color: colors.forest, fontWeight: 700, fontSize: '16px', flexShrink: 0 },
}
