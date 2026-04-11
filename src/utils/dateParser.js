/**
 * 自然语言日期时间解析工具
 * 支持解析如："明天下午3点开会"、"后天9点"、"下周三"、"2024年5月1日" 等格式
 */

// 时间关键词映射
const TIME_KEYWORDS = {
  '今天': () => new Date(),
  '明天': () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  },
  '后天': () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d;
  },
  '大后天': () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  },
  '昨天': () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  },
  '前天': () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d;
  }
};

// 星期映射
const WEEK_MAP = {
  '周日': 0, '星期日': 0, '周天': 0,
  '周一': 1, '星期一': 1,
  '周二': 2, '星期二': 2,
  '周三': 3, '星期三': 3,
  '周四': 4, '星期四': 4,
  '周五': 5, '星期五': 5,
  '周六': 6, '星期六': 6
};

// 月份映射
const MONTH_MAP = {
  '一月': 0, '1月': 0, '1日': 0,
  '二月': 1, '2月': 1, '2日': 1,
  '三月': 2, '3月': 2, '3日': 2,
  '四月': 3, '4月': 3, '4日': 3,
  '五月': 4, '5月': 4, '5日': 4,
  '六月': 5, '6月': 5, '6日': 5,
  '七月': 6, '7月': 6, '7日': 6,
  '八月': 7, '8月': 7, '8日': 7,
  '九月': 8, '9月': 8, '9日': 8,
  '十月': 9, '10月': 9, '10日': 9,
  '十一月': 10, '11月': 10, '11日': 10,
  '十二月': 11, '12月': 11, '12日': 11
};

/**
 * 解析时间字符串，如 "下午3点"、"3点"、"15:30"
 */
function parseTimeString(text) {
  const patterns = [
    /凌晨(\d{1,2})[:：]?(\d{0,2})/,
    /早上(\d{1,2})[:：]?(\d{0,2})/,
    /上午(\d{1,2})[:：]?(\d{0,2})/,
    /中午(\d{1,2})?[:：]?(\d{0,2})?/,
    /下午(\d{1,2})[:：]?(\d{0,2})/,
    /晚上(\d{1,2})[:：]?(\d{0,2})/,
    /(\d{1,2})[:：](\d{1,2})/,
    /(\d{1,2})点(\d{1,2})?/,
    /(\d{1,2}):(\d{1,2})/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = 0, minutes = 0;
      
      if (pattern.source.startsWith('凌晨') || pattern.source.startsWith('早上') || pattern.source.startsWith('上午')) {
        hours = parseInt(match[1], 10);
        minutes = match[2] ? parseInt(match[2], 10) : 0;
      } else if (pattern.source.startsWith('中午')) {
        hours = 12;
        if (match[1]) hours = parseInt(match[1], 10);
        if (match[2]) minutes = parseInt(match[2], 10);
      } else if (pattern.source.startsWith('下午') || pattern.source.startsWith('晚上')) {
        hours = parseInt(match[1], 10);
        minutes = match[2] ? parseInt(match[2], 10) : 0;
        if (hours < 12) hours += 12;
      } else {
        hours = parseInt(match[1], 10);
        minutes = match[2] ? parseInt(match[2], 10) : 0;
      }
      
      return { hours, minutes };
    }
  }
  
  return null;
}

/**
 * 解析时间段字符串，如 "3点到4点"、"14:00-15:00"
 */
function parseTimeRange(text) {
  // 匹配 "X点到Y点" 格式
  const rangePattern1 = /(\d{1,2})[:：]?(\d{0,2})?\s*点到\s*(\d{1,2})[:：]?(\d{0,2})?\s*点?/;
  // 匹配 "X-Y" 格式 (如 14:00-15:00)
  const rangePattern2 = /(\d{1,2})[:：](\d{1,2})\s*[-~至]\s*(\d{1,2})[:：](\d{1,2})/;
  
  // 先尝试匹配 X点到Y点 格式
  const match1 = text.match(rangePattern1);
  if (match1) {
    const startHours = parseInt(match1[1], 10);
    const startMinutes = match1[2] ? parseInt(match1[2], 10) : 0;
    const endHours = parseInt(match1[3], 10);
    const endMinutes = match1[4] ? parseInt(match1[4], 10) : 0;
    
    return {
      start: { hours: startHours, minutes: startMinutes },
      end: { hours: endHours, minutes: endMinutes }
    };
  }
  
  // 再尝试匹配 14:00-15:00 格式
  const match2 = text.match(rangePattern2);
  if (match2) {
    return {
      start: { hours: parseInt(match2[1], 10), minutes: parseInt(match2[2], 10) },
      end: { hours: parseInt(match2[3], 10), minutes: parseInt(match2[4], 10) }
    };
  }
  
  return null;
}

