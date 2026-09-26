export default function WellnessMark({ size = 28, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="DisciplineOS wellness mark">
      <path d="M20 2.8 34.8 11.4v17.2L20 37.2 5.2 28.6V11.4L20 2.8Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M20 10v20M11.3 15l17.4 10M11.3 25l17.4-10" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.2" />
      <circle cx="20" cy="7.6" r="2.6" fill="var(--physical)" />
      <circle cx="30.5" cy="13.7" r="2.6" fill="var(--emotional)" />
      <circle cx="30.5" cy="26.3" r="2.6" fill="var(--social)" />
      <circle cx="20" cy="32.4" r="2.6" fill="var(--financial)" />
      <circle cx="9.5" cy="26.3" r="2.6" fill="var(--intellectual)" />
      <circle cx="9.5" cy="13.7" r="2.6" fill="var(--occupational)" />
      <circle cx="20" cy="20" r="3.2" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.5" />
    </svg>
  );
}
