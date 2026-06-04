// ═══ Keyword Dictionaries for HS Tariff Search ═══
// Adapted from hscoder project

const materials = [
  '塑料', 'PP', 'PE', 'PVC', 'ABS', '聚乙烯', '聚丙烯', '聚苯乙烯', '聚氨酯',
  '金属', '钢', '铁', '铝', '铜', '不锈钢', '合金', '锌', '镍', '钛',
  '棉', '麻', '丝', '毛', '化纤', '涤纶', '尼龙', '聚酯', '腈纶', '氨纶',
  '木', '竹', '藤', '柳', '胶合板', '纤维板',
  '玻璃', '陶瓷', '石材', '大理石', '花岗岩',
  '皮革', '橡胶', '硅胶', '乳胶',
  '纸', '纸板', '瓦楞纸',
]

const categories = [
  '杯', '碗', '盘', '碟', '餐具', '厨具', '容器', '瓶', '罐', '桶',
  '衬衫', 'T恤', '裤', '裙', '衣', '服装', '鞋', '帽', '袜',
  '机器', '设备', '泵', '阀', '马达', '电机', '压缩机', '发动机', '发电机',
  '电器', '电子', '传感器', '开关', '继电器', '变压器', '电池', '电路', '蓄电池', '电源',
  '汽车', '车辆', '零件', '配件', '轮胎', '发动机',
  '玩具', '游戏', '运动', '健身',
  '家具', '座椅', '桌', '柜', '架', '床', '沙发',
  '灯', '照明', 'LED', '灯具',
  '工具', '刀具', '模具', '量具',
  '化学品', '涂料', '颜料', '胶粘剂', '添加剂',
  '食品', '饮料', '糖果', '调料', '酒',
  '药品', '医疗器械', '试剂',
  '手机', '电脑', '笔记本', '平板', '耳机', '音箱', '充电', '数据线',
  '移动', '锂', '离子', '聚合物', '镍', '氢',
]

const functions = [
  '医疗', '工业', '农业', '家用', '商用', '办公', '实验室',
  '食品', '饮料', '化妆品', '药品',
  '汽车', '航空', '船舶', '铁路',
  '建筑', '装修', '管道',
  '包装', '运输', '仓储',
  '通讯', '测量', '控制', '检测',
]

export function extractKeywords(text: string): string[] {
  const allKeywords = [...materials, ...categories, ...functions]
  const found: string[] = []

  for (const keyword of allKeywords) {
    if (text.includes(keyword)) {
      found.push(keyword)
    }
  }

  // Fallback: extract 2-4 char Chinese words
  if (found.length === 0) {
    const chineseWords = text.match(/[一-龥]{2,4}/g) || []
    found.push(...chineseWords.slice(0, 5))
  }

  return [...new Set(found)]
}
