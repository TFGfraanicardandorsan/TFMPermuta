# Prompt para implementar las permutas por curso en el frontend

Implementa en el frontend la nueva opción de solicitudes de permuta por curso. El backend ya está implementado. Reutiliza los componentes, cliente HTTP, autenticación y estilos existentes, y entrega el cambio funcionando con sus pruebas.

## Comportamiento

- Agrupa las asignaturas matriculadas por curso y muestra en cada curso un interruptor independiente, desactivado inicialmente: **«Solo quiero permutar con una persona en este curso»**.
- Texto de ayuda: «Se permutarán juntas todas tus asignaturas matriculadas de este curso con la misma persona. Si no hay una coincidencia completa, el bloque quedará pendiente».
- Activado: incluye todas las asignaturas matriculadas del curso, sin permitir desmarcar ninguna. Solicita al menos un grupo deseado válido por asignatura. No presupongas que todas tienen el mismo grupo de origen o los mismos destinos.
- Desactivado: permite seleccionar una o varias asignaturas. Sus permutas podrán resolverse de forma independiente con personas distintas.
- Si está matriculado en varios cursos, cada curso tiene su propio formulario, estado y envío. Puede activar el bloque en uno, en varios o en ninguno. Dos bloques de cursos diferentes pueden emparejarse con personas diferentes.
- «Todas» se refiere a la matrícula del usuario al crear la solicitud, no a todas las asignaturas del plan de estudios.

## Contrato real de la API

Todas las rutas siguientes tienen prefijo `/api/v1/solicitudPermuta`. Usa la sesión existente y `X-CSRF-Token` en las mutaciones. La API obtiene la identidad desde la sesión; no envíes UVUS ni IDs de usuario.

### Cursos disponibles

`GET /cursos`

```json
{
  "err": false,
  "result": [
    {
      "curso": "PRIMERO",
      "asignaturas": [
        { "codigo_asignatura": 2050001, "nombre_asignatura": "Asignatura A" },
        { "codigo_asignatura": 2050002, "nombre_asignatura": "Asignatura B" }
      ]
    }
  ]
}
```

Los cursos válidos son `PRIMERO`, `SEGUNDO`, `TERCERO`, `CUARTO`. Usa el valor devuelto por la API. Los números del ejemplo son ilustrativos. Este endpoint devuelve matrícula, incluso asignaturas sin grupo: completa grupos actuales y destinos mediante los servicios de grupos existentes. Si falta un grupo actual o destinos válidos, explica qué debe corregirse y deshabilita el envío del bloque. No excluyas silenciosamente esa asignatura.

### Crear solicitudes de un curso

`POST /solicitarPermutaCurso`

```json
{
  "curso": "PRIMERO",
  "en_bloque": true,
  "solicitudes": [
    { "asignatura": 2050001, "grupos_deseados": [2, 3] },
    { "asignatura": 2050002, "grupos_deseados": [2] }
  ]
}
```

- `asignatura` es el **código** numérico de la asignatura, no su ID interno.
- `grupos_deseados` contiene los **números/nombres numéricos** de los grupos, no sus IDs internos. Conserva la convención del endpoint antiguo de creación.
- `en_bloque` es booleano obligatorio. Con `false`, el mismo endpoint crea solicitudes individuales y admite un subconjunto de asignaturas del curso.
- No mezcles cursos en una petición. Cada envío es atómico: o se crean todas las solicitudes enviadas o ninguna.
- Respuesta HTTP 201:

```json
{
  "err": false,
  "result": {
    "curso": "PRIMERO",
    "en_bloque": true,
    "bloque_id": "UUID",
    "solicitudes_ids": [101, 102]
  }
}
```

Con `en_bloque: false`, `bloque_id` es `null`.

### Listados y edición

