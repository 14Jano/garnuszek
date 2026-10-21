import './PagePlaceholder.css';

interface PagePlaceholderProps {
  title: string;
  lead: string;
  planned: readonly string[];
  note?: string;
}

/** Stand-in for screens that are on the roadmap but not built yet. */
export function PagePlaceholder({ title, lead, planned, note }: PagePlaceholderProps) {
  return (
    <section className="page-placeholder">
      <h1>{title}</h1>
      <p className="page-placeholder__lead">{lead}</p>
      <p className="page-placeholder__badge">W budowie</p>

      <h2>Co tu się pojawi</h2>
      <ul>
        {planned.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {note && <p className="page-placeholder__note">{note}</p>}
    </section>
  );
}
