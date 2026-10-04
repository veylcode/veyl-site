export type StatusId = string;
export type Quality = "full" | "balanced" | "light";
export type ProjectCategory = "Minecraft" | "Web" | "Systems";
export type Language = "ru" | "en";
export type Theme = "dark" | "light";
export interface StatusDefinition {
  id: StatusId;
  label: string;
  nameRu: string;
  description: string;
  descriptionEn: string;
  color: string;
  responseTime: string;
  chatEnabled: boolean;
  acceptingProjects: boolean;
}
export interface StatusSchedule {
  id: string;
  day: number;
  start: string;
  end: string;
  status: StatusId;
  enabled: boolean;
}
export interface Project {
  id: string;
  name: string;
  category: ProjectCategory;
  description: string;
  stack: string;
  visible: boolean;
  descriptionEn?: string;
  state?: "active" | "completed" | "archived" | "unknown" | "draft" | "private";
  role?: string;
  roleEn?: string;
  alias?: boolean;
  link?: string;
  cover?: string;
}
export interface Message {
  id: string;
  text: string;
  sender: "visitor" | "owner";
  time: string;
  readAt?: string | null;
}
export interface CaseStudy {
  id: string;
  title: string;
  titleEn: string;
  problem: string;
  problemEn: string;
  work: string;
  workEn: string;
  result: string;
  resultEn: string;
  stack: string;
  flow: string;
  visible: boolean;
  needsReview: boolean;
}
export interface SiteContent {
  title: string;
  subtitle: string;
  about: string;
  titleEn: string;
  subtitleEn: string;
  aboutEn: string;
}
export interface SiteSettings {
  telegram: string;
  discord: string;
  github: string;
  chatVisible: boolean;
  statusVisible: boolean;
  chatButtonRu: string;
  chatButtonEn: string;
}
export interface PublicSite {
  content: SiteContent;
  settings: SiteSettings;
  status: StatusId;
  statusUntil: string | null;
  statusFallback: StatusId;
  statusDefinitions: StatusDefinition[];
  projects: Project[];
  cases: CaseStudy[];
  workload: { projectNames: string[]; showNames: boolean; count: number };
}
export interface SiteData extends PublicSite {
  schedules: StatusSchedule[];
  quickReplies: string[];
}
export interface SiteState extends SiteData {
  quality: Quality;
  theme: Theme;
  language: Language;
  messages: Message[];
}
export interface Conversation {
  id: string;
  name: string;
  contact: string;
  state: "new" | "active" | "waiting" | "closed" | "blocked";
  createdAt: string;
  lastMessage: string;
  updatedAt: string;
  unread: number;
  pinned: boolean;
  archived: boolean;
  muted: boolean;
  notes: string;
}
