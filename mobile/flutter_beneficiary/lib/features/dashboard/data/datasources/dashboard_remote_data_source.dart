import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../../core/config/env.dart';
import '../models/dashboard_response.dart';

abstract class DashboardRemoteDataSource {
  Future<DashboardData> fetchDashboard();
}

class DashboardRemoteDataSourceImpl implements DashboardRemoteDataSource {
  DashboardRemoteDataSourceImpl({required http.Client client})
    : _client = client;

  final http.Client _client;

  @override
  Future<DashboardData> fetchDashboard() async {
    final uri = Uri.parse('${Env.dashboardApiBaseUrl}/dashboard');
    final response = await _client.get(
      uri,
      headers: const {'Accept': 'application/json'},
    );

    if (response.statusCode == 200) {
      final payload = json.decode(response.body) as Map<String, dynamic>;
      final data = payload['data'] ?? payload;
      return DashboardData.fromJson(
        (data ?? <String, dynamic>{}) as Map<String, dynamic>,
      );
    }

    throw DashboardApiException(
      'Failed to load dashboard: HTTP ${response.statusCode}',
    );
  }
}

class DashboardApiException implements Exception {
  DashboardApiException(this.message);
  final String message;

  @override
  String toString() => message;
}
