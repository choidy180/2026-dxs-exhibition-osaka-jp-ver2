package com.scct.dxs.pushtest;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.os.Build;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public final class PushTestMessagingService extends FirebaseMessagingService {
    @Override
    public void onNewToken(String token) {
        if (PushTestApplication.preferences(this).getBoolean("enabled", false)) {
            PushTestApplication.preferences(this).edit().putString("token", token).apply();
        }
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        if (!PushTestApplication.preferences(this).getBoolean("enabled", false)) return;
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (!manager.areNotificationsEnabled()) return;

        RemoteMessage.Notification remote = message.getNotification();
        String title = text(message.getData().get("title"), remote == null ? null : remote.getTitle(),
            "고모텍 CCTV", 160);
        String body = text(message.getData().get("body"), remote == null ? null : remote.getBody(),
            "CCTV 알림이 도착했습니다. (test)", 500);
        String tag = text(message.getData().get("tag"), remote == null ? null : remote.getTag(),
            "push-test", 128);

        // Never use a URL or an Activity name supplied by notification data.
        Intent intent = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent click = PendingIntent.getActivity(this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new Notification.Builder(this, PushTestApplication.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_gomotec_notification)
            .setLargeIcon(BitmapFactory.decodeResource(getResources(), R.drawable.ic_gomotec))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setContentIntent(click)
            .setCategory(Notification.CATEGORY_STATUS)
            .setAutoCancel(true)
            .build();
        manager.notify(tag, 0, notification);
    }

    private static String text(String primary, String secondary, String fallback, int limit) {
        String value = primary != null && !primary.isEmpty() ? primary : secondary;
        if (value == null || value.isEmpty()) return fallback;
        return value.substring(0, Math.min(value.length(), limit));
    }
}
