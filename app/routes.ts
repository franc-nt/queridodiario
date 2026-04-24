import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("cadastro", "routes/cadastro.tsx"),
  route("logout", "routes/logout.tsx"),
  route("diarios", "routes/diarios.tsx", [
    index("routes/diarios._index.tsx"),
    route("novo", "routes/diarios.novo.tsx"),
    route(":diarioId", "routes/diarios.$diarioId.tsx", [
      index("routes/diarios.$diarioId._index.tsx"),
      route("editar", "routes/diarios.$diarioId.editar.tsx"),
      route("rotinas/nova", "routes/diarios.$diarioId.rotinas.nova.tsx"),
      route(
        "rotinas/:rotinaId",
        "routes/diarios.$diarioId.rotinas.$rotinaId.tsx"
      ),
      route(
        "rotinas/:rotinaId/editar",
        "routes/diarios.$diarioId.rotinas.$rotinaId.editar.tsx"
      ),
      route(
        "rotinas/:rotinaId/atividades/nova",
        "routes/diarios.$diarioId.rotinas.$rotinaId.atividades.nova.tsx"
      ),
      route(
        "rotinas/:rotinaId/atividades/:atividadeId/editar",
        "routes/diarios.$diarioId.rotinas.$rotinaId.atividades.$atividadeId.editar.tsx"
      ),
    ]),
  ]),
  route("admin", "routes/admin.tsx", [
    index("routes/admin._index.tsx"),
    route("usuarios/novo", "routes/admin.usuarios.novo.tsx"),
    route("usuarios/:userId/editar", "routes/admin.usuarios.$userId.editar.tsx"),
    route("usuarios/:userId/senha", "routes/admin.usuarios.$userId.senha.tsx"),
  ]),
  route("painel", "routes/painel.tsx"),
  route("api/painel", "routes/api.painel.tsx"),
  route("api/painel/complete", "routes/api.painel.complete.tsx"),
  route("api/painel/notes", "routes/api.painel.notes.tsx"),
  route("api/painel/extra-activity", "routes/api.painel.extra-activity.tsx"),
] satisfies RouteConfig;
