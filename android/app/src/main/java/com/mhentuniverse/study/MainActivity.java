package com.mhentuniverse.study;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private String pendingDeepLink = null;

    public class AndroidAuthBridge {
        @JavascriptInterface
        public void openExternalUrl(String url) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupWebView();
        handleDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pendingDeepLink != null) {
            dispatchDeepLink(pendingDeepLink);
        }
    }

    private void setupWebView() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new AndroidAuthBridge(), "AndroidAuth");

            WebSettings settings = getBridge().getWebView().getSettings();
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            // Cho phép Cookie bên thứ ba để xác thực Google / Firebase hoạt động hoàn hảo
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(getBridge().getWebView(), true);

            // Tinh chỉnh User-Agent: Loại bỏ "; wv" để Google Auth không chặn disallowed_useragent
            String defaultUa = settings.getUserAgentString();
            if (defaultUa != null && defaultUa.contains("; wv")) {
                String cleanUa = defaultUa.replace("; wv", "");
                settings.setUserAgentString(cleanUa);
            }
        }
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data != null && "mhentstudy".equalsIgnoreCase(data.getScheme())) {
            dispatchDeepLink(data.toString());
        }
    }

    private void dispatchDeepLink(final String url) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    getBridge().getWebView().evaluateJavascript(
                        "if (typeof window.handleMHEntDeepLink === 'function') { window.handleMHEntDeepLink('" + url + "'); } else { window.__pendingDeepLink = '" + url + "'; }",
                        null
                    );
                }
            });
            pendingDeepLink = null;
        } else {
            pendingDeepLink = url;
        }
    }
}
