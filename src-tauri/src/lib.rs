use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};
use windows_sys::Win32::Foundation::{ERROR_ALREADY_EXISTS, GetLastError, HWND, RECT};
use windows_sys::Win32::System::Registry::{
    RegCloseKey, RegDeleteValueW, RegOpenKeyExW, RegSetValueExW, HKEY, HKEY_CURRENT_USER,
    KEY_READ, KEY_WRITE, REG_SZ,
};
use windows_sys::Win32::System::Threading::CreateMutexW;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{RegisterHotKey, MOD_ALT, MOD_CONTROL};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    DispatchMessageW, EnumWindows, FindWindowExW, FindWindowW, GetClassNameW, GetForegroundWindow,
    GetMessageW, GetSystemMetrics, GetWindowLongPtrW, GetWindowRect, SendMessageTimeoutW,
    SetForegroundWindow, SetParent, SetWindowLongPtrW, SetWindowPos, ShowWindow, TranslateMessage,
    GWL_EXSTYLE, GWL_STYLE, HWND_BOTTOM, MSG, SMTO_NORMAL, SM_CXSCREEN, SM_CYSCREEN,
    SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, SWP_SHOWWINDOW,
    SW_RESTORE, WM_HOTKEY, WS_CHILD, WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_EX_TRANSPARENT,
    WS_POPUP,
};

static IS_INTERACTIVE: AtomicBool = AtomicBool::new(false);
static CLOCK_HWND: Mutex<Option<usize>> = Mutex::new(None);

fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

pub fn embed_into_desktop(hwnd: HWND) -> bool {
    unsafe {
        let progman = FindWindowW(to_wide("Progman").as_ptr(), std::ptr::null());
        if progman.is_null() {
            set_bottom_most(hwnd);
            return false;
        }

        let mut result: usize = 0;
        SendMessageTimeoutW(
            progman,
            0x052C,
            0x0000000D,
            0,
            SMTO_NORMAL,
            1000,
            &mut result,
        );

        struct SearchData {
            workerw: HWND,
        }
        let mut data = SearchData {
            workerw: std::ptr::null_mut(),
        };

        unsafe extern "system" fn enum_windows_proc(top_hwnd: HWND, lparam: isize) -> i32 {
            unsafe {
                let data_ptr = lparam as *mut SearchData;
                let def_view = FindWindowExW(
                    top_hwnd,
                    std::ptr::null_mut(),
                    to_wide("SHELLDLL_DefView").as_ptr(),
                    std::ptr::null(),
                );
                if !def_view.is_null() {
                    let workerw = FindWindowExW(
                        std::ptr::null_mut(),
                        top_hwnd,
                        to_wide("WorkerW").as_ptr(),
                        std::ptr::null(),
                    );
                    if !workerw.is_null() {
                        (*data_ptr).workerw = workerw;
                    }
                }
                1
            }
        }

        EnumWindows(Some(enum_windows_proc), &mut data as *mut SearchData as isize);

        let target = if !data.workerw.is_null() {
            data.workerw
        } else {
            FindWindowExW(
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                to_wide("WorkerW").as_ptr(),
                std::ptr::null(),
            )
        };

        if !target.is_null() {
            SetParent(hwnd, target);
            let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
            SetWindowLongPtrW(hwnd, GWL_STYLE, (style & !(WS_POPUP as isize)) | (WS_CHILD as isize));
            let cx = GetSystemMetrics(SM_CXSCREEN);
            let cy = GetSystemMetrics(SM_CYSCREEN);
            SetWindowPos(
                hwnd,
                std::ptr::null_mut(),
                0,
                0,
                cx,
                cy,
                SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
            );
            true
        } else {
            set_bottom_most(hwnd);
            false
        }
    }
}

