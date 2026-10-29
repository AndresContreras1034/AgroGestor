use std::net::{IpAddr, Ipv4Addr, SocketAddr};

pub fn api_address() -> Result<SocketAddr, std::num::ParseIntError> {
    let port = std::env::var("AGROGESTOR_API_PORT")
        .unwrap_or_else(|_| "3000".to_owned())
        .parse()?;
    Ok(SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port))
}
