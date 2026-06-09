import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'
import classnames from 'classnames'

interface RatingStarsProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  onChange,
  readonly = false,
  size="md"
}) => {
  const handleClick = (rating: number) => {
    if (readonly || !onChange) return
    onChange(rating)
  }

  return (
    <View className={classnames(styles.ratingStars, styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`])}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          className={classnames(
            styles.star,
            star <= value && styles.starActive,
            !readonly && styles.starClickable
          )}
          onClick={() => handleClick(star)}
        >
          ★
        </Text>
      ))}
    </View>
  )
}

export default RatingStars
