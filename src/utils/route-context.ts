import type { NextRequest } from "next/server";

export type RouteParams = Record<string, string>;

export type RouteContext<Params extends RouteParams = RouteParams> = {
  params?: Params | Promise<Params>;
};

export type RouteHandler<Params extends RouteParams = RouteParams> = (
  req: NextRequest,
  context: RouteContext<Params>,
) => Promise<Response>;
