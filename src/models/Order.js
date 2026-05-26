/**
 * Модель Order - управление заявками
 */

import { CONSTANTS } from '../utils/constants.js';
import { Validators } from '../utils/validators.js';
import { Helpers } from '../utils/helpers.js';
import { Formatters } from '../utils/formatters.js';

export class Order {
  constructor(data = {}) {
    this.id = data.id || `#${1000 + Math.floor(Math.random() * 9000)}`;
    this.userId = data.userId || '';
    this.userName = data.userName || '';
    this.tech = data.tech || '';
    this.techId = data.techId || '';
    this.workType = data.workType || '';
    this.obj = data.obj || ''; // Объект (для работ на месте)
    this.from = data.from || ''; // Откуда (для доставки)
    this.to = data.to || ''; // Куда (для доставки)
    this.wtype = data.wtype || 'site'; // 'site', 'delivery', 'container', 'equip'
    this.date = data.date || Formatters.formatDate(new Date());
    this.cost = data.cost || '';
    this.desc = data.desc || '';
    this.timeSlot = data.timeSlot || 'anytime'; // 'anytime', 'morning', 'evening'
    this.timeComment = data.timeComment || '';
    this.contactFrom = data.contactFrom || '';
    this.contactTo = data.contactTo || '';
    this.urgent = data.urgent || 'Плановая';
    this.resp = data.resp || ''; // Ответственный
    this.st = data.st || CONSTANTS.ORDER_STATUSES.NEW; // Статус
    this.ts = data.ts || new Date().toLocaleString('ru-RU');
    this.comment = data.comment || '';
    this.confirmedBy = data.confirmedBy || '';
    this.confirmedAt = data.confirmedAt || '';
    this.changedBy = data.changedBy || '';
  }

  /**
   * Валидация заявки
   */
  validate() {
    const errors = [];

    if (!this.userName?.trim()) errors.push('Укажите ваше имя');
    if (!this.tech?.trim()) errors.push('Выберите технику');
    if (!this.date) errors.push('Выберите дату');
    if (!this.cost?.trim()) errors.push('Выберите статью затрат');

    if (this.wtype === 'site' && !this.obj?.trim()) {
      errors.push('Укажите объект');
    }

    if (['delivery', 'container', 'equip'].includes(this.wtype)) {
      if (!this.from?.trim()) errors.push('Укажите адрес отправления');
      if (!this.to?.trim()) errors.push('Укажите адрес получения');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    return true;
  }

  /**
   * Получить статус с иконкой
   */
  getStatusLabel() {
    const labels = {
      [CONSTANTS.ORDER_STATUSES.NEW]: '🆕 Новая',
      [CONSTANTS.ORDER_STATUSES.ACCEPTED]: '✅ Принята',
      [CONSTANTS.ORDER_STATUSES.IN_PROGRESS]: '🔄 В работе',
      [CONSTANTS.ORDER_STATUSES.DRIVER_ON_WAY]: '🚛 Водитель едет',
      [CONSTANTS.ORDER_STATUSES.COMPLETED]: '✔️ Выполнена',
      [CONSTANTS.ORDER_STATUSES.REJECTED]: '❌ Отказ'
    };
    return labels[this.st] || this.st;
  }

  /**
   * Получить место (объект или маршрут)
   */
  getLocation() {
    return this.wtype === 'site' ? this.obj : `${this.from} → ${this.to}`;
  }

  /**
   * Получить описание работы
   */
  getWorkDescription() {
    return `${this.tech}${this.workType ? ` · ${this.workType}` : ''}`;
  }

  /**
   * Получить время работы
   */
  getTimeSlotLabel() {
    const labels = {
      'anytime': '🕐 В любое время',
      'morning': '🌅 Первая половина дня',
      'evening': '🌆 Вторая половина дня'
    };
    return labels[this.timeSlot] || this.timeSlot;
  }

  /**
   * Проверить статус
   */
  isNew() { return this.st === CONSTANTS.ORDER_STATUSES.NEW; }
  isAccepted() { return this.st === CONSTANTS.ORDER_STATUSES.ACCEPTED; }
  isInProgress() { return this.st === CONSTANTS.ORDER_STATUSES.IN_PROGRESS; }
  isDriverOnWay() { return this.st === CONSTANTS.ORDER_STATUSES.DRIVER_ON_WAY; }
  isCompleted() { return this.st === CONSTANTS.ORDER_STATUSES.COMPLETED; }
  isRejected() { return this.st === CONSTANTS.ORDER_STATUSES.REJECTED; }
  isActive() { return ![CONSTANTS.ORDER_STATUSES.COMPLETED, CONSTANTS.ORDER_STATUSES.REJECTED].includes(this.st); }

  /**
   * Изменить статус
   */
  setStatus(newStatus, changedBy = '', comment = '') {
    this.st = newStatus;
    this.changedBy = changedBy;
    if (comment) this.comment = comment;
  }

  /**
   * Подтвердить приезд
   */
  confirmArrival(confirmedBy) {
    if (this.st !== CONSTANTS.ORDER_STATUSES.DRIVER_ON_WAY) {
      throw new Error('Заявка не в статусе "Водитель едет"');
    }
    this.st = CONSTANTS.ORDER_STATUSES.COMPLETED;
    this.confirmedBy = confirmedBy;
    this.confirmedAt = new Date().toLocaleString('ru-RU');
  }

  /**
   * Отклонить
   */
  reject(comment, rejectedBy = '') {
    this.st = CONSTANTS.ORDER_STATUSES.REJECTED;
    this.comment = comment;
    this.changedBy = rejectedBy;
  }

  /**
   * Конвертация в JSON
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      userName: this.userName,
      tech: this.tech,
      techId: this.techId,
      workType: this.workType,
      obj: this.obj,
      from: this.from,
      to: this.to,
      wtype: this.wtype,
      date: this.date,
      cost: this.cost,
      desc: this.desc,
      timeSlot: this.timeSlot,
      timeComment: this.timeComment,
      contactFrom: this.contactFrom,
      contactTo: this.contactTo,
      urgent: this.urgent,
      resp: this.resp,
      st: this.st,
      ts: this.ts,
      comment: this.comment,
      confirmedBy: this.confirmedBy,
      confirmedAt: this.confirmedAt,
      changedBy: this.changedBy
    };
  }

  /**
   * Статический метод создания из JSON
   */
  static fromJSON(data) {
    return new Order(data);
  }
}
