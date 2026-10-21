// functions.js
/**
 * 获取最近一周日期，分离周五周六和其他日期
 * @param {Date} baseDate - 基准日期（默认今天）
 * @returns {Object} 分类后的日期对象
 */
export function getRecentWeekSeparated(baseDate = new Date()) {
  const fridaySaturday = [];  // 周五、周六
  const otherDays = [];       // 其他日期
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay(); // 0=周日, 5=周五, 6=周六
    const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;
    
    const dayInfo = {
      date: formatDate(date),
      dayOfWeek: dayOfWeek,
      dayName: getDayName(dayOfWeek),
      isFridayOrSaturday,
      isToday: i === 0
    };
    
    if (isFridayOrSaturday) {
      fridaySaturday.push(dayInfo);
    } else {
      otherDays.push(dayInfo);
    }
  }
  
  return {
    fridaySaturday,              // 周五周六数组
    otherDays,                   // 其他日期数组
    all: [...fridaySaturday, ...otherDays].sort((a, b) => a.date.localeCompare(b.date)) // 全部按日期排序
  };
}

/**
 * 判断日期范围是否包含周五或周六，并返回总天数
 * @param {string} startDate - 开始日期（如 2026/10/07）
 * @param {string} endDate - 结束日期（如 2026/10/12）
 * @returns {Object} { hasWeekend: boolean, totalDays: number }
 */
export function checkDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { hasWeekend: false, totalDays: 0 };
  }
  
  // 确保 start <= end
  const [s, e] = start > end ? [end, start] : [start, end];
  
  // 计算总天数（含首尾）
  // const totalDays = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  
  // 计算总天数（不含后一天）
  const totalDays = Math.floor((e - s) / (1000 * 60 * 60 * 24));

  // 判断是否包含周五或周六
  let hasWeekend = false;
  const current = new Date(s);
  
  while (current <= e) {
    const day = current.getDay(); // 5=周五, 6=周六
    if (day === 5 || day === 6) {
      hasWeekend = true;
      break;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return { hasWeekend, totalDays };
}

/**
 * 判断日期范围是否同时包含周五/周六和其他非周五周六的日期
 * 规则：
 * 1. 同一天内的多个时间点算一天
 * 2. 不包含结束日期那天
 * @param {string} startDate - 开始日期（如 2026/10/07）
 * @param {string} endDate - 结束日期（如 2026/10/12）
 * @returns {Object} 包含判断结果和统计信息
 */
export function checkDateRangeType(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      hasWeekend: false,
      hasWeekday: false,
      isMixed: false,
      totalDays: 0,
      weekendDays: 0,
      weekdayDays: 0
    };
  }
  
  // 确保 start <= end
  const [s, e] = start > end ? [end, start] : [start, end];
  
  // 使用 Set 去重同一天（忽略时间部分）
  const uniqueDays = new Set();
  
  const current = new Date(s);
  current.setHours(0, 0, 0, 0);
  const endDay = new Date(e);
  endDay.setHours(0, 0, 0, 0);
  
  // 不包含结束那天，所以是 current < endDay
  while (current < endDay) {
    // 使用本地日期格式化，避免 toISOString 的时区问题
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    uniqueDays.add(dateStr);
    current.setDate(current.getDate() + 1);
  }
  
  let weekendDays = 0;
  let weekdayDays = 0;
  
  uniqueDays.forEach(dateStr => {
    const date = new Date(dateStr);
    const day = date.getDay();
    if (day === 5 || day === 6) {
      weekendDays++;
    } else {
      weekdayDays++;
    }
  });
  
  const hasWeekend = weekendDays > 0;
  const hasWeekday = weekdayDays > 0;
  
  return {
    hasWeekend,
    hasWeekday,
    isMixed: hasWeekend && hasWeekday,
    totalDays: uniqueDays.size,
    weekendDays,
    weekdayDays
  };
}



/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取星期名称
 */
export function getDayName(dayIndex) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[dayIndex];
}

/**
 * 将数字四舍五入到小数点后两位
 */
export function roundToTwoDecimals(num) {
  if (num == null || isNaN(num)) return 0
  return Math.round(Number(num) * 100) / 100
}