package com.velvetstories.app;

import android.os.Bundle;

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
