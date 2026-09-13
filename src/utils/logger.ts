const isProduction = process.env.NODE_ENV === "production";

function normalizeMeta(meta: unknown) {
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }

  return meta;
}

export const logger = {
  error(message: string, meta?: unknown) {
    if (isProduction) {
      console.error(JSON.stringify({ level: "error", message, meta: normalizeMeta(meta) }));
      return;
    }

    console.error(message, meta);
  },

  warn(message: string, meta?: unknown) {
    if (isProduction) {
      console.warn(JSON.stringify({ level: "warn", message, meta: normalizeMeta(meta) }));
      return;
    }

    console.warn(message, meta);
  },

  info(message: string, meta?: unknown) {
    if (isProduction) {
      console.info(JSON.stringify({ level: "info", message, meta: normalizeMeta(meta) }));
      return;
    }

    console.info(message, meta);
  },
};
