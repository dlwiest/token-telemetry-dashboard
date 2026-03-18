import { useConfig, useTelemetry } from "./hooks/useTelemetry";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProviderCard from "./components/ProviderCard";

export default function App() {
  const { data: config, isError: configError } = useConfig();
  const { data: telemetry, isError: telemetryError } = useTelemetry(config?.pollInterval);

  const providers = telemetry?.providers ?? [];
  const onlineCount = providers.filter((p) => p.status !== "offline").length;
  const hasError = configError || telemetryError;

  return (
    <div className="h-screen bg-background p-4 font-mono flex flex-col overflow-hidden">
      <Header providers={providers} />

      {hasError && providers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="panel p-8 text-center">
            <div className="text-2xl font-bold text-alert mb-2">CONNECTION_LOST</div>
            <div className="label-text">Backend unreachable — retrying automatically</div>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 mb-3 flex-1 min-h-0 overflow-hidden justify-center">
          {providers.map((provider) => (
            <div key={provider.id} className="flex-1 max-w-md min-h-0 flex">
              <ProviderCard provider={provider} />
            </div>
          ))}
        </div>
      )}

      <Footer
        onlineCount={onlineCount}
        totalCount={providers.length}
        pollInterval={config?.pollInterval ?? 30}
        lastSync={telemetry?.timestamp ?? null}
      />
    </div>
  );
}
