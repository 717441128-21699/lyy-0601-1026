import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Activity, Feedback, AbnormalReport, Product, Store, ReportData, PersistedState } from '@/types'
import { mockProducts } from '@/data/products'
import { mockStores } from '@/data/stores'
import dayjs from 'dayjs'
import Taro from '@tarojs/taro'

const STORAGE_KEY = 'smart-tasting-activity'

const taroStorage = {
  getItem: (name: string) => {
    try {
      const value = Taro.getStorageSync(name)
      return value || null
    } catch (e) {
      console.error('[Storage] getItem error:', e)
      return null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      Taro.setStorageSync(name, value)
    } catch (e) {
      console.error('[Storage] setItem error:', e)
    }
  },
  removeItem: (name: string) => {
    try {
      Taro.removeStorageSync(name)
    } catch (e) {
      console.error('[Storage] removeItem error:', e)
    }
  }
}

interface ActivityState {
  currentActivity: Activity | null
  allFeedbacks: Feedback[]
  allAbnormalReports: AbnormalReport[]
  activityHistory: Activity[]
  products: Product[]
  stores: Store[]
  selectedStore: Store | null
  selectedProduct: Product | null
  setSelectedStore: (store: Store | null) => void
  setSelectedProduct: (product: Product | null) => void
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt' | 'createdBy'>) => void
  addAbnormalReport: (report: Omit<AbnormalReport, 'id' | 'createdAt'>) => void
  updateSamples: (_used: number, remaining: number) => void
  startActivity: () => boolean
  endActivity: () => boolean
  resetActivity: () => void
  getProductByBarcode: (barcode: string) => Product | undefined
  getProductById: (id: string) => Product | undefined
  searchProducts: (keyword: string) => Product[]
  getReportData: (storeFilter: string, productFilter: string, periodFilter: string, activityId?: string) => ReportData | null
  getFilteredFeedbacks: (storeFilter: string, productFilter: string, periodFilter: string) => Feedback[]
  getActivityById: (id: string) => Activity | undefined
  getActivityAbnormalReports: (activityId: string) => AbnormalReport[]
  clearAllData: () => void
}

const isToday = (dateStr: string) => {
  return dayjs(dateStr).isSame(dayjs(), 'day')
}

const isThisWeek = (dateStr: string) => {
  return dayjs(dateStr).isSame(dayjs(), 'week')
}

const isThisMonth = (dateStr: string) => {
  return dayjs(dateStr).isSame(dayjs(), 'month')
}

const matchPeriod = (dateStr: string, period: string): boolean => {
  if (period === '全部') return true
  if (period === '今日') return isToday(dateStr)
  if (period === '本周') return isThisWeek(dateStr)
  if (period === '本月') return isThisMonth(dateStr)
  return true
}

