package com.scct.dxs.pushtest;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 41;
    private static final String BRIDGE_NAME = "DxsNativePush";
    private static final String START_URL = BuildConfig.SERVER_ORIGIN + "/lab/push?native=android";
    private final TrustedOrigin trusted = new TrustedOrigin(BuildConfig.SERVER_ORIGIN);
    private WebView webView;
    private AlertDialog connectionDialog;
    private BridgeCall permissionCall;
    private boolean tokenOperationPending;
    private int documentGeneration;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createWebView();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebView() {
        FrameLayout frame = new FrameLayout(this);
        frame.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        webView = new WebView(this);
        frame.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(frame);
        frame.requestApplyInsets();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSafeBrowsingEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        webView.setWebViewClient(new InternalWebViewClient());

        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            showConnectionError(R.string.webview_error_message);
            return;
        }
        WebViewCompat.addWebMessageListener(webView, BRIDGE_NAME,
            Collections.singleton(BuildConfig.SERVER_ORIGIN),
            (view, message, sourceOrigin, isMainFrame, reply) -> {
                if (!isMainFrame || !trusted.matches(sourceOrigin.toString()) ||
                    !trusted.matches(view.getUrl()) || message.getType() != WebMessageCompat.TYPE_STRING) {
                    return;
                }
                handleMessage(message.getData(), reply);
            });
        webView.loadUrl(START_URL);
    }

    private void handleMessage(String message, JavaScriptReplyProxy reply) {
        if (message == null || message.length() > 4096) return;
        try {
            JSONObject request = new JSONObject(message);
            Object id = request.opt("id");
            if (!(id instanceof String) || ((String) id).isEmpty() || ((String) id).length() > 128) return;
            BridgeCall call = new BridgeCall((String) id, reply, documentGeneration);
            switch (request.optString("method")) {
                case "getStatus":
                    call.success(status());
                    break;
                case "getToken":
                    String cached = PushTestApplication.preferences(this).getBoolean("enabled", false)
                        ? PushTestApplication.preferences(this).getString("token", null) : null;
                    call.success(json("token", cached == null ? JSONObject.NULL : cached));
                    break;
                case "requestPermission":
                    requestNotificationPermission(call);
                    break;
                case "register":
                    registerToken(call);
                    break;
                case "unregister":
                    unregisterToken(call);
                    break;
                default:
                    call.error("UNKNOWN_METHOD", "지원하지 않는 알림 요청입니다.");
            }
        } catch (JSONException exception) {
            // Malformed or untrusted messages are never evaluated as JavaScript.
        }
    }

    private JSONObject status() {
        return json("permission", notificationPermission(), "configured",
            ((PushTestApplication) getApplication()).isConfigured());
    }

    private String notificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return PushTestApplication.preferences(this).getBoolean("permission_requested", false)
                ? "denied" : "default";
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        NotificationChannel channel = manager.getNotificationChannel(PushTestApplication.CHANNEL_ID);
        return manager.areNotificationsEnabled() &&
            (channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE)
            ? "granted" : "denied";
    }

    private void requestNotificationPermission(BridgeCall call) {
        if (permissionCall != null) {
            call.error("BUSY", "알림 허용 창에서 먼저 선택해 주세요.");
            return;
        }
        if (Build.VERSION.SDK_INT < 33 ||
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED ||
            !((PushTestApplication) getApplication()).isConfigured()) {
            call.success(status());
            return;
        }
        permissionCall = call;
        PushTestApplication.preferences(this).edit().putBoolean("permission_requested", true).apply();
        requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST && permissionCall != null) {
            BridgeCall completed = permissionCall;
            permissionCall = null;
            completed.success(status());
        }
    }

    private boolean canRegister(BridgeCall call) {
        if (!((PushTestApplication) getApplication()).isConfigured()) {
            call.error("NOT_CONFIGURED", "앱의 Firebase 푸시 설정이 필요합니다. 설정을 포함한 APK를 설치해 주세요.");
            return false;
        }
        if (!"granted".equals(notificationPermission())) {
            call.error("PERMISSION_REQUIRED", "알림을 허용한 뒤 다시 등록해 주세요.");
            return false;
        }
        if (tokenOperationPending) {
            call.error("BUSY", "알림 등록 처리가 끝난 뒤 다시 시도해 주세요.");
            return false;
        }
        return true;
    }

    private void registerToken(BridgeCall call) {
        if (!canRegister(call)) return;
        tokenOperationPending = true;
        FirebaseMessaging messaging = FirebaseMessaging.getInstance();
        PushTestApplication.preferences(this).edit().putBoolean("enabled", true).apply();
        messaging.setAutoInitEnabled(true);
        messaging.getToken().addOnCompleteListener(task -> {
            tokenOperationPending = false;
            if (!task.isSuccessful() || task.getResult() == null) {
                call.error("REGISTRATION_FAILED", "기기를 등록하지 못했습니다. 인터넷 연결과 Google Play 서비스를 확인한 뒤 다시 시도해 주세요.");
                return;
            }
            String token = task.getResult();
            PushTestApplication.preferences(this).edit().putString("token", token).apply();
            call.success(json("token", token));
        });
    }

    private void unregisterToken(BridgeCall call) {
        if (tokenOperationPending) {
            call.error("BUSY", "알림 등록 처리가 끝난 뒤 다시 시도해 주세요.");
            return;
        }
        PushTestApplication.preferences(this).edit().putBoolean("enabled", false).remove("token").apply();
        if (!((PushTestApplication) getApplication()).isConfigured()) {
            call.success(json("unregistered", true));
            return;
        }
        tokenOperationPending = true;
        FirebaseMessaging messaging = FirebaseMessaging.getInstance();
        messaging.setAutoInitEnabled(false);
        messaging.deleteToken().addOnCompleteListener(task -> {
            tokenOperationPending = false;
            if (task.isSuccessful()) call.success(json("unregistered", true));
            else call.error("UNREGISTER_FAILED", "기기의 알림 등록 해제를 완료하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");
        });
    }

    private void showConnectionError(int message) {
        if (isFinishing() || isDestroyed() || connectionDialog != null) return;
        connectionDialog = new AlertDialog.Builder(this)
            .setTitle(R.string.connection_error_title)
            .setMessage(message)
            .setPositiveButton(R.string.retry, (dialog, which) -> {
                if (message == R.string.webview_error_message) recreate();
                else if (webView == null) createWebView();
                else webView.loadUrl(START_URL);
            })
            .setNegativeButton(R.string.close, (dialog, which) -> finish())
            .create();
        connectionDialog.setOnDismissListener(dialog -> connectionDialog = null);
        connectionDialog.show();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Notification extras and external intent URLs cannot change the destination.
        if (webView != null) webView.loadUrl(START_URL);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            if (trusted.matches(webView.getUrl())) {
                webView.evaluateJavascript("window.dispatchEvent(new Event('focus'))", null);
            }
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else finish();
    }

    @Override
    protected void onDestroy() {
        if (connectionDialog != null) connectionDialog.dismiss();
        permissionCall = null;
        if (webView != null) {
            webView.stopLoading();
            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                WebViewCompat.removeWebMessageListener(webView, BRIDGE_NAME);
            }
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private final class InternalWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return request.isForMainFrame() && !trusted.matches(request.getUrl().toString());
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (request.isForMainFrame() && !trusted.matches(request.getUrl().toString())) {
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden",
                    Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            return null;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            documentGeneration++;
            if (!trusted.matches(url)) view.stopLoading();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) showConnectionError(R.string.connection_error_message);
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            if (request.isForMainFrame()) showConnectionError(R.string.connection_error_message);
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            if (trusted.matches(error.getUrl())) showConnectionError(R.string.certificate_error_message);
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            documentGeneration++;
            ((FrameLayout) view.getParent()).removeView(view);
            view.destroy();
            webView = null;
            showConnectionError(R.string.connection_error_message);
            return true;
        }
    }

    private final class BridgeCall {
        private final String id;
        private final JavaScriptReplyProxy reply;
        private final int generation;

        BridgeCall(String id, JavaScriptReplyProxy reply, int generation) {
            this.id = id;
            this.reply = reply;
            this.generation = generation;
        }

        void success(JSONObject result) {
            send(json("id", id, "result", result));
        }

        void error(String code, String message) {
            send(json("id", id, "error", json("code", code, "message", message)));
        }

        private void send(JSONObject response) {
            if (!isFinishing() && !isDestroyed() && webView != null && generation == documentGeneration &&
                trusted.matches(webView.getUrl())) {
                reply.postMessage(response.toString());
            }
        }
    }

    private static JSONObject json(Object... pairs) {
        JSONObject result = new JSONObject();
        try {
            for (int index = 0; index < pairs.length; index += 2) {
                result.put((String) pairs[index], pairs[index + 1]);
            }
        } catch (JSONException exception) {
            throw new IllegalStateException("알림 응답을 만들지 못했습니다.");
        }
        return result;
    }
}
