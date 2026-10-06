# MUSE · HERO

Entorno independiente de MUSE que muestra únicamente el dashboard HERO. Los correos y el dominio indicados en `.env.example` entran directamente al escribir su dirección; cualquier otro correo autorizado usa el código de MUSE. El HTML del dashboard se entrega desde `/api/hero` solo con una sesión válida.

## Configuración de Vercel

1. Importar este repositorio en el equipo de Flowslabs con el nombre de proyecto **MUSE-2026**.
2. Configurar `MUSE_SESSION_SECRET` con un valor aleatorio de al menos 32 caracteres en Production y Preview.
3. Configurar `HERO_ALLOWED_EMAILS` para acceso por código y `HERO_DIRECT_DOMAINS` / `HERO_DIRECT_EMAILS` para los accesos directos solicitados. Los valores iniciales están en `.env.example`. El acceso directo identifica al usuario por el correo escrito, sin comprobar que controle esa cuenta; debe usarse solo si ese nivel de protección es aceptable para este portal.
4. Desplegar. `vercel.json` publica `public/` y empaqueta `private/hero-motos.html` únicamente en la función protegida.

La fuente visual de HERO procede del dashboard MUSE existente. Los vínculos de regreso dentro del dashboard apuntan a esta aplicación.
