import { useState } from 'react'
import { useApp } from '../context/RecipeContext'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { colors, fonts, fontSizes, spacing, borderRadius, shadows } from '../lib/theme'
import MealPicker from './MealPicker'

export default function CalendarPage() {
  const {
    t, language,
    tags, mealPlans,
    loadMealPlans, deleteMealPlan
  } = useApp()

  const [viewMode, setViewMode] = useState('week')
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDate, setSelectedDate] = useState(null)
  const [showMealPicker, setShowMealPicker] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)

  const locale = language === 'fr' ? fr : enUS

  const getDateRange = () => {
    if (viewMode === 'week') {
      return {
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      }
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

  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm(t('calendar.deleteConfirm'))) return
    try {
      await deleteMealPlan(mealId)
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const handleMealAdded = () => {
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')
    loadMealPlans(startStr, endStr)
    setShowMealPicker(false)
  }

  const goToPreviousPeriod = () => {
    if (viewMode === 'week') {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1))
    } else {
      setCurrentWeekStart(new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() - 1, 1))
    }
  }

  const goToNextPeriod = () => {
    if (viewMode === 'week') {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1))
    } else {
      setCurrentWeekStart(new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() + 1, 1))
    }
  }

  const goToToday = () => {
    const today = new Date()
    if (viewMode === 'week') {
      setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }))
    } else {
      setCurrentWeekStart(new Date(today.getFullYear(), today.getMonth(), 1))
    }
  }

  const getRangeText = () => {
    if (viewMode === 'week') {
      return `${format(start, 'd MMM', { locale })} - ${format(end, 'd MMM yyyy', { locale })}`
    } else {
      return format(start, 'MMMM yyyy', { locale })
    }
  }

  const isCurrentPeriod = () => {
    const today = new Date()
    if (viewMode === 'week') {
      return isSameDay(currentWeekStart, startOfWeek(today, { weekStartsOn: 1 }))
    } else {
      return today.getMonth() === currentWeekStart.getMonth() && today.getFullYear() === currentWeekStart.getFullYear()
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('calendar.title')}</h1>
        <div style={styles.controls}>
          <div style={styles.navBar}>
            <button onClick={goToPreviousPeriod} style={styles.navButton}>←</button>
            <span style={styles.rangeText}>{getRangeText()}</span>
            {!isCurrentPeriod() && (
              <button onClick={goToToday} style={styles.todayButton}>{t('calendar.today')}</button>
            )}
            <button onClick={goToNextPeriod} style={styles.navButton}>→</button>
          </div>

          <div style={styles.viewModeToggle}>
            <button
              onClick={() => setViewMode('week')}
              style={{
                ...styles.viewModeButton,
                backgroundColor: viewMode === 'week' ? colors.forest : colors.white,
                color: viewMode === 'week' ? colors.white : colors.textPrimary,
                borderColor: viewMode === 'week' ? colors.forest : colors.warmGray
              }}
            >
              {t('calendar.week')}
            </button>
            <button
              onClick={() => setViewMode('month')}
              style={{
                ...styles.viewModeButton,
                backgroundColor: viewMode === 'month' ? colors.forest : colors.white,
                color: viewMode === 'month' ? colors.white : colors.textPrimary,
                borderColor: viewMode === 'month' ? colors.forest : colors.warmGray
              }}
            >
              {t('calendar.month')}
            </button>
          </div>
        </div>
      </header>

      <div style={styles.content}>
        {viewMode === 'week' && (
          <div style={styles.weekView}>
            {eachDayOfInterval({ start, end }).map(day => {
              const dayStr = format(day, 'yyyy-MM-dd')
              const meals = getMealsForDay(day)
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate && isSameDay(day, selectedDate)

              return (
                <div key={dayStr} style={{
                  ...styles.dayColumn,
                  borderColor: isToday ? colors.forest : colors.warmGray,
                  backgroundColor: isSelected ? colors.forest + '08' : colors.white
                }}>
                  <div
                    style={{
                      ...styles.dayHeader,
                      backgroundColor: isToday ? colors.forest + '10' : 'transparent'
                    }}
                    onClick={() => handleDayClick(day)}
                  >
                    <div style={styles.dayHeaderText}>
                      <span style={{
                        ...styles.dayName,
                        color: isToday ? colors.forest : colors.textPrimary,
                        fontWeight: isToday ? 700 : 600
                      }}>
                        {format(day, 'EEEE', { locale })}
                      </span>
                      <span style={styles.dayDate}>{format(day, 'd MMMM', { locale })}</span>
                    </div>
                    <button style={styles.addButton}>+</button>
                  </div>

                  <div style={styles.mealsList}>
                    {meals.map(meal => (
                      <div key={meal.id} style={styles.mealItem}>
                        <span style={styles.mealName}>{meal.recipe?.name}</span>
                        <button
                          onClick={() => handleDeleteMeal(meal.id)}
                          style={styles.deleteButton}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {viewMode === 'month' && (
          <div style={styles.monthView}>
            <div style={styles.monthGrid}>
              {eachDayOfInterval({ start, end }).map(day => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const meals = getMealsForDay(day)
                const isToday = isSameDay(day, new Date())
                const isExpanded = expandedDay && isSameDay(expandedDay, day)
                const isCurrentMonth = day.getMonth() === start.getMonth()

                return (
                  <div
                    key={dayStr}
                    style={{
                      ...styles.monthCell,
                      opacity: isCurrentMonth ? 1 : 0.5,
                      backgroundColor: isExpanded ? colors.forest + '10' : isToday ? colors.forest + '05' : colors.white
                    }}
                  >
                    <button
                      onClick={() => handleDayClick(day)}
                      style={styles.monthCellButton}
                    >
                      <span style={{
                        ...styles.monthCellDate,
                        color: isToday ? colors.forest : colors.textPrimary,
                        fontWeight: isToday ? 700 : 400
                      }}>
                        {format(day, 'd')}
                      </span>
                      {meals.length > 0 && (
                        <span style={styles.mealDot}>•</span>
                      )}
                    </button>

                    {isExpanded && (
                      <div style={styles.monthCellDetails}>
                        {meals.map(meal => (
                          <div key={meal.id} style={styles.monthMealItem}>
                            <span style={styles.monthMealName}>{meal.recipe?.name}</span>
                            <button
                              onClick={() => handleDeleteMeal(meal.id)}
                              style={styles.monthDeleteButton}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showMealPicker && selectedDate && (
        <MealPicker
          selectedDate={selectedDate}
          onClose={() => setShowMealPicker(false)}
          onMealAdded={handleMealAdded}
        />
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: spacing.md
  },
  header: {
    marginBottom: spacing.lg
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes['2xl'],
    color: colors.forest,
    margin: 0
  },
  controls: {
    marginTop: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm
  },
  navBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  navButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${colors.warmGray}`,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontSize: fontSizes.md,
    color: colors.textPrimary
  },
  rangeText: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSizes.sm,
    fontWeight: 600,
    color: colors.textPrimary,
    textTransform: 'capitalize'
  },
  todayButton: {
    padding: `4px ${spacing.sm}`,
    backgroundColor: colors.forest,
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.full,
    fontSize: fontSizes.xs,
    cursor: 'pointer',
    fontFamily: fonts.body
  },
  viewModeToggle: {
    display: 'flex',
    gap: spacing.xs,
    marginTop: spacing.sm
  },
  viewModeButton: {
    flex: 1,
    padding: spacing.xs,
    border: '1px solid',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  content: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: shadows.sm
  },
  weekView: {
    display: 'flex',
    gap: spacing.sm
  },
  dayColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid',
    borderRadius: borderRadius.md,
    overflow: 'hidden'
  },
  dayHeader: {
    padding: spacing.sm,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    borderBottom: `1px solid ${colors.warmGray}`
  },
  dayHeaderText: {
    display: 'flex',
    flexDirection: 'column'
  },
  dayName: {
    fontSize: fontSizes.sm,
    textTransform: 'capitalize'
  },
  dayDate: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'capitalize'
  },
  addButton: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: fontSizes.md,
    cursor: 'pointer',
    color: colors.forest,
    fontWeight: 700
  },
  mealsList: {
    flex: 1,
    padding: spacing.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs
  },
  mealItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xs,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.sm,
    gap: spacing.xs
  },
  mealName: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: 500
  },
  deleteButton: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: fontSizes.sm,
    cursor: 'pointer',
    color: colors.textMuted,
    flexShrink: 0
  },
  monthView: {
    padding: 0
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    backgroundColor: colors.warmGray
  },
  monthCell: {
    minHeight: '80px',
    backgroundColor: colors.white,
    display: 'flex',
    flexDirection: 'column'
  },
  monthCellButton: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    padding: spacing.xs,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '4px',
    fontFamily: fonts.body
  },
  monthCellDate: {
    fontSize: fontSizes.sm
  },
  mealDot: {
    color: colors.forest,
    fontSize: '12px'
  },
  monthCellDetails: {
    padding: spacing.xs,
    borderTop: `1px solid ${colors.warmGray}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  monthMealItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
    padding: '2px 4px',
    fontSize: fontSizes.xs
  },
  monthMealName: {
    flex: 1,
    color: colors.textSecondary
  },
  monthDeleteButton: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: fontSizes.xs,
    cursor: 'pointer',
    color: colors.textMuted,
    flexShrink: 0
  }
}
