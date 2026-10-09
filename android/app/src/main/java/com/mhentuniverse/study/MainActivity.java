package com.mhentuniverse.study;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private String pendingDeepLink = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
