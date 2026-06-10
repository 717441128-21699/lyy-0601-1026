import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, Button, ScrollView, Image, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { ReportData, Activity, Feedback, ManagerViewData, DailySummary, ComparisonRecord, DimensionSummary, ManagerDimension } from '@/types'
import EmptyState from '@/components/EmptyState'
import { useActivityStore } from '@/store/useActivityStore'
import { formatDateTime, formatTime } from '@/utils'
import { abnormalTypeLabels } from '@/data/feedbacks'
import dayjs from 'dayjs'

type ViewMode = 'timeline' | 'list' | 'compare' | 'manager' | 'comparisons'

const ReportPage: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState('全部')
  const [selectedProduct, setSelectedProduct] = useState('全部')
  const [selectedPeriod, setSelectedPeriod] = useState('今日')
  const [showFilterModal, setShowFilterModal] = useState<string | null>(null)
  const [tempFilterValue, setTempFilterValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null)
  const [compareActivityIds, setCompareActivityIds] = useState<string[]>([])
  const [managerDimension, setManagerDimension] = useState<ManagerDimension>('store')
  const [expandedDimensionKey, setExpandedDimensionKey] = useState<string | null>(null)
  const [expandedDailyDate, setExpandedDailyDate] = useState<string | null>(null)
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [comparisonReason, setComparisonReason] = useState('')

  const {
    getReportData,
    activityHistory,
    currentActivity,
    getActivityById,
    getManagerViewData,
    getDailySummaries,
    saveComparisonRecord,
    getComparisonRecords
  } = useActivityStore()

  const filteredActivities = useMemo(() => {
    let allActivities: Activity[] = []
    if (currentActivity && currentActivity.status !== 'pending') {
      allActivities = [currentActivity, ...activityHistory.filter(a => a.id !== currentActivity.id)]
    } else {
      allActivities = [...activityHistory]
    }

    return allActivities.filter(act => {
      if (selectedStore !== '全部' && act.storeName !== selectedStore) return false
      if (selectedProduct !== '全部' && !act.productName.includes(selectedProduct)) return false

      const dateStr = act.startTime
      if (selectedPeriod === '今日') {
        const today = new Date().toDateString()
        return new Date(dateStr).toDateString() === today
      }
      if (selectedPeriod === '本周') {
        const now = new Date()
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        return new Date(dateStr) >= weekStart
      }
      if (selectedPeriod === '本月') {
        const now = new Date()
        return new Date(dateStr).getMonth() === now.getMonth() &&
          new Date(dateStr).getFullYear() === now.getFullYear()
      }
      return true
    }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [selectedStore, selectedProduct, selectedPeriod, activityHistory, currentActivity])



  const reportData: ReportData | null = useMemo(() => {
    return getReportData(selectedStore, selectedProduct, selectedPeriod)
  }, [selectedStore, selectedProduct, selectedPeriod, getReportData])

  const compareReportData1 = useMemo(() => {
    if (compareActivityIds.length < 1) return null
    return getReportData(selectedStore, selectedProduct, selectedPeriod, compareActivityIds[0])
  }, [compareActivityIds, selectedStore, selectedProduct, selectedPeriod, getReportData])

  const compareReportData2 = useMemo(() => {
    if (compareActivityIds.length < 2) return null
    return getReportData(selectedStore, selectedProduct, selectedPeriod, compareActivityIds[1])
  }, [compareActivityIds, selectedStore, selectedProduct, selectedPeriod, getReportData])

  const compareActivity1 = useMemo(() => {
    if (compareActivityIds.length < 1) return null
    return getActivityById(compareActivityIds[0])
  }, [compareActivityIds, getActivityById])

  const compareActivity2 = useMemo(() => {
    if (compareActivityIds.length < 2) return null
    return getActivityById(compareActivityIds[1])
  }, [compareActivityIds, getActivityById])

  const managerViewData: ManagerViewData | null = useMemo(() => {
    return getManagerViewData(selectedPeriod)
  }, [selectedPeriod, getManagerViewData])

  const dailySummaries: DailySummary[] = useMemo(() => {
    return getDailySummaries(selectedStore, selectedProduct, selectedPeriod)
  }, [selectedStore, selectedProduct, selectedPeriod, getDailySummaries])

  const comparisonRecords: ComparisonRecord[] = useMemo(() => {
    return getComparisonRecords()
  }, [getComparisonRecords])

  const currentDimensionData: DimensionSummary[] = useMemo(() => {
    if (!managerViewData) return []
    switch (managerDimension) {
      case 'store': return managerViewData.byStore
      case 'product': return managerViewData.byProduct
      case 'promoter': return managerViewData.byPromoter
      default: return []
    }
  }, [managerViewData, managerDimension])

  const storeOptions = useMemo(() => {
    const storeNames = new Set(activityHistory.map(a => a.storeName))
    if (currentActivity) storeNames.add(currentActivity.storeName)
    return ['全部', ...Array.from(storeNames)]
  }, [activityHistory, currentActivity])

  const productOptions = useMemo(() => {
    const productNames = new Set(activityHistory.map(a => a.productName.split(' ')[0]))
    if (currentActivity) productNames.add(currentActivity.productName.split(' ')[0])
    return ['全部', ...Array.from(productNames)]
  }, [activityHistory, currentActivity])

  const periodOptions = ['今日', '本周', '本月', '全部']

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'out_of_stock': return 'typeOutStock'
      case 'price_error': return 'typePriceError'
      case 'competitor': return 'typeCompetitor'
      default: return ''
    }
  }

  useEffect(() => {
    console.log('[Report] 筛选条件:', { store: selectedStore, product: selectedProduct, period: selectedPeriod })
    console.log('[Report] 筛选后活动数:', filteredActivities.length)
    console.log('[Report] 对比活动:', compareActivityIds)
    console.log('[Report] 当前视图:', viewMode)
  }, [selectedStore, selectedProduct, selectedPeriod, filteredActivities, compareActivityIds, viewMode])

  const handleFilterClick = (type: string, currentValue: string) => {
    setTempFilterValue(currentValue)
    setShowFilterModal(type)
  }

  const handleFilterSelect = (value: string) => {
    setTempFilterValue(value)
  }

  const handleFilterConfirm = () => {
    if (showFilterModal === 'store') {
      setSelectedStore(tempFilterValue)
    } else if (showFilterModal === 'product') {
      setSelectedProduct(tempFilterValue)
    } else if (showFilterModal === 'period') {
      setSelectedPeriod(tempFilterValue)
    }
    setCompareActivityIds([])
    setExpandedActivityId(null)
    setExpandedDimensionKey(null)
    setExpandedDailyDate(null)
    setShowFilterModal(null)
  }

  const getFilterOptions = () => {
    if (showFilterModal === 'store') return storeOptions
    if (showFilterModal === 'product') return productOptions
    if (showFilterModal === 'period') return periodOptions
    return []
  }

  const handleExpandActivity = (activityId: string) => {
    if (expandedActivityId === activityId) {
      setExpandedActivityId(null)
    } else {
      setExpandedActivityId(activityId)
    }
  }

  const handleToggleCompare = (activityId: string) => {
    setCompareActivityIds(prev => {
      if (prev.includes(activityId)) {
        return prev.filter(id => id !== activityId)
      }
      if (prev.length >= 2) {
        return [prev[1], activityId]
      }
      return [...prev, activityId]
    })
  }

  const handleClearCompare = () => {
    setCompareActivityIds([])
    setWinnerId(null)
    setComparisonReason('')
  }

  const handleStartCompare = () => {
    if (compareActivityIds.length === 2) {
      setViewMode('compare')
      setWinnerId(null)
      setComparisonReason('')
    } else {
      Taro.showToast({ title: '请选择两场活动', icon: 'none' })
    }
  }

  const handleExport = () => {
    if (!reportData) {
      Taro.showToast({ title: '暂无数据可导出', icon: 'none' })
      return
    }
    Taro.showModal({
      title: '导出复盘报告',
      content: `门店：${reportData.storeName}\n商品：${reportData.productName}\n时段：${reportData.period}\n\n试吃：${reportData.totalTasters}人\n购买：${reportData.purchaseCount}人\n转化率：${reportData.conversionRate}%`,
      success: (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '生成中...' })
          setTimeout(() => {
            Taro.hideLoading()
            Taro.showToast({
              title: '报告已生成',
              icon: 'success'
            })
          }, 1500)
        }
      }
    })
  }

  const getDifferenceIndicator = (val1: number, val2: number) => {
    const diff = val1 - val2
    if (diff > 0) return <Text className={styles.diffPositive}>↑ {diff.toFixed(1)}</Text>
    if (diff < 0) return <Text className={styles.diffNegative}>↓ {Math.abs(diff).toFixed(1)}</Text>
    return <Text className={styles.diffEqual}>— 持平</Text>
  }

  const handleExpandDimension = (key: string) => {
    if (expandedDimensionKey === key) {
      setExpandedDimensionKey(null)
    } else {
      setExpandedDimensionKey(key)
    }
  }

  const handleExpandDailyDate = (date: string) => {
    if (expandedDailyDate === date) {
      setExpandedDailyDate(null)
    } else {
      setExpandedDailyDate(date)
    }
  }

  const handleSaveComparison = () => {
    if (compareActivityIds.length !== 2) {
      Taro.showToast({ title: '请选择两场活动', icon: 'none' })
      return
    }
    if (!winnerId) {
      Taro.showToast({ title: '请选择胜出活动', icon: 'none' })
      return
    }
    if (!comparisonReason.trim()) {
      Taro.showToast({ title: '请填写对比原因', icon: 'none' })
      return
    }
    if (comparisonReason.length > 200) {
      Taro.showToast({ title: '原因不能超过200字', icon: 'none' })
      return
    }

    try {
      saveComparisonRecord(
        compareActivityIds[0],
        compareActivityIds[1],
        winnerId,
        comparisonReason.trim()
      )
      Taro.showModal({
        title: '保存成功',
        content: '对比结论已保存，是否查看历史对比记录？',
        confirmText: '查看历史',
        cancelText: '返回列表',
        success: (res) => {
          if (res.confirm) {
            setViewMode('comparisons')
          } else {
            setViewMode('list')
          }
          handleClearCompare()
        }
      })
    } catch (e) {
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  }

  const handleViewComparisonDetail = (record: ComparisonRecord) => {
    setCompareActivityIds([record.activityId1, record.activityId2])
    setViewMode('compare')
  }

  const renderActivityDetail = (activity: Activity) => {
    const avgRating = activity.feedbacks.length > 0
      ? (activity.feedbacks.reduce((s: number, f: Feedback) => s + f.tasteRating, 0) / activity.feedbacks.length).toFixed(1)
      : '—'
    const conversionRate = activity.usedSamples > 0
      ? ((activity.purchaseCount / activity.usedSamples) * 100).toFixed(1)
      : '0'

    return (
      <View className={styles.timelineItemDetail}>
        <View className={styles.detailSection}>
          <Text className={styles.detailTitle}>📊 基础数据</Text>
          <View className={styles.detailStats}>
            <View className={styles.detailStat}>
              <Text className={styles.detailStatValue}>{activity.usedSamples}</Text>
              <Text className={styles.detailStatLabel}>试吃人数</Text>
            </View>
            <View className={styles.detailStat}>
              <Text className={styles.detailStatValue}>{activity.purchaseCount}</Text>
              <Text className={styles.detailStatLabel}>购买人数</Text>
            </View>
            <View className={styles.detailStat}>
              <Text className={styles.detailStatValue}>{conversionRate}%</Text>
              <Text className={styles.detailStatLabel}>转化率</Text>
            </View>
            <View className={styles.detailStat}>
              <Text className={styles.detailStatValue}>{avgRating}</Text>
              <Text className={styles.detailStatLabel}>平均评分</Text>
            </View>
          </View>
        </View>

        {activity.feedbacks.length > 0 && (
          <View className={styles.detailSection}>
            <Text className={styles.detailTitle}>📝 反馈明细</Text>
            <View className={styles.feedbackList}>
              {activity.feedbacks.slice(0, 5).map((fb: Feedback) => (
                <View key={fb.id} className={styles.feedbackMiniItem}>
                  <Text className={styles.feedbackTime}>{formatTime(fb.createdAt)}</Text>
                  <Text className={styles.feedbackAge}>
                    {fb.ageGroup === 'child' ? '儿童' :
                     fb.ageGroup === 'teen' ? '青少年' :
                     fb.ageGroup === 'adult' ? '成年人' : '老年人'}
                  </Text>
                  <View className={styles.feedbackStars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Text
                        key={i}
                        className={classnames(
                          styles.starIcon,
                          i < fb.tasteRating && styles.starFilled
                        )}
                      >★</Text>
                    ))}
                  </View>
                  <Text className={styles.feedbackIntent}>
                    {fb.purchaseIntent === 'high' ? '👍 强购' :
                     fb.purchaseIntent === 'medium' ? '🤔 考虑' :
                     fb.purchaseIntent === 'low' ? '😐 犹豫' : '👎 不购'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activity.abnormalReports.length > 0 && (
          <View className={styles.detailSection}>
            <Text className={styles.detailTitle}>⚠️ 异常记录</Text>
            <View className={styles.abnormalMiniList}>
              {activity.abnormalReports.map(ab => (
                <View key={ab.id} className={styles.abnormalMiniItem}>
                  <View className={classnames(styles.abnormalMiniType, styles[getTypeClass(ab.type)])}>
                    {abnormalTypeLabels[ab.type]}
                  </View>
                  <Text className={styles.abnormalMiniDesc}>{ab.description}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className={styles.detailSection}>
          <Text className={styles.detailTitle}>🎁 样品消耗</Text>
          <View className={styles.sampleDetail}>
            <View className={styles.sampleBar}>
              <View
                className={styles.sampleBarUsed}
                style={{ width: `${Math.min(100, (activity.usedSamples / activity.targetSamples) * 100)}%` }}
              ></View>
            </View>
            <View className={styles.sampleDetailStats}>
              <Text>已用 {activity.usedSamples}/{activity.targetSamples} 份</Text>
              <Text>剩余 {activity.remainingSamples} 份</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderTimelineView = () => (
    <View className={styles.timelineSection}>
      {dailySummaries.map((summary) => (
        <View key={summary.date} className={styles.dailySummaryCard}>
          <View
            className={styles.dailySummaryHeader}
            onClick={() => handleExpandDailyDate(summary.date)}
          >
            <View className={styles.dailySummaryDate}>
              <Text className={styles.dailySummaryDateText}>{summary.date}</Text>
              <Text className={styles.dailySummaryCount}>{summary.activityCount}场</Text>
            </View>
            <View className={styles.dailySummaryStats}>
              <View className={styles.dailySummaryStat}>
                <Text className={styles.dailySummaryStatValue}>{summary.totalTasters}</Text>
                <Text className={styles.dailySummaryStatLabel}>试吃</Text>
              </View>
              <View className={styles.dailySummaryStat}>
                <Text className={styles.dailySummaryStatValue}>{summary.totalPurchases}</Text>
                <Text className={styles.dailySummaryStatLabel}>购买</Text>
              </View>
              <View className={styles.dailySummaryStat}>
                <Text className={styles.dailySummaryStatValue}>{summary.avgConversionRate}%</Text>
                <Text className={styles.dailySummaryStatLabel}>转化率</Text>
              </View>
              <View className={styles.dailySummaryStat}>
                <Text className={styles.dailySummaryStatValue}>⭐{summary.avgRating}</Text>
                <Text className={styles.dailySummaryStatLabel}>评分</Text>
              </View>
              {summary.abnormalCount > 0 && (
                <View className={styles.dailySummaryStat}>
                  <Text className={classnames(styles.dailySummaryStatValue, styles.statError)}>
                    ⚠️{summary.abnormalCount}
                  </Text>
                  <Text className={styles.dailySummaryStatLabel}>异常</Text>
                </View>
              )}
            </View>
            <Text className={styles.timelineItemArrow}>
              {expandedDailyDate === summary.date ? '▲' : '▼'}
            </Text>
          </View>

          {expandedDailyDate === summary.date && (
            <View className={styles.dailyActivityList}>
              {summary.activities.map((activity) => (
                <View
                  key={activity.id}
                  className={classnames(
                    styles.timelineItemCard,
                    expandedActivityId === activity.id && styles.timelineCardExpanded
                  )}
                >
                  <View
                    className={styles.timelineItemHeader}
                    onClick={() => handleExpandActivity(activity.id)}
                  >
                    <View className={styles.timelineItemTime}>
                      {dayjs(activity.startTime).format('HH:mm')}
                    </View>
                    <View className={styles.timelineItemInfo}>
                      <Text className={styles.timelineItemStore}>{activity.storeName}</Text>
                      <Text className={styles.timelineItemProduct}>{activity.productName}</Text>
                    </View>
                    <View className={styles.timelineItemStats}>
                      <Text className={styles.timelineItemStat}>
                        试吃 {activity.usedSamples}
                      </Text>
                      <Text className={styles.timelineItemStat}>
                        购买 {activity.purchaseCount}
                      </Text>
                    </View>
                    <Text className={styles.timelineItemArrow}>
                      {expandedActivityId === activity.id ? '▲' : '▼'}
                    </Text>
                  </View>

                  {expandedActivityId === activity.id && renderActivityDetail(activity)}
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  )

  const renderManagerView = () => {
    if (!managerViewData) {
      return (
        <View className={styles.emptyReport}>
          <EmptyState
            title="暂无主管视角数据"
            description="活动结束后将自动生成汇总数据"
            icon="👔"
          />
        </View>
      )
    }

    return (
      <View className={styles.managerSection}>
        <View className={styles.managerSummary}>
          <Text className={styles.managerSummaryTitle}>📊 整体汇总 - {managerViewData.period}</Text>
          <View className={styles.managerSummaryStats}>
            <View className={styles.managerSummaryStat}>
              <Text className={styles.managerSummaryValue}>{managerViewData.totalActivities}</Text>
              <Text className={styles.managerSummaryLabel}>总活动数</Text>
            </View>
            <View className={styles.managerSummaryStat}>
              <Text className={styles.managerSummaryValue}>{managerViewData.totalTasters}</Text>
              <Text className={styles.managerSummaryLabel}>总试吃</Text>
            </View>
            <View className={styles.managerSummaryStat}>
              <Text className={styles.managerSummaryValue}>{managerViewData.totalPurchases}</Text>
              <Text className={styles.managerSummaryLabel}>总购买</Text>
            </View>
            <View className={styles.managerSummaryStat}>
              <Text className={styles.managerSummaryValue}>{managerViewData.overallConversionRate}%</Text>
              <Text className={styles.managerSummaryLabel}>整体转化率</Text>
            </View>
            <View className={styles.managerSummaryStat}>
              <Text className={styles.managerSummaryValue}>⭐{managerViewData.overallAvgRating}</Text>
              <Text className={styles.managerSummaryLabel}>整体评分</Text>
            </View>
          </View>
        </View>

        <View className={styles.dimensionTabs}>
          <View
            className={classnames(
              styles.dimensionTab,
              managerDimension === 'store' && styles.dimensionTabActive
            )}
            onClick={() => { setManagerDimension('store'); setExpandedDimensionKey(null) }}
          >
            🏪 按门店
          </View>
          <View
            className={classnames(
              styles.dimensionTab,
              managerDimension === 'product' && styles.dimensionTabActive
            )}
            onClick={() => { setManagerDimension('product'); setExpandedDimensionKey(null) }}
          >
            📦 按商品
          </View>
          <View
            className={classnames(
              styles.dimensionTab,
              managerDimension === 'promoter' && styles.dimensionTabActive
            )}
            onClick={() => { setManagerDimension('promoter'); setExpandedDimensionKey(null) }}
          >
            👤 按促销员
          </View>
        </View>

        <View className={styles.dimensionCardList}>
          {currentDimensionData.map((dimension) => (
            <View
              key={dimension.key}
              className={classnames(
                styles.dimensionCard,
                expandedDimensionKey === dimension.key && styles.dimensionCardExpanded
              )}
            >
              <View
                className={styles.dimensionCardHeader}
                onClick={() => handleExpandDimension(dimension.key)}
              >
                <View className={styles.dimensionCardTitle}>
                  <Text className={styles.dimensionCardName}>{dimension.name}</Text>
                  <Text className={styles.dimensionCardActivityCount}>
                    {dimension.activityCount}场活动
                  </Text>
                </View>
                <View className={styles.dimensionCardBadges}>
                  {dimension.highConversionActivities.length > 0 && (
                    <View className={classnames(styles.dimensionBadge, styles.badgeHighConversion)}>
                      🔥 高转化 {dimension.highConversionActivities.length}
                    </View>
                  )}
                  {dimension.lowRatingActivities.length > 0 && (
                    <View className={classnames(styles.dimensionBadge, styles.badgeLowRating)}>
                      ⚠️ 低评分 {dimension.lowRatingActivities.length}
                    </View>
                  )}
                </View>
              </View>

              <View className={styles.dimensionCardStats}>
                <View className={styles.dimensionCardStat}>
                  <Text className={styles.dimensionCardStatValue}>{dimension.totalTasters}</Text>
                  <Text className={styles.dimensionCardStatLabel}>总试吃</Text>
                </View>
                <View className={styles.dimensionCardStat}>
                  <Text className={styles.dimensionCardStatValue}>{dimension.totalPurchases}</Text>
                  <Text className={styles.dimensionCardStatLabel}>总购买</Text>
                </View>
                <View className={styles.dimensionCardStat}>
                  <Text className={classnames(
                    styles.dimensionCardStatValue,
                    dimension.avgConversionRate >= 30 ? styles.statSuccess :
                    dimension.avgConversionRate >= 15 ? styles.statWarning : styles.statError
                  )}>{dimension.avgConversionRate}%</Text>
                  <Text className={styles.dimensionCardStatLabel}>平均转化率</Text>
                </View>
                <View className={styles.dimensionCardStat}>
                  <Text className={classnames(
                    styles.dimensionCardStatValue,
                    dimension.avgRating >= 4 ? styles.statSuccess :
                    dimension.avgRating >= 3 ? styles.statWarning : styles.statError
                  )}>⭐{dimension.avgRating}</Text>
                  <Text className={styles.dimensionCardStatLabel}>平均评分</Text>
                </View>
                {dimension.abnormalCount > 0 && (
                  <View className={styles.dimensionCardStat}>
                    <Text className={classnames(styles.dimensionCardStatValue, styles.statError)}>
                      ⚠️{dimension.abnormalCount}
                    </Text>
                    <Text className={styles.dimensionCardStatLabel}>异常数</Text>
                  </View>
                )}
              </View>

              {expandedDimensionKey === dimension.key && (
                <View className={styles.dimensionActivityList}>
                  <Text className={styles.dimensionActivityListTitle}>
                    活动列表（点击查看详情）
                  </Text>
                  {dimension.activities.map((activity) => {
                    const activityConversion = activity.usedSamples > 0
                      ? (activity.purchaseCount / activity.usedSamples) * 100
                      : 0
                    const activityRating = activity.feedbacks.length > 0
                      ? activity.feedbacks.reduce((s: number, f: Feedback) => s + f.tasteRating, 0) / activity.feedbacks.length
                      : 5

                    return (
                      <View
                        key={activity.id}
                        className={classnames(
                          styles.dimensionActivityItem,
                          expandedActivityId === activity.id && styles.dimensionActivityItemExpanded
                        )}
                      >
                        <View
                          className={styles.dimensionActivityItemHeader}
                          onClick={() => handleExpandActivity(activity.id)}
                        >
                          <Image
                            className={styles.dimensionActivityImage}
                            src={activity.productImage}
                            mode="aspectFill"
                          />
                          <View className={styles.dimensionActivityInfo}>
                            <View className={styles.dimensionActivityNameRow}>
                              <Text className={styles.dimensionActivityStore}>{activity.storeName}</Text>
                              <View className={styles.dimensionActivityBadges}>
                                {activityConversion >= 30 && (
                                  <View className={classnames(styles.dimensionBadge, styles.badgeHighConversion, styles.badgeSmall)}>
                                    高转化
                                  </View>
                                )}
                                {activityRating < 3 && (
                                  <View className={classnames(styles.dimensionBadge, styles.badgeLowRating, styles.badgeSmall)}>
                                    低评分
                                  </View>
                                )}
                              </View>
                            </View>
                            <Text className={styles.dimensionActivityProduct}>{activity.productName}</Text>
                            <Text className={styles.dimensionActivityTime}>
                              {formatDateTime(activity.startTime)}
                            </Text>
                          </View>
                          <View className={styles.dimensionActivityStats}>
                            <Text className={styles.dimensionActivityStat}>
                              试吃 {activity.usedSamples}
                            </Text>
                            <Text className={styles.dimensionActivityStat}>
                              购买 {activity.purchaseCount}
                            </Text>
                          </View>
                          <Text className={styles.timelineItemArrow}>
                            {expandedActivityId === activity.id ? '▲' : '▼'}
                          </Text>
                        </View>

                        {expandedActivityId === activity.id && renderActivityDetail(activity)}
                      </View>
                    )
                  })}
                </View>
              )}

              <View className={styles.dimensionCardExpandHint}>
                {expandedDimensionKey === dimension.key ? '▲ 点击收起' : '▼ 点击展开查看活动列表'}
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const renderCompareView = () => {
    if (!compareActivity1 || !compareActivity2 || !compareReportData1 || !compareReportData2) {
      return (
        <View className={styles.emptyCompare}>
          <EmptyState
            title="请选择两场活动进行对比"
            description="切换到列表视图，选择两场活动后点击对比按钮"
            icon="⚖️"
          />
          <Button className={styles.switchToListBtn} onClick={() => setViewMode('list')}>
            去选择活动
          </Button>
        </View>
      )
    }

    const r1 = compareReportData1
    const r2 = compareReportData2
    const maxCompareTag = Math.max(
      ...r1.topTasteTags.map(t => t.count),
      ...r2.topTasteTags.map(t => t.count),
      1
    )

    return (
      <View className={styles.compareSection}>
        <View className={styles.compareHeader}>
          <Button className={styles.backToListBtn} onClick={() => setViewMode('list')}>
            ← 返回列表
          </Button>
          <Text className={styles.compareTitle}>活动对比分析</Text>
          <Button className={styles.clearCompareBtn} onClick={handleClearCompare}>
            清除选择
          </Button>
        </View>

        <View className={styles.compareGrid}>
          <View className={styles.compareHeaderRow}>
            <View className={styles.compareHeaderCell}></View>
            <View
              className={classnames(
                styles.compareActivityHeader,
                winnerId === compareActivity1.id && styles.compareWinner
              )}
            >
              {winnerId === compareActivity1.id && (
                <View className={styles.winnerBadge}>👑</View>
              )}
              <Image className={styles.compareActivityImage} src={compareActivity1.productImage} mode="aspectFill" />
              <Text className={styles.compareActivityName}>{compareActivity1.productName}</Text>
              <Text className={styles.compareActivityStore}>{compareActivity1.storeName}</Text>
            </View>
            <View
              className={classnames(
                styles.compareActivityHeader,
                winnerId === compareActivity2.id && styles.compareWinner
              )}
            >
              {winnerId === compareActivity2.id && (
                <View className={styles.winnerBadge}>👑</View>
              )}
              <Image className={styles.compareActivityImage} src={compareActivity2.productImage} mode="aspectFill" />
              <Text className={styles.compareActivityName}>{compareActivity2.productName}</Text>
              <Text className={styles.compareActivityStore}>{compareActivity2.storeName}</Text>
            </View>
          </View>

          <View className={styles.compareRow}>
            <Text className={styles.compareLabel}>试吃人数</Text>
            <View className={styles.compareValue}>
              <Text className={styles.compareNumber}>{r1.totalTasters}</Text>
              {getDifferenceIndicator(r1.totalTasters, r2.totalTasters)}
            </View>
            <View className={styles.compareValue}>
              <Text className={styles.compareNumber}>{r2.totalTasters}</Text>
            </View>
          </View>

          <View className={styles.compareRow}>
            <Text className={styles.compareLabel}>购买人数</Text>
            <View className={styles.compareValue}>
              <Text className={styles.compareNumber}>{r1.purchaseCount}</Text>
              {getDifferenceIndicator(r1.purchaseCount, r2.purchaseCount)}
            </View>
            <View className={styles.compareValue}>
              <Text className={styles.compareNumber}>{r2.purchaseCount}</Text>
            </View>
          </View>

          <View className={styles.compareRow}>
            <Text className={styles.compareLabel}>转化率</Text>
            <View className={styles.compareValue}>
              <Text className={classnames(
                styles.compareNumber,
                r1.conversionRate >= 50 ? styles.valueSuccess :
                r1.conversionRate >= 30 ? styles.valueWarning : styles.valueError
              )}>{r1.conversionRate}%</Text>
              {getDifferenceIndicator(r1.conversionRate, r2.conversionRate)}
            </View>
            <View className={styles.compareValue}>
              <Text className={classnames(
                styles.compareNumber,
                r2.conversionRate >= 50 ? styles.valueSuccess :
                r2.conversionRate >= 30 ? styles.valueWarning : styles.valueError
              )}>{r2.conversionRate}%</Text>
            </View>
          </View>

          <View className={styles.compareRow}>
            <Text className={styles.compareLabel}>平均评分</Text>
            <View className={styles.compareValue}>
              <Text className={styles.compareNumber}>⭐ {r1.avgTasteRating}</Text>
              {getDifferenceIndicator(r1.avgTasteRating, r2.avgTasteRating)}
            </View>
            <View className={styles.compareValue}>
              <Text className={styles.compareNumber}>⭐ {r2.avgTasteRating}</Text>
            </View>
          </View>

          <View className={styles.compareTagsSection}>
            <Text className={styles.compareSectionTitle}>🏷️ 口味标签对比</Text>
            <View className={styles.compareTagsRow}>
              <View className={styles.compareTagsColumn}>
                {r1.topTasteTags.slice(0, 5).map((tag, i) => (
                  <View key={i} className={styles.compareTagItem}>
                    <Text className={styles.compareTagName}>{tag.tag}</Text>
                    <View className={styles.compareTagBar}>
                      <View
                        className={classnames(styles.compareTagFill, styles.tagFill1)}
                        style={{ width: `${(tag.count / maxCompareTag) * 100}%` }}
                      ></View>
                    </View>
                    <Text className={styles.compareTagCount}>{tag.count}</Text>
                  </View>
                ))}
              </View>
              <View className={styles.compareTagsColumn}>
                {r2.topTasteTags.slice(0, 5).map((tag, i) => (
                  <View key={i} className={styles.compareTagItem}>
                    <Text className={styles.compareTagName}>{tag.tag}</Text>
                    <View className={styles.compareTagBar}>
                      <View
                        className={classnames(styles.compareTagFill, styles.tagFill2)}
                        style={{ width: `${(tag.count / maxCompareTag) * 100}%` }}
                      ></View>
                    </View>
                    <Text className={styles.compareTagCount}>{tag.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View className={styles.compareTimeSection}>
            <Text className={styles.compareSectionTitle}>⏰ 时段分布对比</Text>
            <View className={styles.compareTimeChart}>
              {r1.timeDistribution.map((item, i) => {
                const count2 = r2.timeDistribution.find(t => t.hour === item.hour)?.count || 0
                const max = Math.max(item.count, count2, 1)
                return (
                  <View key={i} className={styles.compareTimeItem}>
                    <Text className={styles.compareTimeLabel}>{item.hour}</Text>
                    <View className={styles.compareTimeBars}>
                      <View className={styles.compareTimeBarGroup}>
                        <View
                          className={classnames(styles.compareTimeFill, styles.timeFill1)}
                          style={{ height: `${(item.count / max) * 100}%` }}
                        ></View>
                        <Text className={styles.compareTimeCount}>{item.count}</Text>
                      </View>
                      <View className={styles.compareTimeBarGroup}>
                        <View
                          className={classnames(styles.compareTimeFill, styles.timeFill2)}
                          style={{ height: `${(count2 / max) * 100}%` }}
                        ></View>
                        <Text className={styles.compareTimeCount}>{count2}</Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
            <View className={styles.compareLegend}>
              <View className={styles.legendItem}>
                <View className={classnames(styles.legendDot, styles.timeFill1)}></View>
                <Text>{compareActivity1.productName.split(' ')[0]}</Text>
              </View>
              <View className={styles.legendItem}>
                <View className={classnames(styles.legendDot, styles.timeFill2)}></View>
                <Text>{compareActivity2.productName.split(' ')[0]}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className={styles.compareConclusionSection}>
          <Text className={styles.compareSectionTitle}>📝 对比结论</Text>

          <View className={styles.winnerSelector}>
            <Text className={styles.winnerSelectorLabel}>选择胜出活动：</Text>
            <View className={styles.winnerButtons}>
              <Button
                className={classnames(
                  styles.winnerButton,
                  winnerId === compareActivity1.id && styles.winnerButtonActive
                )}
                onClick={() => setWinnerId(compareActivity1.id)}
              >
                👑 {compareActivity1.productName.split(' ')[0]}
              </Button>
              <Button
                className={classnames(
                  styles.winnerButton,
                  winnerId === compareActivity2.id && styles.winnerButtonActive
                )}
                onClick={() => setWinnerId(compareActivity2.id)}
              >
                👑 {compareActivity2.productName.split(' ')[0]}
              </Button>
            </View>
          </View>

          <View className={styles.reasonInput}>
            <Text className={styles.reasonInputLabel}>
              对比原因（{comparisonReason.length}/200）
            </Text>
            <Textarea
              className={styles.reasonTextarea}
              placeholder="请输入对比分析原因，例如：活动1在转化率上表现更优，主要因为..."
              value={comparisonReason}
              onInput={(e) => setComparisonReason(e.detail.value.slice(0, 200))}
              maxlength={200}
              autoHeight
            />
          </View>

          <Button
            className={styles.saveConclusionBtn}
            onClick={handleSaveComparison}
            disabled={!winnerId || !comparisonReason.trim()}
          >
            💾 保存对比结论
          </Button>
        </View>
      </View>
    )
  }

  const renderComparisonsView = () => {
    if (comparisonRecords.length === 0) {
      return (
        <View className={styles.emptyReport}>
          <EmptyState
            title="暂无历史对比记录"
            description="在对比视图中保存对比结论后，记录将显示在这里"
            icon="📋"
          />
          <Button className={styles.switchToListBtn} onClick={() => setViewMode('list')}>
            去对比活动
          </Button>
        </View>
      )
    }

    return (
      <View className={styles.comparisonsSection}>
        <Text className={styles.comparisonsTitle}>
          📋 历史对比记录（共{comparisonRecords.length}条）
        </Text>

        {comparisonRecords.map((record) => {
          const act1 = record.activity1Snapshot
          const act2 = record.activity2Snapshot
          const isAct1Winner = record.winnerId === record.activityId1
          const isAct2Winner = record.winnerId === record.activityId2

          return (
            <View
              key={record.id}
              className={styles.comparisonRecordCard}
              onClick={() => handleViewComparisonDetail(record)}
            >
              <View className={styles.comparisonRecordHeader}>
                <Text className={styles.comparisonRecordTime}>
                  📅 {record.createdAt}
                </Text>
              </View>

              <View className={styles.comparisonRecordActivities}>
                <View className={styles.comparisonRecordActivity}>
                  {isAct1Winner && <View className={styles.winnerBadge}>👑</View>}
                  <Image
                    className={styles.comparisonRecordImage}
                    src={act1.productImage}
                    mode="aspectFill"
                  />
                  <View className={styles.comparisonRecordInfo}>
                    <Text className={styles.comparisonRecordProduct}>{act1.productName}</Text>
                    <Text className={styles.comparisonRecordStore}>{act1.storeName}</Text>
                  </View>
                  {isAct1Winner && (
                    <View className={styles.comparisonRecordWinnerTag}>胜出</View>
                  )}
                </View>

                <View className={styles.comparisonRecordVs}>VS</View>

                <View className={styles.comparisonRecordActivity}>
                  {isAct2Winner && <View className={styles.winnerBadge}>👑</View>}
                  <Image
                    className={styles.comparisonRecordImage}
                    src={act2.productImage}
                    mode="aspectFill"
                  />
                  <View className={styles.comparisonRecordInfo}>
                    <Text className={styles.comparisonRecordProduct}>{act2.productName}</Text>
                    <Text className={styles.comparisonRecordStore}>{act2.storeName}</Text>
                  </View>
                  {isAct2Winner && (
                    <View className={styles.comparisonRecordWinnerTag}>胜出</View>
                  )}
                </View>
              </View>

              <View className={styles.comparisonRecordReason}>
                <Text className={styles.comparisonRecordReasonLabel}>💡 对比原因：</Text>
                <Text className={styles.comparisonRecordReasonText}>{record.reason}</Text>
              </View>

              <View className={styles.comparisonRecordFooter}>
                <Text className={styles.comparisonRecordHint}>点击查看详细对比数据 →</Text>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  const hasAnyData = filteredActivities.length > 0

  const shouldShowOverview = viewMode !== 'compare' && viewMode !== 'comparisons' && viewMode !== 'manager'

  const shouldShowFilter = viewMode !== 'compare'

  return (
    <View className={styles.page}>
      {shouldShowFilter && (
        <View className={styles.filterBar}>
          <View
            className={classnames(styles.filterItem, selectedStore !== '全部' && styles.filterActive)}
            onClick={() => handleFilterClick('store', selectedStore)}
          >
            <Text>{selectedStore}</Text>
            <Text className={styles.filterArrow}>▼</Text>
          </View>
          <View
            className={classnames(styles.filterItem, selectedProduct !== '全部' && styles.filterActive)}
            onClick={() => handleFilterClick('product', selectedProduct)}
          >
            <Text>{selectedProduct}</Text>
            <Text className={styles.filterArrow}>▼</Text>
          </View>
          <View
            className={classnames(styles.filterItem, selectedPeriod !== '今日' && styles.filterActive)}
            onClick={() => handleFilterClick('period', selectedPeriod)}
          >
            <Text>{selectedPeriod}</Text>
            <Text className={styles.filterArrow}>▼</Text>
          </View>
        </View>
      )}

      <View className={styles.viewModeTabs}>
        <View
          className={classnames(styles.viewModeItem, viewMode === 'timeline' && styles.viewModeActive)}
          onClick={() => { setViewMode('timeline'); setCompareActivityIds([]) }}
        >
          📅 时间线
        </View>
        <View
          className={classnames(styles.viewModeItem, viewMode === 'list' && styles.viewModeActive)}
          onClick={() => setViewMode('list')}
        >
          📋 列表{compareActivityIds.length > 0 && `(${compareActivityIds.length}/2)`}
        </View>
        <View
          className={classnames(styles.viewModeItem, viewMode === 'manager' && styles.viewModeActive)}
          onClick={() => { setViewMode('manager'); setCompareActivityIds([]) }}
        >
          👔 主管
        </View>
        <View
          className={classnames(styles.viewModeItem, viewMode === 'comparisons' && styles.viewModeActive)}
          onClick={() => { setViewMode('comparisons'); setCompareActivityIds([]) }}
        >
          📊 对比记录
        </View>
      </View>

      {viewMode === 'list' && compareActivityIds.length > 0 && (
        <View className={styles.compareToolbar}>
          <Text className={styles.compareToolbarText}>已选 {compareActivityIds.length}/2 场活动</Text>
          <View className={styles.compareToolbarActions}>
            <Button
              className={classnames(styles.compareToolbarBtn, styles.btnClear)}
              onClick={handleClearCompare}
            >
              清除
            </Button>
            <Button
              className={classnames(
                styles.compareToolbarBtn,
                styles.btnCompare,
                compareActivityIds.length < 2 && styles.btnDisabled
              )}
              onClick={handleStartCompare}
              disabled={compareActivityIds.length < 2}
            >
              开始对比
            </Button>
          </View>
        </View>
      )}

      <ScrollView className={styles.content} scrollY>
        {viewMode === 'compare' ? (
          renderCompareView()
        ) : viewMode === 'manager' ? (
          renderManagerView()
        ) : viewMode === 'comparisons' ? (
          renderComparisonsView()
        ) : viewMode === 'timeline' ? (
          dailySummaries.length > 0 ? (
            <>
              {shouldShowOverview && reportData && (
                <View className={styles.overviewCard}>
                  <View className={styles.overviewHeader}>
                    <View>
                      <Text className={styles.overviewTitle}>活动汇总</Text>
                      <Text className={styles.overviewPeriod}>{reportData.period}</Text>
                    </View>
                    <View className={classnames(styles.overviewBadge, styles.badgeMulti)}>
                      {filteredActivities.length}场汇总
                    </View>
                  </View>
                  <View className={styles.overviewStats}>
                    <View className={styles.overviewStat}>
                      <Text className={styles.overviewValue}>{reportData.totalTasters}</Text>
                      <Text className={styles.overviewLabel}>试吃总人数</Text>
                    </View>
                    <View className={styles.overviewStat}>
                      <Text className={styles.overviewValue}>{reportData.purchaseCount}</Text>
                      <Text className={styles.overviewLabel}>购买人数</Text>
                    </View>
                    <View className={styles.overviewStat}>
                      <Text className={styles.overviewValue}>{reportData.conversionRate}%</Text>
                      <Text className={styles.overviewLabel}>购买转化率</Text>
                    </View>
                    <View className={styles.overviewStat}>
                      <Text className={styles.overviewValue}>{reportData.avgTasteRating}</Text>
                      <Text className={styles.overviewLabel}>平均口味评分</Text>
                    </View>
                  </View>
                </View>
              )}
              {renderTimelineView()}
              <Button className={styles.exportBtn} onClick={handleExport}>
                📤 导出复盘报告
              </Button>
            </>
          ) : (
            <View className={styles.emptyReport}>
              <EmptyState
                title="暂无复盘数据"
                description={activityHistory.length > 0 ? '请调整筛选条件查看数据' : '活动结束后将自动生成复盘报告'}
                icon="📊"
              />
              {activityHistory.length > 0 && (
                <Text className={styles.emptyHint}>
                  已有 {activityHistory.length} 条历史活动记录，请尝试选择不同筛选条件
                </Text>
              )}
            </View>
          )
        ) : hasAnyData ? (
          <>
            {shouldShowOverview && reportData && (
              <View className={styles.overviewCard}>
                <View className={styles.overviewHeader}>
                  <View>
                    <Text className={styles.overviewTitle}>活动汇总</Text>
                    <Text className={styles.overviewPeriod}>{reportData.period}</Text>
                  </View>
                  <View className={classnames(styles.overviewBadge, styles.badgeMulti)}>
                    {filteredActivities.length}场汇总
                  </View>
                </View>
                <View className={styles.overviewStats}>
                  <View className={styles.overviewStat}>
                    <Text className={styles.overviewValue}>{reportData.totalTasters}</Text>
                    <Text className={styles.overviewLabel}>试吃总人数</Text>
                  </View>
                  <View className={styles.overviewStat}>
                    <Text className={styles.overviewValue}>{reportData.purchaseCount}</Text>
                    <Text className={styles.overviewLabel}>购买人数</Text>
                  </View>
                  <View className={styles.overviewStat}>
                    <Text className={styles.overviewValue}>{reportData.conversionRate}%</Text>
                    <Text className={styles.overviewLabel}>购买转化率</Text>
                  </View>
                  <View className={styles.overviewStat}>
                    <Text className={styles.overviewValue}>{reportData.avgTasteRating}</Text>
                    <Text className={styles.overviewLabel}>平均口味评分</Text>
                  </View>
                </View>
              </View>
            )}

            <View className={styles.activityListSection}>
              <Text className={styles.sectionTitle}>
                📋 活动列表
                <Text className={styles.listCount}>({filteredActivities.length}场，点击勾选对比)</Text>
              </Text>
              <View className={styles.activityListVertical}>
                {filteredActivities.map((activity) => (
                  <View
                    key={activity.id}
                    className={classnames(
                      styles.activityListItem,
                      expandedActivityId === activity.id && styles.activityItemExpanded
                    )}
                    onClick={() => handleExpandActivity(activity.id)}
                  >
                    <View className={styles.activityListItemHeader}>
                      <View
                        className={classnames(
                          styles.compareCheckbox,
                          styles.compareCheckboxLarge,
                          compareActivityIds.includes(activity.id) && styles.compareChecked
                        )}
                        onClick={(e) => { e.stopPropagation(); handleToggleCompare(activity.id) }}
                      >
                        {compareActivityIds.includes(activity.id) && '✓'}
                      </View>
                      <Image
                        className={styles.activityListItemImage}
                        src={activity.productImage}
                        mode="aspectFill"
                      />
                      <View className={styles.activityListItemInfo}>
                        <Text className={styles.activityListItemStore}>{activity.storeName}</Text>
                        <Text className={styles.activityListItemProduct}>{activity.productName}</Text>
                        <Text className={styles.activityListItemTime}>
                          {formatDateTime(activity.startTime)}
                        </Text>
                      </View>
                      <View className={styles.activityListItemStats}>
                        <Text className={styles.activityListItemStat}>
                          试吃 {activity.usedSamples}
                        </Text>
                        <Text className={styles.activityListItemStat}>
                          购买 {activity.purchaseCount}
                        </Text>
                      </View>
                      <Text className={styles.timelineItemArrow}>
                        {expandedActivityId === activity.id ? '▲' : '▼'}
                      </Text>
                    </View>

                    {activity.usedSamples === 0 && activity.abnormalReports.length > 0 && (
                      <View className={styles.zeroTastingNotice}>
                        ⚠️ 本场无试吃反馈，但有 {activity.abnormalReports.length} 条异常记录
                      </View>
                    )}

                    {expandedActivityId === activity.id && renderActivityDetail(activity)}
                  </View>
                ))}
              </View>
            </View>

            <Button className={styles.exportBtn} onClick={handleExport}>
              📤 导出复盘报告
            </Button>
          </>
        ) : (
          <View className={styles.emptyReport}>
            <EmptyState
              title="暂无复盘数据"
              description={activityHistory.length > 0 ? '请调整筛选条件查看数据' : '活动结束后将自动生成复盘报告'}
              icon="📊"
            />
            {activityHistory.length > 0 && (
              <Text className={styles.emptyHint}>
                已有 {activityHistory.length} 条历史活动记录，请尝试选择不同筛选条件
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {showFilterModal && (
        <View className={styles.filterModal} onClick={() => setShowFilterModal(null)}>
          <View className={styles.filterContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.filterModalTitle}>
              选择{showFilterModal === 'store' ? '门店' : showFilterModal === 'product' ? '商品' : '时段'}
            </Text>
            <ScrollView className={styles.filterOptions} scrollY>
              {getFilterOptions().map((option, index) => (
                <View
                  key={index}
                  className={classnames(
                    styles.filterOption,
                    tempFilterValue === option && styles.optionSelected
                  )}
                  onClick={() => handleFilterSelect(option)}
                >
                  <Text>{option}</Text>
                  {tempFilterValue === option && (
                    <Text className={styles.filterCheck}>✓</Text>
                  )}
                </View>
              ))}
            </ScrollView>
            <View className={styles.filterModalActions}>
              <Button
                className={classnames(styles.filterModalBtn, styles.btnCancel)}
                onClick={() => setShowFilterModal(null)}
              >
                取消
              </Button>
              <Button
                className={classnames(styles.filterModalBtn, styles.btnConfirm)}
                onClick={handleFilterConfirm}
              >
                确定
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default ReportPage
