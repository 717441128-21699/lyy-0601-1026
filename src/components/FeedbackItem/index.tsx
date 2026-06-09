import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'
import { Feedback } from '@/types'
import { ageGroupLabels, purchaseIntentLabels } from '@/data/feedbacks'
import { formatTime } from '@/utils'
import classnames from 'classnames'

interface FeedbackItemProps {
  feedback: Feedback
}

const FeedbackItem: React.FC<FeedbackItemProps> = ({ feedback }) => {
  const ageLabel = ageGroupLabels[feedback.ageGroup] || feedback.ageGroup
  const intentLabel = purchaseIntentLabels[feedback.purchaseIntent] || feedback.purchaseIntent
  const intentColor = feedback.purchaseIntent

  return (
    <View className={styles.feedbackItem}>
      <View className={styles.feedbackHeader}>
        <View className={styles.feedbackMeta}>
          <View
            className={classnames(styles.ageTag, styles[`age${feedback.ageGroup.charAt(0).toUpperCase() + feedback.ageGroup.slice(1)}`])}
          >
            {ageLabel}
          </View>
          <Text className={styles.feedbackTime}>
            {formatTime(feedback.createdAt)}
          </Text>
        </View>
        <View className={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              className={classnames(styles.star, star <= feedback.tasteRating && styles.starActive)}
            >
              ★
            </Text>
          ))}
        </View>
      </View>

      {feedback.tasteTags.length > 0 && (
        <View className={styles.tagList}>
          {feedback.tasteTags.map((tag, index) => (
            <View key={index} className={styles.tasteTag}>
              {tag}
            </View>
          ))}
        </View>
      )}

      <View className={styles.feedbackFooter}>
        <View
          className={classnames(styles.intentTag, styles[`intent${intentColor.charAt(0).toUpperCase() + intentColor.slice(1)}`])}
        >
          {intentLabel}
        </View>
        {feedback.notPurchaseReason && (
          <Text className={styles.reasonText}>
          原因：{feedback.notPurchaseReason}
        </Text>
        )}
      </View>

      {feedback.photos.length > 0 && (
        <View className={styles.photoCount}>
          📷 {feedback.photos.length}张照片
        </View>
      )}
    </View>
  )
}

export default FeedbackItem
