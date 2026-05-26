/**
 * Общие вспомогательные функции
 */

export const Helpers = {
  /**
   * Глубокое копирование объекта
   */
  deepClone: (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => Helpers.deepClone(item));
    if (obj instanceof Object) {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = Helpers.deepClone(obj[key]);
        }
      }
      return cloned;
    }
  },

  /**
   * Слияние объектов
   */
  merge: (target, source) => {
    const result = { ...target };
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = Helpers.merge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    return result;
  },

  /**
   * Проверка является ли объект пустым
   */
  isEmpty: (obj) => {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    if (typeof obj === 'string') return obj.trim().length === 0;
    return false;
  },

  /**
   * Генерирование уникального ID
   */
  generateId: (prefix = '') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
  },

  /**
   * Генерирование случайного цвета из палитры
   */
  pickColor: (colors) => {
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /**
   * Дебаунс функции
   */
  debounce: (fn, delay = 300) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * Throttle функции
   */
  throttle: (fn, limit = 300) => {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Переведите миллисекунды в секунды
   */
  msToSeconds: (ms) => Math.floor(ms / 1000),

  /**
   * Переведите секунды в миллисекунды
   */
  secondsToMs: (seconds) => seconds * 1000,

  /**
   * Проверка мобильного устройства
   */
  isMobile: () => {
    const mobileRegex = /Mobi|Android|iPhone|iPad|iPod/i;
    const widthCheck = window.innerWidth < 900;
    return mobileRegex.test(navigator.userAgent) || widthCheck;
  },

  /**
   * Элемент в viewport?
   */
  isInViewport: (element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Скролл к элементу
   */
  scrollToElement: (element, behavior = 'smooth') => {
    element?.scrollIntoView({ behavior, block: 'nearest' });
  },

  /**
   * Копирование в буфер обмена
   */
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Получение значения из nested объекта
   */
  getNestedValue: (obj, path, defaultValue = null) => {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      result = result?.[key];
      if (result === undefined) return defaultValue;
    }
    
    return result || defaultValue;
  },

  /**
   * Установка значения в nested объект
   */
  setNestedValue: (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    let current = obj;
    for (const key of keys) {
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    
    current[lastKey] = value;
    return obj;
  },

  /**
   * Фильтрация объекта по ключам
   */
  filterObject: (obj, predicate) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([key, value]) => predicate(key, value))
    );
  },

  /**
   * Маппирование объекта
   */
  mapObject: (obj, transform) => {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, transform(key, value)])
    );
  },

  /**
   * Уникальные элементы массива
   */
  unique: (array) => [...new Set(array)],

  /**
   * Группировка массива по ключу
   */
  groupBy: (array, keyFn) => {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  },

  /**
   * Сортировка массива
   */
  sortBy: (array, keyFn, ascending = true) => {
    return [...array].sort((a, b) => {
      const aVal = keyFn(a);
      const bVal = keyFn(b);
      
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
      return 0;
    });
  },

  /**
   * Пагинация массива
   */
  paginate: (array, page = 1, pageSize = 10) => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      items: array.slice(start, end),
      total: array.length,
      pages: Math.ceil(array.length / pageSize),
      currentPage: page
    };
  },

  /**
   * Поиск в массиве объектов
   */
  search: (array, query, searchFields) => {
    const lowerQuery = query.toLowerCase();
    return array.filter(item => {
      return searchFields.some(field => {
        const value = Helpers.getNestedValue(item, field);
        return value && String(value).toLowerCase().includes(lowerQuery);
      });
    });
  },

  /**
   * Задержка (для async/await)
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Retry функция с экспоненциальной задержкой
   */
  retry: async (fn, maxAttempts = 3, backoffMs = 1000) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await Helpers.delay(backoffMs * Math.pow(2, i));
      }
    }
  },

  /**
   * Логирование с префиксом
   */
  log: (prefix, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${prefix}: ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  },

  /**
   * Безопасное получение JSON из строки
   */
  parseJSON: (jsonStr, defaultValue = null) => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return defaultValue;
    }
  }
};

/**
 * EventEmitter для связи между модулями
 */
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event, listenerToRemove) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }

  once(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }
}

/**
 * Глобальный event emitter приложения
 */
export const appEvents = new EventEmitter();
