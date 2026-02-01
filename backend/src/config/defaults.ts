export const COURSE_DEFAULTS = {
    AI_MODEL: 'gemini-2.5-flash',
    QUIZ_QUESTION_COUNT: 3,

    // Structure Rules
    SMALL_TOPIC_LESSONS: 1,
    BIG_TOPIC_MIN_LESSONS: 3,
    BIG_TOPIC_MAX_LESSONS: 5,

    // Max lessons to process in one batch (to avoid timeouts)
    MAX_LESSONS_PER_COURSE: 5,

    // Server Defaults
    DEFAULT_PORT: 5000,
    JWT_SECRET_FALLBACK: 'default_dev_secret_change_me',

    // AI Content Limits
    TRANSCRIPT_CHAR_LIMIT: 15000
};
