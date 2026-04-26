import mysql from 'mysql2/promise';

const missingDatabaseConfigMessage =
  'Missing SQL database configuration. Set DATABASE_URL or MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE.';

export function hasDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE),
  );
}

export function isMissingDatabaseConfigError(error) {
  return error instanceof Error && error.message === missingDatabaseConfigMessage;
}

function getDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (
    process.env.MYSQL_HOST &&
    process.env.MYSQL_USER &&
    process.env.MYSQL_DATABASE
  ) {
    return {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE,
    };
  }

  throw new Error(missingDatabaseConfigMessage);
}

if (!global.mysqlConnection) {
  global.mysqlConnection = {
    pool: null,
    initPromise: null,
  };
}

async function ensureBlogTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      excerpt TEXT NULL,
      content_html LONGTEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      cover_image TEXT NULL,
      cover_image_alt VARCHAR(255) NULL,
      categories_json LONGTEXT NULL,
      tags_json LONGTEXT NULL,
      meta_title VARCHAR(255) NULL,
      meta_description TEXT NULL,
      faq_json LONGTEXT NULL,
      howto_json LONGTEXT NULL,
      custom_schema_json LONGTEXT NULL,
      show_table_of_contents TINYINT(1) NOT NULL DEFAULT 1,
      search_text LONGTEXT NULL,
      author_name VARCHAR(255) NULL,
      published_at DATETIME NULL,
      reading_time_minutes INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY blog_posts_slug_unique (slug),
      KEY blog_posts_status_idx (status),
      KEY blog_posts_published_at_idx (published_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const requiredColumns = [
    {
      name: 'faq_json',
      definition: 'LONGTEXT NULL',
    },
    {
      name: 'howto_json',
      definition: 'LONGTEXT NULL',
    },
    {
      name: 'custom_schema_json',
      definition: 'LONGTEXT NULL',
    },
    {
      name: 'show_table_of_contents',
      definition: 'TINYINT(1) NOT NULL DEFAULT 1',
    },
  ];

  for (const column of requiredColumns) {
    const [rows] = await pool.query(`SHOW COLUMNS FROM blog_posts LIKE ?`, [column.name]);

    if (!rows.length) {
      await pool.query(
        `ALTER TABLE blog_posts ADD COLUMN ${column.name} ${column.definition}`,
      );
    }
  }
}

export async function connectToDatabase() {
  if (global.mysqlConnection.pool) {
    return global.mysqlConnection.pool;
  }

  if (!global.mysqlConnection.initPromise) {
    global.mysqlConnection.initPromise = (async () => {
      const pool = mysql.createPool({
        ...getDatabaseConfig(),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      await ensureBlogTable(pool);
      global.mysqlConnection.pool = pool;
      return pool;
    })();
  }

  return global.mysqlConnection.initPromise;
}