pub fn set_bottom_most(hwnd: HWND) {
    unsafe {
        let cx = GetSystemMetrics(SM_CXSCREEN);
        let cy = GetSystemMetrics(SM_CYSCREEN);
        SetWindowPos(
            hwnd,
            HWND_BOTTOM,
            0,
            0,
            cx,
            cy,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        );
    }
}

pub fn set_click_through(hwnd: HWND, click_through: bool) {
    unsafe {
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        let new_style = if click_through {
            ex_style | (WS_EX_TRANSPARENT as isize) | (WS_EX_LAYERED as isize) | (WS_EX_TOOLWINDOW as isize)
        } else {
            (ex_style & !(WS_EX_TRANSPARENT as isize)) | (WS_EX_LAYERED as isize) | (WS_EX_TOOLWINDOW as isize)
        };
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);
        SetWindowPos(
            hwnd,
            std::ptr::null_mut(),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED,
        );
    }
}

fn check_fullscreen_active(clock_hwnd: usize) -> bool {
    unsafe {
        let fg = GetForegroundWindow();
        if fg.is_null() || fg as usize == clock_hwnd {
            return false;
        }

        let mut class_buf = [0u16; 128];
        GetClassNameW(fg, class_buf.as_mut_ptr(), 128);
        let class_name = String::from_utf16_lossy(&class_buf);
        if class_name.starts_with("Progman")
            || class_name.starts_with("WorkerW")
            || class_name.starts_with("Shell_TrayWnd")
        {
            return false;
        }

        let mut rect: RECT = std::mem::zeroed();
        GetWindowRect(fg, &mut rect);
        let screen_w = GetSystemMetrics(SM_CXSCREEN);
        let screen_h = GetSystemMetrics(SM_CYSCREEN);

        rect.left <= 0 && rect.top <= 0 && rect.right >= screen_w && rect.bottom >= screen_h
    }
}

