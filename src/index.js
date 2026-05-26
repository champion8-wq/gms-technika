/**
 * Punto de entrada de la aplicación
 * Inicialización de servicios y módulos
 */

import { initializeServices, getAuth, getOrderRepository, getDriverRepository } from './core/service-locator.js';
import { appEvents } from './utils/helpers.js';

/**
 * Инициализация приложения
 */
export async function initializeApp() {
  try {
    console.log('🚀 Инициализация GMS Group...');

    // 1. Инициализировать все сервисы
    await initializeServices();

    // 2. Установить слушатели на события БД
    setupDatabaseListeners();

    // 3. Установить слушатели на события авторизации
    setupAuthListeners();

    // 4. Загрузить данные
    await loadInitialData();

    console.log('✅ Приложение готово к работе');
    appEvents.emit('appReady', { timestamp: new Date().toISOString() });

    return true;
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
    appEvents.emit('appError', { error: error.message });
    return false;
  }
}

/**
 * Настройка слушателей БД
 */
function setupDatabaseListeners() {
  const orderRepo = getOrderRepository();
  const driverRepo = getDriverRepository();

  // Слушаем новые заявки
  orderRepo.listen((orders) => {
    appEvents.emit('ordersUpdated', { orders, count: orders.length });
  });

  // Слушаем изменения водителей
  driverRepo.listen((drivers) => {
    appEvents.emit('driversUpdated', { drivers, count: drivers.length });
  });
}

/**
 * Настройка слушателей авторизации
 */
function setupAuthListeners() {
  const auth = getAuth();

  // Слушаем смену текущего пользователя
  appEvents.on('currentUserChanged', (user) => {
    console.log('👤 Текущий пользователь:', user.name);
  });

  // Слушаем смену статуса подключения
  appEvents.on('connectionChange', (isOnline) => {
    console.log(isOnline ? '🟢 Онлайн' : '🔴 Офлайн');
  });
}

/**
 * Загрузить начальные данные
 */
async function loadInitialData() {
  try {
    const orderRepo = getOrderRepository();
    const driverRepo = getDriverRepository();

    // Загружаем параллельно
    const [orders, drivers] = await Promise.all([
      orderRepo.getAll(),
      driverRepo.getAll()
    ]);

    console.log(`📊 Загружено заявок: ${orders.length}, водителей: ${drivers.length}`);

    return { orders, drivers };
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    return { orders: [], drivers: [] };
  }
}

/**
 * Выход из приложения
 */
export async function shutdown() {
  console.log('🛑 Завершение работы приложения...');
  const db = await import('./core/database.js').then(m => m.db);
  await db.clear();
  console.log('✅ Приложение закрыто');
}

// Экспорт для использования в других модулях
export { initializeServices, getAuth, getOrderRepository, getDriverRepository };
