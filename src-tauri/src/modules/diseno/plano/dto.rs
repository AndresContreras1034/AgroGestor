use serde::{Deserialize, Serialize};

use super::models::{CamaPlano, ZonaPlano};

#[derive(Debug, Serialize)]
pub struct Plano {
    pub zonas: Vec<ZonaPlano>,
    pub camas: Vec<CamaPlano>,
}

#[derive(Debug, Deserialize)]
pub struct MoverCama {
    pub pos_x: f64,
    pub pos_y: f64,
}

#[derive(Debug, Serialize)]
pub struct PosicionActualizada {
    pub codigo: String,
    pub pos_x: f64,
    pub pos_y: f64,
    pub actualizado_en: chrono::DateTime<chrono::Utc>,
}
