package com.velvetstories.app;

import android.graphics.Color;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.view.Window;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VelvetNative")
public class VelvetNativePlugin extends Plugin {
    @PluginMethod
    public void setSystemBars(PluginCall call) {
        final String theme = call.getString("theme", "light");
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            View decor = window.getDecorView();
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
            boolean lightIcons = "dark".equals(theme);
            controller.setAppearanceLightStatusBars(!lightIcons);
            controller.setAppearanceLightNavigationBars(!lightIcons);

            if (Build.VERSION.SDK_INT < 35) {
                int barColor = Color.parseColor("dark".equals(theme) ? "#120B0E" : ("comfort".equals(theme) ? "#F1E7D7" : "#F8F1E8"));
                window.setStatusBarColor(barColor);
                window.setNavigationBarColor(barColor);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
                window.setStatusBarContrastEnforced(false);
            }
            call.resolve();
        });
    }


    @PluginMethod
    public void setLaunchFullscreen(PluginCall call) {
        final boolean enabled = call.getBoolean("enabled", true);
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            View decor = window.getDecorView();
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decor);
            if (enabled) {
                controller.hide(WindowInsetsCompat.Type.systemBars());
                controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            } else {
                controller.show(WindowInsetsCompat.Type.systemBars());
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void getInsets(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            WindowInsetsCompat rootInsets = ViewCompat.getRootWindowInsets(getBridge().getWebView());
            Insets bars = rootInsets == null
                    ? Insets.NONE
                    : rootInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            float density = getActivity().getResources().getDisplayMetrics().density;
            JSObject result = new JSObject();
            result.put("top", bars.top / density);
            result.put("right", bars.right / density);
            result.put("bottom", bars.bottom / density);
            result.put("left", bars.left / density);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void haptic(PluginCall call) {
        String kind = call.getString("kind", "selection");
        long duration = "destructive".equals(kind) ? 28L : ("confirm".equals(kind) ? 18L : 9L);
        int amplitude = "destructive".equals(kind) ? 95 : ("confirm".equals(kind) ? 70 : 42);

        Vibrator vibrator;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) getContext().getSystemService(VibratorManager.class);
            vibrator = manager == null ? null : manager.getDefaultVibrator();
        } else {
            vibrator = (Vibrator) getContext().getSystemService(android.content.Context.VIBRATOR_SERVICE);
        }

        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(duration, amplitude));
            } else {
                vibrator.vibrate(duration);
            }
        }
        call.resolve();
    }
}
