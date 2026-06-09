import { Feedback, Activity, ReportData, AbnormalReport } from '@/types'
import dayjs from 'dayjs'

export const mockFeedbacks: Feedback[] = [
  {
    id: 'fb001',
    activityId: 'act001',
    productId: 'prod001',
    productName: '伊利纯牛奶',
    ageGroup: 'adult',
    tasteRating: 5,
    tasteTags: ['口感醇厚', '奶香浓郁', '新鲜'],
    purchaseIntent: 'high',
    photos: [],
    createdAt: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    createdBy: '促销员001'
  },
  {
    id: 'fb002',
    activityId: 'act001',
    productId: 'prod001',
    productName: '伊利纯牛奶',
    ageGroup: 'child',
    tasteRating: 4,
    tasteTags: ['好喝', '香甜'],
    purchaseIntent: 'high',
    photos: [],
    createdAt: dayjs().subtract(1.5, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    createdBy: '促销员001'
  },
  {
    id: 'fb003',
    activityId: 'act001',
    productId: 'prod001',
    productName: '伊利纯牛奶',
    ageGroup: 'senior',
    tasteRating: 4,
    tasteTags: ['清淡', '营养'],
    purchaseIntent: 'medium',
    notPurchaseReason: '家里还有没喝完',
    photos: [],
    createdAt: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    createdBy: '促销员001'
  },
  {
    id: 'fb004',
    activityId: 'act001',
    productId: 'prod001',
    productName: '伊利纯牛奶',
    ageGroup: 'teen',
    tasteRating: 5,
    tasteTags: ['超好喝', '推荐'],
    purchaseIntent: 'high',
    photos: [],
    createdAt: dayjs().subtract(45, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    createdBy: '促销员001'
  },
  {
    id: 'fb005',
    activityId: 'act001',
    productId: 'prod001',
    productName: '伊利纯牛奶',
    ageGroup: 'adult',
    tasteRating: 3,
    tasteTags: ['一般'],
    purchaseIntent: 'low',
    notPurchaseReason: '价格还是有点贵',
    photos: [],
    createdAt: dayjs().subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    createdBy: '促销员001'
  },
  {
    id: 'fb006',
    activityId: 'act001',
    productId: 'prod001',
    productName: '伊利纯牛奶',
    ageGroup: 'adult',
    tasteRating: 5,
    tasteTags: ['口感很好', '物超所值'],
    purchaseIntent: 'high',
    photos: [],
    createdAt: dayjs().subtract(20, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    createdBy: '促销员001'
  },
  {
    id: 'fb007',
    activityId: 'act001',
    productId: 'prod001',
    productName: '伊利纯牛奶',
    ageGroup: 'senior',
    tasteRating: 4,
    tasteTags: ['不错', '新鲜'],
    purchaseIntent: 'none',
    notPurchaseReason: '乳糖不耐受',
    photos: [],
    createdAt: dayjs().subtract(10, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    createdBy: '促销员001'
  }
]

export const mockCurrentActivity: Activity = {
  id: 'act001',
  storeId: 'store001',
  storeName: '永辉超市(朝阳路店)',
  productId: 'prod001',
  productName: '伊利纯牛奶 250ml×16盒',
  productImage: 'https://picsum.photos/id/292/300/300',
  startTime: dayjs().hour(9).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss'),
  status: 'ongoing',
  targetSamples: 50,
  usedSamples: 28,
  remainingSamples: 22,
  totalFeedbacks: 7,
  purchaseCount: 4
}

export const mockAbnormalReports: AbnormalReport[] = [
  {
    id: 'ab001',
    type: 'price_error',
    description: '货架上的价格牌标注为45元，系统活动价为39.9元，需更新价格牌',
    createdAt: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'ab002',
    type: 'out_of_stock',
    description: '仓库库存不足，仅剩30箱，预计下午会缺货',
    createdAt: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss')
  }
]

export const mockReportData: ReportData = {
  activityId: 'act001',
  storeId: 'store001',
  storeName: '永辉超市(朝阳路店)',
  productId: 'prod001',
  productName: '伊利纯牛奶 250ml×16盒',
  period: '2026-06-10 09:00 - 18:00',
  totalTasters: 48,
  purchaseCount: 26,
  conversionRate: 54.2,
  avgTasteRating: 4.5,
  timeDistribution: [
    { hour: '09:00', count: 3 },
    { hour: '10:00', count: 5 },
    { hour: '11:00', count: 8 },
    { hour: '12:00', count: 6 },
    { hour: '13:00', count: 4 },
    { hour: '14:00', count: 5 },
    { hour: '15:00', count: 7 },
    { hour: '16:00', count: 6 },
    { hour: '17:00', count: 4 }
  ],
  ageDistribution: [
    { group: '儿童', count: 8 },
    { group: '青少年', count: 12 },
    { group: '成年人', count: 22 },
    { group: '老年人', count: 6 }
  ],
  topTasteTags: [
    { tag: '口感醇厚', count: 28 },
    { tag: '奶香浓郁', count: 24 },
    { tag: '新鲜', count: 20 },
    { tag: '性价比高', count: 18 },
    { tag: '推荐', count: 15 }
  ]
}

export const ageGroupLabels: Record<string, string> = {
  child: '儿童',
  teen: '青少年',
  adult: '成年人',
  senior: '老年人'
}

export const purchaseIntentLabels: Record<string, string> = {
  high: '强烈购买',
  medium: '考虑购买',
  low: '不太想买',
  none: '不购买'
}

export const abnormalTypeLabels: Record<string, string> = {
  out_of_stock: '缺货上报',
  price_error: '价格牌错误',
  competitor: '竞品活动'
}

export const tasteTagOptions = [
  '口感醇厚', '奶香浓郁', '新鲜', '香甜', '清淡',
  '好喝', '物超所值', '推荐', '一般', '太甜',
  '太咸', '太油腻', '味道好', '性价比高', '会回购'
]

export const notPurchaseReasons = [
  '价格偏高', '家里还有', '口味不喜欢', '乳糖不耐受',
  '保质期太短', '包装太大', '没有优惠', '其他原因'
]
