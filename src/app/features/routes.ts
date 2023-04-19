import Router from '@koa/router';
const requireModule = require.context('./', true, /\.controller\.ts$/);

const routes: Router[] = requireModule
  .keys()
  .map((fileName: string) => requireModule(fileName).default);

export default routes;
