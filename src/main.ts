import cors from '@koa/cors';
import { StatusCodes } from 'http-status-codes';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import koaQs from 'koa-qs';
import { problemDetailsMiddleware } from 'rfc-7807-problem-details';
import dataSource from './app/core/data-source';
import routes from './app/features/routes';

// import logger from 'koa-logger';
const application = koaQs(new Koa().use(cors({ origin: '*' })));

const bp = bodyParser();
application.use((ctx, next) => {
  // Prevent koa-bodyparser from parsing already parsed body
  ctx.request.body = ctx.request.body || (ctx.req as any).body;
  return bp(ctx, next);
});

console.log('Routes', routes.length);
routes.forEach((route) => {
  application.use(route.routes());
});

application.use((context, next) => {
  if (context.path === '/') {
    context.status = StatusCodes.OK;
    context.body = {
      status: 'UP',
    };
    return;
  }
  if (context.path === '/health') {
    context.status = StatusCodes.OK;
    context.body = {
      status: 'UP',
    };
    return;
  }
  next();
});

application.use(
  problemDetailsMiddleware.koa((options) => {
    options.rethrow(Error);
    options.mapToStatusCode(Error, StatusCodes.INTERNAL_SERVER_ERROR);
  })
);

dataSource
  .initialize()
  .then(() => {
    console.log('Database initialized');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export default application;
console.log(process.env)
