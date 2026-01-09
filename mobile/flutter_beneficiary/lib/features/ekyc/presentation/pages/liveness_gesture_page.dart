import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/widgets/primary_button.dart';
import '../bloc/liveness/liveness_bloc.dart';
import '../bloc/liveness/liveness_event.dart';
import '../bloc/liveness/liveness_state.dart';

class LivenessGesturePage extends StatefulWidget {
  const LivenessGesturePage({super.key});

  @override
  State<LivenessGesturePage> createState() => _LivenessGesturePageState();
}

class _LivenessGesturePageState extends State<LivenessGesturePage> {
  Timer? _advanceTimer;

  @override
  void initState() {
    super.initState();
    final bloc = context.read<LivenessBloc>();
    if (bloc.state.status == LivenessStatus.idle) {
      bloc.add(const LivenessSessionStarted());
    }
  }

  @override
  void dispose() {
    _advanceTimer?.cancel();
    super.dispose();
  }

  void _scheduleAutoAdvance() {
    _advanceTimer?.cancel();
    _advanceTimer = Timer(const Duration(seconds: 2), () {
      if (!mounted) return;
      context.read<LivenessBloc>().add(const LivenessGestureCaptured());
    });
  }

  void _goCompletion() {
    Navigator.of(context).pushReplacementNamed(AppRoutes.ekycComplete);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Ikuti Instruksi')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Dimens.spacing16),
          child: BlocBuilder<LivenessBloc, LivenessState>(
            builder: (context, state) {
              if (state.status == LivenessStatus.inProgress) {
                _scheduleAutoAdvance();
              } else {
                _advanceTimer?.cancel();
              }

              if (state.status == LivenessStatus.success) {
                return Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: Dimens.spacing24),
                          const Text(
                            'Terima kasih!',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: Dimens.spacing12),
                          const Text(
                            'Pengecekan gerakan wajah selesai. Kamu bisa lanjut ke dashboard.',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: Dimens.spacing24),
                          PrimaryButton(
                            label: 'Lanjut',
                            onPressed: _goCompletion,
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              final total = state.gestures.length;
              final currentStep = state.currentIndex + 1;

              return Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Langkah $currentStep dari $total',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: Dimens.spacing8),
                        Text(
                          'Sekarang: ${state.currentGesture}',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: Dimens.spacing12),
                        const Text(
                          'Gerakan akan berganti otomatis setelah terdeteksi.',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: Dimens.spacing24),
                        Row(
                          children: List.generate(total, (index) {
                            final isActive = index == state.currentIndex;
                            return Expanded(
                              child: Container(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                ),
                                height: 6,
                                decoration: BoxDecoration(
                                  color: isActive
                                      ? AppColors.primary
                                      : AppColors.textSecondary.withOpacity(
                                          0.2,
                                        ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            );
                          }),
                        ),
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
                              color: AppColors.primary.withOpacity(0.08),
                            ),
                          ),
                          child: Row(
                            children: [
                              const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 3,
                                ),
                              ),
                              const SizedBox(width: Dimens.spacing12),
                              Expanded(
                                child: Text(
                                  'Sekarang: ${state.currentGesture}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: Dimens.spacing24),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
