import test from "node:test";
import assert from "node:assert/strict";

import database from "../src/config/database.mjs";
import feedbackController from "../src/controllers/feedbackController.mjs";
import feedbackRouter from "../src/routes/feedbackRoutes.mjs";
import feedbackService, {
  FeedbackNotFoundError,
} from "../src/services/feedbackService.mjs";

const originalConnectPostgreSQL = database.connectPostgreSQL;
const originalCrearFeedback = feedbackService.crearFeedback;
const originalActualizarEstado = feedbackService.actualizarEstado;

const queryText = (query) => (typeof query === "string" ? query : query.text);

const fakeResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return response;
};

const fakeDatabase = (responses) => {
  const queries = [];
  let closed = false;
  return {
    queries,
    isClosed: () => closed,
    client: {
      async query(query) {
        queries.push(query);
        const response = responses.shift();
        if (response instanceof Error) throw response;
        return response ?? { rows: [] };
      },
      async end() {
        closed = true;
      },
    },
  };
};

test.afterEach(() => {
  database.connectPostgreSQL = originalConnectPostgreSQL;
  feedbackService.crearFeedback = originalCrearFeedback;
  feedbackService.actualizarEstado = originalActualizarEstado;
});

test("expone los cuatro endpoints de feedback mediante POST", () => {
  const expectedRoutes = [
    ["/crear", feedbackController.crearFeedback],
    ["/mis-respuestas", feedbackController.obtenerMisRespuestas],
    ["/listar", feedbackController.listarFeedback],
    ["/actualizar-estado", feedbackController.actualizarEstado],
  ];

  for (const [path, controller] of expectedRoutes) {
    const route = feedbackRouter.stack.find((layer) => layer.route?.path === path)?.route;
    assert.ok(route, `Falta la ruta ${path}`);
    assert.equal(route.methods.post, true);
    assert.equal(route.stack.at(-1).handle, controller);
  }
});

