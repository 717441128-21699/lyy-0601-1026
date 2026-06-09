import React, { useState, useMemo } from 'react'
import { View, Text, Button, Input, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useActivityStore } from '@/store/useActivityStore'
import RatingStars from '@/components/RatingStars'
import TagSelector from '@/components/TagSelector'
import FeedbackItem from '@/components/FeedbackItem'
import EmptyState from '@/components/EmptyState'
import { tasteTagOptions, notPurchaseReasons } from '@/data/feedbacks'
import { AgeGroup, PurchaseIntent } from '@/types'

const FeedbackPage: React.FC = () => {
  const { currentActivity, feedbacks, addFeedback } = useActivityStore()

  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form')
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>('')
  const [tasteRating, setTasteRating] = useState(0)
  const [tasteTags, setTasteTags] = useState<string[]>([])
  const [purchaseIntent, setPurchaseIntent] = useState<PurchaseIntent | ''>('')
  const [notPurchaseReason, setNotPurchaseReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  const ageOptions: { value: AgeGroup; label: string; icon: string }[] = [
    { value: 'child', label: '儿童', icon: '👦' },
    { value: 'teen', label: '青少年', icon: '🧑' },
    { value: 'adult', label: '成年人', icon: '👨' },
    { value: 'senior', label: '老年人', icon: '👴' }
  ]

  const intentOptions: { value: PurchaseIntent; label: string; icon: string }[] = [
    { value: 'high', label: '强烈购买', icon: '👍' },
    { value: 'medium', label: '考虑购买', icon: '🤔' },
    { value: 'low', label: '不太想买', icon: '😐' },
    { value: 'none', label: '不购买', icon: '👎' }
  ]

  const ratingLabels = ['', '很差', '一般', '还行', '很好', '非常好']

  const canSubmit = useMemo(() => {
    if (!currentActivity || currentActivity.status !== 'ongoing') return false
    if (!ageGroup) return false
    if (tasteRating === 0) return false
    if (!purchaseIntent) return false
    if ((purchaseIntent === 'low' || purchaseIntent === 'none') && !notPurchaseReason) return false
    return true
  }, [currentActivity, ageGroup, tasteRating, purchaseIntent, notPurchaseReason])

  const stats = useMemo(() => {
    const todayFeedbacks = feedbacks.filter(f => f.activityId === currentActivity?.id)
    const highIntent = todayFeedbacks.filter(f => f.purchaseIntent === 'high').length
    const avgRating = todayFeedbacks.length > 0
      ? (todayFeedbacks.reduce((sum, f) => sum + f.tasteRating, 0) / todayFeedbacks.length).toFixed(1)
      : '0'
    return { total: todayFeedbacks.length, highIntent, avgRating }
  }, [feedbacks, currentActivity])

  const handleTagToggle = (tag: string) => {
    setTasteTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleReasonSelect = (reason: string) => {
    setNotPurchaseReason(reason)
    if (reason !== '其他原因') {
      setOtherReason('')
    }
  }

  const handleAddPhoto = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 9 - photos.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      setPhotos(prev => [...prev, ...res.tempFilePaths])
      console.log('[Feedback] 选择照片:', res.tempFilePaths)
    } catch (error) {
      console.error('[Feedback] 选择照片失败:', error)
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    if (!canSubmit) {
      if (!currentActivity || currentActivity.status !== 'ongoing') {
        Taro.showToast({ title: '请先开始活动', icon: 'none' })
        return
      }
      if (!ageGroup) {
        Taro.showToast({ title: '请选择年龄段', icon: 'none' })
        return
      }
      if (tasteRating === 0) {
        Taro.showToast({ title: '请进行口味评分', icon: 'none' })
        return
      }
      if (!purchaseIntent) {
        Taro.showToast({ title: '请选择购买意向', icon: 'none' })
        return
      }
      return
    }

    Taro.showModal({
      title: '确认提交',
      content: '确认提交该顾客反馈吗？',
      success: (res) => {
        if (res.confirm) {
          addFeedback({
            activityId: currentActivity!.id,
            productId: currentActivity!.productId,
            productName: currentActivity!.productName,
            ageGroup: ageGroup as AgeGroup,
            tasteRating,
            tasteTags,
            purchaseIntent: purchaseIntent as PurchaseIntent,
            notPurchaseReason: notPurchaseReason === '其他原因' ? otherReason : notPurchaseReason || undefined,
            photos
          })

          Taro.showToast({ title: '提交成功', icon: 'success' })

          setAgeGroup('')
          setTasteRating(0)
          setTasteTags([])
          setPurchaseIntent('')
          setNotPurchaseReason('')
          setOtherReason('')
          setPhotos([])

          console.log('[Feedback] 反馈提交成功')
        }
      }
    })
  }

  const currentFeedbacks = useMemo(() => {
    return feedbacks.filter(f => f.activityId === currentActivity?.id)
  }, [feedbacks, currentActivity])

  return (
    <View className={styles.page}>
      <View className={styles.tabBar}>
        <View
          className={classnames(styles.tabItem, activeTab === 'form' && styles.tabActive)}
          onClick={() => setActiveTab('form')}
        >
          录入反馈
        </View>
        <View
          className={classnames(styles.tabItem, activeTab === 'list' && styles.tabActive)}
          onClick={() => setActiveTab('list')}
        >
          反馈列表
        </View>
      </View>

      {activeTab === 'form' ? (
        <ScrollView className={styles.content} scrollY>
          <View className={styles.formSection}>
            <Text className={styles.sectionTitle}>顾客年龄段</Text>
            <View className={styles.ageGroup}>
              {ageOptions.map((option) => (
                <View
                  key={option.value}
                  className={classnames(styles.ageItem, ageGroup === option.value && styles.ageSelected)}
                  onClick={() => setAgeGroup(option.value)}
                >
                  <Text className={styles.ageIcon}>{option.icon}</Text>
                  <Text className={styles.ageLabel}>{option.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className={styles.formSection}>
            <Text className={styles.sectionTitle}>口味评价</Text>
            <View className={styles.ratingSection}>
              <RatingStars
                value={tasteRating}
                onChange={setTasteRating}
                size="lg"
              />
              <Text className={styles.ratingLabel}>
                {tasteRating > 0 ? ratingLabels[tasteRating] : '请点击星星评分'}
              </Text>
            </View>

            <View className={styles.tagsSection}>
              <Text className={styles.tagsHint}>选择口味标签（可多选）</Text>
              <TagSelector
                tags={tasteTagOptions}
                selectedTags={tasteTags}
                onTagClick={handleTagToggle}
                maxSelect={5}
              />
            </View>
          </View>

          <View className={styles.formSection}>
            <Text className={styles.sectionTitle}>购买意向</Text>
            <View className={styles.intentGroup}>
              {intentOptions.map((option) => (
                <View
                  key={option.value}
                  className={classnames(styles.intentItem, purchaseIntent === option.value && styles.intentSelected)}
                  onClick={() => setPurchaseIntent(option.value)}
                >
                  {purchaseIntent === option.value && (
                    <View className={styles.intentCheck}>✓</View>
                  )}
                  <Text className={styles.intentIcon}>{option.icon}</Text>
                  <Text className={styles.intentLabel}>{option.label}</Text>
                </View>
              ))}
            </View>

            {(purchaseIntent === 'low' || purchaseIntent === 'none') && (
              <View className={styles.reasonSection}>
                <Text className={styles.reasonTitle}>未购买原因</Text>
                <View className={styles.reasonGroup}>
                  {notPurchaseReasons.map((reason) => (
                    <View
                      key={reason}
                      className={classnames(styles.reasonItem, notPurchaseReason === reason && styles.reasonSelected)}
                      onClick={() => handleReasonSelect(reason)}
                    >
                      {reason}
                    </View>
                  ))}
                </View>
                {notPurchaseReason === '其他原因' && (
                  <Input
                    className={styles.otherReasonInput}
                    placeholder="请输入其他原因"
                    value={otherReason}
                    onInput={(e) => setOtherReason(e.detail.value)}
                  />
                )}
              </View>
            )}
          </View>

          <View className={styles.formSection}>
            <Text className={styles.sectionTitle}>现场照片（可选）</Text>
            <View className={styles.photoSection}>
              <View className={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <View key={index} className={styles.photoItem}>
                    <Image className={styles.photoImage} src={photo} mode="aspectFill" />
                    <View className={styles.photoRemove} onClick={() => handleRemovePhoto(index)}>
                      ×
                    </View>
                  </View>
                ))}
                {photos.length < 9 && (
                  <View className={styles.photoAdd} onClick={handleAddPhoto}>
                    <Text className={styles.photoAddIcon}>+</Text>
                    <Text>添加照片</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View className={styles.listContent}>
          <View className={styles.statsSummary}>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{stats.total}</Text>
              <Text className={styles.statLabel}>总反馈数</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{stats.highIntent}</Text>
              <Text className={styles.statLabel}>强烈购买</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{stats.avgRating}</Text>
              <Text className={styles.statLabel}>平均评分</Text>
            </View>
          </View>

          <View className={styles.listHeader}>
            <Text className={styles.listTitle}>反馈记录</Text>
            <Text className={styles.listCount}>共 {currentFeedbacks.length} 条</Text>
          </View>

          {currentFeedbacks.length > 0 ? (
            <ScrollView scrollY>
              {currentFeedbacks.map((feedback) => (
                <FeedbackItem key={feedback.id} feedback={feedback} />
              ))}
            </ScrollView>
          ) : (
            <View className={styles.emptyFeedback}>
              <EmptyState
                title="暂无反馈记录"
                description="活动进行中，快去录入顾客反馈吧"
                icon="📝"
              />
            </View>
          )}
        </View>
      )}

      {activeTab === 'form' && (
        <View className={styles.bottomBar}>
          <Button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            提交反馈
          </Button>
          <Text className={styles.submitHint}>
            {currentActivity?.status !== 'ongoing' ? '请先在今日活动页开始活动' : '提交后将自动统计到活动数据'}
          </Text>
        </View>
      )}
    </View>
  )
}

export default FeedbackPage
