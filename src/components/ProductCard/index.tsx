import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import styles from './index.module.scss'
import { Product } from '@/types'
import { formatPrice } from '@/utils'

interface ProductCardProps {
  product: Product
  onClick?: () => void
  showActivityPrice?: boolean
}

const ProductCard: React.FC<ProductCardProps> = ({
  product, onClick, showActivityPrice = true
}) => {
  const discount = product.originalPrice > 0
    ? Math.round((1 - product.activityPrice / product.originalPrice) * 100)
    : 0

  return (
    <View className={styles.productCard} onClick={onClick}>
      <Image
        className={styles.productImage}
        src={product.image}
        mode="aspectFill"
      />
      <View className={styles.productInfo}>
        <Text className={styles.productName}>{product.name}</Text>
        <Text className={styles.productSpec}>{product.spec}</Text>
        <View className={styles.priceRow}>
          {showActivityPrice && (
            <>
              <Text className={styles.activityPrice}>¥{formatPrice(product.activityPrice)}</Text>
              <Text className={styles.originalPrice}>¥{formatPrice(product.originalPrice)}</Text>
              {discount > 0 && (
                <View className={styles.discountTag}>{discount}%OFF</View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  )
}

export default ProductCard
