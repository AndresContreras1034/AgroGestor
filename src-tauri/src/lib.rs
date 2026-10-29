mod config;
mod db;
mod errors;
mod logging;
mod modules;
mod router;
mod state;
mod types;

use std::time::Duration;

pub fn run() {
    let env_result = dotenvy::from_filename("src-tauri/.env");
    logging::init();
    if let Err(error) = env_result {
        tracing::debug!(%error, "No se cargó src-tauri/.env; se usarán variables del entorno");
    }

    tauri::Builder::default()
        .setup(|_| {
            tauri::async_runtime::spawn(async {
                let mut espera = 1;
                loop {
                    if let Err(error) = dotenvy::from_filename("src-tauri/.env") {
                        tracing::debug!(%error, "No se pudo recargar src-tauri/.env");
                    }

                    match router::serve().await {
                        Ok(()) => tracing::warn!("La API local se detuvo; se volverá a iniciar"),
                        Err(error) => {
                            tracing::error!(%error, "No se pudo iniciar la API local; se reintentará");
                        }
                    }

                    tokio::time::sleep(Duration::from_secs(espera)).await;
                    espera = (espera * 2).min(30);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running AgroGestor");
}
