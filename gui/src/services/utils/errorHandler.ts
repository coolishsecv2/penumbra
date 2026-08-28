import { parseTauriError, getErrorSuggestion } from "./errorParser";
import type { AppError } from "../../types";

/**
 * Options for error handling behavior.
 */
export interface ErrorOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  customMessage?: string;
  showSuggestion?: boolean;
}

/**
 * Error Handler Service - Provides consistent error and success handling.
 * Centralizes toast notifications and console logging.
 */
export class ErrorHandler {
  /**
   * Handle errors consistently across the application.
   */
  static handle(
    error: unknown,
    operation: string,
    options: ErrorOptions = {}
  ): AppError {
    const {
      showToast = true,
      logToConsole = true,
      customMessage,
      showSuggestion = true,
    } = options;

    const parsedError = parseTauriError(error);
    const errorMessage = customMessage || parsedError.message;
    const suggestion = showSuggestion
      ? parsedError.suggestion || getErrorSuggestion(error)
      : undefined;

    if (logToConsole) {
      console.error(`[${operation}] Error:`, error);
      console.error(`[${operation}] Parsed:`, parsedError);
    }

    if (showToast) {
      const displayMessage = suggestion
        ? `${errorMessage}\n\nSuggestion: ${suggestion}`
        : errorMessage;

      if (typeof window !== "undefined" && "__TAURI__" in window) {
        import("@tauri-apps/plugin-dialog")
          .then(({ message }) => {
            message(displayMessage, { title: operation, kind: "error" });
          })
          .catch(() => {
            console.error(`[${operation}]`, displayMessage);
          });
      } else {
        console.error(`[${operation}]`, displayMessage);
      }
    }

    return parsedError;
  }

  /**
   * Handle successful operations consistently.
   */
  static success(
    operation: string,
    message?: string,
    showToast: boolean = true
  ): void {
    const successMessage = message || `${operation} completed successfully`;

    if (showToast) {
      if (typeof window !== "undefined" && "__TAURI__" in window) {
        import("@tauri-apps/plugin-dialog")
          .then(({ message }) => {
            message(successMessage, { title: operation, kind: "info" });
          })
          .catch(() => {
            console.log(`[${operation}]`, successMessage);
          });
      } else {
        console.log(`[${operation}]`, successMessage);
      }
    }
  }

  /**
   * Handle warnings.
   */
  static warn(operation: string, message: string): void {
    console.warn(`[${operation}]`, message);
  }
}

export { parseTauriError, getErrorSuggestion };
export type { AppError };
