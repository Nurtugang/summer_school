export const UNIVERSITY_NAME = "Университет им. М. Ауэзова (Шымкент)";

export const MAX_REVIEWS_PER_USER = Number(process.env.MAX_REVIEWS_PER_USER ?? 3);
export const UPLOAD_MAX_MB = Number(process.env.UPLOAD_MAX_MB ?? 10);
export const UPLOAD_MAX_FILES = 3;
export const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024;

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Минимальная длина смыслового поля триады (не пусто, не «ааа»).
export const MIN_TRIAD_FIELD_CHARS = 15;
export const MIN_TRIAD_FIELD_WORDS = 3;

// --- Quiz ---
export const MAX_QUIZ_ATTEMPTS = Number(process.env.MAX_QUIZ_ATTEMPTS ?? 3);
export const OPEN_QUESTIONS_COUNT_IN_RATING =
  (process.env.OPEN_QUESTIONS_COUNT_IN_RATING ?? "true") !== "false";

// --- Rating weights (sum to 1.0 → итог на шкале 0–100) ---
export const W_QUIZ = Number(process.env.W_QUIZ ?? 0.4);
export const W_CARD = Number(process.env.W_CARD ?? 0.5);
export const W_REVIEW_BONUS = Number(process.env.W_REVIEW_BONUS ?? 0.1);

// Число рецензий, после которого прогресс-полоска "Рецензии" считается заполненной.
export const REVIEW_PROGRESS_TARGET = 3;

// Тематический контекст модуля — передаётся Gemini при генерации кейсовых вопросов теста,
// подобранных под специализацию преподавателя.
export const QUIZ_MODULE_CONTEXT: Record<number, string> = {
  1: "Backward Design (обратный дизайн), конструктивное согласование Биггса (Outcome ↔ Assessment ↔ Activity), ИИ-резистентность заданий в высшем образовании.",
  2: "Таксономия Блума в редакции 2001 года в эпоху ИИ, феномен ventriloquising (списывание через ИИ в один клик) и co-curating, Pentagram-фреймворк для системных промптов, устойчивые к ИИ формулировки заданий.",
  3: "Flipped classroom (перевёрнутый класс) по Брейм и Bergmann & Sams: до-классное знакомство с материалом на низких уровнях Блума, аудиторное время — на высоких; Peer Instruction (Mazur), Just-in-Time Teaching; наивное против осмысленного (Flip 2.0) внедрение ИИ; ИИ-тьютор для домашней подготовки (сократовский метод, без готовых ответов).",
};

// --- Задание М3 «Тьютор для домашней подготовки» (tutor_prompt) ---
// Рецензии нет, ИИ не ставит балл — гейт локальный (см. lib/tutorPrompt.ts). Балл в
// компоненте «работы» фиксированный за сам факт зачёта, чтобы модуль был симметричен М1/М2.
export const TUTOR_PROMPT_FIXED_SCORE = 5;

// --- Админка (/admin) — доступ только этим email, остальные получают 404 ---
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