test("las rutas administrativas rechazan a estudiantes", () => {
  const route = feedbackRouter.stack
    .find((layer) => layer.route?.path === "/listar")
    .route;
  const roleMiddleware = route.stack[0].handle;
  const res = fakeResponse();
  let nextCalled = false;

  roleMiddleware(
    { session: { user: { nombre_usuario: "alumno", rol: "estudiante" } } },
    res,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("las rutas generales admiten estudiantes, administración y delegación", () => {
  const route = feedbackRouter.stack
    .find((layer) => layer.route?.path === "/crear")
    .route;
  const roleMiddleware = route.stack[0].handle;

  for (const rol of ["estudiante", "administrador", "delegacion"]) {
    let nextCalled = false;
    roleMiddleware(
      { session: { user: { nombre_usuario: rol, rol } } },
      fakeResponse(),
      () => {
        nextCalled = true;
      },
    );
    assert.equal(nextCalled, true, `El rol ${rol} debería poder crear feedback`);
  }
});

test("crearFeedback valida puntuaciones y no llama al servicio con datos inválidos", async () => {
  let called = false;
  feedbackService.crearFeedback = async () => {
    called = true;
  };
  const res = fakeResponse();

  await feedbackController.crearFeedback(
    {
      session: { user: { nombre_usuario: "alumno", rol: "estudiante" } },
      body: {
        satisfaccion_general: 6,
        facilidad_uso: 4,
        recomendacion: 8,
      },
    },
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.err, true);
  assert.equal(called, false);
});

test("crearFeedback toma usuario y rol de la sesión y normaliza campos opcionales", async () => {
  let serviceArguments;
  feedbackService.crearFeedback = async (...args) => {
    serviceArguments = args;
    return { id_feedback: 12, estado: "recibida" };
  };
  const res = fakeResponse();

  await feedbackController.crearFeedback(
    {
      session: { user: { nombre_usuario: "delegado", rol: "delgacion" } },
      body: {
        satisfaccion_general: 5,
        facilidad_uso: 4,
        recomendacion: 9,
        tipo_aporte: "",
        comentario: "  Todo correcto  ",
        solicita_seguimiento: false,
        uvus: "usuario-falso",
        rol: "administrador",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.err, false);
  assert.equal(serviceArguments[0], "delegado");
  assert.equal(serviceArguments[1], "delegacion");
  assert.deepEqual(serviceArguments[2], {
    satisfaccion_general: 5,
    facilidad_uso: 4,
    recomendacion: 9,
    tipo_aporte: null,
    comentario: "Todo correcto",
    solicita_seguimiento: false,
  });
});

test("actualizarEstado rechaza estados desconocidos", async () => {
  let called = false;
  feedbackService.actualizarEstado = async () => {
    called = true;
  };
  const res = fakeResponse();

  await feedbackController.actualizarEstado(
    {
      session: { user: { nombre_usuario: "admin", rol: "administrador" } },
      body: {
        id_feedback: 4,
        estado: "cerrada",
        respuesta_administracion: "",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});

test("actualizarEstado traduce una aportación inexistente a HTTP 404", async () => {
  feedbackService.actualizarEstado = async () => {
    throw new FeedbackNotFoundError();
  };
  const res = fakeResponse();

  await feedbackController.actualizarEstado(
    {
      session: { user: { nombre_usuario: "admin", rol: "administrador" } },
      body: {
        id_feedback: 404,
        estado: "en_revision",
        respuesta_administracion: "",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.err, true);
});

test("el servicio crea la aportación con consulta parametrizada", async () => {
  const created = { id_feedback: 7, estado: "recibida" };
  const fake = fakeDatabase([{ rows: [created] }]);
  database.connectPostgreSQL = async () => fake.client;

  const result = await feedbackService.crearFeedback("alumno", "estudiante", {
    satisfaccion_general: 4,
    facilidad_uso: 3,
    recomendacion: 8,
    tipo_aporte: "mejora",
    comentario: "Añadir filtros",
    solicita_seguimiento: true,
  });

  assert.deepEqual(result, created);
  assert.match(queryText(fake.queries[0]), /INSERT INTO feedback_sistema/);
  assert.deepEqual(fake.queries[0].values, [
    "alumno",
    "estudiante",
    4,
    3,
    8,
    "mejora",
    "Añadir filtros",
    true,
  ]);
  assert.equal(fake.isClosed(), true);
});

test("el servicio actualiza estado y registra auditoría en una transacción", async () => {
  const updated = { id_feedback: 9, estado: "planificada" };
  const fake = fakeDatabase([
    { rows: [] },
    { rows: [{ estado: "en_revision" }] },
    { rows: [updated] },
    { rows: [] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  const result = await feedbackService.actualizarEstado(
    9,
    "planificada",
    "Próxima iteración",
    "admin",
  );

  assert.deepEqual(result, updated);
  assert.equal(queryText(fake.queries[0]), "BEGIN");
  assert.match(queryText(fake.queries[2]), /UPDATE feedback_sistema/);
  assert.match(queryText(fake.queries[3]), /INSERT INTO historial_feedback_sistema/);
  assert.deepEqual(fake.queries[3].values, [
    9,
    "en_revision",
    "planificada",
    "Próxima iteración",
    "admin",
  ]);
  assert.equal(queryText(fake.queries[4]), "COMMIT");
  assert.equal(fake.isClosed(), true);
});

test("el servicio revierte la transacción si no existe la aportación", async () => {
  const fake = fakeDatabase([
    { rows: [] },
    { rows: [] },
    { rows: [] },
  ]);
  database.connectPostgreSQL = async () => fake.client;

  await assert.rejects(
    feedbackService.actualizarEstado(88, "descartada", null, "admin"),
    FeedbackNotFoundError,
  );

  assert.equal(queryText(fake.queries.at(-1)), "ROLLBACK");
  assert.equal(fake.isClosed(), true);
});
