// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Force WebView2 to use transparent background and eliminate white borders/bars
    unsafe {
        std::env::set_var("WEBVIEW2_DEFAULT_BACKGROUND_COLOR", "0");
    }
    app_lib::run();
}
