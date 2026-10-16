# MUSE · HERO

Entorno independiente de MUSE que muestra únicamente el dashboard HERO. Los correos y el dominio indicados en `.env.example` entran directamente al escribir su dirección; cualquier otro correo autorizado usa el código de MUSE. El HTML del dashboard se entrega desde `/api/hero` solo con una sesión válida.

## Configuración de Vercel

1. Importar este repositorio en el equipo de Flowslabs con el nombre de proyecto **MUSE-2026**.
2. Configurar `MUSE_SESSION_SECRET` con un valor aleatorio de al menos 32 caracteres en Production y Preview.
3. Configurar `HERO_ALLOWED_EMAILS` para acceso por código y `HERO_DIRECT_DOMAINS` / `HERO_DIRECT_EMAILS` para los accesos directos solicitados. Los valores iniciales están en `.env.example`. El acceso directo identifica al usuario por el correo escrito, sin comprobar que controle esa cuenta; debe usarse solo si ese nivel de protección es aceptable para este portal.
4. Desplegar. `vercel.json` publica `public/` y empaqueta `private/hero-motos.html` únicamente en la función protegida.

La fuente visual de HERO procede del dashboard MUSE existente. Los vínculos de regreso dentro del dashboard apuntan a esta aplicación.

## Analítica y registro interno de HERO

Web Analytics cuenta el portal y `/api/hero` por separado. El script elimina parámetros y fragmentos de URL; los correos no se envían a Vercel Analytics.

Cada respuesta autorizada del dashboard genera un registro `HERO_DASHBOARD_OPEN`. El correo de la sesión, fecha UTC, dominio, referencia de sesión y tipo de acceso se cifran con AES-256-GCM antes de guardarse en `user_activities`. No hay un endpoint público para descifrarlos. Las sesiones anteriores se identifican como `legacy`; las nuevas distinguen `direct` (correo declarado) y `otp` (código verificado). Una respuesta del servidor no demuestra cuánto tiempo leyó el usuario el dashboard.

Variables de servidor, solo en Production: `HERO_AUDIT_SUPABASE_URL`, `HERO_AUDIT_SERVICE_KEY`, `HERO_AUDIT_ENCRYPTION_KEY` (32 bytes en base64). Conservar la clave de cifrado: cambiarla sin conservar la anterior impide leer los registros previos. Los fallos de persistencia se registran sin datos personales y no bloquean la apertura del dashboard.

El administrador puede exportar el registro desde una terminal privada con esas variables: `node scripts/export-hero-access.mjs RUTA_PRIVADA.csv`. No guardar credenciales ni exportaciones dentro de `public/`. La exportación separa aperturas de sesiones mediante `sessionRef`; no interpreta accesos directos como identidad verificada. El registro comienza al activar esta versión y no reconstruye visitas anteriores.
