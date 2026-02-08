import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("painel", "routes/painel.tsx"),
  route("api/painel", "routes/api.painel.tsx"),
  route("api/painel/complete", "routes/api.painel.complete.tsx"),
] satisfies RouteConfig;
