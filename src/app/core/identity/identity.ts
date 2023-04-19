import { IncomingMessage } from 'http';

export interface IdentitySubject {}

export async function isAuthenticated(req: IncomingMessage): Promise<boolean> {
  return false;
}

export async function getSubject(
  req: IncomingMessage
): Promise<IdentitySubject | undefined> {
  return undefined;
}