const calculateReportDataFromActivities = (
  activities: Activity[]
): ReportData | null => {
  if (activities.length === 0) return null

  const allFeedbacks = activities.flatMap(a => a.feedbacks)

  const totalTasters = activities.reduce((sum, a) => sum + a.usedSamples, 0)
  const purchaseCount = activities.reduce((sum, a) => sum + a.purchaseCount, 0)
  const conversionRate = totalTasters > 0 ? Math.round((purchaseCount / totalTasters) * 1000) / 10 : 0

  const avgTasteRating = allFeedbacks.length > 0
    ? Math.round((allFeedbacks.reduce((sum, f) => sum + f.tasteRating, 0) / allFeedbacks.length) * 10) / 10
    : 0

  const timeMap: Record<string, number> = {}
  const ageMap: Record<string, number> = { '儿童': 0, '青少年': 0, '成年人': 0, '老年人': 0 }
  const tagMap: Record<string, number> = {}

  allFeedbacks.forEach(fb => {
    const hour = dayjs(fb.createdAt).format('HH:00')
    timeMap[hour] = (timeMap[hour] || 0) + 1

    const ageGroup = fb.ageGroup === 'child' ? '儿童'
      : fb.ageGroup === 'teen' ? '青少年'
      : fb.ageGroup === 'adult' ? '成年人'
      : '老年人'
    ageMap[ageGroup] = (ageMap[ageGroup] || 0) + 1

    fb.tasteTags.forEach(tag => {
      tagMap[tag] = (tagMap[tag] || 0) + 1
    })
  })

  const hours = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)
  const timeDistribution = hours.map(hour => ({
    hour,
    count: timeMap[hour] || 0
  }))

  const ageDistribution = Object.entries(ageMap).map(([group, count]) => ({
    group,
    count
  }))

  const topTasteTags = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const firstActivity = activities[0]
  const lastActivity = activities[activities.length - 1]
  const period = activities.length === 1
    ? `${dayjs(firstActivity.startTime).format('YYYY-MM-DD HH:mm')} - ${dayjs(lastActivity.endTime || lastActivity.startTime).format('YYYY-MM-DD HH:mm')}`
    : `${dayjs(firstActivity.startTime).format('YYYY-MM-DD')} 至 ${dayjs(lastActivity.endTime || lastActivity.startTime).format('YYYY-MM-DD')} (${activities.length}场)`

  return {
    activityId: activities.map(a => a.id).join(','),
    storeId: activities.length === 1 ? firstActivity.storeId : 'all',
    storeName: activities.length === 1 ? firstActivity.storeName : `共${activities.length}场活动`,
    productId: activities.length === 1 ? firstActivity.productId : 'all',
    productName: activities.length === 1 ? firstActivity.productName : `全部商品`,
    period,
    totalTasters,
    purchaseCount,
    conversionRate,
    avgTasteRating,
    timeDistribution,
    ageDistribution,
    topTasteTags
  }
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      currentActivity: null,
      allFeedbacks: [],
      allAbnormalReports: [],
      activityHistory: [],
      products: mockProducts,
      stores: mockStores,
      selectedStore: null,
      selectedProduct: null,

      setSelectedStore: (store) => set({ selectedStore: store }),
      setSelectedProduct: (product) => set({ selectedProduct: product }),

      addFeedback: (feedback) => {
        const { currentActivity } = get()
        if (!currentActivity || currentActivity.status !== 'ongoing') {
          console.error('[Feedback] 请先开始活动')
          return
        }
        const newFeedback: Feedback = {
          ...feedback,
          id: `fb${Date.now()}`,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          createdBy: '促销员001',
          activityId: currentActivity.id,
          productId: currentActivity.productId,
          productName: currentActivity.productName
        }

        const updatedActivity: Activity = {
          ...currentActivity,
          totalFeedbacks: currentActivity.totalFeedbacks + 1,
          purchaseCount: currentActivity.purchaseCount +
            (feedback.purchaseIntent === 'high' ? 1 : 0),
          usedSamples: currentActivity.usedSamples + 1,
          remainingSamples: Math.max(0, currentActivity.remainingSamples - 1),
          feedbacks: [...currentActivity.feedbacks, newFeedback]
        }

        set((state) => ({
          currentActivity: updatedActivity,
          allFeedbacks: [newFeedback, ...state.allFeedbacks]
        }))
        console.log('[Feedback] 新增反馈记录:', newFeedback)
      },

      addAbnormalReport: (report) => {
        const { currentActivity } = get()
        const newReport: AbnormalReport = {
          ...report,
          id: `ab${Date.now()}`,
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
        }

        if (currentActivity && currentActivity.status === 'ongoing') {
          const updatedActivity: Activity = {
            ...currentActivity,
            abnormalReports: [...currentActivity.abnormalReports, newReport]
          }
          set((state) => ({
            currentActivity: updatedActivity,
            allAbnormalReports: [newReport, ...state.allAbnormalReports]
          }))
        } else {
          set((state) => ({
            allAbnormalReports: [newReport, ...state.allAbnormalReports]
          }))
        }
        console.log('[Abnormal] 新增异常报告:', newReport, '活动ID:', currentActivity?.id)
      },

      updateSamples: (_used, remaining) => {
        const { currentActivity } = get()
        if (!currentActivity || currentActivity.status !== 'ongoing') return

        const target = currentActivity.targetSamples
        const validRemaining = Math.max(0, Math.min(remaining, target))
        const validUsed = target - validRemaining

        if (validUsed < 0) {
          console.error('[Samples] 已使用数量不能为负数')
          return
        }

        const updatedActivity: Activity = {
          ...currentActivity,
          usedSamples: validUsed,
          remainingSamples: validRemaining
        }

        set({ currentActivity: updatedActivity })
        console.log('[Samples] 更新样品数量:', { used: validUsed, remaining: validRemaining })
      },

      startActivity: () => {
        const { selectedStore, selectedProduct, currentActivity, activityHistory } = get()
        if (!selectedStore || !selectedProduct) {
          console.error('[Activity] 请先选择门店和商品')
          return false
        }
        if (currentActivity?.status === 'ongoing') {
          console.error('[Activity] 已有进行中的活动')
          return false
        }

        const newActivity: Activity = {
          id: `act${Date.now()}`,
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          productId: selectedProduct.id,
          productName: `${selectedProduct.name} ${selectedProduct.spec}`,
          productImage: selectedProduct.image,
          startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          status: 'ongoing',
          targetSamples: 50,
          usedSamples: 0,
          remainingSamples: 50,
          totalFeedbacks: 0,
          purchaseCount: 0,
          feedbacks: [],
          abnormalReports: []
        }

        let updatedHistory = activityHistory
        if (currentActivity && currentActivity.status === 'completed') {
          updatedHistory = [currentActivity, ...activityHistory.filter(a => a.id !== currentActivity.id)]
        }

        set({
          currentActivity: newActivity,
          activityHistory: updatedHistory,
          selectedStore: null,
          selectedProduct: null
        })
        console.log('[Activity] 活动已开始:', newActivity)
        console.log('[Activity] 历史活动数:', updatedHistory.length)
        return true
      },

      endActivity: () => {
        const { currentActivity, activityHistory } = get()
        if (!currentActivity || currentActivity.status !== 'ongoing') {
          console.error('[Activity] 没有进行中的活动')
          return false
        }
        const endedActivity: Activity = {
          ...currentActivity,
          status: 'completed',
          endTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
        }
        const updatedHistory = [endedActivity, ...activityHistory]
        set({
          currentActivity: endedActivity,
          activityHistory: updatedHistory
        })
        console.log('[Activity] 活动已结束，保存到历史:', endedActivity)
        console.log('[Activity] 历史活动数:', updatedHistory.length)
        return true
      },

      resetActivity: () => {
        const { currentActivity, activityHistory } = get()
        let updatedHistory = activityHistory
        if (currentActivity && currentActivity.status === 'completed') {
          updatedHistory = [currentActivity, ...activityHistory.filter(a => a.id !== currentActivity.id)]
        }
        set({
          currentActivity: null,
          selectedStore: null,
          selectedProduct: null,
          activityHistory: updatedHistory
        })
        console.log('[Activity] 已重置当前活动，历史记录保留:', updatedHistory.length, '场')
      },

      clearAllData: () => {
        Taro.removeStorageSync(STORAGE_KEY)
        set({
          currentActivity: null,
          allFeedbacks: [],
          allAbnormalReports: [],
          activityHistory: [],
          selectedStore: null,
          selectedProduct: null
        })
        console.log('[Activity] 所有数据已清除')
      },

      getProductByBarcode: (barcode) => {
        return get().products.find((p) => p.barcode === barcode)
      },

      getProductById: (id) => {
        return get().products.find((p) => p.id === id)
      },

      searchProducts: (keyword) => {
        if (!keyword.trim()) return get().products
        const lowerKeyword = keyword.toLowerCase()
        return get().products.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerKeyword) ||
            p.barcode.includes(keyword) ||
            p.category.toLowerCase().includes(lowerKeyword)
        )
      },

      getActivityById: (id) => {
        const { activityHistory, currentActivity } = get()
        if (currentActivity?.id === id) return currentActivity
        return activityHistory.find(a => a.id === id)
      },

      getActivityAbnormalReports: (activityId) => {
        const activity = get().getActivityById(activityId)
        return activity?.abnormalReports || []
      },

      getReportData: (storeFilter, productFilter, periodFilter, activityId) => {
        const { activityHistory, currentActivity } = get()

        let allActivities: Activity[] = []
        if (currentActivity) {
          allActivities = [currentActivity, ...activityHistory.filter(a => a.id !== currentActivity.id)]
        } else {
          allActivities = [...activityHistory]
        }

        if (activityId) {
          const activity = allActivities.find(a => a.id === activityId)
          return activity ? calculateReportDataFromActivities([activity]) : null
        }

        const filteredActivities = allActivities.filter(act => {
          if (storeFilter !== '全部' && act.storeName !== storeFilter) return false
          if (productFilter !== '全部' && !act.productName.includes(productFilter)) return false
          if (!matchPeriod(act.startTime, periodFilter)) return false
          return act.status === 'completed' || act.status === 'ongoing'
        })

        return calculateReportDataFromActivities(filteredActivities)
      },

      getFilteredFeedbacks: (storeFilter, productFilter, periodFilter) => {
        const { activityHistory, currentActivity, allFeedbacks } = get()
        let allActivities: Activity[] = []
        if (currentActivity) {
          allActivities = [currentActivity, ...activityHistory.filter(a => a.id !== currentActivity.id)]
        } else {
          allActivities = [...activityHistory]
        }

        const filteredActivities = allActivities.filter(act => {
          if (storeFilter !== '全部' && act.storeName !== storeFilter) return false
          if (productFilter !== '全部' && !act.productName.includes(productFilter)) return false
          if (!matchPeriod(act.startTime, periodFilter)) return false
          return true
        })

        const activityIds = new Set(filteredActivities.map(a => a.id))
        return allFeedbacks.filter(f => activityIds.has(f.activityId))
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => taroStorage),
      partialize: (state): PersistedState => ({
        currentActivity: state.currentActivity,
        allFeedbacks: state.allFeedbacks,
        allAbnormalReports: state.allAbnormalReports,
        selectedStoreId: state.selectedStore?.id || null,
        selectedProductId: state.selectedProduct?.id || null,
        activityHistory: state.activityHistory
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const persisted = state as unknown as PersistedState & { stores: Store[]; products: Product[] }
        if (persisted.selectedStoreId && persisted.stores) {
          state.selectedStore = persisted.stores.find(s => s.id === persisted.selectedStoreId) || null
        }
        if (persisted.selectedProductId && persisted.products) {
          state.selectedProduct = persisted.products.find(p => p.id === persisted.selectedProductId) || null
        }
        console.log('[Storage] 数据已从本地恢复')
        console.log('[Storage] 当前活动:', state.currentActivity?.id)
        console.log('[Storage] 历史活动数:', state.activityHistory?.length || 0)
        console.log('[Storage] 总反馈数:', state.allFeedbacks?.length || 0)
      }
    }
  )
)
