export interface Store {
  id: string
  name: string
  address: string
  area: string
}

export interface Product {
  id: string
  barcode: string
  name: string
  spec: string
  sellingPoints: string[]
  originalPrice: number
  activityPrice: number
  category: string
  image: string
}

export interface Feedback {
  id: string
  activityId: string
  productId: string
  productName: string
  ageGroup: 'child' | 'teen' | 'adult' | 'senior'
  tasteRating: number
  tasteTags: string[]
  purchaseIntent: 'high' | 'medium' | 'low' | 'none'
  notPurchaseReason?: string
  photos: string[]
  createdAt: string
  createdBy: string
}

export interface Activity {
  id: string
  storeId: string
  storeName: string
  productId: string
  productName: string
  productImage: string
  startTime: string
  endTime?: string
  status: 'pending' | 'ongoing' | 'completed'
  targetSamples: number
  usedSamples: number
  remainingSamples: number
  totalFeedbacks: number
  purchaseCount: number
  feedbacks: Feedback[]
  abnormalReports: AbnormalReport[]
}

export interface PersistedState {
  currentActivity: Activity | null
  allFeedbacks: Feedback[]
  allAbnormalReports: AbnormalReport[]
  selectedStoreId: string | null
  selectedProductId: string | null
  activityHistory: Activity[]
  comparisonRecords: ComparisonRecord[]
}

export interface InventoryReport {
  activityId: string
  totalTasters: number
  purchaseCount: number
  conversionRate: number
  commonProblems: { label: string; count: number }[]
  remainingSamples: number
  abnormalReports: AbnormalReport[]
}

export interface AbnormalReport {
  id: string
  type: 'out_of_stock' | 'price_error' | 'competitor'
  description: string
  createdAt: string
}

export interface ReportData {
  activityId: string
  storeId: string
  storeName: string
  productId: string
  productName: string
  period: string
  totalTasters: number
  purchaseCount: number
  conversionRate: number
  avgTasteRating: number
  timeDistribution: { hour: string; count: number }[]
  ageDistribution: { group: string; count: number }[]
  topTasteTags: { tag: string; count: number }[]
}

export interface DimensionSummary {
  key: string
  name: string
  activityCount: number
  totalTasters: number
  totalPurchases: number
  avgConversionRate: number
  avgRating: number
  abnormalCount: number
  highConversionActivities: Activity[]
  lowRatingActivities: Activity[]
  activities: Activity[]
}

export interface ManagerViewData {
  byStore: DimensionSummary[]
  byProduct: DimensionSummary[]
  byPromoter: DimensionSummary[]
  period: string
  totalActivities: number
  totalTasters: number
  totalPurchases: number
  overallConversionRate: number
  overallAvgRating: number
}

export interface DailySummary {
  date: string
  activityCount: number
  totalTasters: number
  totalPurchases: number
  avgConversionRate: number
  avgRating: number
  abnormalCount: number
  activities: Activity[]
}

export interface ComparisonRecord {
  id: string
  activityId1: string
  activityId2: string
  activity1Snapshot: Activity
  activity2Snapshot: Activity
  winnerId: string | null
  reason: string
  createdAt: string
}

export type AgeGroup = 'child' | 'teen' | 'adult' | 'senior'
export type PurchaseIntent = 'high' | 'medium' | 'low' | 'none'
export type AbnormalType = 'out_of_stock' | 'price_error' | 'competitor'
export type ActivityStatus = 'pending' | 'ongoing' | 'completed'
export type ManagerDimension = 'store' | 'product' | 'promoter'
export type ReportViewMode = 'timeline' | 'list' | 'compare' | 'manager' | 'comparisons'
