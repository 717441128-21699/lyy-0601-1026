import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'
import classnames from 'classnames'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'primary' | 'success' | 'warning' | 'error'
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend = 'neutral',
  color = 'primary'
}) => {
  const colorClass = `color${color.charAt(0).toUpperCase() + color.slice(1)}`
  const trendClass = `trend${trend.charAt(0).toUpperCase() + trend.slice(1)}`
  
  return (
    <View className={styles.statCard}>
      <View className={classnames(styles.statValue, styles[colorClass])}>
        {value}
      </View>
      <Text className={styles.statTitle}>{title}</Text>
      {subtitle && (
        <View className={classnames(styles.statSubtitle, styles[trendClass])}>
          {trend === 'up' && <Text>↑ </Text>}
          {trend === 'down' && <Text>↓ </Text>}
          {subtitle}
        </View>
      )}
    </View>
  )
}

export default StatCard
