interface ModulePageProps {
  title: string;
  description: string;
  includes: string[];
}

export function ModulePage({ title, description, includes }: ModulePageProps) {
  return (
    <section className="module-page">
      <h1>{title}</h1>
      <p className="module-page-description">{description}</p>
      <h2>Secciones previstas</h2>
      <ul>
        {includes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Este módulo todavía no está implementado.</p>
    </section>
  );
}
