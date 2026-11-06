# Caso práctico: Sistema de gestión para la botica Nova Salud

**Curso:** ______________________________  
**Estudiante:** __________________________  
**Docente:** _____________________________  
**Fecha:** ______________________________

## 1. Descripción del problema

La botica Nova Salud ha incrementado la cantidad de clientes, pero sus procesos manuales de inventario y atención generan errores, desabastecimientos y demoras. Se propone centralizar el control de productos y ventas en una aplicación web.

## 2. Objetivo

Desarrollar un sistema web que permita administrar el inventario, advertir sobre productos con bajo stock y registrar ventas de manera sencilla, manteniendo actualizada la existencia de cada producto.

## 3. Propuesta de solución

Nova Salud es una aplicación web desarrollada con React para la interfaz y Node.js con Express para la API. MySQL almacena los datos de productos, usuarios, clientes, ventas, detalles de venta y movimientos de inventario. La interfaz se adapta a distintos tamaños de pantalla y se accede desde un navegador.

### Funciones principales

- **Panel general:** resume las ventas del día y muestra alertas de productos por reponer.
- **Inventario:** permite consultar y buscar productos, ver su stock y precio, y registrar nuevos productos.
- **Alertas:** identifica productos cuyo stock está en el nivel mínimo o por debajo de este.
- **Reposición:** permite al administrador registrar un ingreso, aumentar el stock y guardar el movimiento con su motivo.
- **Punto de venta:** permite buscar productos, preparar un carrito y registrar una venta.
- **Actualización del stock:** al confirmar una venta se descuenta la cantidad vendida; los cambios de venta se guardan dentro de una transacción.
- **Historial:** muestra las ventas registradas, sus productos, fecha y monto.
- **Acceso por roles:** el administrador puede agregar productos y registrar reposiciones; el cajero puede consultar el inventario y realizar ventas.

## 4. Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Interfaz web | React, Vite, HTML y CSS |
| API y lógica de negocio | Node.js y Express |
| Base de datos | MySQL |
| Herramienta de administración | phpMyAdmin o MySQL Workbench |
| Conexión a MySQL | mysql2 |

## 5. Diseño de la base de datos

La base de datos relacional se llama `nova_salud`. Sus tablas principales son:

- `categorias`: clasifica los productos.
- `productos`: almacena SKU, nombre, precio, stock, stock mínimo y categoría.
- `usuarios`: registra a los trabajadores y su rol.
- `auth_credentials`: almacena hashes de contraseñas asociados a usuarios.
- `clientes`: guarda datos opcionales de los clientes.
- `ventas`: registra cada operación, fecha, usuario, forma de pago y total.
- `detalle_venta`: relaciona cada venta con los productos, cantidades y precios vendidos.
- `movimientos_stock`: conserva el historial de ingresos y salidas de inventario.

Una venta puede incluir varios productos; el detalle de venta guarda la cantidad y el precio aplicado en el momento de la operación. Los movimientos permiten consultar por qué cambió el stock.

## 6. Seguridad y acceso

El sistema almacena contraseñas como hashes bcrypt, usa sesiones de servidor y restringe acciones según el rol del usuario. La ruta de inicio de sesión limita los intentos y Express Helmet establece cabeceras de seguridad. Las credenciales de conexión a MySQL se configuran en `.env`, que no debe compartirse.

Estas medidas corresponden al alcance del prototipo académico. La puesta en producción requeriría una configuración de alojamiento y HTTPS.

## 7. Instalación y ejecución

1. Importar `database/nova_salud.sql` en phpMyAdmin o MySQL Workbench.
2. Importar una vez `database/auth_migration.sql` para crear la tabla de credenciales.
3. Crear `.env` a partir de `.env.example` y completar la conexión local a MySQL.
4. Instalar dependencias e iniciar el sistema desde la carpeta del proyecto:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

5. Abrir en el navegador la dirección local que informe Vite, normalmente `http://localhost:5173`.

Se asigna una contraseña a un usuario de demostración con:

```powershell
npm.cmd run auth:create -- maria.rodriguez@example.test
```

El comando solicita la contraseña dos veces y no la muestra mientras se escribe.

## 8. Comprobación funcional

Durante la comprobación manual se verificó que la aplicación abre, permite iniciar sesión, registrar una venta y reflejar la disminución del stock. También se comprobó el registro de una reposición desde el inventario.

| Escenario | Resultado esperado |
|---|---|
| Iniciar sesión con una cuenta configurada | Se accede al sistema según el rol asignado. |
| Registrar una venta | La venta queda en el historial y se descuenta el stock. |
| Vender más unidades que las disponibles | El sistema rechaza la operación y conserva el stock. |
| Reponer un producto como administrador | Aumenta el stock y se registra el movimiento. |
| Revisar un producto bajo el mínimo | El sistema lo muestra como alerta de reposición. |

## 9. Conclusión

La aplicación centraliza las tareas principales de Nova Salud y reemplaza el registro manual de inventario y ventas por una interfaz web conectada a MySQL. Las validaciones, transacciones, alertas y movimientos de stock ayudan a reducir errores y facilitan la atención en mostrador.

## 10. Evidencias para anexar

Agregar capturas propias de estas pantallas:

1. Panel general con ventas y alertas de stock.
2. Inventario con un producto marcado como stock bajo.
3. Punto de venta con una venta registrada.
4. Historial de ventas.
5. Reposición con el stock actualizado.
6. Tablas de ventas y movimientos de stock en phpMyAdmin.
