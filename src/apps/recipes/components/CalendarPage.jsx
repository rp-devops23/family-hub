import { useState, useEffect } from 'react'
import { useApp } from '../context/RecipeContext'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../lib/theme'
import MealPicker from './MealPicker'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

function useOrientation() {
  const [state, setState] = useState({
    isLandscape: window.innerWidth > window.innerHeight,
    width: window.innerWidth,
  })
  useEffect(() => {
    const update = () => setState({ isLandscape: window.innerWidth > window.innerHeight, width: window.innerWidth })
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', () => setTimeout(update, 100))
    return () => { window.removeEventListener('resize', update) }
  }, [])
  return state
}

const DAY_HEADERS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAY_HEADERS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarPage() {
  const { t, language, mealPlans, loadMealPlans, deleteMealPlan } = useApp()
  const { isLandscape, width } = useOrientation()
  const isMobile = width < 768

  const [viewMode, setViewMode] = useState('week')
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDate, setSelectedDate] = useState(null)
  const [showMealPicker, setShowMealPicker] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

  const locale = language === 'fr' ? fr : enUS
  const dayHeaders = language === 'fr' ? DAY_HEADERS_FR : DAY_HEADERS_EN

  const getDateRange = () => {
    if (viewMode === 'week') {
      return { start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) }
    } else {
      const start = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1)
      const end = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() + 1, 0)
      return { start, end }
    }
  }

  const { start, end } = getDateRange()

  const getMealsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return mealPlans.filter(mp => mp.planned_date === dayStr)
  }

  const handleDayClick = (day) => {
    if (viewMode === 'week') {
      setSelectedDate(day)
      setShowMealPicker(true)
    } else {
      setExpandedDay(expandedDay && isSameDay(expandedDay, day) ? null : day)
    }
  }

  const handleDeleteMeal = async (mealId, e) => {
    e.stopPropagation()
    if (!window.confirm(t('calendar.deleteConfirm'))) return
    try { await deleteMealPlan(mealId) }
    catch (error) { console.error('Delete error:', error) }
  }

  const handleMealAdded = () => {
    loadMealPlans(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
    setShowMealPicker(false)
  }

  const goToPreviousPeriod = () => {
    if (viewMode === 'week') setCurrentWeekStart(subWeeks(currentWeekStart, 1))
    else setCurrentWeekStart(new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() - 1, 1))
  }

  const goToNextPeriod = () => {
    if (viewMode === 'week') setCurrentWeekStart(addWeeks(currentWeekStart, 1))
    else setCurrentWeekStart(new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    if (viewMode === 'week') setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }))
    else setCurrentWeekStart(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const getRangeText = () => {
    if (viewMode === 'week') return `${format(start, 'd MMM', { locale })} – ${format(end, 'd MMM yyyy', { locale })}`
    return format(start, 'MMMM yyyy', { locale })
  }

  const isCurrentPeriod = () => {
    const today = new Date()
    if (viewMode === 'week') return isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 1 }))
    return today.getMonth() === currentWeekStart.getMonth() && today.getFullYear() === currentWeekStart.getFullYear()
  }

  const days = eachDayOfInterval({ start, end })

  // Month view: leading empty cells to align first day
  const monthStartOffset = (start.getDay() + 6) % 7 // Monday-based offset

  // Week view layout: portrait mobile → vertical list, landscape/desktop → horizontal scroll
  const weekIsVertical = isMobile && !isLandscape

  return (
    <div style={{ padding: isMobile ? '12px 12px 100px' : '16px 16px 100px', fontFamily: FONT }}>

      {/* Header */}
      <div style={styles.header}>
        {/* Navigation row */}
        <div style={styles.navRow}>
          <button onClick={goToPreviousPeriod} style={styles.navBtn}>←</button>
          <div style={styles.navCenter}>
            <span style={styles.rangeText}>{getRangeText()}</span>
            {!isCurrentPeriod() && (
              <button onClick={goToToday} style={styles.todayBtn}>{t('calendar.today')}</button>
            )}
          </div>
          <button onClick={goToNextPeriod} style={styles.navBtn}>→</button>
        </div>

        {/* View toggle */}
        <div style={styles.viewToggle}>
          {['week', 'month'].map(mode => (
            <button key={mode}
              onClick={() => setViewMode(mode)}
              style={{ ...styles.viewBtn, ...(viewMode === mode ? styles.viewBtnActive : {}) }}>
              {t(`calendar.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Week view */}
      {viewMode === 'week' && (
        weekIsVertical ? (
          // Portrait mobile: vertical list
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {days.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd')
              const meals = getMealsForDay(day)
              const isToday = isSameDay(day, new Date())
              return (
                <div key={dayStr} style={{
                  ...styles.dayCard,
                  borderLeft: `3px solid ${isToday ? colors.forest : colors.warmGray}`,
                  backgroundColor: isToday ? colors.forest + '06' : colors.white,
                }}>
                  <div style={styles.dayCardHeader} onClick={() => handleDayClick(day)}>
                    <div>
                      <span style={{ ...styles.dayName, color: isToday ? colors.forest : colors.textPrimary, fontWeight: isToday ? 700 : 600 }}>
                        {format(day, 'EEEE', { locale })}
                      </span>
                      <span style={styles.dayDate}> · {format(day, 'd MMMM', { locale })}</span>
                    </div>
                    <button style={styles.addBtn} onClick={(e) => { e.stopPropagation(); handleDayClick(day) }}>+</button>
                  </div>
                  {meals.length > 0 && (
                    <div style={styles.dayCardMeals}>
                      {meals.map(meal => (
                        <div key={meal.id} style={styles.mealRow}>
                          <span style={styles.mealName}>🍽 {meal.recipe?.name}</span>
                          <button onClick={(e) => handleDeleteMeal(meal.id, e)} style={styles.deleteBtn}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          // Landscape / desktop: horizontal scroll
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', gap: '6px', minWidth: isLandscape ? '560px' : '700px' }}>
              {days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const meals = getMealsForDay(day)
                const isToday = isSameDay(day, new Date())
                return (
                  <div key={dayStr} style={{
                    ...styles.dayColumn,
                    flex: '1 0 0',
                    minWidth: isLandscape ? '80px' : '100px',
                    borderColor: isToday ? colors.forest : colors.warmGray,
                    backgroundColor: isToday ? colors.forest + '06' : colors.white,
                  }}>
                    <div style={{ ...styles.dayColHeader, backgroundColor: isToday ? colors.forest + '12' : 'transparent' }}
                      onClick={() => handleDayClick(day)}>
                      <span style={{ fontSize: isLandscape ? '10px' : fontSizes.xs, fontWeight: 700, color: isToday ? colors.forest : colors.textPrimary, textTransform: 'capitalize' }}>
                        {format(day, isLandscape ? 'EEE' : 'EEE', { locale })}
                      </span>
                      <span style={{ fontSize: '10px', color: colors.textMuted }}>{format(day, 'd MMM', { locale })}</span>
                      <button style={styles.addBtn}>+</button>
                    </div>
                    <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {meals.map(meal => (
                        <div key={meal.id} style={styles.mealChip}>
                          <span style={{ fontSize: '10px', color: colors.textPrimary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {meal.recipe?.name}
                          </span>
                          <button onClick={(e) => handleDeleteMeal(meal.id, e)} style={{ ...styles.deleteBtn, fontSize: '10px' }}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* Month view */}
      {viewMode === 'month' && (
        <div style={{ backgroundColor: colors.white, borderRadius: borderRadius.lg, overflow: 'hidden', boxShadow: shadows.sm }}>
          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: colors.forest }}>
            {dayHeaders.map(d => (
              <div key={d} style={{ padding: '6px 2px', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'white' }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: colors.warmGray }}>
            {/* Padding cells */}
            {Array(monthStartOffset).fill(null).map((_, i) => (
              <div key={`pad-${i}`} style={{ backgroundColor: '#F9FAFB', minHeight: isMobile ? '50px' : '70px' }} />
            ))}

            {days.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd')
              const meals = getMealsForDay(day)
              const isToday = isSameDay(day, new Date())
              const isExpanded = expandedDay && isSameDay(expandedDay, day)

              return (
                <div key={dayStr} style={{
                  backgroundColor: isExpanded ? colors.forest + '10' : isToday ? colors.forest + '06' : colors.white,
                  minHeight: isMobile ? '50px' : '70px',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <button onClick={() => handleDayClick(day)} style={{
                    flex: 1, border: 'none', backgroundColor: 'transparent',
                    padding: isMobile ? '4px 2px' : '6px 4px',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '2px', fontFamily: FONT,
                  }}>
                    <span style={{
                      fontSize: isMobile ? '11px' : fontSizes.sm,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? 'white' : colors.textPrimary,
                      backgroundColor: isToday ? colors.forest : 'transparent',
                      borderRadius: '50%',
                      width: isMobile ? '20px' : '24px',
                      height: isMobile ? '20px' : '24px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {format(day, 'd')}
                    </span>
                    {meals.length > 0 && (
                      isMobile ? (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: colors.forest }} />
                      ) : (
                        <span style={{ fontSize: '10px', color: colors.forest, fontWeight: 600 }}>
                          {meals.length > 1 ? `${meals.length} repas` : meals[0]?.recipe?.name?.slice(0, 8)}
                        </span>
                      )
                    )}
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${colors.warmGray}`, padding: '4px' }}>
                      {meals.length === 0 ? (
                        <button onClick={() => { setSelectedDate(day); setShowMealPicker(true) }}
                          style={{ width: '100%', fontSize: '10px', color: colors.forest, border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}>
                          + {t('calendar.addMeal')}
                        </button>
                      ) : (
                        meals.map(meal => (
                          <div key={meal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', padding: '1px 0' }}>
                            <span style={{ flex: 1, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.recipe?.name}</span>
                            <button onClick={(e) => handleDeleteMeal(meal.id, e)} style={{ border: 'none', background: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}>×</button>
                          </div>
                        ))
                      )}
                      {meals.length > 0 && (
                        <button onClick={() => { setSelectedDate(day); setShowMealPicker(true) }}
                          style={{ width: '100%', fontSize: '10px', color: colors.forest, border: 'none', background: 'none', cursor: 'pointer', padding: '2px 0 0' }}>
                          + {t('calendar.addMeal')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showMealPicker && selectedDate && (
        <MealPicker date={selectedDate} onClose={handleMealAdded} />
      )}
    </div>
  )
}

const styles = {
  header: { marginBottom: '12px', backgroundColor: 'white', borderRadius: borderRadius.lg, padding: '12px', boxShadow: shadows.sm },
  navRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  navBtn: { width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.warmGray}`, backgroundColor: colors.white, borderRadius: borderRadius.md, cursor: 'pointer', fontSize: '16px', flexShrink: 0 },
  navCenter: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' },
  rangeText: { fontSize: fontSizes.sm, fontWeight: 600, color: colors.textPrimary, textTransform: 'capitalize', textAlign: 'center' },
  todayBtn: { padding: '3px 10px', backgroundColor: colors.forest, color: 'white', border: 'none', borderRadius: borderRadius.full, fontSize: fontSizes.xs, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap' },
  viewToggle: { display: 'flex', gap: '6px' },
  viewBtn: { flex: 1, padding: '7px', border: `1px solid ${colors.warmGray}`, borderRadius: borderRadius.md, cursor: 'pointer', fontFamily: FONT, fontSize: fontSizes.sm, fontWeight: 600, backgroundColor: colors.white, color: colors.textPrimary, transition: 'all 0.2s' },
  viewBtnActive: { backgroundColor: colors.forest, color: 'white', borderColor: colors.forest },

  // Week portrait
  dayCard: { borderRadius: borderRadius.md, overflow: 'hidden', boxShadow: shadows.sm },
  dayCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' },
  dayCardMeals: { padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: '4px' },
  dayName: { fontSize: fontSizes.sm, textTransform: 'capitalize', fontFamily: FONT },
  dayDate: { fontSize: fontSizes.xs, color: colors.textMuted, fontFamily: FONT },
  mealRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', backgroundColor: colors.cream, borderRadius: borderRadius.sm },
  mealName: { flex: 1, fontSize: fontSizes.sm, color: colors.textPrimary },
  deleteBtn: { border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: colors.textMuted, fontSize: '16px', padding: '0 2px', lineHeight: 1 },
  addBtn: { width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.warmGray}`, backgroundColor: 'white', borderRadius: borderRadius.sm, cursor: 'pointer', color: colors.forest, fontWeight: 700, fontSize: '16px', flexShrink: 0 },

  // Week landscape/desktop columns
  dayColumn: { display: 'flex', flexDirection: 'column', border: '1px solid', borderRadius: borderRadius.sm, overflow: 'hidden' },
  dayColHeader: { padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', borderBottom: `1px solid ${colors.warmGray}` },
  mealChip: { display: 'flex', alignItems: 'center', backgroundColor: colors.cream, borderRadius: '3px', padding: '2px 4px', gap: '2px' },
}
