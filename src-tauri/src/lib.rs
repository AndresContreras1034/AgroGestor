mod config;
mod db;
mod logging;
mod modules;
mod router;
mod types;

pub fn run() {
    let env_result = dotenvy::from_filename("src-tauri/.env");
    logging::init();
    if let Err(error) = env_result {
        tracing::debug!(%error, "No se cargó src-tauri/.env; se usarán variables del entorno");
    }

    tauri::Builder::default()
        .setup(|_| {
            tauri::async_runtime::spawn(async {
                if let Err(error) = router::serve().await {
                    tracing::error!(%error, "No se pudo iniciar la API local");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AgroGestor");
}
