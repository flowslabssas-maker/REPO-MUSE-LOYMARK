# MUSE · HERO

Entorno independiente de MUSE que muestra únicamente el dashboard HERO. La pantalla de acceso usa los códigos de correo de MUSE; el HTML del dashboard se entrega desde `/api/hero` solo con una sesión válida.

## Configuración de Vercel

1. Importar este repositorio en el equipo de Flowslabs con el nombre de proyecto **muse**.
2. Configurar `MUSE_SESSION_SECRET` con un valor aleatorio de al menos 32 caracteres en Production y Preview.
3. Configurar `HERO_ALLOWED_EMAILS` con los correos autorizados, separados por comas. El valor inicial está en `.env.example`.
4. Desplegar. `vercel.json` publica `public/` y empaqueta `private/hero-motos.html` únicamente en la función protegida.

La fuente visual de HERO procede del dashboard MUSE existente. Los vínculos de regreso dentro del dashboard apuntan a esta aplicación.
