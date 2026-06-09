import React, { useMemo } from 'react'
import { View, Text, Image, Picker, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'
import classnames from 'classnames'
import dayjs from 'dayjs'
import { useActivityStore } from '@/store/useActivityStore'
import StatCard from '@/components/StatCard'
import { calculateConversionRate, formatDateTime, statusLabels } from '@/utils'


const ActivityPage: React.FC = () => {
  const {
    currentActivity,
    stores,
    products,
    selectedStore,
    selectedProduct,
    setSelectedStore,
    setSelectedProduct,
    startActivity,
    endActivity
  } = useActivityStore()

  const todayDate = dayjs().format('YYYY年MM月DD日 dddd')

  const conversionRate = useMemo(() => {
    if (!currentActivity) return 0
    return calculateConversionRate(currentActivity.usedSamples, currentActivity.purchaseCount)
  }, [currentActivity])

  const handleStoreChange = (e: any) => {
    const index = e.detail.value
    setSelectedStore(stores[index])
  }

  const handleProductChange = (e: any) => {
    const index = e.detail.value
    setSelectedProduct(products[index])
  }

  const handleStartActivity = () => {
    if (!selectedStore || !selectedProduct) {
      Taro.showToast({ title: '请先选择门店和商品', icon: 'none' })
      return
    }
    Taro.showModal({
      title: '确认开始活动',
      content: `门店：${selectedStore.name}\n商品：${selectedProduct.name}`,
      success: (res) => {
        if (res.confirm) {
          startActivity()
          Taro.showToast({ title: '活动已开始', icon: 'success' })
        }
      }
    })
  }

  const handleEndActivity = () => {
    Taro.showModal({
      title: '确认结束活动',
      content: '结束后将无法继续录入反馈，确定结束吗？',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          endActivity()
          Taro.showToast({ title: '活动已结束', icon: 'success' })
        }
      }
    })
  }

  const canStart = selectedStore && selectedProduct && currentActivity?.status !== 'ongoing'

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerDate}>{todayDate}</Text>
        <View className={styles.headerSubtitle}>
          <Text>促销员：001</Text>
          {currentActivity && (
            <View
              className={classnames(
                styles.statusTag,
                styles[`status${currentActivity.status.charAt(0).toUpperCase() + currentActivity.status.slice(1)}`]
              )}
            >
              {statusLabels[currentActivity.status]}
            </View>
          )}
        </View>
      </View>

      <ScrollView className={styles.content} scrollY>
        {currentActivity?.status === 'ongoing' || currentActivity?.status === 'completed' ? (
          <>
            <View className={styles.sectionCard}>
              <Text className={styles.sectionTitle}>活动概览</Text>
              <View className={styles.activityInfo}>
                <Image
                  className={styles.activityImage}
                  src={currentActivity.productImage}
                  mode="aspectFill"
                />
                <View className={styles.activityDetail}>
                  <Text className={styles.activityName}>{currentActivity.productName}</Text>
                  <Text className={styles.activityStore}>📍 {currentActivity.storeName}</Text>
                  <Text className={styles.activityTime}>
                    开始时间：{formatDateTime(currentActivity.startTime)}
                  </Text>
                </View>
              </View>

              <View className={styles.statsGrid}>
                <StatCard
                  title="试吃人数"
                  value={currentActivity.usedSamples}
                  subtitle="目标50份"
                  color="primary"
                />
                <StatCard
                  title="购买人数"
                  value={currentActivity.purchaseCount}
                  color="success"
                />
                <StatCard
                  title="转化率"
                  value={`${conversionRate}%`}
                  color="warning"
                />
                <StatCard
                  title="剩余样品"
                  value={currentActivity.remainingSamples}
                  subtitle={`已用${currentActivity.usedSamples}份`}
                  color={currentActivity.remainingSamples < 10 ? 'error' : 'primary'}
                />
              </View>
            </View>

            <View className={styles.sectionCard}>
              <Text className={styles.sectionTitle}>反馈记录</Text>
              <View className={styles.statsGrid}>
                <StatCard
                  title="总反馈数"
                  value={currentActivity.totalFeedbacks}
                  color="primary"
                />
                <StatCard
                  title="待处理"
                  value={0}
                  color="success"
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <View className={styles.sectionCard}>
              <Text className={styles.sectionTitle}>选择门店</Text>
              <Picker
                mode="selector"
                range={stores.map((s) => s.name)}
                value={stores.findIndex((s) => s.id === selectedStore?.id)}
                onChange={handleStoreChange}
                disabled={currentActivity?.status === ('ongoing' as any)}
              >
                <View className={styles.pickerRow}>
                  <Text className={styles.pickerLabel}>当班门店</Text>
                  <Text className={styles.pickerValue}>
                    {selectedStore?.name || '请选择门店'}
                  </Text>
                  <Text className={styles.pickerArrow}>›</Text>
                </View>
              </Picker>
              {selectedStore && (
                <Text className={styles.activityStore}>📍 {selectedStore.address}</Text>
              )}
            </View>

            <View className={styles.sectionCard}>
              <Text className={styles.sectionTitle}>选择试吃商品</Text>
              <Picker
                mode="selector"
                range={products.map((p) => `${p.name} - ${p.spec}`)}
                value={products.findIndex((p) => p.id === selectedProduct?.id)}
                onChange={handleProductChange}
                disabled={currentActivity?.status === ('ongoing' as any)}
              >
                <View className={styles.pickerRow}>
                  <Text className={styles.pickerLabel}>试吃商品</Text>
                  <Text className={styles.pickerValue}>
                    {selectedProduct ? `${selectedProduct.name} ${selectedProduct.spec}` : '请选择商品'}
                  </Text>
                  <Text className={styles.pickerArrow}>›</Text>
                </View>
              </Picker>

              {selectedProduct && (
                <View className={styles.activityInfo}>
                  <Image
                    className={styles.activityImage}
                    src={selectedProduct.image}
                    mode="aspectFill"
                  />
                  <View className={styles.activityDetail}>
                    <Text className={styles.activityName}>{selectedProduct.name}</Text>
                    <Text className={styles.activityStore}>规格：{selectedProduct.spec}</Text>
                    <Text className={styles.activityTime}>
                      活动价：¥{selectedProduct.activityPrice.toFixed(2)}
                      <Text style={{ textDecoration: 'line-through', color: '#86909C', marginLeft: '12rpx' }}>
                        ¥{selectedProduct.originalPrice.toFixed(2)}
                      </Text>
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View className={styles.bottomBar}>
        {currentActivity?.status === 'ongoing' ? (
          <>
            <Button
              className={classnames(styles.actionButton, styles.buttonEnd)}
              onClick={handleEndActivity}
            >
              结束活动
            </Button>
            <Text className={styles.buttonHint}>活动进行中，可在顾客反馈页录入反馈</Text>
          </>
        ) : currentActivity?.status === 'completed' ? (
          <>
            <Button
              className={classnames(styles.actionButton, styles.buttonStart)} disabled
            >
              活动已结束
            </Button>
            <Text className={styles.buttonHint}>可前往活动复盘查看本次活动数据</Text>
          </>
        ) : (
          <>
            <Button
              className={classnames(styles.actionButton, styles.buttonStart)}
              onClick={handleStartActivity}
              disabled={!canStart}
            >
              开始活动
            </Button>
            <Text className={styles.buttonHint}>请先选择门店和试吃商品</Text>
          </>
        )}
      </View>
    </View>
  )
}

export default ActivityPage
