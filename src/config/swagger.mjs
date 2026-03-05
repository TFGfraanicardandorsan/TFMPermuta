import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Permutas ETSII',
      version: '1.0.0',
      description: 'Documentación de la API de Permutas ETSII',
    },
    servers: [
      {
        url: 'https://localhost:3013/api/v1',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      schemas: {
        Incidencia: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            fecha_creacion: { type: 'string', format: 'date-time', example: '2026-03-05T10:00:00Z' },
            descripcion: { type: 'string', example: 'No funciona el aula 1.1' },
            tipo_incidencia: { type: 'string', example: 'infraestructura' },
            estado_incidencia: { type: 'string', enum: ['abierta', 'asignada', 'solucionada'], example: 'abierta' },
            archivo: { type: 'string', nullable: true, example: 'archivo123.pdf' },
          },
        },
        Usuario: {
          type: 'object',
          properties: {
            uvus: { type: 'string', example: 'juapergar' },
            nombre_completo: { type: 'string', example: 'Juan Pérez García' },
            correo: { type: 'string', example: 'juapergar@alum.us.es' },
            rol: { type: 'string', enum: ['estudiante', 'administrador'], example: 'estudiante' },
          },
        },
        SolicitudPermuta: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            asignatura: { type: 'string', example: 'Matemáticas I' },
            grupos_deseados: { type: 'array', items: { type: 'integer' }, example: [1, 2, 3] },
            estado: { type: 'string', enum: ['pendiente', 'aceptada', 'cancelada'], example: 'pendiente' },
          },
        },
        Notificacion: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            contenido: { type: 'string', example: 'Notificación de prueba' },
            receptor: { type: 'string', enum: ['estudiante', 'administrador', 'all'], example: 'estudiante' },
          },
        },
        Permuta: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            estado: { type: 'string', example: 'borrador' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            err: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Error description' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            err: { type: 'boolean', example: false },
            result: { type: 'object' },
          },
        },
      },
    },
  },
  apis: ['./src/docs/*.mjs'],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };