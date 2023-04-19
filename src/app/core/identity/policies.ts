import { AnyMongoAbility, defineAbility } from '@casl/ability';
import { IResult } from 'ua-parser-js';

import { IdentitySubject } from './identity';

export interface Environment {
  ip?: string | null;
  userAgent?: string | null;
  userAgentData: IResult;
}

export interface Policy {
  name: string;
  abilities: AnyMongoAbility;
  evaluate: (
    subject: IdentitySubject | undefined,
    resource: any,
    environment: Environment
  ) => boolean;
}

export const policies: Policy[] = [
  {
    name: 'Guest',
    evaluate: (
      subject: IdentitySubject | undefined,
      resource: any,
      environment: Environment
    ) => {
      return true;
    },
    abilities: defineAbility((can, cannot) => {
      can('manage', 'all');
    }),
  },
];
