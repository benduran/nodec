export function isNullOrUndefined(thing: unknown): thing is null | undefined {
  return thing === null || thing === undefined || typeof thing === 'undefined';
}
