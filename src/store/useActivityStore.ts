import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Activity, Feedback, AbnormalReport, Product, Store, ReportData, PersistedState } from '@/types'
import { mockProducts } from '@/data/products'
import { mockStores } from '@/data/stores'
import dayjs from 'dayjs'

const STORAGE_KEY = 'smart-tasting-activity'

interface ActivityState {
  currentActivity: Activity | null
  feedbacks: Feedback[]
  abnormalReports: AbnormalReport[]
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
  getReportData: (storeFilter: string, productFilter: string, periodFilter: string) => ReportData | null
  getFilteredFeedbacks: (storeFilter: string, productFilter: string, periodFilter: string) => Feedback[]
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

const calculateReportData = (
  activities: Activity[],
  feedbacks: Feedback[],
  storeFilter: string,
  productFilter: string,
  periodFilter: string
): ReportData | null => {
  const filteredActivities = activities.filter(act => {
    if (storeFilter !== '全部' && act.storeName !== storeFilter) return false
    if (productFilter !== '全部' && !act.productName.includes(productFilter)) return false
    if (!matchPeriod(act.startTime, periodFilter)) return false
    return act.status === 'completed' || act.status === 'ongoing'
  })

  if (filteredActivities.length === 0) return null

  const activityIds = new Set(filteredActivities.map(a => a.id))
  const filteredFeedbacks = feedbacks.filter(f => activityIds.has(f.activityId))

  const totalTasters = filteredActivities.reduce((sum, a) => sum + a.usedSamples, 0)
  const purchaseCount = filteredActivities.reduce((sum, a) => sum + a.purchaseCount, 0)
  const conversionRate = totalTasters > 0 ? Math.round((purchaseCount / totalTasters) * 1000) / 10 : 0

  const avgTasteRating = filteredFeedbacks.length > 0
    ? Math.round((filteredFeedbacks.reduce((sum, f) => sum + f.tasteRating, 0) / filteredFeedbacks.length) * 10) / 10
    : 0

  const timeMap: Record<string, number> = {}
  const ageMap: Record<string, number> = { '儿童': 0, '青少年': 0, '成年人': 0, '老年人': 0 }
  const tagMap: Record<string, number> = {}

  filteredFeedbacks.forEach(fb => {
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

  const hours = Array.from({ length: 10 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`)
  const timeDistribution = hours.map(hour => ({
    hour,
    count: timeMap[hour] || 0
  })).filter(d => d.count > 0 || true)

  const ageDistribution = Object.entries(ageMap).map(([group, count]) => ({
    group,
    count
  }))

  const topTasteTags = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const firstActivity = filteredActivities[0]
  const lastActivity = filteredActivities[filteredActivities.length - 1]
  const period = `${dayjs(firstActivity.startTime).format('YYYY-MM-DD HH:mm')} - ${dayjs(lastActivity.endTime || lastActivity.startTime).format('YYYY-MM-DD HH:mm')}`

  return {
    activityId: filteredActivities.map(a => a.id).join(','),
    storeId: storeFilter === '全部' ? 'all' : firstActivity.storeId,
    storeName: storeFilter === '全部' ? '全部门店' : firstActivity.storeName,
    productId: productFilter === '全部' ? 'all' : firstActivity.productId,
    productName: productFilter === '全部' ? '全部商品' : firstActivity.productName,
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
      feedbacks: [],
      abnormalReports: [],
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
        set((state) => ({
          feedbacks: [newFeedback, ...state.feedbacks],
          currentActivity: state.currentActivity
            ? {
                ...state.currentActivity,
                totalFeedbacks: state.currentActivity.totalFeedbacks + 1,
                purchaseCount: state.currentActivity.purchaseCount +
                  (feedback.purchaseIntent === 'high' ? 1 : 0),
                usedSamples: state.currentActivity.usedSamples + 1,
                remainingSamples: Math.max(0, state.currentActivity.remainingSamples - 1)
              }
            : null
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
        set((state) => ({
          abnormalReports: [newReport, ...state.abnormalReports]
        }))
        console.log('[Abnormal] 新增异常报告:', newReport, '活动ID:', currentActivity?.id)
      },

      updateSamples: (_used, remaining) => {
        const { currentActivity } = get()
        if (!currentActivity) return

        const target = currentActivity.targetSamples
        const validRemaining = Math.max(0, Math.min(remaining, target))
        const validUsed = target - validRemaining

        if (validUsed < 0) {
          console.error('[Samples] 已使用数量不能为负数')
          return
        }

        set((state) => ({
          currentActivity: state.currentActivity
            ? {
                ...state.currentActivity,
                usedSamples: validUsed,
                remainingSamples: validRemaining
              }
            : null
        }))
        console.log('[Samples] 更新样品数量:', { used: validUsed, remaining: validRemaining })
      },

      startActivity: () => {
        const { selectedStore, selectedProduct, currentActivity } = get()
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
          purchaseCount: 0
        }
        set({
          currentActivity: newActivity,
          feedbacks: [],
          abnormalReports: [],
          selectedStore: null,
          selectedProduct: null
        })
        console.log('[Activity] 活动已开始:', newActivity)
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
        set({
          currentActivity: endedActivity,
          activityHistory: [endedActivity, ...activityHistory]
        })
        console.log('[Activity] 活动已结束:', endedActivity)
        return true
      },

      resetActivity: () => {
        set({
          currentActivity: null,
          selectedStore: null,
          selectedProduct: null,
          feedbacks: [],
          abnormalReports: []
        })
        console.log('[Activity] 已重置，可开始新活动')
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

      getReportData: (storeFilter, productFilter, periodFilter) => {
        const { activityHistory, currentActivity, feedbacks } = get()
        const allActivities = currentActivity
          ? [currentActivity, ...activityHistory.filter(a => a.id !== currentActivity.id)]
          : activityHistory
        return calculateReportData(allActivities, feedbacks, storeFilter, productFilter, periodFilter)
      },

      getFilteredFeedbacks: (storeFilter, productFilter, periodFilter) => {
        const { activityHistory, currentActivity, feedbacks } = get()
        const allActivities = currentActivity
          ? [currentActivity, ...activityHistory.filter(a => a.id !== currentActivity.id)]
          : activityHistory

        const filteredActivities = allActivities.filter(act => {
          if (storeFilter !== '全部' && act.storeName !== storeFilter) return false
          if (productFilter !== '全部' && !act.productName.includes(productFilter)) return false
          if (!matchPeriod(act.startTime, periodFilter)) return false
          return true
        })

        const activityIds = new Set(filteredActivities.map(a => a.id))
        return feedbacks.filter(f => activityIds.has(f.activityId))
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        currentActivity: state.currentActivity,
        feedbacks: state.feedbacks,
        abnormalReports: state.abnormalReports,
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
      }
    }
  )
)
