-- Esquema y datos ficticios de Nova Salud para MySQL 8.0+.
CREATE DATABASE IF NOT EXISTS nova_salud CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE nova_salud;

CREATE TABLE IF NOT EXISTS categorias (
  id_categoria INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  correo VARCHAR(160) NOT NULL UNIQUE,
  rol ENUM('ADMINISTRADOR','CAJERO') NOT NULL DEFAULT 'CAJERO',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
  id_cliente INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  documento VARCHAR(20) UNIQUE,
  telefono VARCHAR(20), correo VARCHAR(160),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
  id_producto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_categoria INT UNSIGNED NOT NULL,
  sku VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(140) NOT NULL,
  descripcion VARCHAR(255),
  unidad VARCHAR(30) NOT NULL DEFAULT 'unidad',
  precio_venta DECIMAL(10,2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  stock_minimo INT UNSIGNED NOT NULL DEFAULT 5,
  fecha_vencimiento DATE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria),
  CONSTRAINT chk_producto_precio CHECK (precio_venta >= 0),
  INDEX idx_productos_nombre (nombre), INDEX idx_productos_stock (stock, stock_minimo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ventas (
  id_venta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(24) NOT NULL UNIQUE,
  id_cliente INT UNSIGNED NULL,
  id_usuario INT UNSIGNED NOT NULL,
  fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metodo_pago ENUM('EFECTIVO','TARJETA','TRANSFERENCIA','OTRO') NOT NULL DEFAULT 'EFECTIVO',
  estado ENUM('COMPLETADA','ANULADA') NOT NULL DEFAULT 'COMPLETADA',
  subtotal DECIMAL(12,2) NOT NULL,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  observacion VARCHAR(255),
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT chk_venta_importes CHECK (subtotal >= 0 AND descuento >= 0 AND total >= 0),
  INDEX idx_ventas_fecha (fecha_venta)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalle_venta (
  id_detalle BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_venta BIGINT UNSIGNED NOT NULL,
  id_producto INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta),
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
  INDEX idx_detalle_producto (id_producto)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimientos_stock (
  id_movimiento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_producto INT UNSIGNED NOT NULL,
  id_usuario INT UNSIGNED NULL,
  id_venta BIGINT UNSIGNED NULL,
  tipo ENUM('INGRESO','VENTA','AJUSTE','DEVOLUCION') NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  stock_resultante INT UNSIGNED NOT NULL,
  motivo VARCHAR(255),
  fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimiento_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
  CONSTRAINT fk_movimiento_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_movimiento_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE SET NULL,
  INDEX idx_movimiento_producto_fecha (id_producto, fecha_movimiento)
) ENGINE=InnoDB;

INSERT IGNORE INTO categorias (id_categoria, nombre, descripcion) VALUES
  (1,'Analgésicos','Alivio del dolor'), (2,'Vitaminas','Vitaminas y suplementos'),
  (3,'Cuidado personal','Higiene y cuidado personal'), (4,'Antialérgicos','Medicamentos para alergias'),
  (5,'Digestivos','Medicamentos digestivos'), (6,'Primeros auxilios','Productos de primeros auxilios');

INSERT IGNORE INTO usuarios (id_usuario,nombres,apellidos,correo,rol) VALUES
  (1,'María','Rodríguez','maria.rodriguez@example.test','ADMINISTRADOR'),
  (2,'Luis','Paredes','luis.paredes@example.test','CAJERO');

INSERT IGNORE INTO clientes (id_cliente,nombres,apellidos,documento,telefono,correo) VALUES
  (1,'Andrea','Quispe','70123456','900111222','andrea.quispe@example.test'),
  (2,'Carlos','Mendoza','70876543','900333444','carlos.mendoza@example.test');

INSERT IGNORE INTO productos (id_producto,id_categoria,sku,nombre,descripcion,unidad,precio_venta,stock,stock_minimo,fecha_vencimiento) VALUES
  (1,1,'MED-001','Paracetamol 500 mg','Tabletas, caja x 100','caja',4.50,48,15,'2027-08-31'),
  (2,1,'MED-002','Ibuprofeno 400 mg','Tabletas, caja x 50','caja',6.80,8,12,'2027-04-30'),
  (3,2,'VIT-014','Vitamina C 1 g','Tabletas efervescentes','unidad',2.50,31,10,'2027-11-30'),
  (4,3,'CUI-021','Alcohol medicinal 96°','Frasco de 500 ml','frasco',7.90,5,8,'2028-02-29'),
  (5,4,'MED-018','Loratadina 10 mg','Tabletas, caja x 10','caja',3.20,26,10,'2027-06-30'),
  (6,6,'CUI-030','Suero fisiológico 1 L','Solución fisiológica','frasco',9.50,18,8,'2027-03-31'),
  (7,5,'MED-024','Omeprazol 20 mg','Cápsulas, caja x 30','caja',5.40,3,10,'2027-05-31'),
  (8,3,'CUI-043','Alcohol en gel 250 ml','Gel antibacterial','frasco',8.00,22,8,'2028-01-31');

CREATE OR REPLACE VIEW alertas_stock AS
SELECT p.id_producto,p.sku,p.nombre,c.nombre AS categoria,p.stock AS stock_actual,
       p.stock_minimo,(p.stock_minimo-p.stock) AS unidades_para_minimo
FROM productos p JOIN categorias c ON c.id_categoria=p.id_categoria
WHERE p.activo=TRUE AND p.stock<=p.stock_minimo;
