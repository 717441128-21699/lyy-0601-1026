import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, Button, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { ReportData, Activity } from '@/types'
import EmptyState from '@/components/EmptyState'
import { useActivityStore } from '@/store/useActivityStore'
import { formatDateTime, formatTime } from '@/utils'
import { abnormalTypeLabels } from '@/data/feedbacks'

const ReportPage: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState('全部')
  const [selectedProduct, setSelectedProduct] = useState('全部')
  const [selectedPeriod, setSelectedPeriod] = useState('今日')
  const [showFilterModal, setShowFilterModal] = useState<string | null>(null)
  const [tempFilterValue, setTempFilterValue] = useState('')
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)

  const { getReportData, activityHistory, currentActivity, getActivityAbnormalReports, getActivityById } = useActivityStore()

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
    })
  }, [selectedStore, selectedProduct, selectedPeriod, activityHistory, currentActivity])

  const reportData: ReportData | null = useMemo(() => {
    return getReportData(selectedStore, selectedProduct, selectedPeriod, selectedActivityId || undefined)
  }, [selectedStore, selectedProduct, selectedPeriod, selectedActivityId, getReportData])

  const selectedActivity = useMemo(() => {
    if (!selectedActivityId) return null
    return getActivityById(selectedActivityId)
  }, [selectedActivityId, getActivityById])

  const maxTimeCount = useMemo(() => {
    if (!reportData) return 1
    return Math.max(...reportData.timeDistribution.map(d => d.count), 1)
  }, [reportData])

  const maxAgeCount = useMemo(() => {
    if (!reportData) return 1
    return Math.max(...reportData.ageDistribution.map(d => d.count), 1)
  }, [reportData])

  const maxTagCount = useMemo(() => {
    if (!reportData) return 1
    return Math.max(...reportData.topTasteTags.map(d => d.count), 1)
  }, [reportData])

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

  const abnormalReports = useMemo(() => {
    if (selectedActivityId) {
      return getActivityAbnormalReports(selectedActivityId)
    }
    if (reportData) {
      const activityIds = reportData.activityId.split(',')
      const reports: any[] = []
      activityIds.forEach(id => {
        reports.push(...getActivityAbnormalReports(id))
      })
      return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return []
  }, [selectedActivityId, reportData, getActivityAbnormalReports])

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
    console.log('[Report] 选中活动:', selectedActivityId)
    console.log('[Report] 复盘数据:', reportData)
  }, [selectedStore, selectedProduct, selectedPeriod, filteredActivities, selectedActivityId, reportData])

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
    setSelectedActivityId(null)
    setShowFilterModal(null)
  }

  const getFilterOptions = () => {
    if (showFilterModal === 'store') return storeOptions
    if (showFilterModal === 'product') return productOptions
    if (showFilterModal === 'period') return periodOptions
    return []
  }

  const getAgeRingClass = (index: number) => {
    const classes = ['ageRingChild', 'ageRingTeen', 'ageRingAdult', 'ageRingSenior']
    return classes[index] || 'ageRingChild'
  }

  const getTagFontSize = (count: number) => {
    const ratio = count / maxTagCount
    if (ratio > 0.8) return '32rpx'
    if (ratio > 0.5) return '28rpx'
    if (ratio > 0.2) return '26rpx'
    return '24rpx'
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

  const handleSelectActivity = (activityId: string) => {
    if (selectedActivityId === activityId) {
      setSelectedActivityId(null)
    } else {
      setSelectedActivityId(activityId)
    }
  }

  const hasData = reportData && reportData.totalTasters > 0

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

      <ScrollView className={styles.content} scrollY>
        {filteredActivities.length > 0 && (
          <View className={styles.activityListSection}>
            <Text className={styles.sectionTitle}>
              📋 活动列表
              <Text className={styles.listCount}>({filteredActivities.length}场)</Text>
            </Text>
            <ScrollView className={styles.activityListScroll} scrollX>
              {filteredActivities.map((activity) => (
                <View
                  key={activity.id}
                  className={classnames(styles.activityMiniCard, selectedActivityId === activity.id && styles.activityCardSelected)}
                  onClick={() => handleSelectActivity(activity.id)}
                >
                  <Text className={styles.activityMiniStore}>{activity.storeName}</Text>
                  <Text className={styles.activityMiniProduct}>{activity.productName}</Text>
                  <Text className={styles.activityMiniTime}>
                    {formatDateTime(activity.startTime)}
                  </Text>
                  <View className={styles.activityMiniStats}>
                    <Text className={styles.activityMiniStat}>
                      试吃 {activity.usedSamples}
                    </Text>
                    <Text className={styles.activityMiniStat}>
                      购买 {activity.purchaseCount}
                    </Text>
                  </View>
                  {selectedActivityId === activity.id && (
                    <View className={styles.selectedIndicator}>✓ 已选中</View>
                  )}
                </View>
              ))}
            </ScrollView>
            {selectedActivityId && (
              <Text className={styles.clearSelection} onClick={() => setSelectedActivityId(null)}>
                清除选中，查看汇总
              </Text>
            )}
          </View>
        )}

        {hasData ? (
          <>
            <View className={styles.overviewCard}>
              <View className={styles.overviewHeader}>
                <View>
                  <Text className={styles.overviewTitle}>
                    {selectedActivity ? '单场活动复盘' : '活动汇总报告'}
                  </Text>
                  <Text className={styles.overviewPeriod}>{reportData!.period}</Text>
                </View>
                <View className={classnames(
                  styles.overviewBadge,
                  selectedActivity ? styles.badgeSingle : styles.badgeMulti
                )}>
                  {selectedActivity ? '单场数据' : `${filteredActivities.length}场汇总`}
                </View>
              </View>
              <View className={styles.overviewStats}>
                <View className={styles.overviewStat}>
                  <Text className={styles.overviewValue}>{reportData!.totalTasters}</Text>
                  <Text className={styles.overviewLabel}>试吃总人数</Text>
                </View>
                <View className={styles.overviewStat}>
                  <Text className={styles.overviewValue}>{reportData!.purchaseCount}</Text>
                  <Text className={styles.overviewLabel}>购买人数</Text>
                </View>
                <View className={styles.overviewStat}>
                  <Text className={styles.overviewValue}>{reportData!.conversionRate}%</Text>
                  <Text className={styles.overviewLabel}>购买转化率</Text>
                </View>
                <View className={styles.overviewStat}>
                  <Text className={styles.overviewValue}>{reportData!.avgTasteRating}</Text>
                  <Text className={styles.overviewLabel}>平均口味评分</Text>
                </View>
              </View>
            </View>

            <View className={styles.sectionCard}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>⏰ 时段分布</Text>
                <Text className={styles.sectionMore}>按小时统计</Text>
              </View>
              <View className={styles.timeChart}>
                {reportData!.timeDistribution.map((item, index) => {
                  const widthPercent = (item.count / maxTimeCount) * 100
                  return (
                    <View key={index} className={styles.timeBar}>
                      <Text className={styles.timeLabel}>{item.hour}</Text>
                      <View className={styles.timeBarFill}>
                        <View
                          className={styles.timeBarInner}
                          style={{ width: `${Math.max(widthPercent, 10)}%` }}
                        >
                          {item.count > 0 && (
                            <Text className={styles.timeBarCount}>{item.count}人</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>

            <View className={styles.sectionCard}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>👥 年龄分布</Text>
                <Text className={styles.sectionMore}>共 {reportData!.totalTasters} 人</Text>
              </View>
              <View className={styles.ageChart}>
                {reportData!.ageDistribution.map((item, index) => {
                  const progress = (item.count / maxAgeCount) * 100
                  return (
                    <View key={index} className={styles.ageItem}>
                      <View
                        className={classnames(styles.ageRing, styles[getAgeRingClass(index)])}
                        style={{ '--progress': `${progress}%` } as React.CSSProperties}
                      >
                        <View className={styles.ageRingInner}>
                          {item.count}
                        </View>
                      </View>
                      <View className={styles.ageInfo}>
                        <Text className={styles.ageName}>{item.group}</Text>
                        <Text className={styles.ageCount}>
                          占比 {reportData!.totalTasters > 0 ? ((item.count / reportData!.totalTasters) * 100).toFixed(1) : 0}%
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>

            <View className={styles.sectionCard}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>🏷️ 热门评价</Text>
                <Text className={styles.sectionMore}>口味标签</Text>
              </View>
              <View className={styles.tagsCloud}>
                {reportData!.topTasteTags.length > 0 ? (
                  reportData!.topTasteTags.map((item, index) => (
                    <View
                      key={index}
                      className={styles.tagCloudItem}
                      style={{ fontSize: getTagFontSize(item.count) }}
                    >
                      <Text className={styles.tagCloudText}>{item.tag}</Text>
                      <Text className={styles.tagCloudCount}>{item.count}</Text>
                    </View>
                  ))
                ) : (
                  <Text className={styles.noTags}>暂无评价标签</Text>
                )}
              </View>
            </View>

            {abnormalReports.length > 0 && (
              <View className={styles.sectionCard}>
                <View className={styles.sectionHeader}>
                  <Text className={styles.sectionTitle}>⚠️ 异常上报记录</Text>
                  <Text className={styles.sectionMore}>共 {abnormalReports.length} 条</Text>
                </View>
                <View className={styles.reportList}>
                  {abnormalReports.slice(0, 5).map((report) => (
                    <View key={report.id} className={styles.reportItem}>
                      <View className={styles.reportHeader}>
                        <View
                          className={classnames(styles.reportType, styles[getTypeClass(report.type)])}
                        >
                          {abnormalTypeLabels[report.type]}
                        </View>
                        <Text className={styles.reportTime}>{formatTime(report.createdAt)}</Text>
                      </View>
                      <Text className={styles.reportDesc}>{report.description}</Text>
                    </View>
                  ))}
                  {abnormalReports.length > 5 && (
                    <Text className={styles.moreReports}>还有 {abnormalReports.length - 5} 条记录</Text>
                  )}
                </View>
              </View>
            )}

            <View className={styles.sectionCard}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>📋 活动信息</Text>
              </View>
              {selectedActivity ? (
                <View className={styles.activityInfo}>
                  <Image
                    className={styles.activityImage}
                    src={selectedActivity.productImage}
                    mode="aspectFill"
                  />
                  <View className={styles.activityDetail}>
                    <Text className={styles.activityName}>{selectedActivity.productName}</Text>
                    <Text className={styles.activityStore}>📍 {selectedActivity.storeName}</Text>
                    <Text className={styles.activityTime}>
                      活动时间：{formatDateTime(selectedActivity.startTime)} - {formatDateTime(selectedActivity.endTime || selectedActivity.startTime)}
                    </Text>
                    <Text className={styles.activitySamples}>
                      样品使用：{selectedActivity.usedSamples}/{selectedActivity.targetSamples} 份
                    </Text>
                  </View>
                </View>
              ) : (
                <View className={styles.multiActivityInfo}>
                  <Text className={styles.multiInfoText}>
                    本次汇总包含 <Text className={styles.highlight}>{filteredActivities.length}</Text> 场活动
                  </Text>
                  <Text className={styles.multiInfoText}>
                    覆盖 <Text className={styles.highlight}>{new Set(filteredActivities.map(a => a.storeName)).size}</Text> 家门店
                  </Text>
                  <Text className={styles.multiInfoText}>
                    共 <Text className={styles.highlight}>{reportData!.totalTasters}</Text> 人参与试吃
                  </Text>
                </View>
              )}
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
