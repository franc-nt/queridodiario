import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("diarios", "routes/diarios.tsx", [
    index("routes/diarios._index.tsx"),
    route("novo", "routes/diarios.novo.tsx"),
    route(":diarioId", "routes/diarios.$diarioId.tsx", [
      index("routes/diarios.$diarioId._index.tsx"),
      route("editar", "routes/diarios.$diarioId.editar.tsx"),
      route("rotinas/nova", "routes/diarios.$diarioId.rotinas.nova.tsx"),
      route(
        "rotinas/:rotinaId/editar",
        "routes/diarios.$diarioId.rotinas.$rotinaId.editar.tsx"
      ),
    ]),
  ]),
  route("painel", "routes/painel.tsx"),
  route("api/painel", "routes/api.painel.tsx"),
  route("api/painel/complete", "routes/api.painel.complete.tsx"),
] satisfies RouteConfig;
