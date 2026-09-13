export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = "AppError";
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(404, message);
        this.name = "NotFoundError";
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad Request", details?: unknown) {
        super(400, message, details);
        this.name = "BadRequestError";
    }
}

export class ValidationError extends AppError {
    constructor(message = "Validation failed", details?: unknown) {
        super(400, message, details);
        this.name = "ValidationError";
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(401, message);
        this.name = "UnauthorizedError";
    }
}

export class ConflictError extends AppError {
    constructor(message = "Conflict") {
        super(409, message);
        this.name = "ConflictError";
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message = "Too many requests", details?: unknown) {
        super(429, message, details);
        this.name = "TooManyRequestsError";
    }
}