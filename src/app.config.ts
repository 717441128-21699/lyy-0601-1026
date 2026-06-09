export default defineAppConfig({
  pages: [
    'pages/activity/index',
    'pages/scan/index',
    'pages/feedback/index',
    'pages/inventory/index',
    'pages/report/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#165DFF',
    navigationBarTitleText: '智慧零售试吃',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F6F7'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#165DFF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/activity/index',
        text: '今日活动'
      },
      {
        pagePath: 'pages/scan/index',
        text: '扫码记录'
      },
      {
        pagePath: 'pages/feedback/index',
        text: '顾客反馈'
      },
      {
        pagePath: 'pages/inventory/index',
        text: '库存联动'
      },
      {
        pagePath: 'pages/report/index',
        text: '活动复盘'
      }
    ]
  }
})
