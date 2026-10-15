# Correos de pedidos y diagnóstico SMTP

Se envían **dos mensajes independientes** al aprobarse un pago verificado de Mercado Pago:
- Cliente: recibe código de rastreo, total y fecha de entrega.
- Administración: recibe el resumen del pedido en `ORDER_ADMIN_EMAIL` (por defecto `soluciones@listoenlinea.com`).

Cada notificación tiene un evento propio en `historial_pedido`:
`CONFIRMACION_EMAIL` y `AVISO_ADMIN_EMAIL`. Si una falla, no bloquea el pago ni la
otra notificación. Un webhook legítimo posterior reintenta las que falten.

## Hostinger
Configurar en variables de entorno de la aplicación Node:
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD`, `EMAIL_FROM`, `ORDER_ADMIN_EMAIL` y
`FRONTEND_PUBLIC_URL`. Para puerto 465 usar TLS implícito
(`SMTP_SECURE=true`); para 587 usar STARTTLS (`SMTP_SECURE=false`,
`SMTP_REQUIRE_TLS=true`). Usar la **contraseña actual del buzón** o la
contraseña de aplicación correspondiente; cambiarla en Hostinger después de
rotar la contraseña en el proveedor de correo. Nunca subir credenciales a Git.

Comprobar autenticación sin enviar correo:
`GET /api/floristeria-magno/uploads/smtp/health` usando Basic Auth de Admin.
Devuelve estado general sin exponer contraseñas, usuarios ni detalles del servidor.

Tras despliegue, realizar pedido de importe pequeño aprobado o prueba sandbox
según configuración de Mercado Pago y comprobar recepción real en ambos buzones
(incluyendo correo no deseado). El diagnóstico verifica autenticación; la entrega
real depende también de SPF/DKIM/DMARC y reputación del remitente.

Nota: para reintentos automáticos sin nuevos webhooks es necesaria una cola de trabajo
duradera (outbox); actualmente los reintentos son por webhook repetido.
