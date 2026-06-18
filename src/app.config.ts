export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/queue/index',
    'pages/backup/index',
    'pages/mine/index',
    'pages/booking/index',
    'pages/package/index',
    'pages/overcall/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1A0B2E',
    navigationBarTitleText: 'KTV包厢预订',
    navigationBarTextStyle: 'white',
    backgroundColor: '#1A0B2E'
  },
  tabBar: {
    color: 'rgba(255,255,255,0.5)',
    selectedColor: '#9D4EDD',
    backgroundColor: '#1A0B2E',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '包厢'
      },
      {
        pagePath: 'pages/queue/index',
        text: '叫号'
      },
      {
        pagePath: 'pages/backup/index',
        text: '候补'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
