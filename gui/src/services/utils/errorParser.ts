import type { AppError, SerializedError, ErrorCategory } from "../types";

/**
 * Parse errors from Tauri invoke calls into structured AppError format.
 * Tauri may serialize errors in different ways depending on the error type.
 */
export function parseTauriError(error: unknown): AppError {
  if (error == null) {
    return {
      type: "unknown",
      message: "An unknown error occurred",
      category: "unknown",
    };
  }

  if (error instanceof Error) {
    return {
      type: "other",
      message: error.message || "An error occurred",
      category: "unknown",
    };
  }

  if (typeof error === "string") {
    return {
      type: "other",
      message: error,
      category: "unknown",
    };
  }

  if (typeof error === "object") {
    const err = error as SerializedError;

    if (typeof err.type === "string") {
      return {
        type: err.type,
        message: err.message || "An error occurred",
        category: parseCategory(err.category),
        suggestion: err.suggestion,
        code: err.code,
        output: err.output,
      };
    }

    if (typeof err.message === "string") {
      return {
        type: "other",
        message: err.message,
        category: "unknown",
      };
    }

    try {
      const message = JSON.stringify(error);
      return {
        type: "other",
        message,
        category: "unknown",
      };
    } catch {
      return {
        type: "other",
        message: "An error occurred (details unavailable)",
        category: "unknown",
      };
    }
  }

  return {
    type: "unknown",
    message: String(error),
    category: "unknown",
  };
}

function parseCategory(category?: string): ErrorCategory {
  if (!category) return "unknown";

  const normalized = category.toLowerCase();
  switch (normalized) {
    case "network":
      return "network";
    case "permission":
      return "permission";
    case "filesystem":
      return "filesystem";
    case "validation":
      return "validation";
    case "command":
      return "command";
    default:
      return "unknown";
  }
}

/**
 * Extract the most informative error message from any error type.
 */
export function extractErrorMessage(error: unknown): string {
  const parsed = parseTauriError(error);
  return parsed.message;
}

/**
 * Get user-friendly suggestion for an error.
 */
export function getErrorSuggestion(error: unknown): string | undefined {
  const parsed = parseTauriError(error);

  if (parsed.suggestion) {
    return parsed.suggestion;
  }

  switch (parsed.category) {
    case "network":
      return "Check your USB connection and try again";
    case "permission":
      return "Run as Administrator or check folder permissions";
    case "filesystem":
      return "Check that files and directories exist and are accessible";
    case "command":
      return "Ensure the device is connected in Preloader or BROM mode";
    default:
      return undefined;
  }
}

/**
 * Check if an error is of a specific category.
 */
export function isErrorCategory(
  error: unknown,
  category: ErrorCategory
): boolean {
  const parsed = parseTauriError(error);
  return parsed.category === category;
}
