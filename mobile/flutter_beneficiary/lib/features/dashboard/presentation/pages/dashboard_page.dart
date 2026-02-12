import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/constants/strings.dart';
import '../../../../core/widgets/error_view.dart';
import '../../../../core/widgets/loading_indicator.dart';
import '../../../../core/widgets/primary_button.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_event.dart';
import '../bloc/dashboard_bloc.dart';
import '../bloc/dashboard_event.dart';
import '../bloc/dashboard_state.dart';
import '../widgets/assistance_card.dart';
import '../widgets/progress_timeline.dart';
import '../widgets/schedule_card.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  static const bool _previewMode = true;

  @override
  void initState() {
    super.initState();
    if (!_previewMode) {
      context.read<DashboardBloc>().add(const DashboardStarted());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          TextButton(
            style: TextButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.surface,
              padding: const EdgeInsets.symmetric(
                horizontal: Dimens.spacing12,
                vertical: Dimens.spacing8,
              ),
            ),
            onPressed: () {
              Navigator.of(context).pushNamed(AppRoutes.chat);
            },
            child: const Text('Chat Admin'),
          ),
          SizedBox(width: 5),
          TextButton(
            style: TextButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: AppColors.surface,
              padding: const EdgeInsets.symmetric(
                horizontal: Dimens.spacing12,
                vertical: Dimens.spacing8,
              ),
            ),
            onPressed: () {
              context.read<AuthBloc>().add(const AuthLogoutRequested());
              Navigator.of(
                context,
              ).pushNamedAndRemoveUntil(AppRoutes.intro, (_) => false);
            },
            child: const Text('Keluar'),
          ),
          SizedBox(width: 5),
        ],
      ),
      body: BlocBuilder<DashboardBloc, DashboardState>(
        builder: (context, state) {
          if (state.isLoading) {
            return _LoadingView(
              onRefresh: () async {
                context.read<DashboardBloc>().add(const DashboardRefreshed());
                await Future<void>.delayed(const Duration(milliseconds: 400));
              },
            );
          }

          if (state.hasError) {
            return _ErrorView(
              message: state.errorMessage.isEmpty
                  ? 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.'
                  : state.errorMessage,
              onRetry: () {
                context.read<DashboardBloc>().add(const DashboardStarted());
              },
            );
          }

          if (state.isEmpty) {
            return _EmptyView(
              onRefresh: () async {
                context.read<DashboardBloc>().add(const DashboardRefreshed());
                await Future<void>.delayed(const Duration(milliseconds: 400));
              },
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              if (!_previewMode) {
                context.read<DashboardBloc>().add(const DashboardRefreshed());
              }
              await Future<void>.delayed(const Duration(milliseconds: 400));
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(Dimens.spacing16),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 640),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Halo!',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: Dimens.spacing8),
                      const Text(
                        AppStrings.welcomeCopy,
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: Dimens.spacing16),
                      _FaceMatchingCard(status: state.faceMatchingStatus),
                      const SizedBox(height: Dimens.spacing16),
                      ScheduleCard(
                        schedule: _isScheduleReady(state)
                            ? state.nextSchedule
                            : null,
                      ),
                      const SizedBox(height: Dimens.spacing16),
                      if (state.assistanceInfo.isEmpty)
                        const _EmptySectionCard(
                          title: 'Data Bantuan',
                          message:
                              'Tidak ada data bantuan yang bisa ditampilkan saat ini.',
                        )
                      else
                        AssistanceCard(data: state.assistanceInfo),
                      const SizedBox(height: Dimens.spacing16),
                      ProgressTimeline(
                        title: 'Progress verifikasi identitas',
                        steps: state.verificationSteps,
                        emptyMessage:
                            'Tidak ada data progress verifikasi identitas.',
                      ),
                      const SizedBox(height: Dimens.spacing16),
                      ProgressTimeline(
                        title: 'Progress penyaluran bantuan',
                        steps: state.aidProgressSteps,
                        accentColor: AppColors.secondary,
                        emptyMessage:
                            'Tidak ada data progress penyaluran bantuan.',
                      ),
                      const SizedBox(height: Dimens.spacing24),
                      PrimaryButton(
                        label: 'Chat dengan Petugas',
                        onPressed: () =>
                            Navigator.of(context).pushNamed(AppRoutes.chat),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  bool _isScheduleReady(DashboardState state) {
    return state.nextSchedule != null && !state.nextSchedule!.isEmpty;
  }
}

class _FaceMatchingCard extends StatelessWidget {
  final String status;

  const _FaceMatchingCard({required this.status});

  @override
  Widget build(BuildContext context) {
    final hasStatus = status.trim().isNotEmpty;
    final label = hasStatus ? status : 'Tidak ada data';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(Dimens.spacing16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Dimens.borderRadius16),
        border: Border.all(color: AppColors.secondary.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(
            hasStatus ? Icons.verified : Icons.info_outline,
            color: AppColors.secondary,
          ),
          const SizedBox(width: Dimens.spacing12),
          Expanded(
            child: Text(
              'Pencocokan wajah: $label',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptySectionCard extends StatelessWidget {
  final String title;
  final String message;

  const _EmptySectionCard({required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(Dimens.spacing16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Dimens.borderRadius16),
        border: Border.all(color: AppColors.primary.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: Dimens.spacing12),
          Text(message, style: const TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _LoadingView extends StatelessWidget {
  final Future<void> Function() onRefresh;

  const _LoadingView({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.7,
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                LoadingIndicator(size: 32, strokeWidth: 3),
                SizedBox(height: Dimens.spacing12),
                Text(
                  'Sedang mengambil data...',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  final Future<void> Function() onRefresh;

  const _EmptyView({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.7,
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.inbox_outlined, size: 48, color: AppColors.primary),
                SizedBox(height: Dimens.spacing12),
                Text(
                  'Belum ada data yang bisa ditampilkan.',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ErrorView(message: message, onRetry: onRetry),
    );
  }
}
