const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { rateLimit } = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '32kb' }));
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nova_salud',
  createDatabaseTable: true
});
app.use(session({
  name: 'nova.sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(48).toString('hex'),
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }
}));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' } });
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  next();
}
function requireAdmin(req, res, next) {
  if (req.session.user?.rol !== 'ADMINISTRADOR') return res.status(403).json({ error: 'Esta acción requiere el rol de administrador.' });
  next();
}

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Ingresa tu correo y contraseña.' });
    const [rows] = await db.execute(`SELECT u.id_usuario, u.nombres, u.apellidos, u.correo, u.rol, ac.password_hash
      FROM usuarios u JOIN auth_credentials ac ON ac.id_usuario = u.id_usuario
      WHERE LOWER(u.correo) = ? AND u.activo = TRUE LIMIT 1`, [email]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.user = { id: rows[0].id_usuario, name: `${rows[0].nombres} ${rows[0].apellidos}`, email: rows[0].correo, rol: rows[0].rol };
      req.session.save(saveError => saveError ? next(saveError) : res.json({ user: req.session.user }));
    });
  } catch (error) { next(error); }
});
app.get('/api/auth/me', (req, res) => req.session.user ? res.json({ user: req.session.user }) : res.status(401).json({ error: 'No hay una sesión activa.' }));
app.post('/api/auth/logout', (req, res, next) => req.session.destroy(error => {
  if (error) return next(error);
  res.clearCookie('nova.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.status(204).end();
}));

app.get('/api/health', async (_req, res) => {
  try { await db.query('SELECT 1'); res.json({ ok: true, database: 'connected' }); }
  catch (_error) { res.status(503).json({ ok: false, database: 'disconnected' }); }
});

app.get('/api/products', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT p.id_producto AS id, p.nombre AS name,
      c.nombre AS category, p.sku, p.precio_venta AS price, p.stock,
      p.stock_minimo AS minStock, p.unidad AS unit
      FROM productos p JOIN categorias c ON c.id_categoria = p.id_categoria
      WHERE p.activo = TRUE ORDER BY p.nombre`);
    res.json(rows);
  } catch (error) { next(error); }
});

app.post('/api/products', requireAuth, requireAdmin, async (req, res, next) => {
  const { name, category, sku, price, stock, minStock, unit = 'unidad' } = req.body;
  if (!name?.trim() || !category?.trim() || !sku?.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0 || !Number.isInteger(Number(minStock)) || Number(minStock) < 0) return res.status(400).json({ error: 'Completa los datos del producto con valores válidos.' });
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    let [categories] = await conn.execute('SELECT id_categoria FROM categorias WHERE nombre = ?', [category.trim()]);
    if (!categories.length) {
      const [created] = await conn.execute('INSERT INTO categorias (nombre) VALUES (?)', [category.trim()]);
      categories = [{ id_categoria: created.insertId }];
    }
    const [created] = await conn.execute(`INSERT INTO productos
      (id_categoria, sku, nombre, unidad, precio_venta, stock, stock_minimo)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [categories[0].id_categoria, sku.trim(), name.trim(), unit.trim(), Number(price), Number(stock), Number(minStock)]);
    if (Number(stock) > 0) await conn.execute(`INSERT INTO movimientos_stock
      (id_producto, tipo, cantidad, stock_resultante, motivo) VALUES (?, 'INGRESO', ?, ?, 'Stock inicial')`, [created.insertId, Number(stock), Number(stock)]);
    await conn.commit();
    res.status(201).json({ id: created.insertId, name: name.trim(), category: category.trim(), sku: sku.trim(), price: Number(price), stock: Number(stock), minStock: Number(minStock), unit });
  } catch (error) {
    if (conn) await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un producto con ese código.' });
    next(error);
  } finally { if (conn) conn.release(); }
});

app.post('/api/stock/entries', requireAuth, requireAdmin, async (req, res, next) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);
  const reason = String(req.body.reason || 'Reposición de inventario').trim().slice(0, 255);
  if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return res.status(400).json({ error: 'Selecciona un producto y una cantidad válida.' });
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [products] = await conn.execute('SELECT id_producto, nombre, stock FROM productos WHERE id_producto = ? AND activo = TRUE FOR UPDATE', [productId]);
    if (!products.length) { await conn.rollback(); return res.status(404).json({ error: 'No se encontró el producto.' }); }
    const [update] = await conn.execute('UPDATE productos SET stock = stock + ? WHERE id_producto = ?', [quantity, productId]);
    if (!update.affectedRows) throw new Error('No se pudo actualizar el inventario.');
    const newStock = products[0].stock + quantity;
    await conn.execute(`INSERT INTO movimientos_stock (id_producto, id_usuario, tipo, cantidad, stock_resultante, motivo)
      VALUES (?, ?, 'INGRESO', ?, ?, ?)`, [productId, req.session.user.id, quantity, newStock, reason || 'Reposición de inventario']);
    await conn.commit();
    res.status(201).json({ productId, name: products[0].nombre, added: quantity, stock: newStock });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally { if (conn) conn.release(); }
});