/**
 * 解析日期关键词
 */
function parseDateKeyword(text) {
  const now = new Date();
  let targetDate = null;
  
  // 检查今天、明天、后天等
  for (const [keyword, getDate] of Object.entries(TIME_KEYWORDS)) {
    if (text.includes(keyword)) {
      targetDate = getDate();
      break;
    }
  }
  
  // 检查下周X
  if (!targetDate) {
    const weekMatch = text.match(/下周([日一二三四五六天])/);
    if (weekMatch) {
      const dayOfWeek = WEEK_MAP['周' + weekMatch[1]];
      targetDate = new Date();
      const daysUntil = (dayOfWeek - targetDate.getDay() + 7) % 7 + 7;
      targetDate.setDate(targetDate.getDate() + daysUntil);
    }
  }
  
  // 检查本周X
  if (!targetDate) {
    const weekMatch = text.match(/本周([日一二三四五六天])/);
    if (weekMatch) {
      const dayOfWeek = WEEK_MAP['周' + weekMatch[1]];
      targetDate = new Date();
      const daysUntil = (dayOfWeek - targetDate.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + daysUntil);
    }
  }
  
  // 检查周X（本周）
  if (!targetDate) {
    const weekMatch = text.match(/周([日一二三四五六天])/);
    if (weekMatch) {
      const dayOfWeek = WEEK_MAP['周' + weekMatch[1]];
      targetDate = new Date();
      const daysUntil = (dayOfWeek - targetDate.getDay() + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      targetDate.setDate(targetDate.getDate() + daysUntil);
    }
  }
  
  // 检查 X月X日 格式
  if (!targetDate) {
    const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]?/);
    if (monthDayMatch) {
      targetDate = new Date();
      targetDate.setMonth(parseInt(monthDayMatch[1], 10) - 1);
      targetDate.setDate(parseInt(monthDayMatch[2], 10));
      if (targetDate < new Date()) {
        targetDate.setFullYear(targetDate.getFullYear() + 1);
      }
    }
  }
  
  // 检查 X月X日 简写如 "5月1日"
  if (!targetDate) {
    for (const [keyword, monthIndex] of Object.entries(MONTH_MAP)) {
      if (text.includes(keyword) && keyword.length > 1) {
        const dayMatch = text.match(/(\d{1,2})[日号]/);
        if (dayMatch) {
          targetDate = new Date();
          targetDate.setMonth(monthIndex);
          targetDate.setDate(parseInt(dayMatch[1], 10));
          if (targetDate < new Date()) {
            targetDate.setFullYear(targetDate.getFullYear() + 1);
          }
          break;
        }
      }
    }
  }
  
  return targetDate;
}

/**
 * 主解析函数
 * @param {string} input - 用户输入的字符串
 * @returns {{ title: string, dueDate: Date|null, endDate: Date|null, parsed: boolean }}
 */
