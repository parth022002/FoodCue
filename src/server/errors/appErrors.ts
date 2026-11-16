export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR", isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): { error: string; code: string } {
    return {
      error: this.message,
      code: this.errorCode
    };
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required. Missing or invalid Bearer token.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden. You do not have permission to access this resource.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Requested resource not found.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request validation failed.") {
    super(message, 400, "BAD_REQUEST");
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database operation failed.") {
    super(message, 500, "DATABASE_ERROR");
  }
}

export class ConfigurationError extends AppError {
  constructor(message = "Server configuration error.") {
    super(message, 500, "CONFIGURATION_ERROR");
  }
}
