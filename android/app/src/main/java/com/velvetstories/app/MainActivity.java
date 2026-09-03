package com.velvetstories.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private OnBackPressedCallback velvetBackCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VelvetNativePlugin.class);
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.setBackgroundColor(Color.parseColor("#0B0D14"));
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);

            WebSettings settings = webView.getSettings();
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setTextZoom(100);
        }

        velvetBackCallback = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge == null || bridge.getWebView() == null) {
                    finish();
                    return;
                }

                bridge.getWebView().evaluateJavascript(
                    "(function(){try{return window.__VELVET_ANDROID_BACK__ ? !!window.__VELVET_ANDROID_BACK__() : false;}catch(e){return false;}})()",
                    value -> {
                        if (!"true".equals(value)) {
                            setEnabled(false);
                            getOnBackPressedDispatcher().onBackPressed();
                            setEnabled(true);
                        }
                    }
                );
            }
        };
        getOnBackPressedDispatcher().addCallback(this, velvetBackCallback);
    }
}
