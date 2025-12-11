import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/constants/strings.dart';
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
  @override
  void initState() {
    super.initState();
    context.read<DashboardBloc>().add(const DashboardStarted());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.chat),
            onPressed: () {
              Navigator.of(context).pushNamed(AppRoutes.chat);
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              context.read<AuthBloc>().add(const AuthLogoutRequested());
              Navigator.of(
                context,
              ).pushNamedAndRemoveUntil(AppRoutes.intro, (_) => false);
            },
          ),
        ],
      ),
      body: BlocBuilder<DashboardBloc, DashboardState>(
        builder: (context, state) {
          return RefreshIndicator(
            onRefresh: () async {
              context.read<DashboardBloc>().add(const DashboardRefreshed());
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
                      if (state.isLoading) const LoadingIndicator(),
                      const SizedBox(height: Dimens.spacing12),
                      AssistanceCard(data: state.assistanceInfo),
                      const SizedBox(height: Dimens.spacing16),
                      ScheduleCard(schedule: state.nextSchedule),
                      const SizedBox(height: Dimens.spacing16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(Dimens.spacing16),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(
                            Dimens.borderRadius16,
                          ),
                          border: Border.all(
                            color: AppColors.secondary.withOpacity(0.2),
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.verified,
                              color: AppColors.secondary,
                            ),
                            const SizedBox(width: Dimens.spacing12),
                            Expanded(
                              child: Text(
                                'Pencocokan wajah: ${state.faceMatchingStatus}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: Dimens.spacing16),
                      ProgressTimeline(
                        title: 'Progress verifikasi identitas',
                        steps: state.verificationSteps,
                      ),
                      const SizedBox(height: Dimens.spacing16),
                      ProgressTimeline(
                        title: 'Progress penyaluran bantuan',
                        steps: state.aidProgressSteps,
                        accentColor: AppColors.secondary,
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
}
