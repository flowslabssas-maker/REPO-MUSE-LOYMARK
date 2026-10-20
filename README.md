# MUSE · HERO

Entorno independiente de MUSE que muestra únicamente el dashboard HERO. Los correos y el dominio indicados en `.env.example` entran directamente al escribir su dirección; cualquier otro correo autorizado usa el código de MUSE. El HTML del dashboard se entrega desde `/api/hero` solo con una sesión válida.

## Configuración de Vercel

1. Importar este repositorio en el equipo de Flowslabs con el nombre de proyecto **MUSE-2026**.
2. Configurar `MUSE_SESSION_SECRET` con un valor aleatorio de al menos 32 caracteres en Production y Preview.
3. Configurar `HERO_ALLOWED_EMAILS` para acceso por código y `HERO_DIRECT_DOMAINS` / `HERO_DIRECT_EMAILS` para los accesos directos solicitados. Los valores iniciales están en `.env.example`. El acceso directo identifica al usuario por el correo escrito, sin comprobar que controle esa cuenta; debe usarse solo si ese nivel de protección es aceptable para este portal.
4. Desplegar. `vercel.json` publica `public/` y empaqueta `private/hero-motos.html` únicamente en la función protegida.

La fuente visual de HERO procede del dashboard MUSE existente. Los vínculos de regreso dentro del dashboard apuntan a esta aplicación.

## Analítica y registro interno de HERO

Web Analytics cuenta el portal y `/api/hero` por separado. El botón inicial se etiqueta como `hero_enter_click`; los intentos y el éxito confirmado por el servidor se identifican con eventos anónimos separados. Los eventos personalizados de Vercel requieren Pro o Enterprise; en Hobby, estos hooks no ofrecen un reporte de clics. El registro privado funciona independientemente del plan. Estos eventos no prueban la identidad del usuario; el registro privado por correo es la fuente para identificar ingresos. El script elimina parámetros y fragmentos de URL; los correos no se envían a Vercel Analytics.

Cada autenticación exitosa genera `HERO_LOGIN_SUCCESS`, después de validar el acceso directo permitido o el código OTP. Solicitar un código, pulsar INGRESAR o introducir un código incorrecto no cuenta como ingreso. Cada respuesta autorizada del dashboard genera un registro independiente `HERO_DASHBOARD_OPEN`. Ambas escrituras se esperan antes de responder, con hasta tres intentos y el mismo ID para evitar duplicados. El correo de la sesión, fecha UTC, dominio, referencia de sesión y tipo de acceso se cifran con AES-256-GCM antes de guardarse en `user_activities`. No hay un endpoint público para descifrarlos. Las sesiones anteriores se identifican como `legacy`; las nuevas distinguen `direct` (correo declarado) y `otp` (código verificado). Una respuesta del servidor no demuestra cuánto tiempo leyó el usuario el dashboard.

Variables de servidor, solo en Production: `HERO_AUDIT_SUPABASE_URL`, `HERO_AUDIT_SERVICE_KEY`, `HERO_AUDIT_ENCRYPTION_KEY` (32 bytes en base64). Conservar la clave de cifrado: cambiarla sin conservar la anterior impide leer los registros previos. Los fallos de persistencia se registran sin datos personales y no bloquean la apertura del dashboard.

El administrador puede exportar el registro desde una terminal privada con esas variables: `node scripts/export-hero-access.mjs RUTA_PRIVADA.csv`. No guardar credenciales ni exportaciones dentro de `public/`. La exportación separa aperturas de sesiones mediante `sessionRef`; no interpreta accesos directos como identidad verificada. El registro comienza al activar esta versión y no reconstruye visitas anteriores.

La exportación CSV distingue ingreso exitoso de apertura y conserva lectura de registros anteriores. No suma ambos como visitantes únicos. La cabecera de servidor `X-Hero-Audit-Status` indica `recorded` o `unavailable`; los fallos registran el código HTTP sin correo, clave ni cuerpo de respuesta. Si el almacenamiento no responde, el acceso existente sigue disponible y se registra el fallo: no se promete un histórico completo durante una caída.

Pruebas locales aisladas, sin usuarios ni métricas de producción: `node --test tests/hero-audit.test.mjs`.
