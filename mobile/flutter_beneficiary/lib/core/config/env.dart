class Env {
  const Env._();

  /// Base URL for dashboard-related endpoints.
  ///
  /// Override at runtime with:
  /// `--dart-define=DASHBOARD_API_BASE_URL=https://your-api.host`
  static const dashboardApiBaseUrl = String.fromEnvironment(
    'DASHBOARD_API_BASE_URL',
    defaultValue: 'https://api-placeholder.local',
  );
}