- `POST /getMisSolicitudesPermuta` y `POST /getTodasSolicitudesPermuta` añaden `curso`, `en_bloque` y `bloque_id` a cada solicitud. Conservan sus campos anteriores. El segundo endpoint es administrativo.
- Agrupa visualmente las solicitudes con el mismo `bloque_id` y muestra una etiqueta «Curso en bloque · misma persona». Un UUID de solicitud identifica ese bloque; no lo deduzcas solo del curso.
- La edición de destinos sigue siendo `PATCH /:solicitudId/grupos-deseados`, con `{ "grupos_deseados_ids": [20, 30] }`. Aquí sí son **IDs internos de grupo**, como antes. Respeta `editable`. Editar destinos no rompe el bloque ni cambia sus miembros.
- Cancelación: `POST /cancelarSolicitudPermuta` con `{ "solicitud": 101 }`. Si pertenece a un bloque, el backend cancela **todo el bloque**. Muestra una acción «Cancelar bloque» con confirmación que enumere sus asignaturas. La cancelación devuelve el mensaje existente y exige recargar el listado.
- No existe un PATCH para cambiar el modo individual/bloque. Para cambiarlo, el usuario debe cancelar las solicitudes correspondientes y volver a crearlas. Si ya hay solicitudes individuales activas del curso, explica el conflicto antes de intentar crear un bloque; no las canceles automáticamente.
- Los bloques con permutas activas no se pueden cancelar ni editar.

### Propuestas y aceptación

- Los bloques se emparejan mediante las propuestas del sistema. Ambos alumnos deben tener solicitudes con destinos recíprocos para todas las asignaturas exigidas por cualquiera de sus bloques. El otro alumno puede tener solicitudes individuales.
- `POST /getPermutasPropuestasSistema` añade `curso`, `en_bloque`, `bloque_id` a cada permuta; mantiene `permuta_id`, asignatura, grupos, `aceptada_por_mi`, `aceptada_por_otro` y `estado`.
- Agrupa por `bloque_id` y muestra una sola acción para aceptar/rechazar todo el bloque, con todas sus asignaturas visibles. Los UUID de las propuestas son diferentes de los UUID de las solicitudes: no los cruces por igualdad.
- Aceptar: `POST /permuta/:id/aceptar`. Rechazar: `POST /permuta/:id/rechazar`. Envía una sola petición con el `permuta_id` de cualquier miembro. El backend aplica la respuesta a todo el bloque en una transacción. No envíes una petición por asignatura.
- El bloque pasa a `VALIDADA` al aceptar ambos alumnos. Recarga las propuestas y permutas después de responder.
- `POST /getSolicitudesPermutaInteresantes` añade `curso`, `en_bloque`, `bloque_id` y `aceptable_individual`. Si `aceptable_individual` es false, no muestres la aceptación individual: explica que se gestiona desde propuestas del sistema. El endpoint manual `/aceptarSolicitudPermuta` devuelve 409 si cualquiera de los dos alumnos tiene una solicitud en bloque para esa asignatura.
- El endpoint antiguo `/solicitarPermuta` sigue creando solicitudes individuales. Para un bloque usa exclusivamente `/solicitarPermutaCurso`.
- Los listados de permutas del servicio `/api/v1/permutas` también incluyen estos metadatos. Al generar documentos con `IdsPermuta`, incluye todos los miembros de cada bloque seleccionado. El backend rechaza documentos parciales.

### Errores y pruebas

- Formato de errores en solicitudes: `{ "err": true, "message": "...", "detalles": {} }`; `detalles` es opcional.
- HTTP 400: formato inválido, curso incorrecto, asignaturas ajenas/no matriculadas, bloque incompleto o grupos inválidos. Para un bloque incompleto, puede recibirse `detalles.asignaturas_requeridas` con códigos. Recarga la matrícula y conserva los destinos que sigan siendo válidos.
- HTTP 401/403: aplica el tratamiento de sesión/permisos existente.
- HTTP 409: solicitud/permuta activa, bloque no disponible o intento de operación individual sobre un bloque. Muestra `message` y recarga el estado; no reintentes ni canceles solicitudes automáticamente.
- Deshabilita el envío mientras esté en curso. Si el resultado de red es incierto, consulta las solicitudes antes de repetirlo.
- Prueba: un curso completo en bloque; dos cursos con ajustes distintos; dos bloques independientes; modo individual; asignatura sin grupo; bloque incompleto; conflicto con solicitudes existentes; aceptación/rechazo/cancelación únicos por bloque; distinción entre números e IDs de grupos; recarga después de cambios; compatibilidad de las solicitudes antiguas con `bloque_id: null`.

Antes de probar contra el backend, debe haberse aplicado `sql/permuta_bloques_curso.sql`.
