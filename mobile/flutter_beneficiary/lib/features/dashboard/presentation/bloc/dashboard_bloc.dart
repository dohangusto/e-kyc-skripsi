import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/repositories/dashboard_repository.dart';
import '../../data/models/dashboard_response.dart';
import 'dashboard_event.dart';
import 'dashboard_state.dart';

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  DashboardBloc({required DashboardRepository repository})
    : _repository = repository,
      super(_initialState()) {
    on<DashboardStarted>(_onStarted);
    on<DashboardRefreshed>(_onRefreshed);
  }

  final DashboardRepository _repository;

  static DashboardState _initialState() {
    return DashboardState(
      assistanceInfo: const AssistanceInfo(
        title: '',
        category: '',
        amount: '',
        description: '',
      ),
      verificationSteps: const [],
      aidProgressSteps: const [],
      faceMatchingStatus: '',
      isLoading: false,
      hasError: false,
      errorMessage: '',
      isEmpty: false,
    );
  }

  FutureOr<void> _onStarted(
    DashboardStarted event,
    Emitter<DashboardState> emit,
  ) async {
    await _loadDashboard(emit);
  }

  FutureOr<void> _onRefreshed(
    DashboardRefreshed event,
    Emitter<DashboardState> emit,
  ) async {
    await _loadDashboard(emit);
  }

  Future<void> _loadDashboard(Emitter<DashboardState> emit) async {
    emit(
      state.copyWith(
        isLoading: true,
        hasError: false,
        errorMessage: '',
        isEmpty: false,
      ),
    );
    try {
      final dashboard = await _repository.getDashboard();
      final isEmptyData = _isDashboardEmpty(dashboard);
      emit(
        state.copyWith(
          isLoading: false,
          hasError: false,
          errorMessage: '',
          isEmpty: isEmptyData,
          assistanceInfo: dashboard.assistanceInfo,
          nextSchedule: dashboard.nextSchedule,
          verificationSteps: dashboard.verificationSteps.isEmpty
              ? state.verificationSteps
              : dashboard.verificationSteps,
          aidProgressSteps: dashboard.aidProgressSteps.isEmpty
              ? state.aidProgressSteps
              : dashboard.aidProgressSteps,
          faceMatchingStatus: dashboard.faceMatchingStatus.isNotEmpty
              ? dashboard.faceMatchingStatus
              : state.faceMatchingStatus,
        ),
      );
    } catch (_) {
      emit(
        state.copyWith(
          isLoading: false,
          hasError: true,
          errorMessage:
              'Terjadi kesalahan saat mengambil data. Silakan coba lagi.',
          isEmpty: false,
        ),
      );
    }
  }

  bool _isDashboardEmpty(DashboardData dashboard) {
    final hasSchedule =
        dashboard.nextSchedule != null && !dashboard.nextSchedule!.isEmpty;
    final hasAssistance = !dashboard.assistanceInfo.isEmpty;
    final hasVerification = dashboard.verificationSteps.isNotEmpty;
    final hasAidProgress = dashboard.aidProgressSteps.isNotEmpty;
    final hasFaceStatus = dashboard.faceMatchingStatus.trim().isNotEmpty;
    return !(hasSchedule ||
        hasAssistance ||
        hasVerification ||
        hasAidProgress ||
        hasFaceStatus);
  }
}
