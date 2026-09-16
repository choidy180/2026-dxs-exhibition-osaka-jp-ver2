package com.scct.dxs.pushtest;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public final class PushTestApplication extends Application {
    static final String CHANNEL_ID = "push_test";
    private boolean configured;

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
            getString(R.string.notification_channel_name), NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(getString(R.string.notification_channel_description));
        getSystemService(NotificationManager.class).createNotificationChannel(channel);

        try {
            FirebaseOptions options = FirebaseOptions.fromResource(this);
            if (options != null && options.getApiKey() != null &&
                options.getGcmSenderId() != null && options.getProjectId() != null) {
                FirebaseApp.initializeApp(this, options);
                configured = true;
            }
        } catch (IllegalArgumentException | IllegalStateException exception) {
            // A missing or invalid test configuration must not expose credentials or crash CCTV.
            configured = false;
        }
    }

    boolean isConfigured() {
        return configured;
    }

    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("native_push_test", Context.MODE_PRIVATE);
    }
}
