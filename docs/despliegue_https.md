# Publicar Nova Salud con HTTPS

La aplicación está preparada para alojar el frontend compilado y la API desde el mismo servicio Node.js. En un alojamiento con proxy HTTPS, Express confía en un proxy cuando `NODE_ENV=production`, y la cookie de sesión se marca como `Secure`.

## Requisitos para publicarla

1. Subir el proyecto a un repositorio GitHub. No incluyas `.env`, contraseñas, hashes ni credenciales de MySQL.
2. Crear una base MySQL accesible desde el servicio web. La instancia de MySQL/phpMyAdmin que corre en tu PC no es accesible desde internet.
3. Exportar desde phpMyAdmin las bases de esquema y datos (`nova_salud` y las credenciales existentes) e importarlas en el MySQL alojado. También se puede ejecutar `database/nova_salud.sql` y luego `database/auth_migration.sql`, pero esto crea los usuarios ficticios desde cero.
4. Crear un servicio Node conectado al repositorio. Usar `npm run build` como comando de compilación y `npm start` como comando de inicio.
5. Configurar variables de entorno en el panel del proveedor:

   ```text
   NODE_ENV=production
   DB_HOST=<host MySQL en la nube>
   DB_PORT=<puerto MySQL>
   DB_USER=<usuario MySQL>
   DB_PASSWORD=<contraseña MySQL>
   DB_NAME=nova_salud
   SESSION_SECRET=<secreto aleatorio largo>
   ```

   El proveedor asigna `PORT`; no fijes `PORT=4000` en producción. Si el proveedor de MySQL exige TLS, activa y configura SSL según sus instrucciones.
6. Crear el dominio público del servicio. Un proveedor que termine TLS puede emitir el certificado HTTPS y redirigir HTTP a HTTPS automáticamente.
7. Abrir la URL HTTPS, iniciar sesión y comprobar una venta y una reposición contra la base alojada.

## Ejemplo con Railway

Railway puede desplegar el servicio Node desde un repositorio y asignarle un dominio público `*.up.railway.app`. Railway gestiona certificados TLS para sus dominios y redirige HTTP a HTTPS. Configura los comandos `npm run build` y `npm start` en el servicio.

La base MySQL debe estar alojada también en la nube y aceptar conexiones del servicio. No publiques el puerto MySQL; usa una red privada si el proveedor lo permite. Revisa el costo vigente antes de crear recursos: el alojamiento puede generar cargos.

## Referencias oficiales

- [Railway: publicación y dominios con HTTPS](https://docs.railway.com/networking/domains/working-with-domains)
- [Railway: dominios públicos y SSL automático](https://docs.railway.com/networking/public-networking)
- [Railway: ejecutar una aplicación Node](https://docs.railway.com/builds/build-and-start-commands)
- [Railway: precios vigentes](https://railway.com/pricing)
