-- Ejecutar una vez después de importar nova_salud.sql.
USE nova_salud;
CREATE TABLE IF NOT EXISTS auth_credentials (
  id_usuario INT UNSIGNED PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;
