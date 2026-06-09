import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'
import classnames from 'classnames'

interface TagSelectorProps {
  tags: string[]
  selectedTags: string[]
  onTagClick: (tag: string) => void
  maxSelect?: number
}

const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  selectedTags,
  onTagClick,
  maxSelect
}) => {
  const handleClick = (tag: string) => {
    const isSelected = selectedTags.includes(tag)
    if (!isSelected && maxSelect && selectedTags.length >= maxSelect) {
      return
    }
    onTagClick(tag)
  }

  return (
    <View className={styles.tagContainer}>
      {tags.map((tag, index) => {
        const isSelected = selectedTags.includes(tag)
        return (
          <View
            key={index}
            className={classnames(styles.tagItem, isSelected && styles.tagSelected)}
            onClick={() => handleClick(tag)}
          >
            <Text className={classnames(styles.tagText, isSelected && styles.tagTextSelected)}>
              {tag}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export default TagSelector
