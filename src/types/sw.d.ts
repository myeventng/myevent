// types/sw.d.ts

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Extend the PushEvent interface if needed
interface PushEvent extends ExtendableEvent {
  readonly data: PushMessageData | null;
}

// Extend the NotificationEvent interface if needed
interface NotificationEvent extends ExtendableEvent {
  readonly notification: Notification;
  readonly action: string;
}

// Custom notification data structure
interface NotificationData {
  title: string;
  body: string;
  url?: string;
  notificationId?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

// Service Worker Global Scope extensions
interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
  readonly registration: ServiceWorkerRegistration;
  readonly clients: Clients;
  skipWaiting(): Promise<void>;
  addEventListener(type: 'push', listener: (event: PushEvent) => void): void;
  addEventListener(
    type: 'notificationclick',
    listener: (event: NotificationEvent) => void
  ): void;
  addEventListener(
    type: 'install',
    listener: (event: ExtendableEvent) => void
  ): void;
  addEventListener(
    type: 'activate',
    listener: (event: ExtendableEvent) => void
  ): void;
  addEventListener(type: 'sync', listener: (event: SyncEvent) => void): void;
}

// For JSDoc typing in plain JavaScript files
declare global {
  interface Window {
    // This prevents conflicts with DOM Window type
  }
}

export {};
