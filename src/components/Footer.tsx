interface FooterProps {
  onlineCount: number;
  totalCount: number;
  pollInterval: number;
  lastSync: string | null;
}

export default function Footer({ onlineCount, totalCount, pollInterval, lastSync }: FooterProps) {
  // sv-SE locale gives YYYY-MM-DD HH:MM:SS format in local time
  const timestamp = lastSync
    ? new Date(lastSync).toLocaleString("sv-SE").replace(" ", "_")
    : "---";

  return (
    <div className="panel p-4">
      <div className="flex justify-between label-text">
        <span>PROVIDERS_ONLINE: {onlineCount}/{totalCount}</span>
        <span>POLL_INTERVAL: {pollInterval}S</span>
        <span>LAST_SYNC: {timestamp}</span>
      </div>
    </div>
  );
}
