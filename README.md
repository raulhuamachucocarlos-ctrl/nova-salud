# Nova Salud

Aplicación web para gestionar inventario, alertas de reposición y ventas de una botica.

## Requisitos

- Node.js 18 o superior
- npm

## Inicio en desarrollo

Primero importa `database/nova_salud.sql` en MySQL Workbench o phpMyAdmin. Luego copia `.env.example` como `.env` y coloca las credenciales de MySQL que utiliza tu instalación. Cambia también `SESSION_SECRET` por una clave larga y aleatoria:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_clave
DB_NAME=nova_salud
SESSION_SECRET=una_clave_larga_aleatoria
```

Desde la carpeta del proyecto instala dependencias e inicia la aplicación:

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Vite sirve React y reenvía las llamadas `/api` al backend de Express en `http://localhost:4000`. Los productos y ventas se leen y guardan en MySQL.

## Configurar el inicio de sesión

1. Importa `database/auth_migration.sql` en phpMyAdmin para crear la tabla de credenciales.
2. En la terminal del proyecto, configura una contraseña para un usuario ficticio existente. Se pedirá dos veces y no se mostrará mientras la escribes:

   ```bash
   npm run auth:create -- maria.rodriguez@example.test
   ```

   Para crear contraseña al usuario cajero usa `luis.paredes@example.test`.
3. Inicia la aplicación con `npm run dev` e ingresa con ese correo y la contraseña que acabas de configurar.

La creación de contraseña requiere al menos 10 caracteres. Las contraseñas se guardan como hash bcrypt. Los administradores pueden agregar productos; los usuarios con rol cajero pueden consultar el inventario y registrar ventas.

Para compilar el frontend y servir la aplicación desde Express:

```bash
npm run build
npm start
```

La aplicación se servirá en `http://localhost:4000`. Puedes cambiar el puerto con la variable `PORT`.

## Funciones

- Panel con ventas e ingresos del día, unidades disponibles y alertas.
- Búsqueda y filtro de productos por categoría.
- Alta de productos con SKU único, precio, stock y umbral de reposición.
- Registro de reposiciones con motivo y movimiento de inventario auditable.
- Punto de venta con carrito, validación de existencias y actualización del stock.
- Historial de ventas con fecha, artículos y total.
- Diseño adaptable a escritorio, tablet y móvil.

El backend aplica cabeceras de seguridad con Helmet, limita intentos de inicio de sesión, guarda sesiones en MySQL, valida los datos y registra cada venta y descuento de stock dentro de una transacción. Para producción, configura HTTPS y copias de seguridad.
