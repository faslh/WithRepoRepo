import { ForbiddenError } from '@casl/ability';
import Router from '@koa/router';
import { IncomingMessage } from 'http';
import { getClientIp } from 'request-ip';
import {
  ProblemDetails,
  ProblemDetailsException,
} from 'rfc-7807-problem-details';
import UAParser from 'ua-parser-js';

import { getSubject } from './identity';
import { Environment, policies } from './policies';

export function getIp(req: IncomingMessage): string | null {
  return getClientIp(req);
}

function getEnv(req: IncomingMessage): Environment {
  const userAgent = req.headers['user-agent'];
  const parser = new UAParser(userAgent);
  const userAgentData = parser.getResult();
  const ip = getIp(req);
  return {
    userAgentData,
    userAgent,
    ip: ip,
  };
}

export function authorize(action: string): Router.Middleware {
  return async (context, next) => {
    const env: Environment = {
      ...getEnv(context.req),
    };

    const subject = await getSubject(context.req);

    const applicablePolicies = policies.filter((it) =>
      it.evaluate(subject, null, env)
    );

    if (applicablePolicies.length < 1) {
      throw new ProblemDetailsException(
        new ProblemDetails('forbidden', 'no sufficient permissions', 403)
      );
    }

    for (const { abilities } of applicablePolicies) {
      ForbiddenError.from(abilities).throwUnlessCan(action);
    }

    await next();
  };
}
