# DSH Sidebar History para DeepSeek Harness

[English](../../README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [Español](README.es.md)

**DSH Sidebar History** es un plugin de barra lateral para DeepSeek Harness. Muestra el progreso de las tareas TODO y la última respuesta guardada del asistente en el historial de chat. Encuentra el trabajo pendiente y vuelve a la sesión correcta sin abrir cada conversación.

Es un plugin independiente con licencia MIT. Usa las API oficiales de proyección y de slots de la barra lateral de DSH. No modifica el código de DSH.

## Vídeo de la función

[![Las tarjetas de DSH muestran el progreso real de TODO y la última respuesta del asistente](../media/live/feature-8s.gif)](../media/live/demo.mp4)

[Ver el vídeo con la API real, 9.3 segundos](../media/live/demo.mp4) · [Captura real del navegador](../media/live/snapshot.png) · [Registros de la API](../media/live/evidence/result.json)

La grabación usa una sesión nueva de DSH y la API oficial de DeepSeek. El modelo lee datos de pedidos de demostración, llama a la herramienta TODO nativa y guarda su propia respuesta. La barra lateral muestra 2 de 3 tareas completadas y esa respuesta guardada. El vídeo conserva los bytes de la grabación original y el tiempo real transcurrido. No usa un endpoint mock, respuestas programadas ni mensajes del asistente o eventos TODO insertados de antemano. También se comprobaron una segunda sesión con la API real y la recuperación tras recargar. Consulta la [procedencia y los hashes](../media/live/provenance.json) y la [verificación del material](../media/live/qa.json).

## Encuentra y retoma el trabajo

- Cada tarjeta muestra el título de la sesión, la fecha de actualización, el número de tareas completadas, hasta tres tareas y dos líneas de la última respuesta.
- Las tareas en curso y pendientes aparecen antes que las completadas.
- Busca títulos y respuestas en caché. La búsqueda oficial de contenido de DSH también encuentra historial que aún no se ha cargado.
- Usa las flechas arriba y abajo, Home, End y Enter. La lista solo dibuja las tarjetas visibles y un pequeño margen adicional.
- Conserva la barra lateral plegable y el panel móvil nativos. **Native navigation** abre las acciones originales de espacios de trabajo, archivo y sesiones. **History cards** vuelve a las tarjetas.

El estado TODO procede solo de eventos `todo/write`. Cada nuevo `turn/start` borra las tareas del turno anterior. La vista previa usa únicamente texto confirmado de `assistant/message`. Durante la generación, la tarjeta conserva la última respuesta confirmada y muestra **Generating**. El texto interrumpido, el razonamiento y los bloques de herramientas no se convierten en vistas previas. Se distinguen los estados sin respuesta, de mensaje no textual, de carga y de error. Las sesiones archivadas permanecen ocultas.

La interfaz del plugin sigue el idioma de DSH y está disponible en inglés y chino simplificado. El README está disponible en los cinco idiomas enlazados arriba.

## Instala el plugin de barra lateral

Necesitas Node.js `>=24.9.0` y una instalación de DSH Web. La versión verificada es DSH `0.2.2-rc.1`, commit de origen `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159`. El rango declarado es `>=0.2.2-rc.1 <0.3.0`. No se han verificado por separado otras versiones dentro de ese rango.

Crea un tarball local e instálalo en el profile `web`:

```bash
git clone https://github.com/liush2yuxjtu/dsh-sidebar-history.git
cd dsh-sidebar-history
npm pack
dsh plugin --profile web add "$PWD/dsh-sidebar-history-0.1.0.tgz"
```

Abre DSH Web. La barra lateral muestra tarjetas para las sesiones sin archivar. Sustituye `web` si usas otro profile Web. La opción `--profile` debe ir antes de `add`. También puedes instalar el tarball local con el gestor de plugins de DSH. Consulta la [guía de instalación de DSH](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/docs/user/develop/basic/publish.md).

El paquete incluye las entradas JavaScript y no necesita bundler. DSH resuelve las dependencias en tiempo de ejecución. No instales una segunda copia de React. Estas instrucciones instalan desde el repositorio y no presuponen una publicación en npm registry. Las API de DSH aún no son estables. Comprueba la compatibilidad antes de actualizar.

## Telemetría y privacidad

Los mantenedores pueden ejecutar `npm run telemetry:collect` con acceso autorizado a GitHub. El script obtiene visitas al repositorio, clones, sitios de referencia, estrellas y descargas de archivos de Release. Genera informes locales en JSON y Markdown. Las API de tráfico no disponibles se marcan como **BLOCKED**, no como cero.

El plugin no instala un SDK de seguimiento. El script no contacta con los usuarios del plugin ni recopila el contenido del chat. Los clics en funciones y la retención de usuarios aún no se miden. La [guía de telemetría](../telemetry.md) describe las métricas disponibles y un diseño propuesto de eventos con consentimiento.

## Verifica un cambio

Lee [AGENTS.md](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/AGENTS.md) y la [lista de verificaciones](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/.agents/skills/verify/references/surfaces.md). Necesitas un checkout de DSH compilado con sus dependencias fijadas, Node.js `>=24.9.0` y Chromium.

```bash
npm run setup:hooks
npm run verify
DSH_SOURCE_ROOT=/absolute/path/to/built/deepseek-harness npm run verify:browser
npm run verify:live
npm run verify:media
npm run verify:commit
```

Configura `DSH_SOURCE_ROOT`, o el ajuste local de Git `dsh.sourceRoot`, para los comandos posteriores. Configura `DSH_CHROMIUM_PATH` si Chromium no está disponible mediante Playwright de DSH. Usa credenciales ya autorizadas mediante `DEEPSEEK_API_KEY` o un archivo privado `DSH_PROVIDER_ENV_FILE`. Mantén las credenciales fuera de Git.

`verify` comprueba las pruebas unitarias y la estructura del paquete. `verify:browser` usa un adapter controlado y explícito para las pruebas de regresión. Estas comprobaciones no demuestran la aceptación con un modelo real. `verify:live` llama a la API real mediante DSH. El hook de Git y `verify:commit` exportan los archivos preparados y exigen nuevas comprobaciones unitarias, de navegador, de material y de API real. Si falta acceso o falla una aserción, rechazan el commit. Las pruebas de ejecución se guardan en `.runtime/`, que Git ignora.

## Enlaces del proyecto

- [Arquitectura y decisiones](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/docs/decisions.md)
- [Informe de verificación](https://github.com/liush2yuxjtu/dsh-sidebar-history/blob/main/docs/verification.md)
- [Descubrimiento y metadatos del repositorio](../discovery.md)
- [Diseño y aceptación](https://chatgpt.com/space/page_7a28be26236481918ee65d88725c1d38)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [Licencia MIT](../../LICENSE)

Encuentra plugins relacionados en los temas [`dsh-plugin`](https://github.com/topics/dsh-plugin) y [`dsh-plugins`](https://github.com/topics/dsh-plugins) de GitHub. Este proyecto no es un producto oficial de DeepSeek.
