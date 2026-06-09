import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, Input, Image, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import { useActivityStore } from '@/store/useActivityStore'
import { Product } from '@/types'
import EmptyState from '@/components/EmptyState'
import { mockProducts } from '@/data/products'

const ScanPage: React.FC = () => {
  const { searchProducts, currentActivity } = useActivityStore()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)

  const searchResults = useMemo(() => {
    return searchProducts(searchKeyword)
  }, [searchKeyword, searchProducts])

  const handleSearch = useCallback((e: { detail: { value: string } }) => {
    setSearchKeyword(e.detail.value)
    setSelectedProduct(null)
  }, [])

  const handleScanClick = () => {
    setShowScanner(true)
    setScanning(true)
    console.log('[Scan] 启动扫码功能')

    setTimeout(() => {
      setScanning(false)
      setShowScanner(false)
      const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)]
      setSelectedProduct(randomProduct)
      setSearchKeyword(randomProduct.barcode)
      Taro.showToast({
        title: `识别成功：${randomProduct.name}`,
        icon: 'success'
      })
      console.log('[Scan] 扫码识别商品:', randomProduct)
    }, 2000)
  }

  const handleCancelScan = () => {
    setShowScanner(false)
    setScanning(false)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    console.log('[Scan] 选择商品:', product.name)
  }

  const handleAddFeedback = () => {
    if (!currentActivity || currentActivity.status !== 'ongoing') {
      Taro.showToast({ title: '请先开始活动', icon: 'none' })
      return
    }
    Taro.switchTab({ url: '/pages/feedback/index' })
  }

  const handleAddToRecord = () => {
    if (!selectedProduct) return
    Taro.showToast({ title: '已添加到记录', icon: 'success' })
    console.log('[Scan] 添加商品到记录:', selectedProduct.name)
  }

  const discount = selectedProduct && selectedProduct.originalPrice > 0
    ? Math.round((1 - selectedProduct.activityPrice / selectedProduct.originalPrice) * 100)
    : 0

  return (
    <View className={styles.page}>
      <View className={styles.searchBar}>
        <View className={styles.searchInput}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            placeholder="搜索商品名称/条码"
            value={searchKeyword}
            onInput={handleSearch}
            confirmType="search"
          />
        </View>
        <Button className={styles.scanButton} onClick={handleScanClick}>
          📷 扫码
        </Button>
      </View>

      <ScrollView className={styles.content} scrollY>
        {!selectedProduct && !searchKeyword && (
          <View className={styles.scanCard} onClick={handleScanClick}>
            <Text className={styles.scanIcon}>📷</Text>
            <View className={styles.scanText}>
              <Text className={styles.scanTitle}>扫码查商品</Text>
              <Text className={styles.scanDesc}>扫描商品条码查看详细信息</Text>
            </View>
          </View>
        )}

        {selectedProduct ? (
          <View className={styles.productDetail}>
            <View className={styles.detailHeader}>
              <Image
                className={styles.detailImage}
                src={selectedProduct.image}
                mode="aspectFill"
              />
              <View className={styles.detailInfo}>
                <View>
                  <Text className={styles.detailName}>{selectedProduct.name}</Text>
                  <Text className={styles.detailSpec}>{selectedProduct.spec}</Text>
                  <Text className={styles.detailBarcode}>条码：{selectedProduct.barcode}</Text>
                </View>
                <View className={styles.detailPrice}>
                  <Text className={styles.activityPrice}>¥{selectedProduct.activityPrice.toFixed(2)}</Text>
                  <Text className={styles.originalPrice}>¥{selectedProduct.originalPrice.toFixed(2)}</Text>
                  {discount > 0 && (
                    <View className={styles.discountBadge}>{discount}%OFF</View>
                  )}
                </View>
              </View>
            </View>

            <View className={styles.detailSection}>
              <Text className={styles.detailSectionTitle}>🎯 核心卖点</Text>
              <View className={styles.sellingPoints}>
                {selectedProduct.sellingPoints.map((point, index) => (
                  <View key={index} className={styles.sellingPoint}>
                    {point}
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.actionRow}>
              <Button
                className={classnames(styles.actionBtn, styles.btnOutline)}
                onClick={handleAddToRecord}
              >
                添加记录
              </Button>
              <Button
                className={classnames(styles.actionBtn, styles.btnPrimary)}
                onClick={handleAddFeedback}
              >
                录入反馈
              </Button>
            </View>
          </View>
        ) : (
          <>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>
                {searchKeyword ? '搜索结果' : '全部商品'}
              </Text>
              <Text className={styles.sectionCount}>共 {searchResults.length} 件</Text>
            </View>

            {searchResults.length > 0 ? (
              <View className={styles.productList}>
                {searchResults.map((product) => (
                  <View
                    key={product.id}
                    className={styles.productItem}
                    onClick={() => handleProductClick(product)}
                  >
                    <Image
                      className={styles.productItemImage}
                      src={product.image}
                      mode="aspectFill"
                    />
                    <View className={styles.productItemInfo}>
                      <View>
                        <Text className={styles.productItemName}>{product.name}</Text>
                        <Text className={styles.productItemSpec}>{product.spec}</Text>
                      </View>
                      <Text className={styles.productItemPrice}>
                        ¥{product.activityPrice.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                title="未找到商品"
                description="请检查关键词或扫码识别"
                icon="🔍"
              />
            )}
          </>
        )}
      </ScrollView>

      {showScanner && (
        <View className={styles.scanAnimation}>
          <View className={styles.scanFrame}>
            <View className={styles.scanLine}></View>
          </View>
          <Text className={styles.scanHint}>
            {scanning ? '正在识别商品条码...' : '识别完成'}
          </Text>
          <Button className={styles.cancelBtn} onClick={handleCancelScan}>
            取消
          </Button>
        </View>
      )}
    </View>
  )
}

export default ScanPage
