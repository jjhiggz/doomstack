export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type AssertEqual<X, Y> = Equal<X, Y> extends true ? true : "Types are not equal";