#[tauri::command]
fn get_autostart() -> bool {
    unsafe {
        let subkey = to_wide("Software\\Microsoft\\Windows\\CurrentVersion\\Run");
        let val_name = to_wide("WallpaperClock");
        let mut hkey: HKEY = std::ptr::null_mut();
        if RegOpenKeyExW(HKEY_CURRENT_USER, subkey.as_ptr(), 0, KEY_READ, &mut hkey) == 0 {
            let mut buf = [0u16; 512];
            let mut buf_size: u32 = (512 * std::mem::size_of::<u16>()) as u32;
            let status = windows_sys::Win32::System::Registry::RegQueryValueExW(
                hkey,
                val_name.as_ptr(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                buf.as_mut_ptr() as *mut u8,
                &mut buf_size,
            );
            RegCloseKey(hkey);
            status == 0
        } else {
            false
        }
    }
}

#[tauri::command]
fn set_autostart(enable: bool) -> Result<(), String> {
    unsafe {
        let subkey = to_wide("Software\\Microsoft\\Windows\\CurrentVersion\\Run");
        let val_name = to_wide("WallpaperClock");
        let mut hkey: HKEY = std::ptr::null_mut();
        let res = RegOpenKeyExW(HKEY_CURRENT_USER, subkey.as_ptr(), 0, KEY_WRITE, &mut hkey);
        if res != 0 {
            return Err(format!("Failed to open registry key: {}", res));
        }

        if enable {
            let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
            let cmd = format!("\"{}\" --autostart", exe_path.to_string_lossy());
            let wide_cmd = to_wide(&cmd);
            let byte_len = (wide_cmd.len() * std::mem::size_of::<u16>()) as u32;
            let set_res = RegSetValueExW(
                hkey,
                val_name.as_ptr(),
                0,
                REG_SZ,
                wide_cmd.as_ptr() as *const u8,
                byte_len,
            );
            RegCloseKey(hkey);
            if set_res != 0 {
                return Err(format!("Failed to set registry value: {}", set_res));
            }
        } else {
            let _ = RegDeleteValueW(hkey, val_name.as_ptr());
            RegCloseKey(hkey);
        }
        Ok(())
    }
}

#[tauri::command]
fn set_interactive(interactive: bool) -> Result<(), String> {
    IS_INTERACTIVE.store(interactive, Ordering::SeqCst);
    if let Ok(lock) = CLOCK_HWND.lock() {
        if let Some(h) = *lock {
            set_click_through(h as HWND, !interactive);
        }
    }
    Ok(())
}

#[tauri::command]
fn is_interactive() -> bool {
    IS_INTERACTIVE.load(Ordering::SeqCst)
}

#[tauri::command]
fn get_appdata_path() -> Result<String, String> {
    let app_dir = dirs_fallback().ok_or_else(|| "Could not locate app data directory".to_string())?;
    let path = app_dir.join("WallpaperClock");
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn load_settings() -> Result<String, String> {
    let app_dir = dirs_fallback().ok_or_else(|| "Could not locate app data directory".to_string())?;
    let file = app_dir.join("WallpaperClock").join("settings.json");
    if file.exists() {
        std::fs::read_to_string(&file).map_err(|e| e.to_string())
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
fn save_settings(settings_json: String) -> Result<(), String> {
    let app_dir = dirs_fallback().ok_or_else(|| "Could not locate app data directory".to_string())?;
    let dir = app_dir.join("WallpaperClock");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    let file = dir.join("settings.json");
    std::fs::write(&file, settings_json).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn close_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.hide();
    }
    Ok(())
}

#[tauri::command]
fn toggle_clock_window(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(win) = app.get_webview_window("main") {
        let is_vis = win.is_visible().unwrap_or(true);
        if is_vis {
            let _ = win.hide();
            Ok(false)
        } else {
            let _ = win.show();
            Ok(true)
        }
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

fn dirs_fallback() -> Option<std::path::PathBuf> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        Some(std::path::PathBuf::from(appdata))
    } else if let Ok(userprofile) = std::env::var("USERPROFILE") {
        Some(std::path::PathBuf::from(userprofile).join("AppData").join("Roaming"))
    } else {
        None
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 1. Single instance check via Win32 named mutex
    unsafe {
        let mutex_name = to_wide("WallpaperClock_SingleInstance_Mutex_AGY");
        let _mutex = CreateMutexW(std::ptr::null(), 1, mutex_name.as_ptr());
        if GetLastError() == ERROR_ALREADY_EXISTS {
            let settings_title = to_wide("Wallpaper Clock - Settings");
            let existing_wnd = FindWindowW(std::ptr::null(), settings_title.as_ptr());
            if !existing_wnd.is_null() {
                ShowWindow(existing_wnd, SW_RESTORE);
                SetForegroundWindow(existing_wnd);
            }
            std::process::exit(0);
        }
    }

    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            // Setup System Tray
            let show_settings_i = MenuItemBuilder::with_id("show_settings", "Show Settings").build(app)?;
            let toggle_clock_i = MenuItemBuilder::with_id("toggle_clock", "Toggle Clock Visible").build(app)?;
            let toggle_edit_i = MenuItemBuilder::with_id("toggle_edit", "Edit Mode (Ctrl+Alt+C)").build(app)?;
            let sep1 = MenuItemBuilder::with_id("sep1", "---").build(app)?;
            let sw_toggle_i = MenuItemBuilder::with_id("sw_toggle", "Start/Pause Stopwatch").build(app)?;
            let pom_toggle_i = MenuItemBuilder::with_id("pom_toggle", "Start/Pause Pomodoro").build(app)?;
            let sep2 = MenuItemBuilder::with_id("sep2", "---").build(app)?;
            let autostart_status = get_autostart();
            let autostart_label = if autostart_status {
                "Run at Startup [Enabled]"
            } else {
                "Run at Startup [Disabled]"
            };
            let autostart_i = MenuItemBuilder::with_id("autostart", autostart_label).build(app)?;
            let sep3 = MenuItemBuilder::with_id("sep3", "---").build(app)?;
            let quit_i = MenuItemBuilder::with_id("quit", "Quit Wallpaper Clock").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .items(&[
                    &show_settings_i,
                    &toggle_clock_i,
                    &toggle_edit_i,
                    &sep1,
                    &sw_toggle_i,
                    &pom_toggle_i,
                    &sep2,
                    &autostart_i,
                    &sep3,
                    &quit_i,
                ])
                .build()?;

            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app_h, event| match event.id.as_ref() {
                    "show_settings" => {
                        let _ = open_settings_window(app_h.clone());
                    }
                    "toggle_clock" => {
                        let _ = toggle_clock_window(app_h.clone());
                    }
                    "toggle_edit" => {
                        let cur = IS_INTERACTIVE.load(Ordering::SeqCst);
                        let next = !cur;
                        let _ = set_interactive(next);
                        let _ = app_h.emit("set-edit-mode", next);
                    }
                    "sw_toggle" => {
                        let _ = app_h.emit("tray-sw-toggle", ());
                    }
                    "pom_toggle" => {
                        let _ = app_h.emit("tray-pom-toggle", ());
                    }
                    "autostart" => {
                        let cur = get_autostart();
                        let _ = set_autostart(!cur);
                        let _ = app_h.emit("autostart-changed", !cur);
                    }
                    "quit" => {
                        app_h.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app_h = tray.app_handle();
                        let _ = open_settings_window(app_h.clone());
                    }
                })
                .build(app)?;

            // Main clock window setup
            if let Some(main_window) = app.get_webview_window("main") {
                if let Ok(hwnd_raw) = main_window.hwnd() {
                    let hwnd = hwnd_raw.0 as usize;
                    if let Ok(mut lock) = CLOCK_HWND.lock() {
                        *lock = Some(hwnd);
                    }
                    // Embed into WorkerW behind desktop icons (with fallback to HWND_BOTTOM)
                    embed_into_desktop(hwnd as HWND);
                    // Make window click-through initially
                    set_click_through(hwnd as HWND, true);
                }
            }

            // Settings window close interception: hide instead of destroy/exit
            if let Some(settings_window) = app.get_webview_window("settings") {
                let win_clone = settings_window.clone();
                settings_window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            // Global Hotkey thread (Ctrl+Alt+C)
            let handle_hotkey = handle.clone();
            std::thread::spawn(move || {
                unsafe {
                    RegisterHotKey(std::ptr::null_mut(), 1001, (MOD_CONTROL | MOD_ALT) as u32, 0x43); // 'C'
                    let mut msg: MSG = std::mem::zeroed();
                    while GetMessageW(&mut msg, std::ptr::null_mut(), 0, 0) > 0 {
                        if msg.message == WM_HOTKEY && msg.wParam == 1001 {
                            let cur = IS_INTERACTIVE.load(Ordering::SeqCst);
                            let next = !cur;
                            let _ = set_interactive(next);
                            let _ = handle_hotkey.emit("set-edit-mode", next);
                            if next {
                                let _ = open_settings_window(handle_hotkey.clone());
                            }
                        }
                        TranslateMessage(&msg);
                        DispatchMessageW(&msg);
                    }
                }
            });

            // Fullscreen app detection thread (every 2s)
            let handle_fs = handle.clone();
            std::thread::spawn(move || {
                let mut was_fullscreen = false;
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    let clock_h = CLOCK_HWND.lock().ok().and_then(|l| *l).unwrap_or(0);
                    let is_fs = check_fullscreen_active(clock_h);
                    if is_fs != was_fullscreen {
                        was_fullscreen = is_fs;
                        let _ = handle_fs.emit("fullscreen-state-changed", is_fs);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_autostart,
            set_autostart,
            set_interactive,
            is_interactive,
            load_settings,
            save_settings,
            get_appdata_path,
            open_settings_window,
            close_settings_window,
            toggle_clock_window,
            exit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Wallpaper Clock");
}
