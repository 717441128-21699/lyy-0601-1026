import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, Button, Input, ScrollView, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useActivityStore } from '@/store/useActivityStore'
import StatCard from '@/components/StatCard'
import EmptyState from '@/components/EmptyState'
import { calculateConversionRate, formatTime, formatDateTime } from '@/utils'
import { abnormalTypeLabels } from '@/data/feedbacks'
import { AbnormalType, Activity } from '@/types'

const InventoryPage: React.FC = () => {
  const {
    currentActivity,
    addAbnormalReport,
    updateSamples,
    activityHistory
  } = useActivityStore()

  const [sampleCount, setSampleCount] = useState(currentActivity?.remainingSamples || 0)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<AbnormalType | ''>('')
  const [reportDesc, setReportDesc] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [selectedHistoryActivity, setSelectedHistoryActivity] = useState<Activity | null>(null)

  useEffect(() => {
    if (currentActivity) {
      setSampleCount(currentActivity.remainingSamples)
      setInputValue(String(currentActivity.remainingSamples))
    } else {
      setSampleCount(0)
      setInputValue('')
    }
  }, [currentActivity?.remainingSamples, currentActivity?.id])

  const displayActivity = selectedHistoryActivity || currentActivity

  const stats = useMemo(() => {
    if (!displayActivity) {
      return { tasters: 0, buyers: 0, rate: 0, remaining: 0, used: 0, target: 50 }
    }
    const rate = calculateConversionRate(displayActivity.usedSamples, displayActivity.purchaseCount)
    return {
      tasters: displayActivity.usedSamples,
      buyers: displayActivity.purchaseCount,
      rate,
      remaining: displayActivity.remainingSamples,
      used: displayActivity.usedSamples,
      target: displayActivity.targetSamples
    }
  }, [displayActivity])

  const commonProblems = useMemo(() => {
    if (!displayActivity) return []
    const problems: Record<string, number> = {}
    displayActivity.feedbacks
      .filter(f => f.notPurchaseReason)
      .forEach(f => {
        const reason = f.notPurchaseReason!
        problems[reason] = (problems[reason] || 0) + 1
      })
    return Object.entries(problems)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [displayActivity])

  const progressPercent = useMemo(() => {
    if (!displayActivity || displayActivity.targetSamples === 0) return 0
    return Math.min((displayActivity.usedSamples / displayActivity.targetSamples) * 100, 100)
  }, [displayActivity])

  const validateAndUpdateSamples = (newRemaining: number) => {
    if (!currentActivity || currentActivity.status !== 'ongoing') return

    const target = currentActivity.targetSamples
    const validRemaining = Math.max(0, Math.min(newRemaining, target))
    const validUsed = target - validRemaining

    if (validUsed < 0) {
      console.error('[Samples] 已使用数量不能为负数')
      Taro.showToast({ title: '数量不能超过目标值', icon: 'none' })
      return
    }

    setSampleCount(validRemaining)
    setInputValue(String(validRemaining))
    updateSamples(validUsed, validRemaining)
  }

  const handleSampleChange = (delta: number) => {
    if (!currentActivity || currentActivity.status !== 'ongoing') {
      Taro.showToast({ title: '请先开始活动', icon: 'none' })
      return
    }
    if (selectedHistoryActivity) {
      Taro.showToast({ title: '历史活动数据不可修改', icon: 'none' })
      return
    }
    const newValue = sampleCount + delta
    validateAndUpdateSamples(newValue)
  }

  const handleSampleInput = (e: { detail: { value: string } }) => {
    const value = e.detail.value
    setInputValue(value)

    if (value === '' || value === '-') {
      return
    }

    const numValue = parseInt(value)
    if (isNaN(numValue)) {
      return
    }

    validateAndUpdateSamples(numValue)
  }

  const handleSampleBlur = () => {
    if (!currentActivity) return

    const value = parseInt(inputValue)
    if (isNaN(value) || inputValue === '') {
      const defaultValue = currentActivity.remainingSamples
      setSampleCount(defaultValue)
      setInputValue(String(defaultValue))
      return
    }

    validateAndUpdateSamples(value)
  }

  const handleAbnormalClick = (type: AbnormalType) => {
    if (!currentActivity || currentActivity.status !== 'ongoing') {
      Taro.showToast({ title: '请先开始活动', icon: 'none' })
      return
    }
    if (selectedHistoryActivity) {
      Taro.showToast({ title: '请切换到当前活动', icon: 'none' })
      return
    }
    setModalType(type)
    setReportDesc('')
    setShowModal(true)
  }

  const handleSubmitReport = () => {
    if (!reportDesc.trim()) {
      Taro.showToast({ title: '请输入问题描述', icon: 'none' })
      return
    }
    addAbnormalReport({
      type: modalType as AbnormalType,
      description: reportDesc.trim()
    })
    Taro.showToast({ title: '上报成功', icon: 'success' })
    setShowModal(false)
    setModalType('')
    setReportDesc('')
  }

  const abnormalOptions: { type: AbnormalType; label: string; icon: string; class: string }[] = [
    { type: 'out_of_stock', label: '缺货上报', icon: '⚠️', class: 'btnOutStock' },
    { type: 'price_error', label: '价格牌错误', icon: '❌', class: 'btnPriceError' },
    { type: 'competitor', label: '竞品活动', icon: '👀', class: 'btnCompetitor' }
  ]

  const currentReports = useMemo(() => {
    if (!displayActivity) return []
    return displayActivity.abnormalReports.slice().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [displayActivity])

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'out_of_stock': return 'typeOutStock'
      case 'price_error': return 'typePriceError'
      case 'competitor': return 'typeCompetitor'
      default: return ''
    }
  }

  const isActivityOngoing = currentActivity?.status === 'ongoing' && !selectedHistoryActivity
  const canModify = isActivityOngoing

  const handleSelectHistory = (activity: Activity) => {
    if (selectedHistoryActivity?.id === activity.id) {
      setSelectedHistoryActivity(null)
    } else {
      setSelectedHistoryActivity(activity)
    }
  }

  const handleBackToCurrent = () => {
    setSelectedHistoryActivity(null)
  }

  return (
    <View className={styles.page}>
      <ScrollView className={styles.content} scrollY>
        {activityHistory.length > 0 && !selectedHistoryActivity && (
          <View className={styles.historySection}>
            <Text className={styles.historyTitle}>📋 历史活动记录</Text>
            <ScrollView className={styles.historyScroll} scrollX>
              {activityHistory.map((activity) => (
                <View
                  key={activity.id}
                  className={styles.historyCard}
                  onClick={() => handleSelectHistory(activity)}
                >
                  <Text className={styles.historyStore}>{activity.storeName}</Text>
                  <Text className={styles.historyProduct}>{activity.productName}</Text>
                  <Text className={styles.historyTime}>{formatDateTime(activity.startTime)}</Text>
                  <Text className={styles.historyStats}>
                    试吃{activity.usedSamples}人 · 购买{activity.purchaseCount}人
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedHistoryActivity && (
          <View className={styles.historyHeader}>
            <Text className={styles.historySubtitle}>
              查看历史活动：{selectedHistoryActivity.storeName}
            </Text>
            <Button className={styles.backBtn} onClick={handleBackToCurrent}>
              返回当前
            </Button>
          </View>
        )}

        {displayActivity && selectedHistoryActivity && (
          <View className={styles.historyActivityInfo}>
            <Text className={styles.activityInfoTitle}>{selectedHistoryActivity.productName}</Text>
            <Text className={styles.activityInfoTime}>
              {formatDateTime(selectedHistoryActivity.startTime)} - {formatDateTime(selectedHistoryActivity.endTime!)}
            </Text>
          </View>
        )}

        <View className={styles.statsGrid}>
          <StatCard
            title="试吃人数"
            value={stats.tasters}
            subtitle={`目标${stats.target}份`}
            color="primary"
          />
          <StatCard
            title="购买转化"
            value={stats.buyers}
            color="success"
          />
          <StatCard
            title="转化率"
            value={`${stats.rate}%`}
            color={stats.rate >= 50 ? 'success' : stats.rate >= 30 ? 'warning' : 'error'}
          />
          <StatCard
            title="剩余样品"
            value={stats.remaining}
            color={stats.remaining < 10 ? 'error' : 'primary'}
          />
        </View>

        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>样品管理</Text>
          {displayActivity ? (
            <>
              <View className={styles.sampleManager}>
                <View className={styles.sampleInfo}>
                  <Text className={styles.sampleLabel}>剩余样品数</Text>
                  <View>
                    <Text className={styles.sampleValue}>{sampleCount}</Text>
                    <Text className={styles.sampleUnit}>份</Text>
                  </View>
                </View>
                <View className={styles.sampleControl}>
                  <Button
                    className={classnames(styles.sampleBtn, !canModify && styles.sampleBtnDisabled)}
                    onClick={() => handleSampleChange(-1)}
                    disabled={!canModify}
                  >
                    -
                  </Button>
                  <Input
                    className={classnames(styles.sampleInput, !canModify && styles.sampleInputDisabled)}
                    type="number"
                    value={inputValue}
                    onInput={handleSampleInput}
                    onBlur={handleSampleBlur}
                    disabled={!canModify}
                    placeholder="请输入"
                  />
                  <Button
                    className={classnames(styles.sampleBtn, !canModify && styles.sampleBtnDisabled)}
                    onClick={() => handleSampleChange(1)}
                    disabled={!canModify}
                  >
                    +
                  </Button>
                </View>
              </View>

              <View className={styles.sampleTarget}>
                <Text>已使用 {stats.used} 份</Text>
                <Text>目标 {stats.target} 份</Text>
              </View>
              <View className={styles.progressBar}>
                <View
                  className={styles.progressFill}
                  style={{ width: `${progressPercent}%` }}
                ></View>
              </View>

              {!canModify && displayActivity && (
                <Text className={styles.sampleHint}>
                  {selectedHistoryActivity ? '历史活动数据仅供查看' : '活动已结束，无法修改样品数量'}
                </Text>
              )}
            </>
          ) : (
            <Text className={styles.sampleHint}>请先在今日活动页面开始活动</Text>
          )}
        </View>

        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>异常上报</Text>
          <View className={styles.abnormalButtons}>
            {abnormalOptions.map((option) => (
              <Button
                key={option.type}
                className={classnames(styles.abnormalBtn, styles[option.class], !canModify && styles.abnormalBtnDisabled)}
                onClick={() => handleAbnormalClick(option.type)}
                disabled={!canModify}
              >
                <Text className={styles.abnormalIcon}>{option.icon}</Text>
                <Text className={styles.abnormalLabel}>{option.label}</Text>
              </Button>
            ))}
          </View>

          {commonProblems.length > 0 && (
            <View className={styles.problemsSection}>
              <Text className={styles.problemsTitle}>🔥 常见问题</Text>
              <ScrollView className={styles.problemsScroll} scrollX>
                {commonProblems.map((problem, index) => (
                  <View key={index} className={styles.problemTag}>
                    <Text className={styles.problemText}>{problem.label}</Text>
                    <Text className={styles.problemCount}>{problem.count}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View className={styles.sectionCard}>
          <View className={styles.listHeader}>
            <Text className={styles.listTitle}>上报记录</Text>
            <Text className={styles.listCount}>共 {currentReports.length} 条</Text>
          </View>

          {currentReports.length > 0 ? (
            <View className={styles.reportList}>
              {currentReports.map((report) => (
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
            </View>
          ) : (
            <View className={styles.emptyReport}>
              <EmptyState
                title="暂无上报记录"
                description={displayActivity ? '如发现异常情况，请及时上报' : '请先开始活动'}
                icon="📋"
              />
            </View>
          )}
        </View>
      </ScrollView>

      {showModal && (
        <View className={styles.modalMask}>
          <View className={styles.modalContent}>
            <Text className={styles.modalTitle}>
              {abnormalTypeLabels[modalType]}
            </Text>
            <Textarea
              className={styles.modalInput}
              placeholder="请详细描述问题情况..."
              value={reportDesc}
              onInput={(e) => setReportDesc(e.detail.value)}
              maxlength={200}
              autoHeight
            />
            <View className={styles.modalActions}>
              <Button
                className={classnames(styles.modalBtn, styles.btnCancel)}
                onClick={() => setShowModal(false)}
              >
                取消
              </Button>
              <Button
                className={classnames(styles.modalBtn, styles.btnConfirm)}
                onClick={handleSubmitReport}
              >
                提交
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default InventoryPage
