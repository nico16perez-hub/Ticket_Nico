-- =============================================
-- IT Task Manager - Schema para H2
-- =============================================

-- 1. USUARIOS
-- El password se hashea con CryptoJS en el front antes de enviarlo.
-- El campo role solo acepta 'ADMIN' o 'USER'.
CREATE TABLE IF NOT EXISTS users (
    id LONG PRIMARY KEY AUTO_INCREMENT NOT NULL,
    name VARCHAR(50) NOT NULL,
    surname VARCHAR(50) NOT NULL,
    user_name VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(128) NOT NULL,
    area VARCHAR(50) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'USER'
);

-- 2. TAREAS RECURRENTES (templates)
-- Cada usuario configura sus tareas repetitivas.
-- No tienen fecha: son plantillas que se "activan" en el dia.
CREATE TABLE IF NOT EXISTS recurring_tasks (
    id LONG PRIMARY KEY AUTO_INCREMENT NOT NULL,
    user_id LONG NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. TAREAS DEL DIA (instancias activadas)
-- Cuando un usuario clickea una tarea recurrente, se crea un registro aca.
-- El campo type indica el origen: 'recurrente', 'reclamo' o 'trabajo'.
-- area es opcional porque las recurrentes pueden no tener area.
CREATE TABLE IF NOT EXISTS daily_tasks (
    id LONG PRIMARY KEY AUTO_INCREMENT NOT NULL,
    user_id LONG NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    task_date DATE NOT NULL,
    type VARCHAR(20) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    area VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. RECLAMOS / TICKETS
-- Registro completo de un reclamo recibido.
-- claimant = persona que hizo el reclamo (no necesariamente un usuario del sistema).
-- problem_type = tipo de problema (Hardware, Software, Red, etc).
CREATE TABLE IF NOT EXISTS claims (
    id LONG PRIMARY KEY AUTO_INCREMENT NOT NULL,
    user_id LONG NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title VARCHAR(100) NOT NULL,
    area VARCHAR(50) NOT NULL,
    claimant VARCHAR(100) NOT NULL,
    problem_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    solution TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. IMAGENES DE RECLAMOS
-- Tabla separada para soportar multiples imagenes por reclamo.
-- image_data guarda el base64 o la ruta del archivo segun como lo manejes.
CREATE TABLE IF NOT EXISTS claim_images (
    id LONG PRIMARY KEY AUTO_INCREMENT NOT NULL,
    claim_id LONG NOT NULL,
    image_data TEXT NOT NULL,
    file_name VARCHAR(255),
    content_type VARCHAR(100),
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
);

-- 6. TRABAJOS REALIZADOS (sin reclamo)
-- Tareas que el usuario hizo por iniciativa propia, sin que haya un llamado.
CREATE TABLE IF NOT EXISTS completed_works (
    id LONG PRIMARY KEY AUTO_INCREMENT NOT NULL,
    user_id LONG NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title VARCHAR(100) NOT NULL,
    area VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =============================================
-- INDICES para consultas frecuentes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON daily_tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_claims_user_date ON claims(user_id, claim_date);
CREATE INDEX IF NOT EXISTS idx_claims_date ON claims(claim_date);
CREATE INDEX IF NOT EXISTS idx_completed_works_user_date ON completed_works(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_completed_works_date ON completed_works(work_date);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user ON recurring_tasks(user_id);

-- =============================================
-- DATOS INICIALES (usuarios de prueba)
-- Passwords hasheados con CryptoJS SHA-256:
--   admin123 -> hash correspondiente
--   user123  -> hash correspondiente
-- Reemplaza los hashes con los valores reales de tu implementacion.
-- =============================================
INSERT INTO users (name, surname, user_name, password, area, role) VALUES
    ('Admin', 'Sistema', 'admin', 'REEMPLAZAR_CON_HASH_DE_admin123', 'Sistemas', 'ADMIN'),
    ('Juan', 'Perez', 'jperez', 'REEMPLAZAR_CON_HASH_DE_user123', 'Soporte', 'USER');
