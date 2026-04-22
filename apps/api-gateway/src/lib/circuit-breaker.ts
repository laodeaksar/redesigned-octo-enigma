/**
 * Circuit Breaker Pattern Implementation
 * Standar industri untuk fault tolerance pada komunikasi microservice
 * 
 * State Machine:
 * CLOSED -> OPEN -> HALF_OPEN -> CLOSED / OPEN
 * 
 * Sesuai standar Netflix Hystrix dan Resilience4j
 */

import { logger } from "./logger";

export enum CircuitState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half_open"
}

export interface CircuitBreakerConfig {
  /** Nama service untuk identifikasi */
  serviceName: string;
  /** Jumlah kegagalan berturut sebelum circuit terbuka */
  failureThreshold: number;
  /** Waktu tunggu sebelum mencoba recovery (ms) */
  resetTimeout: number;
  /** Timeout permintaan individual (ms) */
  requestTimeout: number;
  /** Jumlah permintaan sukses berturut di half-open untuk menutup circuit */
  successThreshold: number;
  /** Jumlah maksimum permintaan diizinkan saat half-open */
  halfOpenMaxRequests: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  consecutiveSuccesses: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  totalFailures: number;
  totalSuccesses: number;
  totalRejected: number;
  uptimeSinceReset: number;
}

const DEFAULT_CONFIG: Partial<CircuitBreakerConfig> = {
  failureThreshold: 5,
  resetTimeout: 30000,
  requestTimeout: 5000,
  successThreshold: 3,
  halfOpenMaxRequests: 2
};

/**
 * Konfigurasi spesifik per service berdasarkan karakteristik beban kerja
 */
export const SERVICE_CIRCUIT_CONFIG: Record<string, Partial<CircuitBreakerConfig>> = {
  "auth-service": {
    failureThreshold: 8,
    resetTimeout: 15000,
    requestTimeout: 3000,
    successThreshold: 2,
    halfOpenMaxRequests: 3
  },
  "product-service": {
    failureThreshold: 10,
    resetTimeout: 20000,
    requestTimeout: 4000,
    successThreshold: 3,
    halfOpenMaxRequests: 5
  },
  "order-service": {
    failureThreshold: 6,
    resetTimeout: 45000,
    requestTimeout: 8000,
    successThreshold: 2,
    halfOpenMaxRequests: 2
  },
  "payment-service": {
    failureThreshold: 4,
    resetTimeout: 60000,
    requestTimeout: 15000,
    successThreshold: 1,
    halfOpenMaxRequests: 1
  },
  "shipping-service": {
    failureThreshold: 12,
    resetTimeout: 120000,
    requestTimeout: 10000,
    successThreshold: 5,
    halfOpenMaxRequests: 3
  },
  "email-worker": {
    failureThreshold: 20,
    resetTimeout: 30000,
    requestTimeout: 5000,
    successThreshold: 10,
    halfOpenMaxRequests: 10
  }
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange: number = Date.now();
  private totalFailures = 0;
  private totalSuccesses = 0;
  private totalRejected = 0;
  private halfOpenRequestCount = 0;
  private resetTimer: NodeJS.Timeout | null = null;
  
  private readonly config: CircuitBreakerConfig;
  
  constructor(config: CircuitBreakerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Jalankan operasi dengan proteksi circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.isOpen()) {
      if (this.shouldAttemptReset()) {
        this.changeState(CircuitState.HALF_OPEN);
        this.halfOpenRequestCount = 0;
      } else {
        this.totalRejected++;
        logger.warn(`Circuit OPEN request rejected`, {
          service: this.config.serviceName,
          failureCount: this.failureCount,
          remainingWait: this.lastFailureTime 
            ? Math.max(0, this.config.resetTimeout - (Date.now() - this.lastFailureTime))
            : 0
        });
        
        if (fallback) {
          return fallback();
        }
        
        throw new CircuitBreakerOpenError(
          `Service ${this.config.serviceName} tidak tersedia saat ini. Silakan coba lagi nanti.`,
          this.config.serviceName
        );
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenRequestCount >= this.config.halfOpenMaxRequests) {
        this.totalRejected++;
        logger.debug(`Half-open limit reached, request rejected`, {
          service: this.config.serviceName,
          currentRequests: this.halfOpenRequestCount
        });
        
        if (fallback) return fallback();
        throw new CircuitBreakerOpenError(
          `Service ${this.config.serviceName} dalam masa pemulihan. Coba lagi sebentar lagi.`,
          this.config.serviceName
        );
      }
      this.halfOpenRequestCount++;
    }

    try {
      const result = await this.withTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      if (fallback) {
        logger.info(`Using fallback response`, {
          service: this.config.serviceName,
          error: error instanceof Error ? error.message : "Unknown error"
        });
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Bungkus operasi dengan timeout individual
   */
  private async withTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new CircuitTimeoutError(
            `Request ke ${this.config.serviceName} timeout setelah ${this.config.requestTimeout}ms`,
            this.config.serviceName
          ));
        }, this.config.requestTimeout);
      })
    ]);
  }

  /**
   * Handler ketika operasi berhasil dieksekusi
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.consecutiveSuccesses++;
      logger.debug(`Half-open success`, {
        service: this.config.serviceName,
        consecutiveSuccesses: this.consecutiveSuccesses,
        requiredSuccesses: this.config.successThreshold
      });

      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.closeCircuit();
      }
    } else {
      // Kurangi failure count secara gradual saat sukses
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 0.5);
      }
      this.consecutiveSuccesses++;
    }
  }

  /**
   * Handler ketika operasi mengalami kegagalan
   */
  private onFailure(error: unknown): void {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.consecutiveSuccesses = 0;

    logger.error(`Circuit breaker operation failure`, {
      service: this.config.serviceName,
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.openCircuit();
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Buka circuit dan hentikan semua permintaan masuk
   */
  private openCircuit(): void {
    if (this.state === CircuitState.OPEN) return;
    
    this.changeState(CircuitState.OPEN);
    this.halfOpenRequestCount = 0;
    
    logger.critical(`CIRCUIT BREAKER TRIGGERED - SERVICE UNHEALTHY`, {
      service: this.config.serviceName,
      failureCount: this.failureCount,
      resetAfterMs: this.config.resetTimeout,
      alert: true
    });

    // Schedule automatic reset attempt
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        logger.info(`Circuit breaker cooling period ended, attempting recovery`, {
          service: this.config.serviceName
        });
      }
    }, this.config.resetTimeout);
  }

  /**
   * Tutup circuit kembali dan pulihkan operasi normal
   */
  private closeCircuit(): void {
    this.changeState(CircuitState.CLOSED);
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.halfOpenRequestCount = 0;
    
    logger.info(`CIRCUIT BREAKER CLOSED - SERVICE RECOVERED`, {
      service: this.config.serviceName,
      totalFailures: this.totalFailures,
      downtimeMs: Date.now() - this.lastStateChange
    });

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Ubah state circuit breaker dan log perubahan
   */
  private changeState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    logger.debug(`Circuit breaker state changed`, {
      service: this.config.serviceName,
      oldState,
      newState
    });
  }

  /**
   * Cek apakah circuit dalam kondisi terbuka
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Cek apakah sudah waktunya untuk mencoba reset
   */
  shouldAttemptReset(): boolean {
    if (this.state !== CircuitState.OPEN) return false;
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.config.resetTimeout;
  }

  /**
   * Dapatkan metrik dan status saat ini
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      totalRejected: this.totalRejected,
      uptimeSinceReset: Date.now() - this.lastStateChange
    };
  }

  /**
   * Reset paksa circuit ke keadaan normal
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.halfOpenRequestCount = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    logger.info(`Circuit breaker manually reset`, {
      service: this.config.serviceName
    });
  }
}

/**
 * Factory Singleton untuk mengelola instance circuit breaker per service
 */
