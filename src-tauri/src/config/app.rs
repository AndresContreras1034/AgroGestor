use std::net::{IpAddr, Ipv4Addr, SocketAddr};

pub fn api_address() -> Result<SocketAddr, std::num::ParseIntError> {
    let port = std::env::var("AGRO_PORT")
        .unwrap_or_else(|_| "8787".to_owned())
        .parse()?;
    Ok(SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port))
}

pub fn database_max_connections() -> Result<u32, Box<dyn std::error::Error + Send + Sync>> {
    let max_connections = std::env::var("AGRO_DB_MAX_CONEXIONES")
        .unwrap_or_else(|_| "5".to_owned())
        .parse()
        .map_err(|error| Box::new(error) as Box<dyn std::error::Error + Send + Sync>)?;
    if max_connections == 0 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "AGRO_DB_MAX_CONEXIONES debe ser mayor que cero",
        )
        .into());
    }
    Ok(max_connections)
}
