#[derive(Clone, Copy, Debug, Default)]
pub enum IngestaAdapter {
    #[default]
    Http,
    Azure,
}
