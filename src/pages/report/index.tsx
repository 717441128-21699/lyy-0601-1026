import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, Button, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { ReportData, Activity, Feedback } from '@/types'
import EmptyState from '@/components/EmptyState'
import { useActivityStore } from '@/store/useActivityStore'
import { formatDateTime, formatTime, formatDate } from '@/utils'
import { abnormalTypeLabels } from '@/data/feedbacks'
import dayjs from 'dayjs'

type ViewMode = 'timeline' | 'list' | 'compare'

const ReportPage: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState('全部')
  const [selectedProduct, setSelectedProduct] = useState('全部')
  const [selectedPeriod, setSelectedPeriod] = useState('今日')
  const [showFilterModal, setShowFilterModal] = useState<string | null>(null)
  const [tempFilterValue, setTempFilterValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null)
  const [compareActivityIds, setCompareActivityIds] = useState<string[]>([])

  const { getReportData, activityHistory, currentActivity, getActivityById } = useActivityStore()

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

  const activitiesByDate = useMemo(() => {
    const groups: Record<string, Activity[]> = {}
    filteredActivities.forEach(act => {
      const date = formatDate(act.startTime)
      if (!groups[date]) groups[date] = []
      groups[date].push(act)
    })
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
  }, [filteredActivities])

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
  }, [selectedStore, selectedProduct, selectedPeriod, filteredActivities, compareActivityIds])

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
  }

  const handleStartCompare = () => {
    if (compareActivityIds.length === 2) {
      setViewMode('compare')
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

  const renderTimelineView = () => (
    <View className={styles.timelineSection}>
      {activitiesByDate.map(([date, activities]) => (
        <View key={date} className={styles.timelineDateGroup}>
          <View className={styles.timelineDateHeader}>
            <View className={styles.timelineDateDot}></View>
            <Text className={styles.timelineDateText}>{date}</Text>
            <Text className={styles.timelineDateCount}>{activities.length}场</Text>
          </View>
          <View className={styles.timelineList}>
            {activities.map((activity) => (
              <View key={activity.id} className={styles.timelineItem}>
                <View className={styles.timelineItemLine}></View>
                <View
                  className={classnames(
                    styles.timelineItemCard,
                    expandedActivityId === activity.id && styles.timelineCardExpanded
                  )}
                  onClick={() => handleExpandActivity(activity.id)}
                >
                  <View className={styles.timelineItemHeader}>
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
                    {viewMode === 'list' && (
                      <View
                        className={classnames(
                          styles.compareCheckbox,
                          compareActivityIds.includes(activity.id) && styles.compareChecked
                        )}
                        onClick={(e) => { e.stopPropagation(); handleToggleCompare(activity.id) }}
                      >
                        {compareActivityIds.includes(activity.id) && '✓'}
                      </View>
                    )}
                    <Text className={styles.timelineItemArrow}>
                      {expandedActivityId === activity.id ? '▲' : '▼'}
                    </Text>
                  </View>

                  {expandedActivityId === activity.id && (
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
                            <Text className={styles.detailStatValue}>
                              {activity.usedSamples > 0 ? ((activity.purchaseCount / activity.usedSamples) * 100).toFixed(1) : 0}%
                            </Text>
                            <Text className={styles.detailStatLabel}>转化率</Text>
                          </View>
                          <View className={styles.detailStat}>
                            <Text className={styles.detailStatValue}>
                              {activity.feedbacks.length > 0
                                ? (activity.feedbacks.reduce((s: number, f: Feedback) => s + f.tasteRating, 0) / activity.feedbacks.length).toFixed(1)
                                : '—'}
                            </Text>
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
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )

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
            <View className={styles.compareActivityHeader}>
              <Image className={styles.compareActivityImage} src={compareActivity1.productImage} mode="aspectFill" />
              <Text className={styles.compareActivityName}>{compareActivity1.productName}</Text>
              <Text className={styles.compareActivityStore}>{compareActivity1.storeName}</Text>
            </View>
            <View className={styles.compareActivityHeader}>
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
      </View>
    )
  }

  const hasAnyData = filteredActivities.length > 0

  return (
    <View className={styles.page}>
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

      <View className={styles.viewModeBar}>
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
          className={classnames(styles.viewModeItem, viewMode === 'compare' && styles.viewModeActive)}
          onClick={() => setViewMode('compare')}
        >
          ⚖️ 对比
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
        ) : hasAnyData ? (
          <>
            {reportData && (
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

            {viewMode === 'timeline' ? (
              renderTimelineView()
            ) : (
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

                      {expandedActivityId === activity.id && (
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
                                <Text className={styles.detailStatValue}>
                                  {activity.usedSamples > 0 ? ((activity.purchaseCount / activity.usedSamples) * 100).toFixed(1) : 0}%
                                </Text>
                                <Text className={styles.detailStatLabel}>转化率</Text>
                              </View>
                              <View className={styles.detailStat}>
                                <Text className={styles.detailStatValue}>
                                  {activity.feedbacks.length > 0
                                    ? (activity.feedbacks.reduce((s: number, f: Feedback) => s + f.tasteRating, 0) / activity.feedbacks.length).toFixed(1)
                                    : '—'}
                                </Text>
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
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

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