app.post('/api/sales', requireAuth, async (req, res, next) => {
  const { items, paymentMethod = 'EFECTIVO' } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Agrega al menos un producto a la venta.' });
  const validPayments = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO'];
  if (!validPayments.includes(paymentMethod)) return res.status(400).json({ error: 'Método de pago inválido.' });
  const quantities = new Map();
  for (const item of items) {
    const productId = Number(item.productId), quantity = Number(item.quantity);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'Hay productos o cantidades inválidas.' });
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const ids = [...quantities.keys()];
    const placeholders = ids.map(() => '?').join(',');
    const [products] = await conn.query(`SELECT id_producto, nombre, precio_venta, stock FROM productos WHERE activo = TRUE AND id_producto IN (${placeholders}) ORDER BY id_producto FOR UPDATE`, ids);
    if (products.length !== ids.length) { await conn.rollback(); return res.status(400).json({ error: 'Uno o más productos ya no están disponibles.' }); }
    for (const product of products) {
      const quantity = quantities.get(product.id_producto);
      if (product.stock < quantity) { await conn.rollback(); return res.status(409).json({ error: `Stock insuficiente de ${product.nombre}. Disponible: ${product.stock}.` }); }
    }
    const lines = products.map(p => ({ productId: p.id_producto, name: p.nombre, quantity: quantities.get(p.id_producto), unitPrice: Number(p.precio_venta), subtotal: Number((Number(p.precio_venta) * quantities.get(p.id_producto)).toFixed(2)) }));
    const total = Number(lines.reduce((sum, line) => sum + line.subtotal, 0).toFixed(2));
    const now = new Date();
    const code = `NS-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${String(now.getTime()).slice(-6)}`;
    const [saleResult] = await conn.execute(`INSERT INTO ventas
      (codigo, id_usuario, metodo_pago, subtotal, descuento, total, observacion)
      VALUES (?, 1, ?, ?, 0, ?, 'Venta registrada desde punto de venta')`, [code, paymentMethod, total, total]);
    for (const line of lines) {
      await conn.execute(`INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`, [saleResult.insertId, line.productId, line.quantity, line.unitPrice, line.subtotal]);
      await conn.execute('UPDATE productos SET stock = stock - ? WHERE id_producto = ?', [line.quantity, line.productId]);
      const [updated] = await conn.execute('SELECT stock FROM productos WHERE id_producto = ?', [line.productId]);
      await conn.execute(`INSERT INTO movimientos_stock (id_producto, id_usuario, id_venta, tipo, cantidad, stock_resultante, motivo) VALUES (?, 1, ?, 'VENTA', ?, ?, ?)`, [line.productId, saleResult.insertId, line.quantity, updated[0].stock, `Venta ${code}`]);
    }
    await conn.commit();
    res.status(201).json({ id: saleResult.insertId, code, customer: 'Cliente de mostrador', items: lines, total, date: now.toISOString() });
  } catch (error) {
    if (conn) await conn.rollback();
    next(error);
  } finally { if (conn) conn.release(); }
});

app.get('/api/sales', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await db.query(`SELECT v.id_venta AS id, v.codigo AS code,
      v.fecha_venta AS date, v.total, v.estado AS status, COALESCE(CONCAT(c.nombres, ' ', c.apellidos), 'Cliente de mostrador') AS customer,
      dv.id_producto AS productId, p.nombre AS productName, dv.cantidad AS quantity,
      dv.precio_unitario AS unitPrice, dv.subtotal AS lineSubtotal
      FROM ventas v LEFT JOIN clientes c ON c.id_cliente = v.id_cliente
      JOIN detalle_venta dv ON dv.id_venta = v.id_venta
      JOIN productos p ON p.id_producto = dv.id_producto
      ORDER BY v.fecha_venta DESC, dv.id_detalle`);
    const sales = new Map();
    for (const row of rows) {
      if (!sales.has(row.id)) sales.set(row.id, { id: row.id, code: row.code, customer: row.customer, total: Number(row.total), date: new Date(row.date).toISOString(), status: row.status, items: [] });
      sales.get(row.id).items.push({ productId: row.productId, name: row.productName, quantity: row.quantity, unitPrice: Number(row.unitPrice), subtotal: Number(row.lineSubtotal) });
    }
    res.json([...sales.values()]);
  } catch (error) { next(error); }
});

app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (_req, res) => {
  const index = path.join(__dirname, '../dist/index.html');
  if (require('fs').existsSync(index)) res.sendFile(index); else res.status(404).send('Compila el frontend con npm run build.');
});
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error interno. Revisa la conexión a la base de datos.' });
});

app.listen(PORT, () => console.log(`Nova Salud API lista en http://localhost:${PORT}`));
