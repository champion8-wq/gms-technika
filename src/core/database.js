/**
 * Firebase service с fallback на LocalStorage
 */

import { CONSTANTS } from './constants.js';
import { Helpers } from './helpers.js';

export class DatabaseService {
  constructor() {
    this.db = null;
    this.isOnline = false;
    this.listeners = new Map();
    this.queue = [];
    this.syncInProgress = false;
  }

  /**
   * Инициализация Firebase или LocalStorage
   */
  async init() {
    try {
      // Проверяем доступность Firebase
      if (window.firebase && CONSTANTS.FB_CONFIG.projectId) {
        firebase.initializeApp(CONSTANTS.FB_CONFIG);
        this.db = firebase.database();
        
        // Мониторим состояние подключения
        this.db.ref('.info/connected').on('value', (snapshot) => {
          this.isOnline = snapshot.val() === true;
          this.emit('connectionChange', this.isOnline);
          if (this.isOnline) this.syncQueue();
        });
        
        Helpers.log('DB', 'Firebase инициализирован');
        return true;
      } else {
        throw new Error('Firebase не настроен');
      }
    } catch (error) {
      Helpers.log('DB', 'Firebase не доступен, используем LocalStorage', error);
      this.db = null;
      return false;
    }
  }

  /**
   * SET - запись данных (firebase или local)
   */
  async set(path, data) {
    const operation = { type: 'set', path, data, timestamp: Date.now() };
    
    if (this.isOnline && this.db) {
      try {
        await this.db.ref(path).set(data);
        this.removeFromQueue(operation);
        return { success: true };
      } catch (error) {
        this.queue.push(operation);
        return { success: false, offline: true };
      }
    } else {
      // Сохраняем локально
      this.setLocal(path, data);
      this.queue.push(operation);
      return { success: true, local: true };
    }
  }

  /**
   * UPDATE - обновление данных
   */
  async update(path, data) {
    const operation = { type: 'update', path, data, timestamp: Date.now() };
    
    if (this.isOnline && this.db) {
      try {
        await this.db.ref(path).update(data);
        this.removeFromQueue(operation);
        return { success: true };
      } catch (error) {
        this.queue.push(operation);
        return { success: false, offline: true };
      }
    } else {
      // Получаем текущие данные и мержим
      const current = this.getLocal(path) || {};
      const merged = Helpers.merge(current, data);
      this.setLocal(path, merged);
      this.queue.push(operation);
      return { success: true, local: true };
    }
  }

  /**
   * GET - получение данных
   */
  async get(path) {
    if (this.isOnline && this.db) {
      try {
        const snapshot = await this.db.ref(path).once('value');
        const data = snapshot.val();
        this.setLocal(path, data);
        return data;
      } catch (error) {
        Helpers.log('DB', `Ошибка при получении ${path}`, error);
        return this.getLocal(path);
      }
    } else {
      return this.getLocal(path);
    }
  }

  /**
   * REMOVE - удаление данных
   */
  async remove(path) {
    const operation = { type: 'remove', path, timestamp: Date.now() };
    
    if (this.isOnline && this.db) {
      try {
        await this.db.ref(path).remove();
        this.removeFromQueue(operation);
        return { success: true };
      } catch (error) {
        this.queue.push(operation);
        return { success: false, offline: true };
      }
    } else {
      this.removeLocal(path);
      this.queue.push(operation);
      return { success: true, local: true };
    }
  }

  /**
   * QUERY - запрос с фильтром
   */
  async query(path, options = {}) {
    const { orderBy, limitToFirst, limitToLast, equalTo } = options;
    
    if (this.isOnline && this.db) {
      try {
        let query = this.db.ref(path);
        
        if (orderBy) query = query.orderByChild(orderBy);
        if (limitToFirst) query = query.limitToFirst(limitToFirst);
        if (limitToLast) query = query.limitToLast(limitToLast);
        if (equalTo) query = query.equalTo(equalTo);
        
        const snapshot = await query.once('value');
        return snapshot.val();
      } catch (error) {
        Helpers.log('DB', `Ошибка при запросе ${path}`, error);
        return null;
      }
    }
    return null;
  }

  /**
   * LISTEN - слушатель на изменения (только онлайн)
   */
  on(path, callback) {
    if (!this.isOnline || !this.db) {
      // Эмулируем слушателя для локальных данных
      const data = this.getLocal(path);
      if (data) callback(data);
      return;
    }

    try {
      const listener = this.db.ref(path).on('value', (snapshot) => {
        const data = snapshot.val();
        this.setLocal(path, data);
        callback(data);
      });

      this.listeners.set(path, { listener, callback });
    } catch (error) {
      Helpers.log('DB', `Ошибка подписки на ${path}`, error);
    }
  }

  /**
   * OFF - отписка от слушателя
   */
  off(path) {
    if (!this.isOnline || !this.db) return;

    const entry = this.listeners.get(path);
    if (entry) {
      this.db.ref(path).off('value', entry.listener);
      this.listeners.delete(path);
    }
  }

  // === LocalStorage Methods ===

  /**
   * Получение из LocalStorage
   */
  getLocal(path) {
    try {
      const key = `gms_${path}`;
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  /**
   * Установка в LocalStorage
   */
  setLocal(path, data) {
    try {
      const key = `gms_${path}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      Helpers.log('DB', 'Ошибка сохранения в LocalStorage', error);
    }
  }

  /**
   * Удаление из LocalStorage
   */
  removeLocal(path) {
    try {
      const key = `gms_${path}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  /**
   * Очистка LocalStorage
   */
  clearLocal() {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('gms_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // ignore
    }
  }

  // === Queue Management ===

  /**
   * Синхронизация очереди с Firebase
   */
  async syncQueue() {
    if (this.syncInProgress || !this.isOnline || !this.db) return;

    this.syncInProgress = true;
    const failedOps = [];

    for (const operation of this.queue) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        failedOps.push(operation);
        Helpers.log('DB', `Ошибка синхронизации ${operation.path}`, error);
      }
    }

    this.queue = failedOps;
    this.syncInProgress = false;

    if (failedOps.length === 0) {
      this.emit('syncComplete', true);
    }
  }

  /**
   * Выполнение операции из очереди
   */
  async executeOperation(operation) {
    switch (operation.type) {
      case 'set':
        await this.db.ref(operation.path).set(operation.data);
        break;
      case 'update':
        await this.db.ref(operation.path).update(operation.data);
        break;
      case 'remove':
        await this.db.ref(operation.path).remove();
        break;
    }
  }

  /**
   * Удалить операцию из очереди
   */
  removeFromQueue(operation) {
    const index = this.queue.findIndex(
      op => op.type === operation.type && op.path === operation.path
    );
    if (index > -1) this.queue.splice(index, 1);
  }

  // === Event System ===

  emit(event, data) {
    const eventName = `db:${event}`;
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  on(event, callback) {
    const eventName = `db:${event}`;
    window.addEventListener(eventName, (e) => callback(e.detail));
  }

  /**
   * Получить статус подключения
   */
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      hasQueue: this.queue.length > 0,
      queueSize: this.queue.length,
      isPendingSync: this.syncInProgress
    };
  }

  /**
   * Очистить все данные
   */
  async clear() {
    this.clearLocal();
    this.queue = [];
    this.listeners.clear();
  }
}

// Экспортируем синглтон
export const db = new DatabaseService();
