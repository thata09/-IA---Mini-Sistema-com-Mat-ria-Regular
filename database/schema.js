const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'virgula.db');

function initDatabase() {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ==================== USERS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student', 'teacher')),
      class_id INTEGER,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      avatar TEXT DEFAULT 'default',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reset_token TEXT,
      reset_token_expires DATETIME
    );
  `);

  // ==================== CLASSES ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      teacher_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id)
    );
  `);

  // ==================== LEARNING TOPICS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('use', 'dont_use', 'tip')),
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      examples_correct TEXT NOT NULL,
      examples_incorrect TEXT,
      tip TEXT,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ==================== QUESTIONS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('place_comma', 'correct_incorrect', 'choose_alternative', 'identify_rule', 'fix_sentence')),
      topic_slug TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
      statement TEXT NOT NULL,
      sentence TEXT,
      options TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      created_by INTEGER,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_slug) REFERENCES topics(slug),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // ==================== QUIZZES ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      topic_slugs TEXT,
      difficulty TEXT,
      question_count INTEGER DEFAULT 10,
      created_by INTEGER,
      is_custom INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // ==================== QUIZ ATTEMPTS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_id INTEGER,
      topic_slug TEXT,
      difficulty TEXT,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER DEFAULT 0,
      wrong_answers INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'abandoned')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    );
  `);

  // ==================== QUIZ ANSWERS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      user_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );
  `);

  // ==================== ESSAY TOPICS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS essay_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      instructions TEXT,
      genre TEXT DEFAULT 'dissertativo',
      created_by INTEGER,
      is_practice INTEGER DEFAULT 0,
      deadline DATETIME,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // ==================== ESSAYS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS essays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      topic_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      parent_essay_id INTEGER,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'corrected')),
      ai_correction TEXT,
      ai_corrected_text TEXT,
      ai_score REAL,
      ai_feedback TEXT,
      ai_errors TEXT,
      ai_strengths TEXT,
      ai_suggestions TEXT,
      submitted_at DATETIME,
      corrected_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (topic_id) REFERENCES essay_topics(id),
      FOREIGN KEY (parent_essay_id) REFERENCES essays(id)
    );
  `);

  // ==================== ACHIEVEMENTS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT DEFAULT '🏆',
      points_required INTEGER DEFAULT 0,
      condition_type TEXT NOT NULL,
      condition_value INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ==================== USER ACHIEVEMENTS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id INTEGER NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (achievement_id) REFERENCES achievements(id),
      UNIQUE(user_id, achievement_id)
    );
  `);

  // ==================== TOPIC PROGRESS ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS topic_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      topic_slug TEXT NOT NULL,
      total_questions INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      last_practiced DATETIME,
      mastery_level TEXT DEFAULT 'beginner' CHECK(mastery_level IN ('beginner', 'learning', 'practicing', 'mastered')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (topic_slug) REFERENCES topics(slug),
      UNIQUE(user_id, topic_slug)
    );
  `);

  // ==================== INDEXES ====================
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id);
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_slug);
    CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
    CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt ON quiz_answers(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_essays_user ON essays(user_id);
    CREATE INDEX IF NOT EXISTS idx_essays_topic ON essays(topic_id);
    CREATE INDEX IF NOT EXISTS idx_topic_progress_user ON topic_progress(user_id);
  `);

  console.log('✅ Banco de dados inicializado com sucesso!');
  db.close();
}

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

module.exports = { initDatabase, getDb, DB_PATH };

// Run directly
if (require.main === module) {
  initDatabase();
}
