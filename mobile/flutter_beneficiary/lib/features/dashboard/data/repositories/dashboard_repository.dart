import '../datasources/dashboard_remote_data_source.dart';
import '../models/dashboard_response.dart';

abstract class DashboardRepository {
  Future<DashboardData> getDashboard();
}

class DashboardRepositoryImpl implements DashboardRepository {
  DashboardRepositoryImpl({required DashboardRemoteDataSource remoteDataSource})
    : _remoteDataSource = remoteDataSource;

  final DashboardRemoteDataSource _remoteDataSource;

  @override
  Future<DashboardData> getDashboard() {
    return _remoteDataSource.fetchDashboard();
  }
}
