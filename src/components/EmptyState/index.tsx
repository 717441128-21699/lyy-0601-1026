import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon="📋"
}) => {
  return (
    <View className={styles.emptyState}>
      <Text className={styles.emptyIcon}>{icon}</Text>
      <Text className={styles.emptyTitle}>{title}</Text>
      {description && (
        <Text className={styles.emptyDesc}>{description}</Text>
      )}
    </View>
  )
}

export default EmptyState
