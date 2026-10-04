import type { SiteData, StatusDefinition, Project } from "../types.ts";
import portfolio from "./portfolio.json" with { type: "json" };
import { defaultCases } from "./cases.ts";
import {
  additionalProjects,
  staffCoreDescription,
  staffCoreDescriptionEn,
} from "./additional-projects.ts";

const status = (
  id: string,
  label: string,
  nameRu: string,
  description: string,
  descriptionEn: string,
  color: string,
  chatEnabled = true,
  acceptingProjects = true,
): StatusDefinition => ({
  id,
  label,
  nameRu,
  description,
  descriptionEn,
  color,
  chatEnabled,
  acceptingProjects,
  responseTime: "",
});
export const defaultStatuses: StatusDefinition[] = [
  status(
    "projects",
    "Busy with projects",
    "Занят проектами",
    "Веду несколько проектов, отвечаю по возможности",
    "Working on several projects, replying when possible",
    "#d7a36b",
    true,
    false,
  ),
  status(
    "available",
    "Available",
    "Свободен",
    "Открыт к новым проектам",
    "Open to new projects",
    "#35b99a",
  ),
  status(
    "limited",
    "Limited",
    "Есть немного времени",
    "Могу взять небольшую задачу",
    "Available for smaller tasks",
    "#61bdcf",
  ),
  status(
    "working",
    "Working",
    "Работаю",
    "Работаю над проектом, но написать можно",
    "Working on a project, messages are welcome",
    "#e3a64b",
  ),
  status(
    "busy",
    "Busy",
    "Занят",
    "Сейчас занят, отвечу позже",
    "Busy right now, will reply later",
    "#e68a65",
    true,
    false,
  ),
  status(
    "away",
    "Away",
    "Отошёл",
    "Сейчас не у компьютера",
    "Away from the computer",
    "#8b9bb5",
  ),
  status(
    "offline",
    "Offline",
    "Не в сети",
    "Сообщение сохранится, отвечу после возвращения",
    "Your message will be saved until I return",
    "#718198",
  ),
  status(
    "vacation",
    "Vacation",
    "В отпуске",
    "Вернусь к проектам после отпуска",
    "Back to projects after vacation",
    "#a894db",
    true,
    false,
  ),
  status(
    "school",
    "At school",
    "На занятиях",
    "На занятиях, отвечу вечером",
    "At school, will reply in the evening",
    "#739bd0",
  ),
  status(
    "maintenance",
    "Maintenance",
    "Технические работы",
    "Занимаюсь обновлениями и обслуживанием",
    "Handling updates and maintenance",
    "#c7ad71",
    true,
    false,
  ),
  status(
    "unavailable",
    "Unavailable",
    "Не беру проекты",
    "Новые проекты пока не принимаю",
    "Not accepting new projects right now",
    "#9c8598",
    false,
    false,
  ),
];

export const createSeed = (): SiteData => ({
  content: {
    title: "Создаю. Соединяю.",
    titleEn: "Build. Connect.",
    subtitle:
      "Minecraft-серверы, плагины, сайты и автоматизация. От отдельной задачи до целой системы.",
    subtitleEn:
      "Minecraft servers, plugins, websites and automation. From a single task to a complete system.",
    about:
      "Настраиваю Minecraft-сети и игровые механики, создаю сайты и ботов. Разбираюсь с ошибками, правами и интеграциями. Помогаю команде поддерживать проект без постоянной ручной работы.",
    aboutEn:
      "I configure Minecraft networks and gameplay, build websites and bots, diagnose issues, and connect services. I help teams run their projects with less manual work.",
  },
  settings: {
    telegram: "https://t.me/veyldev",
    discord: "veyl.core",
    github: "https://github.com/veylcode",
    chatVisible: true,
    statusVisible: true,
    chatButtonRu: "Обсудить проект",
    chatButtonEn: "Discuss a project",
  },
  status: "available",
  statusUntil: null,
  statusFallback: "available",
  statusDefinitions: structuredClone(defaultStatuses),
  schedules: [],
  quickReplies: [
    "Привет! Расскажи подробнее, что нужно сделать.",
    "Скинь версию сервера, список плагинов и лог ошибки.",
    "Сейчас занят, отвечу немного позже.",
  ],
  projects: [...portfolio.projects, ...additionalProjects].map((project) =>
    project.id === "staffcore"
      ? {
          ...project,
          description: staffCoreDescription,
          descriptionEn: staffCoreDescriptionEn,
          stack: "Java / Paper 1.21.11 / Staff mode / Ray tracing",
          role: "Разработка инструментов команды",
          roleEn: "Staff tools development",
          state: "completed",
        }
      : project,
  ) as Project[],
  cases: structuredClone(defaultCases),
  workload: { projectNames: [], showNames: true, count: 0 },
});
