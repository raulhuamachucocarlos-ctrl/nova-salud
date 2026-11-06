require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

function readSecret(label) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error('Ejecuta este comando en una terminal interactiva.'));
    process.stdout.write(label);
    const stdin = process.stdin;
    const originalRawMode = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    let value = '';
    const finish = (error, result) => {
      stdin.off('data', onData);
      stdin.setRawMode(Boolean(originalRawMode));
      stdin.pause();
      process.stdout.write('\n');
      error ? reject(error) : resolve(result);
    };
    const onData = chunk => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') return finish(new Error('Cancelado.'));
        if (char === '\r' || char === '\n') return finish(null, value);
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  const [email] = process.argv.slice(2);
  if (!email) {
    console.error('Uso: npm run auth:create -- correo');
    console.error('La contraseña debe tener al menos 10 caracteres.');
    process.exitCode = 1;
    return;
  }
  const password = await readSecret('Nueva contraseña (no se mostrará): ');
  const confirmation = await readSecret('Repite la contraseña: ');
  if (password.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres.');
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden. No se realizaron cambios.');
  const [users] = await db.execute('SELECT id_usuario FROM usuarios WHERE correo = ? AND activo = TRUE', [email.trim().toLowerCase()]);
  if (!users.length) throw new Error('No existe un usuario activo con ese correo. Revisa la tabla usuarios.');
  const hash = await bcrypt.hash(password, 12);
  await db.execute(`INSERT INTO auth_credentials (id_usuario, password_hash) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`, [users[0].id_usuario, hash]);
  console.log(`Contraseña configurada para ${email}. Ya puedes iniciar sesión.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.end());
