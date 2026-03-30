export function buildAppUrl(path: string = "/") {
  return `/app${path === "/" ? "" : path}`;
}

export function buildAdminUrl(path: string = "/") {
  return `/niural-admin${path === "/" ? "" : path}`;
}

export function buildPublicUrl(path: string = "/") {
  return path;
}
