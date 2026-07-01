const products = [
  {
    id: 'entry',
    name: '赛事报名费',
    desc: '适合单队报名，包含赛程通知与基础赛果记录。',
    price: '99.00'
  },
  {
    id: 'score',
    name: '现场计分服务包',
    desc: '横屏计分、赛果生成、赛事数据归档。',
    price: '199.00'
  },
  {
    id: 'stats',
    name: '技术统计服务包',
    desc: '球员名单、得分记录、赛后技术统计整理。',
    price: '299.00'
  }
];

Page({
  data: { products },
  selectProduct(event) {
    const product = products.find((item) => item.id === event.currentTarget.dataset.id);
    wx.setStorageSync('pendingOrderProduct', product);
    wx.navigateTo({ url: '/pages/order/index' });
  }
});
