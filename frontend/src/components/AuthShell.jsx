export default function AuthShell({ authority, title, subtitle, aside, children }) {
  return (
    <div className="auth-wrap">
      <div className={`auth-aside ${authority ? 'authority' : ''}`}>
        <h2>{aside.title}</h2>
        <p style={{ color: '#d7e7de', maxWidth: 420 }}>{aside.text}</p>
      </div>
      <div className="auth-main">
        <div className="auth-card">
          <h1 style={{ fontSize: '1.9rem' }}>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
