import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import 'dashboard_event.dart';
import 'dashboard_state.dart';

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  DashboardBloc() : super(_initialState()) {
    on<DashboardStarted>(_onStarted);
    on<DashboardRefreshed>(_onRefreshed);
  }

  static DashboardState _initialState() {
    return DashboardState(
      assistanceInfo: const AssistanceInfo(
        title: 'Bantuan Pangan',
        category: 'BLT',
        group: 'PKH',
        amount: 'Rp 600.000',
        description: 'Kamu terdaftar sebagai penerima: Bantuan Pangan',
        deliveryMethod: 'Cara menerima bantuan: Diambil di lokasi penyaluran.',
      ),
      nextSchedule: const ScheduleInfo(
        date: '12 Januari 2026',
        location: 'Kantor Kelurahan Sukamaju',
        time: '09.00 – 12.00 WIB',
        note: 'Datang sesuai jadwal. Bawa KTP asli, ya.',
      ),
      verificationSteps: const [
        TimelineStep(
          title: 'KTP kamu sudah kami terima',
          subtitle: 'Foto KTP sudah tersimpan dengan aman.',
          status: StepStatus.done,
        ),
        TimelineStep(
          title: 'Foto wajah kamu sedang dicek',
          subtitle: 'Petugas sedang mencocokkan wajah kamu.',
          status: StepStatus.inProgress,
        ),
        TimelineStep(
          title: 'Pengecekan gerakan wajah',
          subtitle: 'Selesaikan liveness untuk lanjut.',
          status: StepStatus.pending,
        ),
        TimelineStep(
          title: 'Identitas kamu sudah terverifikasi',
          subtitle: 'Kamu siap menerima bantuan.',
          status: StepStatus.pending,
        ),
      ],
      aidProgressSteps: const [
        TimelineStep(
          title: 'Sedang Diproses',
          subtitle: 'Data kamu sedang dicek oleh petugas.',
          status: StepStatus.done,
        ),
        TimelineStep(
          title: 'Bantuan Disetujui',
          subtitle: 'Kamu terdaftar sebagai penerima bantuan.',
          status: StepStatus.done,
        ),
        TimelineStep(
          title: 'Menunggu Penyaluran',
          subtitle:
              'Bantuan kamu sudah siap. Tinggal menunggu jadwal penyaluran.',
          status: StepStatus.inProgress,
        ),
        TimelineStep(
          title: 'Bantuan Sudah Diterima',
          subtitle:
              'Bantuan kamu sudah diterima. Terima kasih sudah berpartisipasi.',
          status: StepStatus.pending,
        ),
      ],
      faceMatchingStatus: 'Sedang dicek',
      isLoading: false,
    );
  }

  FutureOr<void> _onStarted(
    DashboardStarted event,
    Emitter<DashboardState> emit,
  ) async {
    emit(state.copyWith(isLoading: true));
    await Future<void>.delayed(const Duration(milliseconds: 600));
    emit(state.copyWith(isLoading: false));
  }

  FutureOr<void> _onRefreshed(
    DashboardRefreshed event,
    Emitter<DashboardState> emit,
  ) async {
    emit(state.copyWith(isLoading: true));
    await Future<void>.delayed(const Duration(milliseconds: 500));
    emit(state.copyWith(isLoading: false));
  }
}
