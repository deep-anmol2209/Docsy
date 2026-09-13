

import { NextResponse } from "next/server";

export type ApiResponseSuccess<Data = unknown> = {
  success: true;
  data?: Data;
  message?: string;
  details?: unknown;
};

export type ApiResponseError = {
  success: false;
  message: string;
  details?: unknown;
};

export function jsonSuccess(
  data?: unknown,
  message?: string,
  status = 200,
): Response {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    } as ApiResponseSuccess,
    {
      status,
    },
  );
}

export function jsonError(
  message: string,
  details?: unknown,
  status = 500,
): Response {
  return NextResponse.json(
    {
      success: false,
      message,
      details,
    } as ApiResponseError,
    {
      status,
    },
  );
}
