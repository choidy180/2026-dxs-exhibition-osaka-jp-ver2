export interface PushTestPendingJob {
  id: string;
  dueAt: number;
}

export interface PushTestCertificateSetup {
  downloadPath: string;
  mobileDownloadUrl: string;
}

export interface PushTestStatus {
  registered: boolean;
  publicKey: string;
  pending: PushTestPendingJob | null;
  lastJob: { status: string } | null;
  workerReady: boolean;
  fcmReady?: boolean;
}

export interface PushTestScheduleResult {
  pending: PushTestPendingJob;
}

export interface PushTestInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PushTestBrowserState {
  checked: boolean;
  supported: boolean;
  installed: boolean;
  permission: NotificationPermission | 'unsupported';
  hasSubscription: boolean;
  installGuide: string;
  supportMessage: string;
}
