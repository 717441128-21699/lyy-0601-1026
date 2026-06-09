import { create } from 'zustand'
import { Activity, Feedback, AbnormalReport, Product, Store } from '@/types'
import { mockCurrentActivity, mockFeedbacks, mockAbnormalReports } from '@/data/feedbacks'
import { mockProducts } from '@/data/products'
import { mockStores } from '@/data/stores'
import dayjs from 'dayjs'

interface ActivityState {
  currentActivity: Activity | null
  feedbacks: Feedback[]
  abnormalReports: AbnormalReport[]
  products: Product[]
  stores: Store[]
  selectedStore: Store | null
  selectedProduct: Product | null
  setCurrentActivity: (activity: Activity | null) => void
  setSelectedStore: (store: Store | null) => void
  setSelectedProduct: (product: Product | null) => void
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt' | 'createdBy'>) => void
  addAbnormalReport: (report: Omit<AbnormalReport, 'id' | 'createdAt'>) => void
  updateSamples: (used: number, remaining: number) => void
  startActivity: () => void
  endActivity: () => void
  getProductByBarcode: (barcode: string) => Product | undefined
  getProductById: (id: string) => Product | undefined
  searchProducts: (keyword: string) => Product[]
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  currentActivity: mockCurrentActivity,
  feedbacks: mockFeedbacks,
  abnormalReports: mockAbnormalReports,
  products: mockProducts,
  stores: mockStores,
  selectedStore: mockStores[0],
  selectedProduct: mockProducts[0],

  setCurrentActivity: (activity) => set({ currentActivity: activity }),
  setSelectedStore: (store) => set({ selectedStore: store }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),

  addFeedback: (feedback) => {
    const newFeedback: Feedback = {
      ...feedback,
      id: `fb${Date.now()}`,
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      createdBy: '促销员001'
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
            remainingSamples: state.currentActivity.remainingSamples - 1
          }
        : null
    }))
    console.log('[Feedback] 新增反馈记录:', newFeedback)
  },

  addAbnormalReport: (report) => {
    const newReport: AbnormalReport = {
      ...report,
      id: `ab${Date.now()}`,
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
    }
    set((state) => ({
      abnormalReports: [newReport, ...state.abnormalReports]
    }))
    console.log('[Abnormal] 新增异常报告:', newReport)
  },

  updateSamples: (used, remaining) => {
    set((state) => ({
      currentActivity: state.currentActivity
        ? {
            ...state.currentActivity,
            usedSamples: used,
            remainingSamples: remaining
          }
        : null
    }))
  },

  startActivity: () => {
    const { selectedStore, selectedProduct } = get()
    if (!selectedStore || !selectedProduct) {
      console.error('[Activity] 请先选择门店和商品')
      return
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
      abnormalReports: []
    })
    console.log('[Activity] 活动已开始:', newActivity)
  },

  endActivity: () => {
    set((state) => ({
      currentActivity: state.currentActivity
        ? {
            ...state.currentActivity,
            status: 'completed',
            endTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
          }
        : null
    }))
    console.log('[Activity] 活动已结束')
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
  }
}))