export class CircuitBreakerManager {
  private static instances = new Map<string, CircuitBreaker>();

  /**
   * Dapatkan atau buat instance circuit breaker untuk service tertentu
   */
  static get(serviceName: string, customConfig?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.instances.has(serviceName)) {
      const baseConfig = SERVICE_CIRCUIT_CONFIG[serviceName] || {};
      const mergedConfig = {
        serviceName,
        ...DEFAULT_CONFIG,
        ...baseConfig,
        ...customConfig
      } as CircuitBreakerConfig;
      
      this.instances.set(serviceName, new CircuitBreaker(mergedConfig));
      logger.debug(`Circuit breaker initialized`, { serviceName, config: mergedConfig });
    }
    return this.instances.get(serviceName)!;
  }

  /**
   * Dapatkan semua metrik circuit breaker untuk monitoring
   */
  static getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, cb] of this.instances.entries()) {
      metrics[name] = cb.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset semua circuit breaker
   */
  static resetAll(): void {
    for (const cb of this.instances.values()) {
      cb.reset();
    }
    logger.info(`All circuit breakers manually reset`);
  }
}

/**
 * Custom Error Classes
 */
export class CircuitBreakerOpenError extends Error {
  readonly statusCode = 503;
  readonly retryAfter: number;
  
  constructor(message: string, public readonly serviceName: string) {
    super(message);
    this.name = "CircuitBreakerOpenError";
    this.retryAfter = SERVICE_CIRCUIT_CONFIG[serviceName]?.resetTimeout || 30000;
  }
}

export class CircuitTimeoutError extends Error {
  readonly statusCode = 504;
  
  constructor(message: string, public readonly serviceName: string) {
    super(message);
    this.name = "CircuitTimeoutError";
  }
}
