# Stack Attack 2 Pro — План публикации в App Store

## Обзор

Превращение веб-игры на PixiJS в нативное iOS приложение с помощью Capacitor и публикация в Apple App Store.

---

## 1. Предварительные требования

### 1.1 Apple Developer Program
- [ ] Зарегистрироваться в [Apple Developer Program](https://developer.apple.com/programs/) ($99/год)
- [ ] Дождаться одобрения (1-2 дня)
- [ ] Настроить двухфакторную аутентификацию на Apple ID

### 1.2 Оборудование и ПО
- [ ] Mac с macOS Sonoma 14+ (или Ventura 13+)
- [ ] Xcode 15+ (бесплатно из App Store)
- [ ] Node.js 18+
- [ ] CocoaPods (`sudo gem install cocoapods`)

### 1.3 Сертификаты и профили
- [ ] Создать iOS Distribution Certificate в Apple Developer Portal
- [ ] Создать App ID (bundle identifier: `com.yourcompany.stackattack2pro`)
- [ ] Создать Provisioning Profile (App Store Distribution)

---

## 2. Настройка Capacitor

### 2.1 Установка
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "Stack Attack 2 Pro" "com.yourcompany.stackattack2pro"
```

### 2.2 Конфигурация capacitor.config.ts
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.stackattack2pro',
  appName: 'Stack Attack 2 Pro',
  webDir: 'dist',
  server: {
    // Для production - без live reload
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Отключить bounce эффект для игры
    scrollEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false
    }
  }
};

export default config;
```

### 2.3 Добавление iOS платформы
```bash
npm run build
npx cap add ios
npx cap sync
```

---

## 3. Настройка iOS проекта в Xcode

### 3.1 Открытие проекта
```bash
npx cap open ios
```

### 3.2 Настройки в Xcode
- [ ] **General > Identity**
  - Display Name: Stack Attack 2 Pro
  - Bundle Identifier: com.yourcompany.stackattack2pro
  - Version: 1.0.0
  - Build: 1

- [ ] **Signing & Capabilities**
  - Team: выбрать свой Developer Team
  - Signing Certificate: Distribution
  - Provisioning Profile: App Store

- [ ] **General > Deployment Info**
  - iOS Deployment Target: 14.0 (или выше)
  - Device Orientation: Portrait (основной для игры)
  - Status Bar Style: Light Content

### 3.3 Иконки приложения (AppIcon)
Размеры иконок для iOS:
| Размер | Использование |
|--------|---------------|
| 20x20 @2x, @3x | Notifications |
| 29x29 @2x, @3x | Settings |
| 40x40 @2x, @3x | Spotlight |
| 60x60 @2x, @3x | App Icon (iPhone) |
| 76x76 @1x, @2x | App Icon (iPad) |
| 83.5x83.5 @2x | App Icon (iPad Pro) |
| 1024x1024 | App Store |

- [ ] Создать иконку 1024x1024 (без прозрачности, без скругленных углов)
- [ ] Сгенерировать все размеры через [App Icon Generator](https://appicon.co/)
- [ ] Добавить в `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### 3.4 Launch Screen (Splash)
- [ ] Настроить `ios/App/App/Base.lproj/LaunchScreen.storyboard`
- [ ] Или использовать Capacitor Splash Screen plugin

---

## 4. Оптимизация для iOS

### 4.1 Viewport и Safe Areas
```css
/* Учет notch на iPhone X+ */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### 4.2 Отключение нежелательных жестов
```typescript
// В main.ts или index.html
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());

// Отключить zoom
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
```

### 4.3 Производительность
- [ ] Убедиться что WebGL работает (PixiJS автоматически)
- [ ] Проверить 60 FPS на реальном устройстве
- [ ] Оптимизировать bundle size (`npm run build -- --minify`)

---

## 5. App Store Connect

### 5.1 Создание приложения
1. Войти в [App Store Connect](https://appstoreconnect.apple.com/)
2. My Apps > "+" > New App
3. Заполнить:
   - Platform: iOS
   - Name: Stack Attack 2 Pro
   - Primary Language: English (или Russian)
   - Bundle ID: com.yourcompany.stackattack2pro
   - SKU: stackattack2pro001

### 5.2 Информация о приложении

#### Описание (до 4000 символов)
```
Stack Attack 2 Pro - классическая аркадная игра в стиле LCD!

Толкайте ящики, избегайте падающих блоков и собирайте бонусы.
Ретро-графика в стиле Game Boy создает ностальгическую атмосферу.

ОСОБЕННОСТИ:
• Классический геймплей в стиле Stack Attack
• Аутентичная LCD-графика с двумя цветовыми палитрами
• 6 уникальных персонажей для разблокировки
• Специальные блоки: супер-прыжок, каска, бомба
• Touch-управление оптимизировано для мобильных
• Работает полностью офлайн

Сможете побить свой рекорд?
```

#### Ключевые слова (до 100 символов)
```
arcade,retro,puzzle,blocks,game boy,lcd,classic,stack,crates,pixel
```

#### Категории
- Primary: Games > Arcade
- Secondary: Games > Puzzle

### 5.3 Скриншоты

| Устройство | Размер | Количество |
|------------|--------|------------|
| iPhone 6.7" (14 Pro Max) | 1290 x 2796 | 3-10 |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 | 3-10 |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | 3-10 |
| iPad Pro 12.9" | 2048 x 2732 | 3-10 |

Рекомендуемые скриншоты:
1. [ ] Главное меню
2. [ ] Геймплей (в процессе игры)
3. [ ] Выбор персонажа
4. [ ] Game Over с высоким счетом
5. [ ] Специальные блоки в действии

### 5.4 App Preview (опционально)
- Видео до 30 секунд
- Размеры как у скриншотов
- Можно записать через QuickTime на Mac

---

## 6. Соответствие App Store Review Guidelines

### 6.1 Обязательные требования
- [ ] **Privacy Policy** — требуется даже без сбора данных
  - Разместить на публичном URL
  - Указать в App Store Connect

- [ ] **Age Rating** — заполнить вопросник
  - Игра без насилия/азарта: вероятно 4+

- [ ] **Support URL** — страница поддержки или email

### 6.2 Частые причины отказа
- [ ] Приложение не падает и не зависает
- [ ] Все UI элементы работают
- [ ] Touch targets минимум 44x44 pt (уже реализовано)
- [ ] Нет заглушек и "coming soon" функций
- [ ] Скриншоты соответствуют реальному приложению

---

## 7. Тестирование

### 7.1 Локальное тестирование
```bash
npm run build
npx cap sync
npx cap open ios
# Запустить на симуляторе в Xcode (Cmd+R)
```

### 7.2 Тестирование на реальном устройстве
1. Подключить iPhone к Mac
2. В Xcode выбрать устройство
3. Build and Run (Cmd+R)
4. Доверять сертификату на iPhone: Settings > General > Device Management

### 7.3 TestFlight (Beta Testing)
1. Archive приложение в Xcode (Product > Archive)
2. Загрузить в App Store Connect
3. Добавить внутренних тестеров (до 100)
4. Добавить внешних тестеров (до 10,000)
5. Собрать фидбек

---

## 8. Отправка на Review

### 8.1 Архивация и загрузка
```bash
# Обновить версию если нужно
npm run build
npx cap sync
npx cap open ios
```

В Xcode:
1. Product > Archive
2. Distribute App > App Store Connect
3. Upload

### 8.2 Отправка на проверку
1. В App Store Connect выбрать загруженный билд
2. Заполнить все обязательные поля
3. Submit for Review

### 8.3 Сроки
- Первая проверка: 1-3 дня (иногда до 7)
- Повторные проверки: обычно быстрее
- Если отказ — исправить и отправить снова

---

## 9. После публикации

### 9.1 Мониторинг
- [ ] Следить за отзывами в App Store Connect
- [ ] Отвечать на отзывы
- [ ] Проверять crash reports в Xcode Organizer

### 9.2 Обновления
```bash
# Увеличить версию в package.json и Xcode
npm run build
npx cap sync
# Archive и загрузить новую версию
```

---

## 10. Чеклист перед отправкой

### Технический
- [ ] Билд без ошибок
- [ ] Протестировано на симуляторе
- [ ] Протестировано на реальном устройстве
- [ ] 60 FPS стабильно
- [ ] Нет memory leaks
- [ ] Работает офлайн

### App Store Connect
- [ ] Иконка 1024x1024 загружена
- [ ] Все скриншоты загружены
- [ ] Описание заполнено
- [ ] Ключевые слова заданы
- [ ] Privacy Policy URL указан
- [ ] Support URL указан
- [ ] Age Rating заполнен
- [ ] Pricing установлен (Free или цена)

### Review Guidelines
- [ ] Приложение полнофункционально
- [ ] Нет заглушек
- [ ] Touch targets >= 44pt
- [ ] Работает в Portrait и/или Landscape
- [ ] Splash screen корректный

---

## Ресурсы

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

## Оценка времени

| Этап | Время |
|------|-------|
| Регистрация Apple Developer | 1-2 дня |
| Настройка Capacitor + iOS | 2-4 часа |
| Создание иконок и скриншотов | 4-8 часов |
| TestFlight тестирование | 3-7 дней |
| Review Apple | 1-7 дней |
| **Итого** | **~2-3 недели** |

---

*Документ создан: 2026-02-01*
*Версия: 1.0*