export function parseNaturalLanguage(input) {
  const text = input.trim();
  if (!text) {
    return { title: '', dueDate: null, endDate: null, parsed: false };
  }
  
  let title = text;
  let dueDate = null;
  let endDate = null;
  
  // 1. 先解析时间段（需要在日期和时间之前）
  const timeRange = parseTimeRange(text);
  
  // 2. 解析日期关键词
  const dateInfo = parseDateKeyword(text);
  
  if (timeRange) {
    // 有时间段的处理
    if (dateInfo) {
      dueDate = new Date(dateInfo);
      dueDate.setHours(timeRange.start.hours, timeRange.start.minutes, 0, 0);
      
      endDate = new Date(dateInfo);
      endDate.setHours(timeRange.end.hours, timeRange.end.minutes, 0, 0);
      
      // 如果结束时间早于开始时间，说明跨天了
      if (endDate < dueDate) {
        endDate.setDate(endDate.getDate() + 1);
      }
    } else {
      // 只有时间没有日期，默认今天
      dueDate = new Date();
      dueDate.setHours(timeRange.start.hours, timeRange.start.minutes, 0, 0);
      
      endDate = new Date();
      endDate.setHours(timeRange.end.hours, timeRange.end.minutes, 0, 0);
      
      // 如果结束时间早于开始时间，说明跨天了
      if (endDate < dueDate) {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      // 如果设定的时间已经过了，设到明天
      if (dueDate < new Date()) {
        dueDate.setDate(dueDate.getDate() + 1);
        endDate.setDate(endDate.getDate() + 1);
      }
    }
    
    // 从输入中移除日期时间相关文字，提取任务标题
    title = text
      .replace(/今天|明天|后天|大后天|昨天|前天/g, '')
      .replace(/下周[日一二三四五六天]/g, '')
      .replace(/本周[日一二三四五六天]/g, '')
      .replace(/周[日一二三四五六天]/g, '')
      .replace(/\d{1,2}月\d{1,2}[日号]?/g, '')
      .replace(/\d{1,2}月/g, '')
      .replace(/凌晨|早上|上午|中午|下午|晚上/g, '')
      .replace(/\d{1,2}[:：]\d{1,2}\s*[-~至]\s*\d{1,2}[:：]\d{1,2}/g, '')
      .replace(/\d{1,2}\s*点到\s*\d{1,2}\s*点?/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // 没有时间段的处理（原有逻辑）
    const timeInfo = parseTimeString(text);
    
    if (dateInfo) {
      dueDate = new Date(dateInfo);
      dueDate.setHours(23, 59, 59, 0);
      
      if (timeInfo) {
        dueDate.setHours(timeInfo.hours, timeInfo.minutes, 0, 0);
      }
      
      title = text
        .replace(/今天|明天|后天|大后天|昨天|前天/g, '')
        .replace(/下周[日一二三四五六天]/g, '')
        .replace(/本周[日一二三四五六天]/g, '')
        .replace(/周[日一二三四五六天]/g, '')
        .replace(/\d{1,2}月\d{1,2}[日号]?/g, '')
        .replace(/\d{1,2}月/g, '')
        .replace(/凌晨|早上|上午|中午|下午|晚上/g, '')
        .replace(/\d{1,2}[:：]\d{1,2}/g, '')
        .replace(/\d+点\d+分?/g, '')
        .replace(/\d+点/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } else if (timeInfo) {
      dueDate = new Date();
      dueDate.setHours(timeInfo.hours, timeInfo.minutes, 0, 0);
      
      if (dueDate < new Date()) {
        dueDate.setDate(dueDate.getDate() + 1);
      }
      
      title = text
        .replace(/凌晨|早上|上午|中午|下午|晚上/g, '')
        .replace(/\d{1,2}[:：]\d{1,2}/g, '')
        .replace(/\d+点\d+分?/g, '')
        .replace(/\d+点/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  
  return {
    title: title || text,
    dueDate,
    endDate,
    parsed: dueDate !== null
  };
}

/**
 * 格式化日期为友好显示
 */
export function formatDueDate(date) {
  if (!date) return null;
  
  const now = new Date();
  const target = new Date(date);
  
  // 判断是否是同一天
  const isSameDay = (d1, d2) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  
  // 判断是否是明天
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = isSameDay(target, tomorrow);
  
  // 判断是否是后天
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const isDayAfterTomorrow = isSameDay(target, dayAfterTomorrow);
  
  // 判断是否是下周
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const isNextWeek = target > now && target < nextWeek;
  
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  
  if (isSameDay(target, now)) {
    return `今天`;
  } else if (isTomorrow) {
    return `明天`;
  } else if (isDayAfterTomorrow) {
    return `后天`;
  } else if (isNextWeek) {
    return `${weekDays[target.getDay()]}`;
  } else {
    return `${target.getMonth() + 1}月${target.getDate()}日`;
  }
}

function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default parseNaturalLanguage;
