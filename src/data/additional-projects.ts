import type { Project } from "../types.ts";

export const additionalProjects: Project[] = [
  {
    id: "west1k-ai",
    name: "West1k AI",
    category: "Systems",
    description:
      "Платформа автоматизации Telegram Business: бот управления, Vue Mini App, правила, контакты, AI через Ollama и журнал действий. Модульная архитектура с проверкой прав перед выполнением действий. Проект продолжает развиваться.",
    descriptionEn:
      "Telegram Business automation platform with a control bot, Vue Mini App, rules, contacts, local Ollama AI and an audit trail. Modular architecture with permission checks before execution. Development is ongoing.",
    stack: "Python / aiogram / FastAPI / Vue / PostgreSQL / Redis / Ollama",
    role: "Разработка платформы и интерфейса",
    roleEn: "Platform and interface development",
    state: "active",
    visible: true,
  },
  {
    id: "velt",
    name: "VELT / Mail",
    category: "Web",
    description:
      "Интерфейс почтового сервиса и админка: письма, папки, черновики, контакты, роли и настройки. Реализованы Vue/Nuxt-интерфейсы и проверки безопасности. Подключение настоящего SMTP/IMAP и почтовой инфраструктуры - следующий этап.",
    descriptionEn:
      "Mail-service interface and admin console: messages, folders, drafts, contacts, roles and settings. Vue/Nuxt interfaces and security checks are implemented. Real SMTP/IMAP and mail infrastructure are the next stage.",
    stack: "Vue / Nuxt / TypeScript / RBAC / AES-GCM",
    role: "Интерфейс и серверные границы доступа",
    roleEn: "Interface and server access boundaries",
    state: "active",
    visible: true,
  },
  {
    id: "apve-filter",
    name: "APVE Chat Filter",
    category: "Minecraft",
    description:
      "Доработка существующего фильтра чата: личные сообщения, смешанные алфавиты, обходы через символы, белый список, локальная цензура и антиспам. Устранены конфликтующая зависимость и ложные срабатывания. Автор оригинального плагина сохранён.",
    descriptionEn:
      "Improved an existing chat filter: private messages, mixed alphabets, symbol-based bypasses, whitelist handling, partial censorship and spam detection. Removed a conflicting dependency and false positives. The original plugin author is credited.",
    stack: "Java / Paper / Leaf 1.21.4 / Chat / Moderation",
    role: "Исправления и доработка существующего плагина",
    roleEn: "Fixes and improvements to an existing plugin",
    state: "completed",
    visible: true,
  },
  {
    id: "greenhunger",
    name: "GreenHungerEffect",
    category: "Minecraft",
    description:
      "Серверный Fabric-мод с отдельным эффектом зелёного голода. Обнуляет насыщение и отключает естественное восстановление здоровья, сохраняя регенерацию от зелий и обычную логику еды. Визуальный эффект доступен ванильному клиенту через Polymer.",
    descriptionEn:
      "Server-side Fabric mod with a separate green hunger effect. Clears saturation and disables natural regeneration while preserving potion regeneration and normal food behavior. Polymer provides visuals for vanilla clients.",
    stack: "Fabric / Polymer / Java / Mixins",
    role: "Разработка серверного мода",
    roleEn: "Server-side mod development",
    state: "completed",
    visible: true,
  },
  {
    id: "infectioncraft-auction",
    name: "InfectionCraft / Auction",
    category: "Minecraft",
    description:
      "Аукцион предметов и задания игроков. Vault, талоны, реликвии и обмен предметами; резервирование оплаты, подтверждение обмена и безопасная выдача. Защита от двойных кликов, переполнения инвентаря и потери предметов после перезапуска.",
    descriptionEn:
      "Item auction and player tasks. Vault, tickets, relics and item trading, with payment reservation, exchange confirmation and safe item claims. Protection against duplicate clicks, full inventories and item loss on restart.",
    stack: "Java / Paper 1.20.1 / Vault / GUI / YAML",
    role: "Разработка игровой экономики",
    roleEn: "Game economy development",
    state: "completed",
    visible: true,
  },
  {
    id: "veyl-motion",
    name: "Veyl / Avatar & Banner",
    category: "Web",
    description:
      "Фирменный аватар и баннер Veyl: ледяная эмблема, пиксельные детали и зацикленная анимация. Подготовка разных форматов и оптимизированных изображений для сайта и профилей.",
    descriptionEn:
      "Veyl avatar and banner with an icy emblem, pixel details and looping motion. Prepared multiple formats and optimized images for the website and profiles.",
    stack: "Brand assets / Animation / WebP / GIF / MP4",
    role: "Фирменная графика и анимация",
    roleEn: "Brand graphics and motion",
    state: "completed",
    visible: true,
  },
  {
    id: "veyl-signature",
    name: "Veyl / Pixel Signature",
    category: "Web",
    description:
      "Зацикленная пиксельная подпись VEYL: появление букв, холодное свечение и аккуратный переход в начало. Компактный формат 700 × 70 для профилей и подписей.",
    descriptionEn:
      "Looping VEYL pixel signature with letter reveal, icy glow and a clean return to the start. Compact 700 × 70 format for profiles and signatures.",
    stack: "Pixel typography / Animation / GIF / VideoZero",
    role: "Пиксельная типографика и анимация",
    roleEn: "Pixel typography and motion",
    state: "completed",
    visible: true,
  },
];

export const staffCoreDescription =
  "Плагин для команды Paper-сервера: роли, staff mode, Freeze и Inspect, предметы управления и журналирование. Исправлены клики по воздуху через PlayerAnimationEvent, поиск игрока под прицелом и защита от двойного запуска действия.";
export const staffCoreDescriptionEn =
  "Paper server staff plugin: roles, staff mode, Freeze and Inspect, action items and logging. Fixed air clicks with PlayerAnimationEvent, ray-traced player targeting and duplicate-action prevention.";
