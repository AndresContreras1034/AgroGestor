use std::{fmt, str::FromStr};

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub struct Zona(char);

impl Zona {
    pub const fn letra(self) -> char {
        self.0
    }

    pub const fn camas(self) -> u8 {
        match self.0 {
            'A' => 9,
            'B' | 'C' => 8,
            _ => 0,
        }
    }
}

impl FromStr for Zona {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_ascii_uppercase().as_str() {
            "A" => Ok(Self('A')),
            "B" => Ok(Self('B')),
            "C" => Ok(Self('C')),
            _ => Err("La zona debe ser A, B o C".to_owned()),
        }
    }
}

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub struct CodigoCama {
    zona: Zona,
    numero: u8,
}

impl fmt::Display for CodigoCama {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}-{:02}", self.zona.letra(), self.numero)
    }
}

impl FromStr for CodigoCama {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let value = value.trim().to_ascii_uppercase();
        let (zona, numero) = value
            .split_once('-')
            .ok_or_else(|| "El código debe tener formato A-01".to_owned())?;
        if numero.len() != 2 || !numero.bytes().all(|byte| byte.is_ascii_digit()) {
            return Err("El número de cama debe tener dos dígitos".to_owned());
        }

        let zona: Zona = zona.parse()?;
        let numero: u8 = numero
            .parse()
            .map_err(|_| "Número de cama inválido".to_owned())?;
        if numero == 0 || numero > zona.camas() {
            return Err(format!(
                "La zona {} no tiene una cama {numero:02}",
                zona.letra()
            ));
        }

        Ok(Self { zona, numero })
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::{CodigoCama, Zona};

    #[test]
    fn normaliza_codigo_de_cama_y_valida_limites() {
        assert_eq!(CodigoCama::from_str("c-05").unwrap().to_string(), "C-05");
        assert!(CodigoCama::from_str("C-014").is_err());
        assert!(CodigoCama::from_str("C-09").is_err());
        assert!(CodigoCama::from_str("A-10").is_err());
    }

    #[test]
    fn valida_zonas() {
        assert_eq!("b".parse::<Zona>().unwrap().camas(), 8);
        assert!("D".parse::<Zona>().is_err());
    }
}
